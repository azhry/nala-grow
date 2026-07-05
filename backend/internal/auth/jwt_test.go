package auth

import (
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJWTService_GenerateToken(t *testing.T) {
	tests := []struct {
		name    string
		secret  string
		userID  string
		email   string
		wantErr bool
	}{
		{
			name:    "valid token generation",
			secret:  "my-secret-key",
			userID:  "user-123",
			email:   "test@example.com",
			wantErr: false,
		},
		{
			name:    "empty user ID",
			secret:  "my-secret-key",
			userID:  "",
			email:   "test@example.com",
			wantErr: false,
		},
		{
			name:    "empty email",
			secret:  "my-secret-key",
			userID:  "user-123",
			email:   "",
			wantErr: false,
		},
		{
			name:    "long values",
			secret:  "my-secret-key",
			userID:  strings.Repeat("a", 1000),
			email:   strings.Repeat("b", 500) + "@example.com",
			wantErr: false,
		},
		{
			name:    "empty secret",
			secret:  "",
			userID:  "user-123",
			email:   "test@example.com",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewJWTService(tt.secret, 1*time.Hour)
			token, err := svc.GenerateToken(tt.userID, tt.email)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Empty(t, token)
				return
			}

			require.NoError(t, err)
			assert.NotEmpty(t, token, "token should not be empty")
			assert.True(t, strings.Contains(token, "."), "JWT should have dot separators")

			// Validate the generated token
			claims, err := svc.ValidateToken(token)
			require.NoError(t, err)
			require.NotNil(t, claims)
			assert.Equal(t, tt.userID, claims.UserID)
			assert.Equal(t, tt.email, claims.Email)
			assert.NotEmpty(t, claims.ID, "JWT ID should be set")
			assert.NotEmpty(t, claims.IssuedAt, "IssuedAt should be set")
			assert.NotEmpty(t, claims.ExpiresAt, "ExpiresAt should be set")
		})
	}
}

func TestJWTService_ValidateToken(t *testing.T) {
	secret := "test-secret"
	svc := NewJWTService(secret, 1*time.Hour)
	validToken, err := svc.GenerateToken("user-456", "valid@example.com")
	require.NoError(t, err)

	anotherSvc := NewJWTService("different-secret", 1*time.Hour)

	tests := []struct {
		name      string
		token     string
		service   *JWTService
		wantErr   bool
		errSubstr string
	}{
		{
			name:    "valid token",
			token:   validToken,
			service: svc,
			wantErr: false,
		},
		{
			name:      "empty token",
			token:     "",
			service:   svc,
			wantErr:   true,
			errSubstr: "parse",
		},
		{
			name:      "malformed token",
			token:     "this.is.not.a.valid.jwt",
			service:   svc,
			wantErr:   true,
			errSubstr: "parse",
		},
		{
			name:      "garbage token",
			token:     "garbage-string-that-is-not-a-jwt",
			service:   svc,
			wantErr:   true,
			errSubstr: "parse",
		},
		{
			name:      "token signed with different secret",
			token:     validToken,
			service:   anotherSvc,
			wantErr:   true,
			errSubstr: "parse",
		},
		{
			name:      "token with invalid signature",
			token:     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalidsignature",
			service:   svc,
			wantErr:   true,
			errSubstr: "parse",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims, err := tt.service.ValidateToken(tt.token)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, claims)
				if tt.errSubstr != "" {
					assert.Contains(t, err.Error(), tt.errSubstr)
				}
				return
			}

			require.NoError(t, err)
			require.NotNil(t, claims)
			assert.Equal(t, "user-456", claims.UserID)
			assert.Equal(t, "valid@example.com", claims.Email)
		})
	}
}

func TestJWTService_ExpiredToken(t *testing.T) {
	svc := NewJWTService("test-secret", -1*time.Hour) // negative duration = already expired
	
	token, err := svc.GenerateToken("user-expired", "expired@example.com")
	require.NoError(t, err)

	// Validate with a service that has the same secret
	validateSvc := NewJWTService("test-secret", 1*time.Hour)
	claims, err := validateSvc.ValidateToken(token)
	assert.Error(t, err, "expired token should return error")
	assert.Contains(t, err.Error(), "parse", "error should mention parse issue (token is expired)")
	assert.Nil(t, claims)
}

func TestJWTService_TokenTampering(t *testing.T) {
	svc := NewJWTService("test-secret", 1*time.Hour)
	token, err := svc.GenerateToken("user-789", "tamper@example.com")
	require.NoError(t, err)

	// Tamper with the payload (second segment)
	parts := strings.Split(token, ".")
	require.Len(t, parts, 3)
	tamperedPayload := "eyJ0YW1wZXJlZCI6InRydWUifQ" // {"tampered": true}
	tamperedToken := parts[0] + "." + tamperedPayload + "." + parts[2]

	claims, err := svc.ValidateToken(tamperedToken)
	assert.Error(t, err, "tampered token should fail validation")
	assert.Contains(t, err.Error(), "parse", "tampered token should trigger parse error")
	assert.Nil(t, claims)
}

func TestJWTService_DifferentSigningMethod(t *testing.T) {
	// Create a token with a different signing method (none algorithm)
	token := jwt.NewWithClaims(jwt.SigningMethodNone, &Claims{
		UserID: "hacker",
		Email:  "hacker@example.com",
	})
	unsignedToken, err := token.SignedString(jwt.UnsafeAllowNoneSignatureType)
	require.NoError(t, err)

	svc := NewJWTService("test-secret", 1*time.Hour)
	claims, err := svc.ValidateToken(unsignedToken)
	assert.Error(t, err, "unsigned token should fail validation")
	assert.Contains(t, err.Error(), "unexpected signing method")
	assert.Nil(t, claims)
}

func TestJWTService_ValidateMultipleTimes(t *testing.T) {
	svc := NewJWTService("test-secret", 1*time.Hour)
	token, err := svc.GenerateToken("user-multi", "multi@example.com")
	require.NoError(t, err)

	// Validate the same token multiple times
	for i := 0; i < 5; i++ {
		claims, err := svc.ValidateToken(token)
		assert.NoError(t, err, "iteration %d", i)
		assert.NotNil(t, claims)
		assert.Equal(t, "user-multi", claims.UserID)
	}
}

func TestJWTService_EdgeCases(t *testing.T) {
	t.Run("very long secret", func(t *testing.T) {
		longSecret := strings.Repeat("x", 10000)
		svc := NewJWTService(longSecret, 1*time.Hour)
		token, err := svc.GenerateToken("user-1", "test@test.com")
		require.NoError(t, err)
		assert.NotEmpty(t, token)

		claims, err := svc.ValidateToken(token)
		assert.NoError(t, err)
		assert.NotNil(t, claims)
	})

	t.Run("zero duration", func(t *testing.T) {
		svc := NewJWTService("secret", 0)
		token, err := svc.GenerateToken("user-1", "test@test.com")
		require.NoError(t, err)
		assert.NotEmpty(t, token)

		// Token with zero duration might already be expired
		claims, err := svc.ValidateToken(token)
		if err != nil {
			t.Log("zero duration token may be expired at validation time")
		} else {
			assert.NotNil(t, claims)
		}
	})

	t.Run("very long user ID and email", func(t *testing.T) {
		svc := NewJWTService("secret", 1*time.Hour)
		longUserID := strings.Repeat("u", 5000)
		longEmail := strings.Repeat("e", 5000) + "@test.com"
		token, err := svc.GenerateToken(longUserID, longEmail)
		require.NoError(t, err)
		assert.NotEmpty(t, token)

		claims, err := svc.ValidateToken(token)
		assert.NoError(t, err)
		require.NotNil(t, claims)
		assert.Equal(t, longUserID, claims.UserID)
		assert.Equal(t, longEmail, claims.Email)
	})
}

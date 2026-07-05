package auth

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func TestPasswordService_Hash(t *testing.T) {
	tests := []struct {
		name     string
		password string
		cost     int
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "valid password",
			password: "securePassword123!",
			cost:     bcrypt.MinCost,
			wantErr:  false,
		},
		{
			name:     "empty password",
			password: "",
			cost:     bcrypt.MinCost,
			wantErr:  false,
		},
		{
			name:     "password at 72-byte limit",
			password: strings.Repeat("a", 72),
			cost:     bcrypt.MinCost,
			wantErr:  false,
		},
		{
			name:     "password exceeding 72 bytes",
			password: strings.Repeat("a", 100),
			cost:     bcrypt.MinCost,
			wantErr:  true,
			errMsg:   "bcrypt: password length exceeds 72 bytes",
		},
		{
			name:     "password with special characters",
			password: "p@ssw0rd!@#$%^&*()_+-=[]{}|;':\",./<>?",
			cost:     bcrypt.MinCost,
			wantErr:  false,
		},
		{
			name:     "unicode password",
			password: "パスワード🔐",
			cost:     bcrypt.MinCost,
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewPasswordService(tt.cost)
			hash, err := svc.Hash(tt.password)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
				assert.Empty(t, hash)
				return
			}

			require.NoError(t, err)
			assert.NotEmpty(t, hash, "hash should not be empty")
			assert.True(t, strings.HasPrefix(hash, "$2a$") || strings.HasPrefix(hash, "$2b$"),
				"hash should have bcrypt prefix, got: %s", hash)
		})
	}
}

func TestPasswordService_Verify(t *testing.T) {
	svc := NewPasswordService(bcrypt.MinCost)

	validPassword := "mySecureP@ss1"
	hash, err := svc.Hash(validPassword)
	require.NoError(t, err)

	tests := []struct {
		name     string
		password string
		hash     string
		wantOK   bool
	}{
		{
			name:     "correct password",
			password: validPassword,
			hash:     hash,
			wantOK:   true,
		},
		{
			name:     "wrong password",
			password: "wrongPassword",
			hash:     hash,
			wantOK:   false,
		},
		{
			name:     "empty password against hash",
			password: "",
			hash:     hash,
			wantOK:   false,
		},
		{
			name:     "password against empty hash",
			password: validPassword,
			hash:     "",
			wantOK:   false,
		},
		{
			name:     "empty password against empty hash",
			password: "",
			hash:     "",
			wantOK:   false,
		},
		{
			name:     "correct password against another user's hash",
			password: validPassword,
			hash:     func() string { h, _ := svc.Hash("someoneElsePass!"); return h }(),
			wantOK:   false,
		},
		{
			name:     "case sensitivity",
			password: strings.ToUpper(validPassword),
			hash:     hash,
			wantOK:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := svc.Verify(tt.password, tt.hash)
			assert.Equal(t, tt.wantOK, result)
		})
	}
}

func TestPasswordService_CostDefaults(t *testing.T) {
	t.Run("zero cost uses default", func(t *testing.T) {
		svc := NewPasswordService(0)
		assert.Equal(t, bcrypt.DefaultCost, svc.cost)
	})

	t.Run("negative cost uses default", func(t *testing.T) {
		svc := NewPasswordService(-5)
		assert.Equal(t, bcrypt.DefaultCost, svc.cost)
	})

	t.Run("min cost accepted", func(t *testing.T) {
		svc := NewPasswordService(bcrypt.MinCost)
		assert.Equal(t, bcrypt.MinCost, svc.cost)
	})

	t.Run("custom valid cost", func(t *testing.T) {
		svc := NewPasswordService(10)
		assert.Equal(t, 10, svc.cost)
	})
}

func TestPasswordService_HashUniqueness(t *testing.T) {
	svc := NewPasswordService(bcrypt.MinCost)
	password := "samePassword123"

	// Same password should produce different hashes (due to random salt)
	hash1, err := svc.Hash(password)
	require.NoError(t, err)

	hash2, err := svc.Hash(password)
	require.NoError(t, err)

	assert.NotEqual(t, hash1, hash2, "hashes should be unique due to random salt")

	// Both should verify correctly
	assert.True(t, svc.Verify(password, hash1))
	assert.True(t, svc.Verify(password, hash2))
}

func TestPasswordService_MultipleVerifications(t *testing.T) {
	svc := NewPasswordService(bcrypt.MinCost)
	password := "testPassword123!"
	hash, err := svc.Hash(password)
	require.NoError(t, err)

	for i := 0; i < 10; i++ {
		assert.True(t, svc.Verify(password, hash), "verification should succeed consistently (iteration %d)", i)
		assert.False(t, svc.Verify("wrong", hash), "wrong password should fail (iteration %d)", i)
	}
}

func TestPasswordService_EdgeCases(t *testing.T) {
	t.Run("password at 72-byte bcrypt limit", func(t *testing.T) {
		svc := NewPasswordService(bcrypt.MinCost)
		pass := strings.Repeat("a", 72)
		hash, err := svc.Hash(pass)
		require.NoError(t, err)
		assert.NotEmpty(t, hash)
		assert.True(t, svc.Verify(pass, hash))
	})

	t.Run("password exceeding 72 bytes returns error", func(t *testing.T) {
		svc := NewPasswordService(bcrypt.MinCost)
		pass := strings.Repeat("a", 1000)
		_, err := svc.Hash(pass)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "bcrypt: password length exceeds 72 bytes")
	})

	t.Run("password with null bytes", func(t *testing.T) {
		svc := NewPasswordService(bcrypt.MinCost)
		pass := "pass\x00word"
		hash, err := svc.Hash(pass)
		require.NoError(t, err)
		require.NotEmpty(t, hash)
		// bcrypt handles null bytes
		assert.True(t, svc.Verify(pass, hash))
	})

	t.Run("hash with invalid format", func(t *testing.T) {
		svc := NewPasswordService(bcrypt.MinCost)
		assert.False(t, svc.Verify("password", "not-a-bcrypt-hash"))
		assert.False(t, svc.Verify("password", "$2a$invalid"))
	})

	t.Run("hash from different cost", func(t *testing.T) {
		svc4 := NewPasswordService(4)
		svc6 := NewPasswordService(6)

		pass := "cross-cost-test"
		hash, err := svc4.Hash(pass)
		require.NoError(t, err)

		// Verification works regardless of cost
		assert.True(t, svc6.Verify(pass, hash))
	})
}

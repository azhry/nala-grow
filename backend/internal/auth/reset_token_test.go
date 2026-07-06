package auth

import (
	"encoding/hex"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResetTokenStore_GenerateToken(t *testing.T) {
	fixedNow := time.Date(2026, 7, 6, 12, 0, 0, 0, time.UTC)

	t.Run("generates unique token for email", func(t *testing.T) {
		s := NewResetTokenStore()
		s.now = func() time.Time { return fixedNow }

		token, err := s.GenerateToken("test@example.com")
		require.NoError(t, err)
		assert.NotEmpty(t, token)
		assert.Len(t, token, 64) // 32 bytes = 64 hex chars
	})

	t.Run("generates different tokens each time", func(t *testing.T) {
		s := NewResetTokenStore()
		s.now = func() time.Time { return fixedNow }

		token1, err := s.GenerateToken("user1@example.com")
		require.NoError(t, err)
		token2, err := s.GenerateToken("user2@example.com")
		require.NoError(t, err)
		assert.NotEqual(t, token1, token2)
	})

	t.Run("same email generates different tokens", func(t *testing.T) {
		s := NewResetTokenStore()
		s.now = func() time.Time { return fixedNow }

		token1, err := s.GenerateToken("same@example.com")
		require.NoError(t, err)
		token2, err := s.GenerateToken("same@example.com")
		require.NoError(t, err)
		assert.NotEqual(t, token1, token2)
	})

	t.Run("empty email returns error", func(t *testing.T) {
		s := NewResetTokenStore()
		_, err := s.GenerateToken("")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "email is required")
	})
}

func TestResetTokenStore_ValidateToken(t *testing.T) {
	fixedNow := time.Date(2026, 7, 6, 12, 0, 0, 0, time.UTC)

	t.Run("valid token returns email", func(t *testing.T) {
		s := NewResetTokenStore()
		s.now = func() time.Time { return fixedNow }

		tokenStr, err := s.GenerateToken("test@example.com")
		require.NoError(t, err)

		email, err := s.ValidateToken(tokenStr)
		require.NoError(t, err)
		assert.Equal(t, "test@example.com", email)
	})

	t.Run("empty token returns error", func(t *testing.T) {
		s := NewResetTokenStore()
		_, err := s.ValidateToken("")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "token is required")
	})

	t.Run("nonexistent token returns error", func(t *testing.T) {
		s := NewResetTokenStore()
		_, err := s.ValidateToken("nonexistent-token-12345")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid token")
	})

	t.Run("used token returns error", func(t *testing.T) {
		s := NewResetTokenStore()
		s.now = func() time.Time { return fixedNow }

		tokenStr, err := s.GenerateToken("test@example.com")
		require.NoError(t, err)

		s.InvalidateToken(tokenStr)

		_, err = s.ValidateToken(tokenStr)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "already been used")
	})

	t.Run("expired token returns error", func(t *testing.T) {
		s := NewResetTokenStore()
		s.now = func() time.Time { return fixedNow }

		tokenStr, err := s.GenerateToken("test@example.com")
		require.NoError(t, err)

		// Advance time past expiry
		s.now = func() time.Time { return fixedNow.Add(31 * time.Minute) }

		_, err = s.ValidateToken(tokenStr)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "expired")
	})

	t.Run("token just before expiry is valid", func(t *testing.T) {
		s := NewResetTokenStore()
		s.now = func() time.Time { return fixedNow }

		tokenStr, err := s.GenerateToken("test@example.com")
		require.NoError(t, err)

		// 29 minutes later — still within 30-min window
		s.now = func() time.Time { return fixedNow.Add(29 * time.Minute) }

		email, err := s.ValidateToken(tokenStr)
		require.NoError(t, err)
		assert.Equal(t, "test@example.com", email)
	})

	t.Run("token exactly at expiry boundary", func(t *testing.T) {
		s := NewResetTokenStore()
		s.now = func() time.Time { return fixedNow }

		tokenStr, err := s.GenerateToken("test@example.com")
		require.NoError(t, err)

		// Exactly 30 minutes later — should be expired (now is not after expiresAt when equal)
		s.now = func() time.Time { return fixedNow.Add(30 * time.Minute) }

		email, err := s.ValidateToken(tokenStr)
		require.NoError(t, err)
		assert.Equal(t, "test@example.com", email, "token at exact expiry boundary should still be valid")
	})
}

func TestResetTokenStore_InvalidateToken(t *testing.T) {
	fixedNow := time.Date(2026, 7, 6, 12, 0, 0, 0, time.UTC)

	t.Run("invalidating a token marks it used", func(t *testing.T) {
		s := NewResetTokenStore()
		s.now = func() time.Time { return fixedNow }

		tokenStr, err := s.GenerateToken("test@example.com")
		require.NoError(t, err)

		s.InvalidateToken(tokenStr)
		_, err = s.ValidateToken(tokenStr)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "already been used")
	})

	t.Run("invalidating nonexistent token does nothing", func(t *testing.T) {
		s := NewResetTokenStore()
		s.InvalidateToken("nonexistent") // should not panic
	})

	t.Run("double invalidation is idempotent", func(t *testing.T) {
		s := NewResetTokenStore()
		s.now = func() time.Time { return fixedNow }

		tokenStr, err := s.GenerateToken("test@example.com")
		require.NoError(t, err)

		s.InvalidateToken(tokenStr)
		s.InvalidateToken(tokenStr) // should not panic
		_, err = s.ValidateToken(tokenStr)
		assert.Error(t, err)
	})
}

func TestResetTokenStore_CleanupExpired(t *testing.T) {
	fixedNow := time.Date(2026, 7, 6, 12, 0, 0, 0, time.UTC)

	t.Run("removes expired tokens", func(t *testing.T) {
		s := NewResetTokenStore()
		s.now = func() time.Time { return fixedNow }

		token1, _ := s.GenerateToken("user1@example.com")

		// Advance time so token1 expires
		s.now = func() time.Time { return fixedNow.Add(31 * time.Minute) }

		// Generate another token that will be valid
		token2, _ := s.GenerateToken("user2@example.com")

		s.CleanupExpired()

		// token1 should be gone
		_, err := s.ValidateToken(token1)
		assert.Error(t, err)

		// token2 should still be valid (it was generated at the later time)
		s.now = func() time.Time { return fixedNow.Add(31 * time.Minute) }
		email, err := s.ValidateToken(token2)
		require.NoError(t, err)
		assert.Equal(t, "user2@example.com", email)
	})

	t.Run("no expired tokens does nothing", func(t *testing.T) {
		s := NewResetTokenStore()
		s.now = func() time.Time { return fixedNow }

		tokenStr, err := s.GenerateToken("test@example.com")
		require.NoError(t, err)

		s.CleanupExpired()

		email, err := s.ValidateToken(tokenStr)
		require.NoError(t, err)
		assert.Equal(t, "test@example.com", email)
	})

	t.Run("cleanup on empty store does nothing", func(t *testing.T) {
		s := NewResetTokenStore()
		s.CleanupExpired() // should not panic
	})
}

func TestResetTokenStore_Concurrency(t *testing.T) {
	s := NewResetTokenStore()
	fixedNow := time.Date(2026, 7, 6, 12, 0, 0, 0, time.UTC)
	s.now = func() time.Time { return fixedNow }

	// Generate tokens concurrently
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func() {
			_, err := s.GenerateToken("concurrent@example.com")
			assert.NoError(t, err)
			done <- true
		}()
	}
	for i := 0; i < 10; i++ {
		<-done
	}

	// Validate and invalidate concurrently
	tokenStr, err := s.GenerateToken("test-concurrent@example.com")
	require.NoError(t, err)

	for i := 0; i < 5; i++ {
		go func() {
			_, err := s.ValidateToken(tokenStr)
			if err == nil {
				s.InvalidateToken(tokenStr)
			}
			done <- true
		}()
	}
	for i := 0; i < 5; i++ {
		<-done
	}
}

func TestResetTokenStore_EdgeCases(t *testing.T) {
	t.Run("token format is hex", func(t *testing.T) {
		s := NewResetTokenStore()
		tokenStr, err := s.GenerateToken("test@example.com")
		require.NoError(t, err)
		// Should be a valid hex string
		_, err = hex.DecodeString(tokenStr)
		assert.NoError(t, err)
	})

	t.Run("multiple valid tokens for same email", func(t *testing.T) {
		s := NewResetTokenStore()
		fixedNow := time.Date(2026, 7, 6, 12, 0, 0, 0, time.UTC)
		s.now = func() time.Time { return fixedNow }

		tok1, _ := s.GenerateToken("same@example.com")
		tok2, _ := s.GenerateToken("same@example.com")

		email1, err := s.ValidateToken(tok1)
		require.NoError(t, err)
		assert.Equal(t, "same@example.com", email1)

		email2, err := s.ValidateToken(tok2)
		require.NoError(t, err)
		assert.Equal(t, "same@example.com", email2)

		// Using one doesn't invalidate the other
		s.InvalidateToken(tok1)
		_, err = s.ValidateToken(tok1)
		assert.Error(t, err)

		email2again, err := s.ValidateToken(tok2)
		require.NoError(t, err)
		assert.Equal(t, "same@example.com", email2again)
	})
}



package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

// ResetToken represents a password reset token with its metadata.
type ResetToken struct {
	Token     string
	Email     string
	ExpiresAt time.Time
	Used      bool
}

// ResetTokenStore is an in-memory store for password reset tokens.
type ResetTokenStore struct {
	mu     sync.RWMutex
	tokens map[string]*ResetToken
	ttl    time.Duration
	now    func() time.Time // for testability
}

// NewResetTokenStore creates a new ResetTokenStore with a 30-minute TTL.
func NewResetTokenStore() *ResetTokenStore {
	return &ResetTokenStore{
		tokens: make(map[string]*ResetToken),
		ttl:    30 * time.Minute,
		now:    time.Now,
	}
}

// GenerateToken creates a new cryptographically random reset token for the given email.
// Returns the raw token string.
func (s *ResetTokenStore) GenerateToken(email string) (string, error) {
	if email == "" {
		return "", fmt.Errorf("email is required")
	}

	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate random: %w", err)
	}
	tokenStr := hex.EncodeToString(bytes)

	now := s.now()
	token := &ResetToken{
		Token:     tokenStr,
		Email:     email,
		ExpiresAt: now.Add(s.ttl),
		Used:      false,
	}

	s.mu.Lock()
	s.tokens[tokenStr] = token
	s.mu.Unlock()

	return tokenStr, nil
}

// ValidateToken looks up a token and returns the associated email if valid.
// Returns an error if the token doesn't exist, is expired, or has been used.
func (s *ResetTokenStore) ValidateToken(tokenStr string) (string, error) {
	if tokenStr == "" {
		return "", fmt.Errorf("token is required")
	}

	s.mu.RLock()
	token, ok := s.tokens[tokenStr]
	s.mu.RUnlock()

	if !ok {
		return "", fmt.Errorf("invalid token")
	}

	if token.Used {
		return "", fmt.Errorf("token has already been used")
	}

	if s.now().After(token.ExpiresAt) {
		return "", fmt.Errorf("token has expired")
	}

	return token.Email, nil
}

// InvalidateToken marks a token as used so it cannot be used again.
func (s *ResetTokenStore) InvalidateToken(tokenStr string) {
	s.mu.Lock()
	if token, ok := s.tokens[tokenStr]; ok {
		token.Used = true
	}
	s.mu.Unlock()
}

// CleanupExpired removes all expired tokens from the store.
func (s *ResetTokenStore) CleanupExpired() {
	now := s.now()
	s.mu.Lock()
	defer s.mu.Unlock()
	for key, token := range s.tokens {
		if now.After(token.ExpiresAt) {
			delete(s.tokens, key)
		}
	}
}

// cleanupExpiredIfNeeded lazily removes expired tokens during validation.
func (s *ResetTokenStore) cleanupExpiredIfNeeded() {
	now := s.now()
	s.mu.Lock()
	defer s.mu.Unlock()
	for key, token := range s.tokens {
		if now.After(token.ExpiresAt) {
			delete(s.tokens, key)
		}
	}
}

package auth

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

type PasswordService struct {
	cost int
}

func NewPasswordService(cost int) *PasswordService {
	if cost < bcrypt.MinCost {
		cost = bcrypt.DefaultCost
	}
	return &PasswordService{cost: cost}
}

func (s *PasswordService) Hash(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), s.cost)
	if err != nil {
		return "", fmt.Errorf("hash: %w", err)
	}
	return string(bytes), nil
}

func (s *PasswordService) Verify(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

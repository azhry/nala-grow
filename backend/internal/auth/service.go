package auth

import (
	"time"

	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	JWT      *JWTService
	Password *PasswordService
}

type User struct {
	ID           string
	Email        string
	DisplayName  string
	PhotoURL     string
	PasswordHash string
	CreatedAt    string
}

type AuthResult struct {
	Token string
	User  User
}

func NewService(jwtSecret string) *Service {
	return &Service{
		JWT:      NewJWTService(jwtSecret, 24*time.Hour),
		Password: NewPasswordService(bcrypt.DefaultCost),
	}
}

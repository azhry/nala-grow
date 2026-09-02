package auth

import (
	"context"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	JWT      *JWTService
	Password *PasswordService
	Casdoor  *CasdoorClient
}

// Principal is the authenticated identity used by the API. Local JWTs and
// Casdoor access tokens are normalized into the same shape so GraphQL does
// not need provider-specific authorization branches.
type Principal struct {
	LocalUserID   string
	Issuer        string
	Subject       string
	Email         string
	DisplayName   string
	Owner         string
	Organization  string
	Roles         []string
	Permissions   []string
	IsAdmin       bool
	IsGlobalAdmin bool
	Local         bool
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

// NewServiceWithCasdoor keeps the local JWT path available for tests and
// local mode while enabling Casdoor only when its required configuration is
// present.
func NewServiceWithCasdoor(jwtSecret string, config CasdoorConfig) (*Service, error) {
	service := NewService(jwtSecret)
	client, err := NewCasdoorClient(config)
	if err != nil {
		return nil, err
	}
	service.Casdoor = client
	return service, nil
}

// Authenticate validates the configured bearer token and returns one
// provider-neutral principal. A configured Casdoor client is authoritative;
// invalid external tokens must not fall through to local JWT validation.
func (s *Service) Authenticate(ctx context.Context, rawToken string) (*Principal, error) {
	if s == nil || s.JWT == nil {
		return nil, fmt.Errorf("auth service unavailable")
	}
	if s.Casdoor != nil {
		casdoorPrincipal, err := s.Casdoor.ValidateAccessToken(ctx, rawToken)
		if err != nil {
			return nil, err
		}
		return &Principal{
			Issuer:        casdoorPrincipal.Issuer,
			Subject:       casdoorPrincipal.Subject,
			Email:         casdoorPrincipal.Email,
			DisplayName:   casdoorPrincipal.DisplayName,
			Owner:         casdoorPrincipal.Owner,
			Organization:  casdoorPrincipal.Organization,
			Roles:         append([]string(nil), casdoorPrincipal.Roles...),
			Permissions:   append([]string(nil), casdoorPrincipal.Permissions...),
			IsAdmin:       casdoorPrincipal.IsAdmin,
			IsGlobalAdmin: casdoorPrincipal.IsGlobalAdmin,
		}, nil
	}
	claims, err := s.JWT.ValidateToken(rawToken)
	if err != nil || claims == nil {
		return nil, fmt.Errorf("invalid local token")
	}
	return &Principal{
		LocalUserID: claims.UserID,
		Subject:     claims.UserID,
		Email:       claims.Email,
		Roles:       []string{"Parent"},
		Permissions: []string{"*"},
		Local:       true,
	}, nil
}

package graph

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func authenticatedUser(ctx context.Context, h *Handler) (string, ExecResult) {
	token, _ := ctx.Value("raw_token").(string)
	if token == "" {
		return "", ExecResult{Errors: []GraphQLError{{Message: "not authenticated"}}}
	}
	if h.auth == nil {
		return "", ExecResult{Errors: []GraphQLError{{Message: "not authenticated"}}}
	}
	claims, err := h.auth.JWT.ValidateToken(token)
	if err != nil || claims == nil {
		return "", ExecResult{Errors: []GraphQLError{{Message: "not authenticated"}}}
	}
	return claims.UserID, ExecResult{}
}

func loadUserByID(ctx context.Context, pool *pgxpool.Pool, id string) (storedUser, error) {
	var user storedUser
	err := pool.QueryRow(ctx, "SELECT email, password_hash, display_name FROM users WHERE id = $1", id).Scan(&user.Email, &user.PasswordHash, &user.DisplayName)
	return user, err
}

func loadUserByEmail(ctx context.Context, pool *pgxpool.Pool, email string) (string, storedUser, error) {
	var id string
	var user storedUser
	err := pool.QueryRow(ctx, "SELECT id::text, email, password_hash, display_name FROM users WHERE email = $1", email).Scan(&id, &user.Email, &user.PasswordHash, &user.DisplayName)
	return id, user, err
}

func authResult(operation, token, userID string, user storedUser) ExecResult {
	return ExecResult{Data: map[string]interface{}{operation: map[string]interface{}{
		"token": token,
		"user": map[string]interface{}{
			"id": userID, "email": user.Email, "displayName": user.DisplayName,
			"photoUrl": "", "createdAt": time.Now().UTC().Format(time.RFC3339),
		},
	}}}
}

package graph

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/azhry/nala-grow/backend/internal/auth"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func authenticatedUser(ctx context.Context, h *Handler) (string, ExecResult) {
	userID, _, result := authenticatedPrincipal(ctx, h)
	return userID, result
}

func authenticatedPrincipal(ctx context.Context, h *Handler) (string, *auth.Principal, ExecResult) {
	token, _ := ctx.Value("raw_token").(string)
	if token == "" {
		return "", nil, ExecResult{Errors: []GraphQLError{{Message: "not authenticated"}}}
	}
	if h.auth == nil {
		return "", nil, ExecResult{Errors: []GraphQLError{{Message: "not authenticated"}}}
	}
	principal, err := h.auth.Authenticate(ctx, token)
	if err != nil || principal == nil {
		return "", nil, ExecResult{Errors: []GraphQLError{{Message: "not authenticated"}}}
	}
	userID, _, err := ensurePrincipalUser(ctx, h, principal)
	if err != nil {
		return "", nil, ExecResult{Errors: []GraphQLError{{Message: "could not load authenticated user"}}}
	}
	return userID, principal, ExecResult{}
}

func loadUserByID(ctx context.Context, pool *pgxpool.Pool, id string) (storedUser, error) {
	var user storedUser
	err := pool.QueryRow(ctx, `SELECT email, COALESCE(password_hash, ''), display_name, photo_url,
		created_at::text, COALESCE(casdoor_subject, ''), casdoor_owner,
		COALESCE(roles, ARRAY[]::text[]), COALESCE(permissions, ARRAY[]::text[]), auth_provider
		FROM users WHERE id = $1`, id).Scan(
		&user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
		&user.CreatedAt, &user.CasdoorSubject, &user.CasdoorOwner,
		&user.Roles, &user.Permissions, &user.AuthProvider,
	)
	return user, err
}

func loadUserByEmail(ctx context.Context, pool *pgxpool.Pool, email string) (string, storedUser, error) {
	var id string
	var user storedUser
	err := pool.QueryRow(ctx, `SELECT id::text, email, COALESCE(password_hash, ''), display_name, photo_url,
		created_at::text, COALESCE(casdoor_subject, ''), casdoor_owner,
		COALESCE(roles, ARRAY[]::text[]), COALESCE(permissions, ARRAY[]::text[]), auth_provider
		FROM users WHERE email = $1`, email).Scan(
		&id, &user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
		&user.CreatedAt, &user.CasdoorSubject, &user.CasdoorOwner,
		&user.Roles, &user.Permissions, &user.AuthProvider,
	)
	return id, user, err
}

func ensurePrincipalUser(ctx context.Context, h *Handler, principal *auth.Principal) (string, storedUser, error) {
	if principal == nil {
		return "", storedUser{}, fmt.Errorf("principal is required")
	}
	if principal.Local {
		user, err := loadUserByID(ctx, h.db, principal.LocalUserID)
		return principal.LocalUserID, user, err
	}
	if h.db == nil || strings.TrimSpace(principal.Subject) == "" || strings.TrimSpace(principal.Email) == "" {
		return "", storedUser{}, fmt.Errorf("external identity is incomplete")
	}
	roles := append([]string(nil), principal.Roles...)
	if len(roles) == 0 {
		roles = []string{"Parent"}
	}
	permissions := append([]string(nil), principal.Permissions...)
	displayName := strings.TrimSpace(principal.DisplayName)
	if displayName == "" {
		displayName = strings.SplitN(principal.Email, "@", 2)[0]
	}

	tx, err := h.db.Begin(ctx)
	if err != nil {
		return "", storedUser{}, err
	}
	defer tx.Rollback(ctx)

	var userID string
	var user storedUser
	query := `SELECT id::text, email, COALESCE(password_hash, ''), display_name, photo_url,
		created_at::text, COALESCE(casdoor_subject, ''), casdoor_owner,
		COALESCE(roles, ARRAY[]::text[]), COALESCE(permissions, ARRAY[]::text[]), auth_provider
		FROM users WHERE casdoor_subject = $1 FOR UPDATE`
	err = tx.QueryRow(ctx, query, principal.Subject).Scan(
		&userID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
		&user.CreatedAt, &user.CasdoorSubject, &user.CasdoorOwner,
		&user.Roles, &user.Permissions, &user.AuthProvider,
	)
	if err == pgx.ErrNoRows {
		err = tx.QueryRow(ctx, queryForUserByEmail(), strings.ToLower(strings.TrimSpace(principal.Email))).Scan(
			&userID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
			&user.CreatedAt, &user.CasdoorSubject, &user.CasdoorOwner,
			&user.Roles, &user.Permissions, &user.AuthProvider,
		)
		if err == pgx.ErrNoRows {
			userID = uuid()
			err = tx.QueryRow(ctx, `INSERT INTO users
				(id, email, password_hash, display_name, casdoor_subject, casdoor_owner, roles, permissions, auth_provider)
				VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, 'casdoor')
				RETURNING email, '', display_name, photo_url, created_at::text,
					COALESCE(casdoor_subject, ''), casdoor_owner, roles, permissions, auth_provider`,
				userID, strings.ToLower(strings.TrimSpace(principal.Email)), displayName, principal.Subject,
				principal.Owner, roles, permissions).Scan(
				&user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
				&user.CreatedAt, &user.CasdoorSubject, &user.CasdoorOwner,
				&user.Roles, &user.Permissions, &user.AuthProvider,
			)
		} else if err == nil && user.CasdoorSubject != "" && user.CasdoorSubject != principal.Subject {
			return "", storedUser{}, fmt.Errorf("email is linked to another identity")
		}
	}
	if err != nil {
		return "", storedUser{}, err
	}
	err = tx.QueryRow(ctx, `UPDATE users SET casdoor_subject = $2, casdoor_owner = $3,
			roles = $4, permissions = $5, auth_provider = 'casdoor',
			display_name = CASE WHEN display_name = '' THEN $6 ELSE display_name END
			WHERE id = $1
			RETURNING email, COALESCE(password_hash, ''), display_name, photo_url, created_at::text,
				COALESCE(casdoor_subject, ''), casdoor_owner, roles, permissions, auth_provider`,
		userID, principal.Subject, principal.Owner, roles, permissions, displayName).Scan(
		&user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
		&user.CreatedAt, &user.CasdoorSubject, &user.CasdoorOwner,
		&user.Roles, &user.Permissions, &user.AuthProvider,
	)
	if err != nil {
		return "", storedUser{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return "", storedUser{}, err
	}
	return userID, user, nil
}

func principalToAuthPrincipal(principal *auth.CasdoorPrincipal) *auth.Principal {
	if principal == nil {
		return nil
	}
	return &auth.Principal{
		Subject:       principal.Subject,
		Email:         principal.Email,
		DisplayName:   principal.DisplayName,
		Owner:         principal.Owner,
		Organization:  principal.Organization,
		Roles:         append([]string(nil), principal.Roles...),
		Permissions:   append([]string(nil), principal.Permissions...),
		IsAdmin:       principal.IsAdmin,
		IsGlobalAdmin: principal.IsGlobalAdmin,
	}
}

func queryForUserByEmail() string {
	return `SELECT id::text, email, COALESCE(password_hash, ''), display_name, photo_url,
		created_at::text, COALESCE(casdoor_subject, ''), casdoor_owner,
		COALESCE(roles, ARRAY[]::text[]), COALESCE(permissions, ARRAY[]::text[]), auth_provider
		FROM users WHERE email = $1 FOR UPDATE`
}

func emailLocalPart(email string) string {
	parts := strings.SplitN(strings.TrimSpace(email), "@", 2)
	if parts[0] == "" {
		return "NalaGrow user"
	}
	return parts[0]
}

func authResult(operation, token, refreshToken string, expiresIn int, userID string, user storedUser) ExecResult {
	createdAt := user.CreatedAt
	if createdAt == "" {
		createdAt = time.Now().UTC().Format(time.RFC3339)
	}
	return ExecResult{Data: map[string]interface{}{operation: map[string]interface{}{
		"token": token, "refreshToken": refreshToken, "expiresIn": expiresIn,
		"user": map[string]interface{}{
			"id": userID, "email": user.Email, "displayName": user.DisplayName,
			"photoUrl": user.PhotoURL, "createdAt": createdAt,
			"subject": user.CasdoorSubject, "organization": user.CasdoorOwner,
			"casdoorSubject": user.CasdoorSubject, "casdoorOwner": user.CasdoorOwner,
			"roles": user.Roles, "permissions": user.Permissions, "authProvider": user.AuthProvider,
		},
	}}}
}

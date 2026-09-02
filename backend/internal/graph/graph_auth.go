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
	err := pool.QueryRow(ctx, userByIDQuery(), id).Scan(
		&user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
		&user.CreatedAt, &user.CasdoorSubject,
	)
	normalizeStoredUser(&user)
	return user, err
}

func loadUserByEmail(ctx context.Context, pool *pgxpool.Pool, email string) (string, storedUser, error) {
	var id string
	var user storedUser
	err := pool.QueryRow(ctx, userByEmailQuery(), email).Scan(
		&id, &user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
		&user.CreatedAt, &user.CasdoorSubject,
	)
	normalizeStoredUser(&user)
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
	issuer := strings.TrimRight(strings.TrimSpace(principal.Issuer), "/")
	if issuer == "" {
		return "", storedUser{}, fmt.Errorf("external identity issuer is required")
	}
	owner := strings.TrimSpace(principal.Owner)
	if owner == "" {
		owner = strings.TrimSpace(principal.Organization)
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
		created_at::text, casdoor_subject
		FROM users
		WHERE casdoor_subject = $1
		FOR UPDATE`
	err = tx.QueryRow(ctx, query, principal.Subject).Scan(
		&userID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
		&user.CreatedAt, &user.CasdoorSubject,
	)
	if err == pgx.ErrNoRows {
		err = tx.QueryRow(ctx, queryForUserByEmail(), strings.ToLower(strings.TrimSpace(principal.Email))).Scan(
			&userID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
			&user.CreatedAt, &user.CasdoorSubject,
		)
		if err == pgx.ErrNoRows {
			userID = uuid()
			unusableHash, hashErr := h.auth.Password.Hash(uuid() + uuid())
			if hashErr != nil {
				return "", storedUser{}, fmt.Errorf("generate unusable local password: %w", hashErr)
			}
			err = tx.QueryRow(ctx, `INSERT INTO users (id, email, password_hash, display_name, casdoor_subject)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING email, password_hash, display_name, photo_url, created_at::text, casdoor_subject`,
				userID, strings.ToLower(strings.TrimSpace(principal.Email)), unusableHash, displayName, principal.Subject).Scan(
				&user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
				&user.CreatedAt, &user.CasdoorSubject,
			)
		}
	}
	if err != nil {
		return "", storedUser{}, err
	}
	if user.CasdoorSubject != "" && user.CasdoorSubject != principal.Subject {
		return "", storedUser{}, fmt.Errorf("email is linked to another identity")
	}
	if user.DisplayName == "" {
		user.DisplayName = displayName
		if _, err := tx.Exec(ctx, "UPDATE users SET display_name = $2 WHERE id = $1", userID, displayName); err != nil {
			return "", storedUser{}, err
		}
	}
	if user.CasdoorSubject == "" {
		_, err = tx.Exec(ctx, `UPDATE users SET casdoor_subject = $2 WHERE id = $1`, userID, principal.Subject)
	}
	if err != nil {
		return "", storedUser{}, err
	}
	user.CasdoorSubject = principal.Subject
	user.CasdoorIssuer = issuer
	user.CasdoorOwner = owner
	user.Roles = roles
	user.Permissions = permissions
	user.AuthProvider = "casdoor"
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
		Issuer:        principal.Issuer,
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
	return userByEmailQuery() + ` FOR UPDATE OF u`
}

func userByIDQuery() string {
	return `SELECT u.email, COALESCE(u.password_hash, ''), u.display_name, u.photo_url,
		u.created_at::text, u.casdoor_subject FROM users u WHERE u.id = $1`
}

func userByEmailQuery() string {
	return `SELECT u.id::text, u.email, COALESCE(u.password_hash, ''), u.display_name, u.photo_url,
		u.created_at::text, u.casdoor_subject FROM users u WHERE lower(u.email) = lower($1)`
}

func normalizeStoredUser(user *storedUser) {
	if user.CasdoorSubject == "" {
		user.AuthProvider = "local"
		user.Roles = []string{"Parent"}
		user.Permissions = []string{"*"}
		return
	}
	user.AuthProvider = "casdoor"
	user.Roles = []string{"Parent"}
	user.Permissions = []string{"*"}
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
	user.CreatedAt = createdAt
	return ExecResult{Data: map[string]interface{}{operation: map[string]interface{}{
		"token": token, "refreshToken": refreshToken, "expiresIn": expiresIn,
		"user": authUserMap(userID, user, nil),
	}}}
}

func authUserMap(userID string, user storedUser, principal *auth.Principal) map[string]interface{} {
	if principal != nil {
		if principal.Local {
			user.CasdoorIssuer = ""
			user.CasdoorSubject = ""
			user.CasdoorOwner = ""
			user.Roles = []string{"Parent"}
			user.Permissions = []string{"*"}
			user.AuthProvider = "local"
		} else {
			user.CasdoorIssuer = principal.Issuer
			user.CasdoorSubject = principal.Subject
			user.CasdoorOwner = principal.Owner
			if user.CasdoorOwner == "" {
				user.CasdoorOwner = principal.Organization
			}
			user.Roles = append([]string(nil), principal.Roles...)
			user.Permissions = append([]string(nil), principal.Permissions...)
			user.AuthProvider = "casdoor"
		}
	}
	return map[string]interface{}{
		"id": userID, "email": user.Email, "displayName": user.DisplayName,
		"photoUrl": user.PhotoURL, "createdAt": user.CreatedAt,
		"subject": user.CasdoorSubject, "organization": user.CasdoorOwner,
		"casdoorSubject": user.CasdoorSubject, "casdoorOwner": user.CasdoorOwner,
		"roles": user.Roles, "permissions": user.Permissions, "authProvider": user.AuthProvider,
	}
}

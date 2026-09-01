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
		&user.CreatedAt, &user.CasdoorIssuer, &user.CasdoorSubject, &user.CasdoorOwner,
		&user.Roles, &user.Permissions, &user.AuthProvider,
	)
	return user, err
}

func loadUserByEmail(ctx context.Context, pool *pgxpool.Pool, email string) (string, storedUser, error) {
	var id string
	var user storedUser
	err := pool.QueryRow(ctx, userByEmailQuery(), email).Scan(
		&id, &user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
		&user.CreatedAt, &user.CasdoorIssuer, &user.CasdoorSubject, &user.CasdoorOwner,
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
	query := `SELECT u.id::text, u.email, COALESCE(u.password_hash, ''), u.display_name, u.photo_url,
		 u.created_at::text, identity.issuer, identity.subject, identity.owner,
		 COALESCE(identity.roles, ARRAY[]::text[]), COALESCE(identity.permissions, ARRAY[]::text[]), identity.provider
		FROM user_identities identity
		JOIN users u ON u.id = identity.user_id
		WHERE identity.provider = 'casdoor' AND identity.issuer = $1 AND identity.subject = $2
		FOR UPDATE OF u, identity`
	err = tx.QueryRow(ctx, query, issuer, principal.Subject).Scan(
		&userID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
		&user.CreatedAt, &user.CasdoorIssuer, &user.CasdoorSubject, &user.CasdoorOwner,
		&user.Roles, &user.Permissions, &user.AuthProvider,
	)
	if err == pgx.ErrNoRows {
		err = tx.QueryRow(ctx, queryForUserByEmail(), strings.ToLower(strings.TrimSpace(principal.Email))).Scan(
			&userID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
			&user.CreatedAt, &user.CasdoorIssuer, &user.CasdoorSubject, &user.CasdoorOwner,
			&user.Roles, &user.Permissions, &user.AuthProvider,
		)
		if err == pgx.ErrNoRows {
			userID = uuid()
			unusableHash, hashErr := h.auth.Password.Hash(uuid() + uuid())
			if hashErr != nil {
				return "", storedUser{}, fmt.Errorf("generate unusable local password: %w", hashErr)
			}
			err = tx.QueryRow(ctx, `INSERT INTO users (id, email, password_hash, display_name)
				VALUES ($1, $2, $3, $4)
				RETURNING email, password_hash, display_name, photo_url, created_at::text`,
				userID, strings.ToLower(strings.TrimSpace(principal.Email)), unusableHash, displayName).Scan(
				&user.Email, &user.PasswordHash, &user.DisplayName, &user.PhotoURL,
				&user.CreatedAt,
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
		_, err = tx.Exec(ctx, `INSERT INTO user_identities
			(user_id, provider, issuer, subject, owner, email, roles, permissions)
			VALUES ($1, 'casdoor', $2, $3, $4, $5, $6, $7)`,
			userID, issuer, principal.Subject, owner, strings.ToLower(strings.TrimSpace(principal.Email)), roles, permissions)
	} else if user.CasdoorIssuer == "legacy" {
		_, err = tx.Exec(ctx, `UPDATE user_identities
			SET issuer = $2, owner = $3, email = $4, roles = $5, permissions = $6, updated_at = NOW()
			WHERE user_id = $1 AND provider = 'casdoor' AND subject = $7`,
			userID, issuer, owner, strings.ToLower(strings.TrimSpace(principal.Email)), roles, permissions, principal.Subject)
	} else if user.CasdoorIssuer == issuer {
		_, err = tx.Exec(ctx, `UPDATE user_identities
			SET owner = $2, email = $3, roles = $4, permissions = $5, updated_at = NOW()
			WHERE user_id = $1 AND provider = 'casdoor' AND issuer = $6 AND subject = $7`,
			userID, owner, strings.ToLower(strings.TrimSpace(principal.Email)), roles, permissions, issuer, principal.Subject)
	} else {
		return "", storedUser{}, fmt.Errorf("email is linked to another identity issuer")
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
	return `SELECT ` + userColumns() + ` FROM users u
		LEFT JOIN LATERAL (
			SELECT subject, owner, roles, permissions, provider
			FROM user_identities
			WHERE user_id = u.id
			ORDER BY CASE WHEN provider = 'casdoor' THEN 0 ELSE 1 END, created_at
			LIMIT 1
		) identity ON TRUE WHERE u.id = $1`
}

func userByEmailQuery() string {
	return `SELECT u.id::text, ` + userColumns() + ` FROM users u
		LEFT JOIN LATERAL (
			SELECT subject, owner, roles, permissions, provider
			FROM user_identities
			WHERE user_id = u.id
			ORDER BY CASE WHEN provider = 'casdoor' THEN 0 ELSE 1 END, created_at
			LIMIT 1
		) identity ON TRUE WHERE lower(u.email) = lower($1)`
}

func userColumns() string {
	return `u.email, COALESCE(u.password_hash, ''), u.display_name, u.photo_url,
		u.created_at::text, COALESCE(identity.issuer, ''), COALESCE(identity.subject, ''), COALESCE(identity.owner, ''),
		COALESCE(identity.roles, ARRAY['Parent']::text[]),
		COALESCE(identity.permissions, ARRAY[]::text[]), COALESCE(identity.provider, 'local')`
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

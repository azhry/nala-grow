package graph

import (
	"testing"

	"github.com/azhry/nala-grow/backend/internal/auth"
	gouuid "github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestEnsurePrincipalUserPersistsCasdoorIdentityOnUser(t *testing.T) {
	userID := gouuid.NewString()
	_, err := testPool.Exec(t.Context(), `INSERT INTO users (id, email, password_hash, display_name)
		VALUES ($1, $2, $3, $4)`, userID, "identity-mapping@example.test", "legacy-hash", "")
	require.NoError(t, err)
	t.Cleanup(func() {
		_, _ = testPool.Exec(t.Context(), "DELETE FROM users WHERE id = $1", userID)
	})

	h := NewHandler(testPool, auth.NewService("identity-mapping-test"))
	principal := &auth.Principal{
		Issuer:      "https://casdoor.example.test",
		Subject:     "casdoor-user-1",
		Email:       "identity-mapping@example.test",
		DisplayName: "Mapped Parent",
		Owner:       "NalaGrow",
		Roles:       []string{"Parent"},
		Permissions: []string{"nala-grow-access"},
	}

	mappedID, mapped, err := ensurePrincipalUser(t.Context(), h, principal)
	require.NoError(t, err)
	require.Equal(t, userID, mappedID)
	require.Equal(t, "casdoor-user-1", mapped.CasdoorSubject)
	require.Equal(t, "NalaGrow", mapped.CasdoorOwner)

	var identityCount int
	err = testPool.QueryRow(t.Context(), `SELECT count(*) FROM users
		WHERE id = $1 AND casdoor_subject = $2`, userID, principal.Subject).Scan(&identityCount)
	require.NoError(t, err)
	require.Equal(t, 1, identityCount)
	var hasPasswordHash bool
	err = testPool.QueryRow(t.Context(), "SELECT password_hash IS NOT NULL FROM users WHERE id = $1", userID).Scan(&hasPasswordHash)
	require.NoError(t, err)
	require.False(t, hasPasswordHash, "linking a local profile to Casdoor must clear its local password hash")

	var directColumnCount int
	err = testPool.QueryRow(t.Context(), `SELECT count(*) FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'users'
		AND column_name = 'casdoor_subject'`).Scan(&directColumnCount)
	require.NoError(t, err)
	require.Equal(t, 1, directColumnCount)

	var identityTableCount int
	err = testPool.QueryRow(t.Context(), `SELECT count(*) FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = 'user_identities'`).Scan(&identityTableCount)
	require.NoError(t, err)
	require.Equal(t, 0, identityTableCount)

	principal.Roles = []string{"Admin"}
	principal.Permissions = []string{"nala-grow-access", "admin:read"}
	mappedID, mapped, err = ensurePrincipalUser(t.Context(), h, principal)
	require.NoError(t, err)
	require.Equal(t, userID, mappedID)
	require.Equal(t, []string{"Admin"}, mapped.Roles)
	require.Equal(t, []string{"nala-grow-access", "admin:read"}, mapped.Permissions)

	err = testPool.QueryRow(t.Context(), `SELECT count(*) FROM users
		WHERE id = $1 AND casdoor_subject = $2`, userID, principal.Subject).Scan(&identityCount)
	require.NoError(t, err)
	require.Equal(t, 1, identityCount)
}

func TestEnsurePrincipalUserCreatesCasdoorProfileWithoutPasswordHash(t *testing.T) {
	h := NewHandler(testPool, auth.NewService("identity-mapping-test"))
	principal := &auth.Principal{
		Issuer:      "https://casdoor.example.test",
		Subject:     "casdoor-user-new",
		Email:       "new-casdoor-user@example.test",
		DisplayName: "New Parent",
	}

	userID, mapped, err := ensurePrincipalUser(t.Context(), h, principal)
	require.NoError(t, err)
	t.Cleanup(func() {
		_, _ = testPool.Exec(t.Context(), "DELETE FROM users WHERE id = $1", userID)
	})
	require.Empty(t, mapped.PasswordHash)
	require.Equal(t, principal.Subject, mapped.CasdoorSubject)

	var hashIsNull bool
	err = testPool.QueryRow(t.Context(), "SELECT password_hash IS NULL FROM users WHERE id = $1", userID).Scan(&hashIsNull)
	require.NoError(t, err)
	require.True(t, hashIsNull, "new Casdoor profiles must not store a local password hash")
}

func TestGoogleLoginRequiresCasdoorWhenCasdoorIsConfigured(t *testing.T) {
	h := newTestHandler()
	h.auth.Casdoor = &auth.CasdoorClient{}

	result := h.resolveLoginWithGoogleResult(t.Context(), map[string]interface{}{"idToken": "not-verified"})
	require.Len(t, result.Errors, 1)
	require.Equal(t, "Google sign-in must use the Casdoor authorization flow", result.Errors[0].Message)
}

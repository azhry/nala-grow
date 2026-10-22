//go:build integration

package integration_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/azhry/nala-grow/backend/internal/testutil"
	"github.com/stretchr/testify/require"
)

func TestPostgresIntegration(t *testing.T) {
	harness := testutil.StartPostgres(t)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var usersBeforeSeed int
	err := harness.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&usersBeforeSeed)
	require.NoError(t, err)
	require.Zero(t, usersBeforeSeed, "a new integration database must start without fixture rows")

	seedCtx, seedCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer seedCancel()
	require.NoError(t, harness.SeedFile(seedCtx, filepath.Join("testdata", "seed.sql")))

	var (
		email    string
		babyName string
	)
	err = harness.Pool.QueryRow(ctx, `
		SELECT users.email, babies.name
		FROM users
		JOIN babies ON babies.user_id = users.id
	`).Scan(&email, &babyName)
	require.NoError(t, err)
	require.Equal(t, "integration@example.com", email)
	require.Equal(t, "Integration Baby", babyName)
}

func TestCasdoorPasswordHashMigrationIntegration(t *testing.T) {
	harness := testutil.StartPostgres(t)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	_, err := harness.Pool.Exec(ctx, `ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL`)
	require.NoError(t, err)

	_, err = harness.Pool.Exec(ctx, `
		INSERT INTO users (id, email, password_hash, display_name, casdoor_subject)
		VALUES
			('00000000-0000-0000-0000-000000000501', 'mapped@example.com', 'legacy-hash', 'Mapped', 'casdoor-subject-501'),
			('00000000-0000-0000-0000-000000000502', 'local@example.com', 'local-hash', 'Local', '')
	`)
	require.NoError(t, err)

	migration, err := os.ReadFile(filepath.Join("..", "internal", "db", "migrations", "009_allow_nullable_casdoor_password_hash.up.sql"))
	require.NoError(t, err)
	_, err = harness.Pool.Exec(ctx, string(migration))
	require.NoError(t, err)

	var nullable string
	err = harness.Pool.QueryRow(ctx, `
		SELECT is_nullable
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
	`).Scan(&nullable)
	require.NoError(t, err)
	require.Equal(t, "YES", nullable)

	var mappedHashIsNull, localHashPreserved bool
	err = harness.Pool.QueryRow(ctx, `
		SELECT
			(SELECT password_hash IS NULL FROM users WHERE id = $1),
			(SELECT password_hash = 'local-hash' FROM users WHERE id = $2)
	`, "00000000-0000-0000-0000-000000000501", "00000000-0000-0000-0000-000000000502").Scan(&mappedHashIsNull, &localHashPreserved)
	require.NoError(t, err)
	require.True(t, mappedHashIsNull, "Casdoor-linked profiles must not retain local password hashes")
	require.True(t, localHashPreserved, "unlinked local-mode profiles must retain their password_hash value")
}

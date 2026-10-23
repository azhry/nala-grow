//go:build integration

package integration_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/azhry/nala-grow/backend/internal/db"
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

func TestRunMigrationsFromLegacyCasdoorIdentityVersion(t *testing.T) {
	harness := testutil.StartPostgres(t)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	_, err := harness.Pool.Exec(ctx, `
		INSERT INTO users (id, email, password_hash, display_name, casdoor_subject)
		VALUES
			('00000000-0000-0000-0000-000000000601', 'mapped@example.com', 'legacy-hash', 'Mapped', 'casdoor-subject-601'),
			('00000000-0000-0000-0000-000000000602', 'local@example.com', 'local-hash', 'Local', '')
	`)
	require.NoError(t, err)

	_, err = harness.Pool.Exec(ctx, `
		CREATE TABLE user_identities (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			provider VARCHAR(32) NOT NULL,
			issuer TEXT NOT NULL,
			subject TEXT NOT NULL,
			owner TEXT NOT NULL DEFAULT '',
			email VARCHAR(255) NOT NULL DEFAULT '',
			roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
			permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT user_identities_provider_issuer_subject_key UNIQUE (provider, issuer, subject),
			CONSTRAINT user_identities_user_provider_issuer_key UNIQUE (user_id, provider, issuer)
		);
		INSERT INTO user_identities (user_id, provider, issuer, subject, email)
		VALUES ('00000000-0000-0000-0000-000000000601', 'casdoor', 'legacy', 'casdoor-subject-601', 'mapped@example.com');
		CREATE INDEX idx_user_identities_user_id ON user_identities(user_id);
		CREATE INDEX idx_user_identities_email ON user_identities(provider, issuer, email);
		ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
		UPDATE schema_migrations SET version = 7, dirty = false;
	`)
	require.NoError(t, err)

	require.NoError(t, db.RunMigrations(harness.DatabaseURL))

	var (
		version                  int
		dirty                    bool
		identityTableAbsent      bool
		mappedSubjectPreserved   bool
		mappedPasswordIsNull     bool
		localPasswordIsPreserved bool
	)
	err = harness.Pool.QueryRow(ctx, `
		SELECT version, dirty FROM schema_migrations
	`).Scan(&version, &dirty)
	require.NoError(t, err)
	err = harness.Pool.QueryRow(ctx, `
		SELECT to_regclass('public.user_identities') IS NULL,
		       (SELECT casdoor_subject = 'casdoor-subject-601' FROM users WHERE id = $1),
		       (SELECT password_hash IS NULL FROM users WHERE id = $1),
		       (SELECT password_hash = 'local-hash' FROM users WHERE id = $2)
	`, "00000000-0000-0000-0000-000000000601", "00000000-0000-0000-0000-000000000602").Scan(
		&identityTableAbsent,
		&mappedSubjectPreserved,
		&mappedPasswordIsNull,
		&localPasswordIsPreserved,
	)
	require.NoError(t, err)
	require.Equal(t, 9, version)
	require.False(t, dirty)
	require.True(t, identityTableAbsent, "legacy identity table must be removed")
	require.True(t, mappedSubjectPreserved, "Casdoor subject must remain on the user row")
	require.True(t, mappedPasswordIsNull, "Casdoor-linked profile must not retain a local password hash")
	require.True(t, localPasswordIsPreserved, "unlinked local-mode profile must retain its password hash")
}

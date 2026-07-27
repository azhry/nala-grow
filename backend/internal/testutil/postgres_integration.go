//go:build integration

package testutil

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/azhry/nala-grow/backend/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

const postgresImage = "postgres:16-alpine"

type PostgresHarness struct {
	DatabaseURL string
	Pool        *pgxpool.Pool
}

// StartPostgres creates a new PostgreSQL container, applies all migrations, and
// registers cleanup for both the connection pool and container.
func StartPostgres(t *testing.T) *PostgresHarness {
	t.Helper()

	startupCtx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	container, err := postgres.Run(
		startupCtx,
		postgresImage,
		postgres.WithDatabase("nalagrow_test"),
		postgres.WithUsername("nalagrow_test"),
		postgres.WithPassword("nalagrow_test"),
		postgres.BasicWaitStrategies(),
	)
	require.NoError(t, err)
	testcontainers.CleanupContainer(t, container)

	databaseURL, err := container.ConnectionString(startupCtx, "sslmode=disable")
	require.NoError(t, err)
	require.NoError(t, db.RunMigrations(databaseURL))

	pool, err := db.Connect(startupCtx, databaseURL)
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	return &PostgresHarness{
		DatabaseURL: databaseURL,
		Pool:        pool,
	}
}

// SeedFile executes a deterministic SQL fixture against the migrated database.
func (h *PostgresHarness) SeedFile(t *testing.T, path string) {
	t.Helper()

	seedSQL, err := os.ReadFile(path)
	require.NoError(t, err)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	tx, err := h.Pool.Begin(ctx)
	require.NoError(t, err)
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	_, err = tx.Exec(ctx, string(seedSQL))
	require.NoError(t, err)
	require.NoError(t, tx.Commit(ctx))
}

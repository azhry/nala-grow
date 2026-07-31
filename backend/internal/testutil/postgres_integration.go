package testutil

import (
	"context"
	"testing"

	"github.com/azhry/nala-grow/backend/internal/dbtest"
	"github.com/stretchr/testify/require"
)

type PostgresHarness = dbtest.Harness

// StartPostgres creates a new PostgreSQL container, applies all migrations, and
// registers cleanup for both the connection pool and container.
func StartPostgres(t *testing.T) *PostgresHarness {
	t.Helper()

	startupCtx, cancel := context.WithTimeout(context.Background(), dbtest.DefaultTimeout)
	defer cancel()

	harness, err := dbtest.Start(startupCtx)
	require.NoError(t, err)
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), dbtest.DefaultTimeout)
		defer cleanupCancel()
		require.NoError(t, harness.Close(cleanupCtx))
	})

	return harness
}

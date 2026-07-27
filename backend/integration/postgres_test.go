//go:build integration

package integration_test

import (
	"context"
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

	harness.SeedFile(t, filepath.Join("testdata", "seed.sql"))

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

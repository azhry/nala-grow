package testutil

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/azhry/nala-grow/backend/internal/db"
	"github.com/azhry/nala-grow/backend/internal/graph"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var smokePool *pgxpool.Pool

func TestMain(m *testing.M) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://nalagrow:nalagrow@localhost:5432/nalagrow?sslmode=disable"
	}
	if err := db.RunMigrations(databaseURL); err != nil {
		os.Exit(1)
	}
	pool, err := db.Connect(ctx, databaseURL)
	if err != nil {
		os.Exit(1)
	}
	smokePool = pool
	defer pool.Close()
	os.Exit(m.Run())
}

func TestGraphQLSmoke(t *testing.T) {
	handler := NewTestHandler(smokePool)
	require.NotNil(t, handler, "NewTestHandler should return a non-nil handler")

	result := ExecuteQuery(handler, "query { health }", nil)
	require.Empty(t, result.Errors, "health query should have no errors")
	require.NotNil(t, result.Data, "health query should return data")

	health, ok := result.Data["health"].(graph.HealthResult)
	require.True(t, ok, "health should be a graph.HealthResult")
	assert.Equal(t, true, health.OK, "health.OK should be true")
	assert.NotEmpty(t, health.Timestamp, "health.Timestamp should not be empty")
	assert.Equal(t, "0.1.0", health.Version, "health.Version should be 0.1.0")
}

func TestGraphQLUnknownQuery(t *testing.T) {
	handler := NewTestHandler(smokePool)
	result := ExecuteQuery(handler, "query { unknownField }", nil)
	require.NotEmpty(t, result.Errors, "unknown query should return errors")
	assert.True(t, HasError(result.Errors, "unknown query"), "should mention unknown query")
}

func TestNewTestHandler(t *testing.T) {
	h1 := NewTestHandler(smokePool)
	h2 := NewTestHandler(smokePool)
	assert.NotNil(t, h1)
	assert.NotNil(t, h2)
	// Each call should return a fresh handler with independent auth state
	assert.NotSame(t, h1, h2, "each call should return a new handler instance")
}

func TestHasError(t *testing.T) {
	errs := []graph.GraphQLError{
		{Message: "something went wrong"},
	}
	assert.True(t, HasError(errs, "went wrong"))
	assert.False(t, HasError(errs, "not found"))
	assert.False(t, HasError(nil, "anything"))
}

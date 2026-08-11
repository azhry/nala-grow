package testutil

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/azhry/nala-grow/backend/internal/dbtest"
	"github.com/azhry/nala-grow/backend/internal/graph"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var smokePool *pgxpool.Pool

func TestMain(m *testing.M) {
	ctx, cancel := context.WithTimeout(context.Background(), dbtest.DefaultTimeout)
	defer cancel()
	harness, err := dbtest.Start(ctx)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Testcontainers PostgreSQL is required for testutil tests:", err)
		os.Exit(1)
	}
	smokePool = harness.Pool
	code := m.Run()
	if err := harness.Close(ctx); err != nil {
		fmt.Fprintln(os.Stderr, "could not stop testutil PostgreSQL container:", err)
		if code == 0 {
			code = 1
		}
	}
	os.Exit(code)
}

func TestGraphQLSmoke(t *testing.T) {
	handler := NewTestHandler(smokePool)
	require.NotNil(t, handler, "NewTestHandler should return a non-nil handler")

	result := ExecuteQuery(handler, "query { health { ok timestamp version } }", nil)
	require.Empty(t, result.Errors, "health query should have no errors")
	require.NotNil(t, result.Data, "health query should return data")

	health, ok := result.Data["health"].(map[string]interface{})
	require.True(t, ok, "health should be a GraphQL object")
	assert.Equal(t, true, health["ok"], "health.ok should be true")
	assert.NotEmpty(t, health["timestamp"], "health.timestamp should not be empty")
	assert.Equal(t, "0.1.0", health["version"], "health.version should be 0.1.0")
}

func TestGraphQLUnknownQuery(t *testing.T) {
	handler := NewTestHandler(smokePool)
	result := ExecuteQuery(handler, "query { unknownField }", nil)
	require.NotEmpty(t, result.Errors, "unknown query should return errors")
	assert.True(t, HasError(result.Errors, "Cannot query field"), "should mention GraphQL validation")
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

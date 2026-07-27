//go:build integration

package integration_test

import (
	"context"
	"testing"
	"time"

	"github.com/azhry/nala-grow/backend/internal/auth"
	"github.com/azhry/nala-grow/backend/internal/graph"
	"github.com/azhry/nala-grow/backend/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestIntegrationFeedingFormFieldsPersistThroughGraphQL defines the database
// contract required by AZH-392. It is intentionally red until AZH-393 connects
// GraphQL feeding operations to PostgreSQL and adds these fields to the schema.
func TestIntegrationFeedingFormFieldsPersistThroughGraphQL(t *testing.T) {
	harness := testutil.StartPostgres(t)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	authService := auth.NewService("feeding-contract-test-secret")
	firstClient := graph.NewHandler(harness.Pool, authService)

	signup := firstClient.Execute(ctx, "mutation { signup }", map[string]interface{}{
		"email":       "feeding-contract@example.com",
		"password":    "pass123!",
		"displayName": "Feeding Contract",
	})
	require.Empty(t, signup.Errors)
	signupData := signup.Data.(map[string]interface{})["signup"].(map[string]interface{})
	token := signupData["token"].(string)
	userID := signupData["user"].(map[string]interface{})["id"].(string)
	authCtx := context.WithValue(ctx, "raw_token", token)

	babyResult := firstClient.Execute(authCtx, "mutation { createBaby }", map[string]interface{}{
		"name": "Contract Baby",
		"dob":  "2026-01-01",
		"sex":  "female",
	})
	require.Empty(t, babyResult.Errors)
	babyID := babyResult.Data.(map[string]interface{})["createBaby"].(map[string]interface{})["id"].(string)

	// The current handler keeps authentication and baby data in memory. Seed only
	// these prerequisites directly; the feeding record itself must be GraphQL-created.
	_, err := harness.Pool.Exec(ctx,
		"INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)",
		userID, "feeding-contract@example.com", "not-used-by-graphql", "Feeding Contract")
	require.NoError(t, err)
	_, err = harness.Pool.Exec(ctx,
		"INSERT INTO babies (id, user_id, name, dob, sex) VALUES ($1, $2, $3, $4, $5)",
		babyID, userID, "Contract Baby", "2026-01-01", "female")
	require.NoError(t, err)
	legacyID := "00000000-0000-4000-8000-000000000392"
	_, err = harness.Pool.Exec(ctx, `
		INSERT INTO feeding_sessions (id, baby_id, feed_type, started_at, notes)
		VALUES ($1, $2, 'bottle', '2026-07-27T07:00:00Z', 'legacy record without optional fields')`,
		legacyID, babyID)
	require.NoError(t, err)

	bottle := firstClient.Execute(authCtx, "mutation { createFeedingSession }", map[string]interface{}{
		"babyId":      babyID,
		"feedType":    "bottle",
		"startedAt":   "2026-07-28T08:30:00Z",
		"amountMl":    120.0,
		"milkType":    "formula",
		"temperature": "warm",
	})
	require.Empty(t, bottle.Errors)
	bottleRecord := bottle.Data.(map[string]interface{})["createFeedingSession"].(map[string]interface{})
	bottleID := bottleRecord["id"].(string)
	assert.Equal(t, "warm", bottleRecord["temperature"], "bottle temperature must be returned by create")

	solids := firstClient.Execute(authCtx, "mutation { createFeedingSession }", map[string]interface{}{
		"babyId":       babyID,
		"feedType":     "solids",
		"startedAt":    "2026-07-28T12:15:00Z",
		"foodName":     "Avocado",
		"quantity":     3.0,
		"quantityUnit": "tbsp",
	})
	require.Empty(t, solids.Errors)
	solidsRecord := solids.Data.(map[string]interface{})["createFeedingSession"].(map[string]interface{})
	solidsID := solidsRecord["id"].(string)
	assert.Equal(t, 3.0, solidsRecord["quantity"], "solids quantity must be returned by create")
	assert.Equal(t, "tbsp", solidsRecord["quantityUnit"], "solids quantity unit must be returned by create")
	assert.Equal(t, "2026-07-28T12:15:00Z", solidsRecord["startedAt"], "selected solids time maps to startedAt")

	var persistedRows int
	err = harness.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM feeding_sessions WHERE baby_id = $1", babyID).Scan(&persistedRows)
	require.NoError(t, err)
	assert.Equal(t, 3, persistedRows, "GraphQL creates must persist feeding rows alongside existing records")

	// A fresh handler represents a reload boundary and must read from PostgreSQL,
	// not a process-local map populated by the create request.
	reloadedClient := graph.NewHandler(harness.Pool, authService)
	reloaded := reloadedClient.Execute(authCtx, "query { feedingSessions }", map[string]interface{}{"babyId": babyID})
	require.Empty(t, reloaded.Errors)
	feeds := reloaded.Data.(map[string]interface{})["feedingSessions"].([]map[string]interface{})
	require.Len(t, feeds, 3)

	byID := map[string]map[string]interface{}{}
	for _, feed := range feeds {
		byID[feed["id"].(string)] = feed
	}
	assert.Contains(t, byID, legacyID, "existing rows without new optional values must remain readable")
	assert.Equal(t, "warm", byID[bottleID]["temperature"], "bottle temperature must survive reload")
	assert.Equal(t, 3.0, byID[solidsID]["quantity"], "solids quantity must survive reload")
	assert.Equal(t, "tbsp", byID[solidsID]["quantityUnit"], "solids quantity unit must survive reload")
	assert.Equal(t, "2026-07-28T12:15:00Z", byID[solidsID]["startedAt"], "selected solids time must survive reload")
}

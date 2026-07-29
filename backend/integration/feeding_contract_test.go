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

	bottleIDs := map[string]string{}
	for _, temperature := range []string{"cold", "room", "warm"} {
		bottle := firstClient.Execute(authCtx, "mutation { createFeedingSession }", map[string]interface{}{
			"babyId":      babyID,
			"feedType":    "bottle",
			"startedAt":   "2026-07-28T08:30:00Z",
			"amountMl":    120.0,
			"milkType":    "formula",
			"temperature": temperature,
		})
		require.Empty(t, bottle.Errors)
		bottleRecord := bottle.Data.(map[string]interface{})["createFeedingSession"].(map[string]interface{})
		bottleIDs[temperature] = bottleRecord["id"].(string)
		assert.Equal(t, temperature, bottleRecord["temperature"], "%s bottle temperature must be returned by create", temperature)
	}

	defaultStartedAt := firstClient.Execute(authCtx, "mutation { createFeedingSession }", map[string]interface{}{
		"babyId":   babyID,
		"feedType": "bottle",
	})
	require.Empty(t, defaultStartedAt.Errors)
	defaultStartedAtRecord := defaultStartedAt.Data.(map[string]interface{})["createFeedingSession"].(map[string]interface{})
	assert.NotEmpty(t, defaultStartedAtRecord["startedAt"], "omitting startedAt must use a server timestamp")

	type solidsCase struct {
		quantity     float64
		quantityUnit string
		startedAt    string
	}
	solidsCases := []solidsCase{
		{quantity: 0, quantityUnit: "tbsp", startedAt: "2026-07-28T12:00:00Z"},
		{quantity: 0.5, quantityUnit: "oz", startedAt: "2026-07-28T12:15:00Z"},
		{quantity: 125, quantityUnit: "g", startedAt: "2026-07-28T12:30:00Z"},
	}
	solidsIDs := make([]string, 0, len(solidsCases))
	for _, testCase := range solidsCases {
		solids := firstClient.Execute(authCtx, "mutation { createFeedingSession }", map[string]interface{}{
			"babyId":       babyID,
			"feedType":     "solids",
			"startedAt":    testCase.startedAt,
			"foodName":     "Avocado",
			"quantity":     testCase.quantity,
			"quantityUnit": testCase.quantityUnit,
		})
		require.Empty(t, solids.Errors)
		solidsRecord := solids.Data.(map[string]interface{})["createFeedingSession"].(map[string]interface{})
		solidsIDs = append(solidsIDs, solidsRecord["id"].(string))
		assert.Equal(t, testCase.quantity, solidsRecord["quantity"], "%s quantity must be returned by create", testCase.quantityUnit)
		assert.Equal(t, testCase.quantityUnit, solidsRecord["quantityUnit"], "solids quantity unit must be returned by create")
		assert.Equal(t, testCase.startedAt, solidsRecord["startedAt"], "selected solids time maps to startedAt")
	}

	var persistedRows int
	err = harness.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM feeding_sessions WHERE baby_id = $1", babyID).Scan(&persistedRows)
	require.NoError(t, err)
	assert.Equal(t, 8, persistedRows, "GraphQL creates must persist all field variants alongside existing records")

	otherBabyResult := firstClient.Execute(authCtx, "mutation { createBaby }", map[string]interface{}{
		"name": "Other Baby",
		"dob":  "2026-01-02",
		"sex":  "male",
	})
	require.Empty(t, otherBabyResult.Errors)
	otherBabyID := otherBabyResult.Data.(map[string]interface{})["createBaby"].(map[string]interface{})["id"].(string)
	_, err = harness.Pool.Exec(ctx,
		"INSERT INTO babies (id, user_id, name, dob, sex) VALUES ($1, $2, $3, $4, $5)",
		otherBabyID, userID, "Other Baby", "2026-01-02", "male")
	require.NoError(t, err)
	otherFeedID := "00000000-0000-4000-8000-000000000393"
	_, err = harness.Pool.Exec(ctx, `
		INSERT INTO feeding_sessions (id, baby_id, feed_type, started_at, notes)
		VALUES ($1, $2, 'solids', '2026-07-28T13:00:00Z', 'must not leak into another baby')`,
		otherFeedID, otherBabyID)
	require.NoError(t, err)

	// A fresh handler represents a reload boundary and must read from PostgreSQL,
	// not a process-local map populated by the create request.
	reloadedClient := graph.NewHandler(harness.Pool, authService)
	reloaded := reloadedClient.Execute(authCtx, "query { feedingSessions }", map[string]interface{}{"babyId": babyID})
	require.Empty(t, reloaded.Errors)
	feeds := reloaded.Data.(map[string]interface{})["feedingSessions"].([]map[string]interface{})
	require.Len(t, feeds, 8)

	byID := map[string]map[string]interface{}{}
	for _, feed := range feeds {
		byID[feed["id"].(string)] = feed
	}
	assert.Contains(t, byID, legacyID, "existing rows without new optional values must remain readable")
	assert.NotContains(t, byID, otherFeedID, "a feeding record must not leak across babies")
	assert.Nil(t, byID[legacyID]["temperature"], "legacy missing temperature must remain null")
	assert.Nil(t, byID[legacyID]["quantity"], "legacy missing quantity must remain null")
	assert.Nil(t, byID[legacyID]["quantityUnit"], "legacy missing quantity unit must remain null")
	for temperature, bottleID := range bottleIDs {
		assert.Equal(t, temperature, byID[bottleID]["temperature"], "%s bottle temperature must survive reload", temperature)
	}
	for index, testCase := range solidsCases {
		solids := byID[solidsIDs[index]]
		assert.Equal(t, testCase.quantity, solids["quantity"], "%s quantity must survive reload", testCase.quantityUnit)
		assert.Equal(t, testCase.quantityUnit, solids["quantityUnit"], "solids quantity unit must survive reload")
		assert.Equal(t, testCase.startedAt, solids["startedAt"], "selected solids time must survive reload")
	}
}

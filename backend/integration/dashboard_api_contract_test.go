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

// TestIntegrationDashboardQueriesReadPersistedActiveBabyData is the intentionally
// red contract for AZH-395. The care records are inserted only in PostgreSQL,
// then read through a new GraphQL handler. It must not be made green by adding
// records to the handler's process-local maps.
func TestIntegrationDashboardQueriesReadPersistedActiveBabyData(t *testing.T) {
	harness := testutil.StartPostgres(t)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var usersBeforeSeed int
	require.NoError(t, harness.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&usersBeforeSeed))
	require.Zero(t, usersBeforeSeed, "a fresh dashboard-contract database must be empty before seeding")

	authService := auth.NewService("dashboard-api-contract-test-secret")
	client := graph.NewHandler(harness.Pool, authService)

	ownerToken, ownerID := signupContractUser(t, ctx, client, "dashboard-owner@example.com", "Dashboard Owner")
	otherToken, otherID := signupContractUser(t, ctx, client, "dashboard-other@example.com", "Dashboard Other")
	ownerCtx := context.WithValue(ctx, "raw_token", ownerToken)
	otherCtx := context.WithValue(ctx, "raw_token", otherToken)

	// The current handler needs its own baby map for authorization. These calls
	// establish that prerequisite only; every care record below is PostgreSQL-only.
	activeBabyID := createContractBaby(t, ownerCtx, client, "Dashboard Baby")
	emptyBabyID := createContractBaby(t, ownerCtx, client, "Empty Dashboard Baby")
	otherBabyID := createContractBaby(t, otherCtx, client, "Other Dashboard Baby")

	seedDashboardContractRows(t, ctx, harness, ownerID, otherID, activeBabyID, emptyBabyID, otherBabyID)

	// Constructing a new handler establishes the reload boundary: successful
	// queries must be served from PostgreSQL rather than request-local state.
	reloaded := graph.NewHandler(harness.Pool, authService)

	feeds := executeDashboardList(t, ownerCtx, reloaded, "feedingSessions", activeBabyID)
	assert.Equal(t,
		[]string{"00000000-0000-4000-8000-000000000942", "00000000-0000-4000-8000-000000000941"},
		contractIDs(feeds),
		"persisted feeding timestamps must produce newest-first dashboard activity and exclude another baby's record",
	)
	assert.NotContains(t, contractIDs(feeds), "00000000-0000-4000-8000-000000000943", "another user's feeding record must not appear")

	sleeps := executeDashboardList(t, ownerCtx, reloaded, "sleepSessions", activeBabyID)
	assert.Equal(t,
		[]string{"00000000-0000-4000-8000-000000000952", "00000000-0000-4000-8000-000000000951"},
		contractIDs(sleeps),
		"persisted sleep timestamps must produce newest-first dashboard activity and exclude another baby's record",
	)
	assert.NotContains(t, contractIDs(sleeps), "00000000-0000-4000-8000-000000000953", "another user's sleep record must not appear")

	measurements := executeDashboardList(t, ownerCtx, reloaded, "measurements", activeBabyID)
	assert.Equal(t,
		[]string{"00000000-0000-4000-8000-000000000962", "00000000-0000-4000-8000-000000000961"},
		contractIDs(measurements),
		"persisted measurement dates must select the latest dashboard growth record and exclude another baby's record",
	)
	assert.NotContains(t, contractIDs(measurements), "00000000-0000-4000-8000-000000000963", "another user's measurement must not appear")

	assert.Empty(t, executeDashboardList(t, ownerCtx, reloaded, "feedingSessions", emptyBabyID), "a baby without persisted feeds must have an honest empty result")
	assert.Empty(t, executeDashboardList(t, ownerCtx, reloaded, "sleepSessions", emptyBabyID), "a baby without persisted sleeps must have an honest empty result")
	assert.Empty(t, executeDashboardList(t, ownerCtx, reloaded, "measurements", emptyBabyID), "a baby without persisted measurements must have an honest empty result")
}

func signupContractUser(t *testing.T, ctx context.Context, client *graph.Handler, email, displayName string) (string, string) {
	t.Helper()
	result := client.Execute(ctx, "mutation { signup }", map[string]interface{}{
		"email": email, "password": "pass123!", "displayName": displayName,
	})
	require.Empty(t, result.Errors)
	signup := result.Data.(map[string]interface{})["signup"].(map[string]interface{})
	return signup["token"].(string), signup["user"].(map[string]interface{})["id"].(string)
}

func createContractBaby(t *testing.T, ctx context.Context, client *graph.Handler, name string) string {
	t.Helper()
	result := client.Execute(ctx, "mutation { createBaby }", map[string]interface{}{
		"name": name, "dob": "2026-01-01", "sex": "female",
	})
	require.Empty(t, result.Errors)
	return result.Data.(map[string]interface{})["createBaby"].(map[string]interface{})["id"].(string)
}

func seedDashboardContractRows(t *testing.T, ctx context.Context, harness *testutil.PostgresHarness, ownerID, otherID, activeBabyID, emptyBabyID, otherBabyID string) {
	t.Helper()
	_, err := harness.Pool.Exec(ctx, `INSERT INTO users (id, email, password_hash, display_name) VALUES
		($1, 'dashboard-owner@example.com', 'not-used-by-graphql', 'Dashboard Owner'),
		($2, 'dashboard-other@example.com', 'not-used-by-graphql', 'Dashboard Other')`, ownerID, otherID)
	require.NoError(t, err)
	_, err = harness.Pool.Exec(ctx, `INSERT INTO babies (id, user_id, name, dob, sex) VALUES
		($1, $2, 'Dashboard Baby', '2026-01-01', 'female'),
		($3, $2, 'Empty Dashboard Baby', '2026-01-01', 'female'),
		($4, $5, 'Other Dashboard Baby', '2026-01-01', 'female')`, activeBabyID, ownerID, emptyBabyID, otherBabyID, otherID)
	require.NoError(t, err)

	_, err = harness.Pool.Exec(ctx, `INSERT INTO feeding_sessions (id, baby_id, feed_type, started_at, amount_ml) VALUES
		('00000000-0000-4000-8000-000000000941', $1, 'bottle', '2026-07-28T08:00:00Z', 90),
		('00000000-0000-4000-8000-000000000942', $1, 'bottle', '2026-07-28T10:00:00Z', 120),
		('00000000-0000-4000-8000-000000000943', $2, 'bottle', '2026-07-28T11:00:00Z', 150)`, activeBabyID, otherBabyID)
	require.NoError(t, err)
	_, err = harness.Pool.Exec(ctx, `INSERT INTO sleep_sessions (id, baby_id, started_at, ended_at, location) VALUES
		('00000000-0000-4000-8000-000000000951', $1, '2026-07-28T06:00:00Z', '2026-07-28T07:00:00Z', 'crib'),
		('00000000-0000-4000-8000-000000000952', $1, '2026-07-28T12:00:00Z', '2026-07-28T13:30:00Z', 'bed'),
		('00000000-0000-4000-8000-000000000953', $2, '2026-07-28T14:00:00Z', '2026-07-28T15:00:00Z', 'carrier')`, activeBabyID, otherBabyID)
	require.NoError(t, err)
	_, err = harness.Pool.Exec(ctx, `INSERT INTO measurements (id, baby_id, type, value, unit, date) VALUES
		('00000000-0000-4000-8000-000000000961', $1, 'weight', 7.10, 'metric', '2026-07-01'),
		('00000000-0000-4000-8000-000000000962', $1, 'weight', 7.35, 'metric', '2026-07-28'),
		('00000000-0000-4000-8000-000000000963', $2, 'weight', 9.99, 'metric', '2026-07-29')`, activeBabyID, otherBabyID)
	require.NoError(t, err)
}

func executeDashboardList(t *testing.T, ctx context.Context, client *graph.Handler, operation, babyID string) []map[string]interface{} {
	t.Helper()
	result := client.Execute(ctx, "query { "+operation+" }", map[string]interface{}{"babyId": babyID})
	require.Empty(t, result.Errors)
	return result.Data.(map[string]interface{})[operation].([]map[string]interface{})
}

func contractIDs(records []map[string]interface{}) []string {
	ids := make([]string, 0, len(records))
	for _, record := range records {
		ids = append(ids, record["id"].(string))
	}
	return ids
}

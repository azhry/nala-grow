package graph

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExport_CSV(t *testing.T) {
	t.Run("export CSV with all data types", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "exp1@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Mia", "2026-01-01", "female")

		// Create feeding session
		h.Execute(ctx, "mutation { createFeedingSession }", map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"feedType":  "bottle",
				"startedAt": "2026-03-15T10:00:00Z",
				"amountMl":  120.0,
			},
		})
		// Create sleep session
		h.Execute(ctx, "mutation { createSleepSession }", map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"startedAt": "2026-03-15T21:00:00Z",
				"endedAt":   "2026-03-16T06:00:00Z",
			},
		})
		// Create measurement
		h.Execute(ctx, "mutation { createMeasurement }", map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
				"date":   "2026-03-15",
				"weight": 6.5,
			},
		})
		// Create milestone
		h.Execute(ctx, "mutation { createMilestone }", map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
				"title":  "First smile",
			},
		})

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":   babyID,
				"dateFrom": "2026-03-01",
				"dateTo":   "2026-03-31",
			},
		}
		result := h.Execute(ctx, "query { exportCSV }", vars)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		csv, ok := data["exportCSV"].(string)
		require.True(t, ok, "exportCSV should return a string")

		assert.Contains(t, csv, "Mia")
		assert.Contains(t, csv, "Feed Type")
		assert.Contains(t, csv, "bottle")
		assert.Contains(t, csv, "120")
		assert.Contains(t, csv, "Sleep Location")
		assert.Contains(t, csv, "crib")
		assert.Contains(t, csv, "Date")
		assert.Contains(t, csv, "6.5")
		assert.Contains(t, csv, "Title")
		assert.Contains(t, csv, "First smile")
	})

	t.Run("export CSV respects date range", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "exp2@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Noah", "2026-02-01", "male")

		// Outside date range
		h.Execute(ctx, "mutation { createFeedingSession }", map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"feedType":  "bottle",
				"startedAt": "2026-01-01T10:00:00Z",
			},
		})
		// Inside date range
		h.Execute(ctx, "mutation { createFeedingSession }", map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"feedType":  "breast",
				"startedAt": "2026-03-15T10:00:00Z",
			},
		})

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":   babyID,
				"dateFrom": "2026-03-01",
				"dateTo":   "2026-03-31",
			},
		}
		result := h.Execute(ctx, "query { exportCSV }", vars)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		csv, _ := data["exportCSV"].(string)

		assert.NotContains(t, csv, "bottle", "bottle feeding outside range should be excluded")
		assert.Contains(t, csv, "breast", "breast feeding inside range should be included")
	})

	t.Run("export CSV requires authentication", func(t *testing.T) {
		h := newTestHandler()
		result := h.Execute(context.Background(), "query { exportCSV }", map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": "some-baby",
			},
		})
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})

	t.Run("export CSV requires babyId", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "exp3@example.com", "pass123!")
		ctx := authCtx(token)

		result := h.Execute(ctx, "query { exportCSV }", nil)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "babyId required")
	})

	t.Run("export CSV for another user's baby", func(t *testing.T) {
		h := newTestHandler()
		token1, _ := signupAndLogin(t, h, "exp4a@example.com", "pass123!")
		ctx1 := authCtx(token1)
		babyID := createBabyHelper(t, h, ctx1, "AliceJr", "2026-03-01", "female")

		token2, _ := signupAndLogin(t, h, "exp4b@example.com", "pass123!")
		ctx2 := authCtx(token2)

		result := h.Execute(ctx2, "query { exportCSV }", map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
			},
		})
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestExport_CSVWrites(t *testing.T) {
	t.Run("CSV contains correct headers", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "exp5@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Baby", "2026-01-01", "male")

		result := h.Execute(ctx, "query { exportCSV }", map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
			},
		})
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		csv, _ := data["exportCSV"].(string)

		lines := strings.Split(strings.TrimSpace(csv), "\n")
		hasFeedHeader := false
		hasSleepHeader := false
		hasGrowthHeader := false
		hasMilestoneHeader := false
		for _, line := range lines {
			if strings.Contains(line, "Feed Type") {
				hasFeedHeader = true
			}
			if strings.Contains(line, "Sleep Location") {
				hasSleepHeader = true
			}
			if strings.Contains(line, "Weight") {
				hasGrowthHeader = true
			}
			if strings.Contains(line, "Category") {
				hasMilestoneHeader = true
			}
		}
		assert.True(t, hasFeedHeader, "CSV should have feeding section header")
		assert.True(t, hasSleepHeader, "CSV should have sleep section header")
		assert.True(t, hasGrowthHeader, "CSV should have growth section header")
		assert.True(t, hasMilestoneHeader, "CSV should have milestones section header")
	})
}

func TestExport_Data(t *testing.T) {
	t.Run("export data returns structured JSON", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "exp6@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Emma", "2026-04-01", "female")

		h.Execute(ctx, "mutation { createFeedingSession }", map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"feedType":  "breast",
				"startedAt": "2026-06-01T10:00:00Z",
			},
		})

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":   babyID,
				"dateFrom": "2026-06-01",
				"dateTo":   "2026-06-30",
			},
		}
		result := h.Execute(ctx, "query { exportData }", vars)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		ed, ok := data["exportData"].(map[string]interface{})
		require.True(t, ok, "exportData should return an object")
		assert.Equal(t, "Emma", ed["babyName"])
		assert.Equal(t, "2026-04-01", ed["babyDob"])
		assert.NotEmpty(t, ed["feedSessions"])
	})
}

func TestExport_EmptyData(t *testing.T) {
	t.Run("export CSV with no data", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "exp7@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Empty", "2026-01-01", "female")

		result := h.Execute(ctx, "query { exportCSV }", map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
			},
		})
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		csv, _ := data["exportCSV"].(string)
		assert.Contains(t, csv, "Empty")
		assert.Contains(t, csv, "No records found")
	})

	t.Run("export data with no records", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "exp8@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "NoData", "2026-01-01", "male")

		result := h.Execute(ctx, "query { exportData }", map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
			},
		})
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		ed, _ := data["exportData"].(map[string]interface{})
		require.NotNil(t, ed)
		feedList, _ := ed["feedSessions"].([]map[string]interface{})
		assert.Empty(t, feedList)
	})
}

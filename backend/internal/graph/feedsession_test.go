package graph

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func feedsessionFromResult(t *testing.T, result ExecResult, key string) map[string]interface{} {
	t.Helper()
	require.Empty(t, result.Errors)
	data, ok := result.Data.(map[string]interface{})
	require.True(t, ok)
	session, ok := data[key].(map[string]interface{})
	require.True(t, ok)
	return session
}

func TestFeedingSession_Create(t *testing.T) {
	t.Run("create breast feeding session with all fields", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "feed1@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Mia", "2026-01-01", "female")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":           babyID,
				"feedType":         "breast",
				"startedAt":        "2026-03-15T10:00:00Z",
				"endedAt":          "2026-03-15T10:25:00Z",
				"leftDurationSec":  900,
				"rightDurationSec": 600,
				"milkType":         "breast_milk",
				"notes":            "Good latch",
			},
		}
		result := h.Execute(ctx, "mutation { createFeedingSession }", vars)
		require.Empty(t, result.Errors)
		s := feedsessionFromResult(t, result, "createFeedingSession")
		assert.Equal(t, babyID, s["babyId"])
		assert.Equal(t, "breast", s["feedType"])
		assert.Equal(t, "2026-03-15T10:00:00Z", s["startedAt"])
		assert.Equal(t, "2026-03-15T10:25:00Z", s["endedAt"])
		assert.Equal(t, float64(900), s["leftDurationSec"])
		assert.Equal(t, float64(600), s["rightDurationSec"])
		assert.Equal(t, "breast_milk", s["milkType"])
		assert.Equal(t, "Good latch", s["notes"])
		assert.NotEmpty(t, s["id"])
		assert.NotEmpty(t, s["createdAt"])
	})

	t.Run("create bottle feeding session", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "feed2@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Noah", "2026-02-01", "male")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"feedType":  "bottle",
				"startedAt": "2026-04-10T14:00:00Z",
				"amountMl":  120.0,
				"milkType":  "formula",
			},
		}
		result := h.Execute(ctx, "mutation { createFeedingSession }", vars)
		require.Empty(t, result.Errors)
		s := feedsessionFromResult(t, result, "createFeedingSession")
		assert.Equal(t, "bottle", s["feedType"])
		assert.Equal(t, 120.0, s["amountMl"])
		assert.Equal(t, "formula", s["milkType"])
	})

	t.Run("create solids feeding session", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "feed3@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Oliver", "2026-03-01", "male")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"feedType":  "solids",
				"startedAt": "2026-06-01T12:00:00Z",
				"foodName":  "Avocado",
				"reaction":  "good",
			},
		}
		result := h.Execute(ctx, "mutation { createFeedingSession }", vars)
		require.Empty(t, result.Errors)
		s := feedsessionFromResult(t, result, "createFeedingSession")
		assert.Equal(t, "solids", s["feedType"])
		assert.Equal(t, "Avocado", s["foodName"])
		assert.Equal(t, "good", s["reaction"])
	})

	t.Run("create feeding session missing babyId", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "feed4@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"feedType":  "breast",
				"startedAt": "2026-05-01T08:00:00Z",
			},
		}
		result := h.Execute(ctx, "mutation { createFeedingSession }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "babyId required")
	})

	t.Run("create feeding session requires authentication", func(t *testing.T) {
		h := newTestHandler()
		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    "some-baby",
				"feedType":  "bottle",
				"startedAt": "2026-01-01T00:00:00Z",
			},
		}
		result := h.Execute(context.Background(), "mutation { createFeedingSession }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})

	t.Run("create feeding session for another user's baby", func(t *testing.T) {
		h := newTestHandler()
		token1, _ := signupAndLogin(t, h, "feed5a@example.com", "pass123!")
		ctx1 := authCtx(token1)
		babyID := createBabyHelper(t, h, ctx1, "AliceJr", "2026-03-01", "female")

		token2, _ := signupAndLogin(t, h, "feed5b@example.com", "pass123!")
		ctx2 := authCtx(token2)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"feedType":  "breast",
				"startedAt": "2026-06-01T10:00:00Z",
			},
		}
		result := h.Execute(ctx2, "mutation { createFeedingSession }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})

	t.Run("create feeding session missing feedType", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "feed6@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Liam", "2026-04-01", "male")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"startedAt": "2026-06-01T10:00:00Z",
			},
		}
		result := h.Execute(ctx, "mutation { createFeedingSession }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "feedType required")
	})
}

func TestFeedingSession_Query(t *testing.T) {
	t.Run("feeding sessions for baby", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "feedq1@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Sophia", "2026-01-15", "female")

		for i := 0; i < 3; i++ {
			vars := map[string]interface{}{
				"input": map[string]interface{}{
					"babyId":    babyID,
					"feedType":  "bottle",
					"startedAt": "2026-03-01T08:00:00Z",
					"amountMl":  90.0 + float64(i)*30,
				},
			}
			h.Execute(ctx, "mutation { createFeedingSession }", vars)
		}

		qVars := map[string]interface{}{"babyId": babyID}
		result := h.Execute(ctx, "query { feedingSessions }", qVars)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		list, ok := data["feedingSessions"].([]map[string]interface{})
		require.True(t, ok)
		assert.Len(t, list, 3)
	})

	t.Run("feeding sessions requires authentication", func(t *testing.T) {
		h := newTestHandler()
		result := h.Execute(context.Background(), "query { feedingSessions }", map[string]interface{}{
			"babyId": "some-baby",
		})
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})

	t.Run("feeding session by id", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "feedq2@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Emma", "2026-04-01", "female")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"feedType":  "breast",
				"startedAt": "2026-06-01T09:00:00Z",
			},
		}
		createResult := h.Execute(ctx, "mutation { createFeedingSession }", vars)
		created := feedsessionFromResult(t, createResult, "createFeedingSession")
		sessionID, _ := created["id"].(string)

		qVars := map[string]interface{}{"id": sessionID}
		qResult := h.Execute(ctx, "query { feedingSession }", qVars)
		require.Empty(t, qResult.Errors)
		qData, _ := qResult.Data.(map[string]interface{})
		s, _ := qData["feedingSession"].(map[string]interface{})
		require.NotNil(t, s)
		assert.Equal(t, sessionID, s["id"])
		assert.Equal(t, "breast", s["feedType"])
	})

	t.Run("feeding session not found", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "feedq3@example.com", "pass123!")
		ctx := authCtx(token)

		result := h.Execute(ctx, "query { feedingSession }", map[string]interface{}{
			"id": "non-existent",
		})
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestFeedingSession_Update(t *testing.T) {
	t.Run("update feeding session notes", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "feedup1@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Lucas", "2026-05-01", "male")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"feedType":  "bottle",
				"startedAt": "2026-07-01T12:00:00Z",
				"amountMl":  150.0,
			},
		}
		createResult := h.Execute(ctx, "mutation { createFeedingSession }", vars)
		created := feedsessionFromResult(t, createResult, "createFeedingSession")
		sessionID, _ := created["id"].(string)

		updateVars := map[string]interface{}{
			"input": map[string]interface{}{
				"id":      sessionID,
				"amountMl": 180.0,
				"notes":   "Finished the bottle",
			},
		}
		updateResult := h.Execute(ctx, "mutation { updateFeedingSession }", updateVars)
		require.Empty(t, updateResult.Errors)
		updateData, _ := updateResult.Data.(map[string]interface{})
		updated, _ := updateData["updateFeedingSession"].(map[string]interface{})
		require.NotNil(t, updated)
		assert.Equal(t, 180.0, updated["amountMl"])
		assert.Equal(t, "Finished the bottle", updated["notes"])
	})

	t.Run("update non-existent feeding session", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "feedup2@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"id":     "non-existent",
				"notes":  "test",
			},
		}
		result := h.Execute(ctx, "mutation { updateFeedingSession }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestFeedingSession_Delete(t *testing.T) {
	t.Run("delete existing feeding session", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "feedd1@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Ava", "2026-06-01", "female")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"feedType":  "solids",
				"startedAt": "2026-08-01T18:00:00Z",
				"foodName":  "Banana",
			},
		}
		createResult := h.Execute(ctx, "mutation { createFeedingSession }", vars)
		created := feedsessionFromResult(t, createResult, "createFeedingSession")
		sessionID, _ := created["id"].(string)

		delVars := map[string]interface{}{"id": sessionID}
		delResult := h.Execute(ctx, "mutation { deleteFeedingSession }", delVars)
		require.Empty(t, delResult.Errors)
		delData, _ := delResult.Data.(map[string]interface{})
		deleted, _ := delData["deleteFeedingSession"].(map[string]interface{})
		require.NotNil(t, deleted)
		assert.Equal(t, sessionID, deleted["id"])
	})

	t.Run("delete non-existent feeding session", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "feedd2@example.com", "pass123!")
		ctx := authCtx(token)

		result := h.Execute(ctx, "mutation { deleteFeedingSession }", map[string]interface{}{
			"id": "non-existent",
		})
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

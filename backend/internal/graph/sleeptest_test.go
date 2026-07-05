package graph

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func sleepFromResult(t *testing.T, result ExecResult, key string) map[string]interface{} {
	t.Helper()
	require.Empty(t, result.Errors)
	data, ok := result.Data.(map[string]interface{})
	require.True(t, ok)
	s, ok := data[key].(map[string]interface{})
	require.True(t, ok)
	return s
}

func TestSleepSession_Create(t *testing.T) {
	t.Run("create sleep session with all fields", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "sleep1@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Mia", "2026-01-01", "female")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"startedAt": "2026-03-15T21:00:00Z",
				"endedAt":   "2026-03-16T06:30:00Z",
				"location":  "crib",
				"notes":     "Slept through the night",
			},
		}
		result := h.Execute(ctx, "mutation { createSleepSession }", vars)
		require.Empty(t, result.Errors)
		s := sleepFromResult(t, result, "createSleepSession")
		assert.Equal(t, babyID, s["babyId"])
		assert.Equal(t, "2026-03-15T21:00:00Z", s["startedAt"])
		assert.Equal(t, "2026-03-16T06:30:00Z", s["endedAt"])
		assert.Equal(t, "crib", s["location"])
		assert.Equal(t, "Slept through the night", s["notes"])
		assert.NotEmpty(t, s["id"])
		assert.NotEmpty(t, s["createdAt"])
	})

	t.Run("create sleep session with only required fields", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "sleep2@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Noah", "2026-02-01", "male")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"startedAt": "2026-04-10T13:00:00Z",
			},
		}
		result := h.Execute(ctx, "mutation { createSleepSession }", vars)
		require.Empty(t, result.Errors)
		s := sleepFromResult(t, result, "createSleepSession")
		assert.Equal(t, babyID, s["babyId"])
		assert.Equal(t, "crib", s["location"], "default location is crib")
	})

	t.Run("create sleep session with contact location", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "sleep3@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Oliver", "2026-03-01", "male")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"startedAt": "2026-06-01T14:00:00Z",
				"location":  "contact",
			},
		}
		result := h.Execute(ctx, "mutation { createSleepSession }", vars)
		require.Empty(t, result.Errors)
		s := sleepFromResult(t, result, "createSleepSession")
		assert.Equal(t, "contact", s["location"])
	})

	t.Run("create sleep session missing babyId", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "sleep4@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"startedAt": "2026-05-01T20:00:00Z",
			},
		}
		result := h.Execute(ctx, "mutation { createSleepSession }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "babyId required")
	})

	t.Run("create sleep session requires authentication", func(t *testing.T) {
		h := newTestHandler()
		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    "some-baby",
				"startedAt": "2026-01-01T22:00:00Z",
			},
		}
		result := h.Execute(context.Background(), "mutation { createSleepSession }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})

	t.Run("create sleep session for another user's baby", func(t *testing.T) {
		h := newTestHandler()
		token1, _ := signupAndLogin(t, h, "sleep5a@example.com", "pass123!")
		ctx1 := authCtx(token1)
		babyID := createBabyHelper(t, h, ctx1, "AliceJr", "2026-03-01", "female")

		token2, _ := signupAndLogin(t, h, "sleep5b@example.com", "pass123!")
		ctx2 := authCtx(token2)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"startedAt": "2026-06-01T22:00:00Z",
			},
		}
		result := h.Execute(ctx2, "mutation { createSleepSession }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestSleepSession_Query(t *testing.T) {
	t.Run("sleep sessions for baby", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "sleepq1@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Sophia", "2026-01-15", "female")

		for i := 0; i < 2; i++ {
			vars := map[string]interface{}{
				"input": map[string]interface{}{
					"babyId":    babyID,
					"startedAt": "2026-03-01T22:00:00Z",
					"endedAt":   "2026-03-02T06:00:00Z",
					"location":  "crib",
				},
			}
			h.Execute(ctx, "mutation { createSleepSession }", vars)
		}

		qVars := map[string]interface{}{"babyId": babyID}
		result := h.Execute(ctx, "query { sleepSessions }", qVars)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		list, ok := data["sleepSessions"].([]map[string]interface{})
		require.True(t, ok)
		assert.Len(t, list, 2)
	})

	t.Run("sleep sessions requires authentication", func(t *testing.T) {
		h := newTestHandler()
		result := h.Execute(context.Background(), "query { sleepSessions }", map[string]interface{}{
			"babyId": "some-baby",
		})
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})

	t.Run("sleep session by id", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "sleepq2@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Emma", "2026-04-01", "female")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"startedAt": "2026-06-01T21:00:00Z",
			},
		}
		createResult := h.Execute(ctx, "mutation { createSleepSession }", vars)
		created := sleepFromResult(t, createResult, "createSleepSession")
		sessionID, _ := created["id"].(string)

		qVars := map[string]interface{}{"id": sessionID}
		qResult := h.Execute(ctx, "query { sleepSession }", qVars)
		require.Empty(t, qResult.Errors)
		qData, _ := qResult.Data.(map[string]interface{})
		s, _ := qData["sleepSession"].(map[string]interface{})
		require.NotNil(t, s)
		assert.Equal(t, sessionID, s["id"])
	})

	t.Run("sleep session not found", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "sleepq3@example.com", "pass123!")
		ctx := authCtx(token)

		result := h.Execute(ctx, "query { sleepSession }", map[string]interface{}{
			"id": "non-existent",
		})
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestSleepSession_Update(t *testing.T) {
	t.Run("update sleep session notes and endedAt", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "sleepup1@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Lucas", "2026-05-01", "male")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"startedAt": "2026-07-01T20:00:00Z",
			},
		}
		createResult := h.Execute(ctx, "mutation { createSleepSession }", vars)
		created := sleepFromResult(t, createResult, "createSleepSession")
		sessionID, _ := created["id"].(string)

		updateVars := map[string]interface{}{
			"input": map[string]interface{}{
				"id":      sessionID,
				"endedAt": "2026-07-02T06:00:00Z",
				"notes":   "Woke up once",
			},
		}
		updateResult := h.Execute(ctx, "mutation { updateSleepSession }", updateVars)
		require.Empty(t, updateResult.Errors)
		updateData, _ := updateResult.Data.(map[string]interface{})
		updated, _ := updateData["updateSleepSession"].(map[string]interface{})
		require.NotNil(t, updated)
		assert.Equal(t, "2026-07-02T06:00:00Z", updated["endedAt"])
		assert.Equal(t, "Woke up once", updated["notes"])
	})

	t.Run("update non-existent sleep session", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "sleepup2@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"id":    "non-existent",
				"notes": "test",
			},
		}
		result := h.Execute(ctx, "mutation { updateSleepSession }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestSleepSession_Delete(t *testing.T) {
	t.Run("delete existing sleep session", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "sleepd1@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Ava", "2026-06-01", "female")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":    babyID,
				"startedAt": "2026-08-01T21:00:00Z",
			},
		}
		createResult := h.Execute(ctx, "mutation { createSleepSession }", vars)
		created := sleepFromResult(t, createResult, "createSleepSession")
		sessionID, _ := created["id"].(string)

		delVars := map[string]interface{}{"id": sessionID}
		delResult := h.Execute(ctx, "mutation { deleteSleepSession }", delVars)
		require.Empty(t, delResult.Errors)
		delData, _ := delResult.Data.(map[string]interface{})
		deleted, _ := delData["deleteSleepSession"].(map[string]interface{})
		require.NotNil(t, deleted)
		assert.Equal(t, sessionID, deleted["id"])
	})

	t.Run("delete non-existent sleep session", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "sleepd2@example.com", "pass123!")
		ctx := authCtx(token)

		result := h.Execute(ctx, "mutation { deleteSleepSession }", map[string]interface{}{
			"id": "non-existent",
		})
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestSleepSession_FlatVariables(t *testing.T) {
	t.Run("create with flat variables", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "sleepflat@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "TestBaby", "2026-01-01", "male")

		vars := map[string]interface{}{
			"babyId":    babyID,
			"startedAt": "2026-03-01T22:00:00Z",
			"location":  "crib",
		}
		result := h.Execute(ctx, "mutation { createSleepSession }", vars)
		require.Empty(t, result.Errors)
		s := sleepFromResult(t, result, "createSleepSession")
		assert.Equal(t, "crib", s["location"])
	})
}

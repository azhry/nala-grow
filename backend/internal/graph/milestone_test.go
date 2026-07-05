package graph

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func milestoneFromResult(t *testing.T, result ExecResult, key string) map[string]interface{} {
	t.Helper()
	require.Empty(t, result.Errors)
	data, ok := result.Data.(map[string]interface{})
	require.True(t, ok)
	m, ok := data[key].(map[string]interface{})
	require.True(t, ok)
	return m
}

func TestMilestone_Create(t *testing.T) {
	t.Run("create milestone with all fields", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "ms1@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Mia", "2026-01-01", "female")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":      babyID,
				"title":       "First smile",
				"description": "Smiled at mom for the first time",
				"category":    "social",
				"achievedAt":  "2026-03-01T14:00:00Z",
				"note":        "So cute!",
				"isCustom":    true,
			},
		}
		result := h.Execute(ctx, "mutation { createMilestone }", vars)
		require.Empty(t, result.Errors)
		m := milestoneFromResult(t, result, "createMilestone")
		assert.Equal(t, babyID, m["babyId"])
		assert.Equal(t, "First smile", m["title"])
		assert.Equal(t, "Smiled at mom for the first time", m["description"])
		assert.Equal(t, "social", m["category"])
		assert.Equal(t, "2026-03-01T14:00:00Z", m["achievedAt"])
		assert.Equal(t, "So cute!", m["note"])
		assert.Equal(t, true, m["isCustom"])
		assert.NotEmpty(t, m["id"])
		assert.NotEmpty(t, m["createdAt"])
	})

	t.Run("create milestone with only required fields", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "ms2@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Noah", "2026-02-01", "male")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
				"title":  "First roll",
			},
		}
		result := h.Execute(ctx, "mutation { createMilestone }", vars)
		require.Empty(t, result.Errors)
		m := milestoneFromResult(t, result, "createMilestone")
		assert.Equal(t, "First roll", m["title"])
		assert.Equal(t, "general", m["category"], "default category is general")
		assert.Equal(t, false, m["isCustom"], "default isCustom is false")
	})

	t.Run("create milestone missing babyId", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "ms3@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"title": "First word",
			},
		}
		result := h.Execute(ctx, "mutation { createMilestone }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "babyId required")
	})

	t.Run("create milestone missing title", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "ms4@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Oliver", "2026-03-01", "male")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
			},
		}
		result := h.Execute(ctx, "mutation { createMilestone }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "title required")
	})

	t.Run("create milestone requires authentication", func(t *testing.T) {
		h := newTestHandler()
		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": "some-baby",
				"title":  "Test milestone",
			},
		}
		result := h.Execute(context.Background(), "mutation { createMilestone }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})

	t.Run("create milestone for another user's baby", func(t *testing.T) {
		h := newTestHandler()
		token1, _ := signupAndLogin(t, h, "ms5a@example.com", "pass123!")
		ctx1 := authCtx(token1)
		babyID := createBabyHelper(t, h, ctx1, "AliceJr", "2026-03-01", "female")

		token2, _ := signupAndLogin(t, h, "ms5b@example.com", "pass123!")
		ctx2 := authCtx(token2)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
				"title":  "Pirate milestone",
			},
		}
		result := h.Execute(ctx2, "mutation { createMilestone }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestMilestone_Query(t *testing.T) {
	t.Run("milestones for baby", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "msq1@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Sophia", "2026-01-15", "female")

		for i := 0; i < 3; i++ {
			vars := map[string]interface{}{
				"input": map[string]interface{}{
					"babyId": babyID,
					"title":  "Milestone",
				},
			}
			h.Execute(ctx, "mutation { createMilestone }", vars)
		}

		qVars := map[string]interface{}{"babyId": babyID}
		result := h.Execute(ctx, "query { milestones }", qVars)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		list, ok := data["milestones"].([]map[string]interface{})
		require.True(t, ok)
		assert.Len(t, list, 3)
	})

	t.Run("milestones requires authentication", func(t *testing.T) {
		h := newTestHandler()
		result := h.Execute(context.Background(), "query { milestones }", map[string]interface{}{
			"babyId": "some-baby",
		})
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})

	t.Run("milestone by id", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "msq2@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Emma", "2026-04-01", "female")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
				"title":  "First steps",
			},
		}
		createResult := h.Execute(ctx, "mutation { createMilestone }", vars)
		created := milestoneFromResult(t, createResult, "createMilestone")
		mID, _ := created["id"].(string)

		qVars := map[string]interface{}{"id": mID}
		qResult := h.Execute(ctx, "query { milestone }", qVars)
		require.Empty(t, qResult.Errors)
		qData, _ := qResult.Data.(map[string]interface{})
		m, _ := qData["milestone"].(map[string]interface{})
		require.NotNil(t, m)
		assert.Equal(t, mID, m["id"])
		assert.Equal(t, "First steps", m["title"])
	})

	t.Run("milestone not found", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "msq3@example.com", "pass123!")
		ctx := authCtx(token)

		result := h.Execute(ctx, "query { milestone }", map[string]interface{}{
			"id": "non-existent",
		})
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestMilestone_Update(t *testing.T) {
	t.Run("update milestone title and note", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "msup1@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Lucas", "2026-05-01", "male")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
				"title":  "Crawling",
			},
		}
		createResult := h.Execute(ctx, "mutation { createMilestone }", vars)
		created := milestoneFromResult(t, createResult, "createMilestone")
		mID, _ := created["id"].(string)

		updateVars := map[string]interface{}{
			"input": map[string]interface{}{
				"id":    mID,
				"title": "Crawling (updated)",
				"note":  "Now crawling everywhere!",
			},
		}
		updateResult := h.Execute(ctx, "mutation { updateMilestone }", updateVars)
		require.Empty(t, updateResult.Errors)
		updateData, _ := updateResult.Data.(map[string]interface{})
		updated, _ := updateData["updateMilestone"].(map[string]interface{})
		require.NotNil(t, updated)
		assert.Equal(t, "Crawling (updated)", updated["title"])
		assert.Equal(t, "Now crawling everywhere!", updated["note"])
	})

	t.Run("update non-existent milestone", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "msup2@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"id":   "non-existent",
				"note": "test",
			},
		}
		result := h.Execute(ctx, "mutation { updateMilestone }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestMilestone_Delete(t *testing.T) {
	t.Run("delete existing milestone", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "msd1@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Ava", "2026-06-01", "female")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
				"title":  "First tooth",
			},
		}
		createResult := h.Execute(ctx, "mutation { createMilestone }", vars)
		created := milestoneFromResult(t, createResult, "createMilestone")
		mID, _ := created["id"].(string)

		delVars := map[string]interface{}{"id": mID}
		delResult := h.Execute(ctx, "mutation { deleteMilestone }", delVars)
		require.Empty(t, delResult.Errors)
		delData, _ := delResult.Data.(map[string]interface{})
		deleted, _ := delData["deleteMilestone"].(map[string]interface{})
		require.NotNil(t, deleted)
		assert.Equal(t, mID, deleted["id"])
	})

	t.Run("delete non-existent milestone", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "msd2@example.com", "pass123!")
		ctx := authCtx(token)

		result := h.Execute(ctx, "mutation { deleteMilestone }", map[string]interface{}{
			"id": "non-existent",
		})
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestMilestone_FlatVariables(t *testing.T) {
	t.Run("create with flat variables", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "msflat@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "TestBaby", "2026-01-01", "male")

		vars := map[string]interface{}{
			"babyId": babyID,
			"title":  "Flat var milestone",
		}
		result := h.Execute(ctx, "mutation { createMilestone }", vars)
		require.Empty(t, result.Errors)
		m := milestoneFromResult(t, result, "createMilestone")
		assert.Equal(t, "Flat var milestone", m["title"])
	})
}

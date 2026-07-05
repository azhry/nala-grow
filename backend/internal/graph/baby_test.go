package graph

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func signupAndLogin(t *testing.T, h *Handler, email, password string) (token, userID string) {
	t.Helper()
	vars := map[string]interface{}{
		"email":    email,
		"password": password,
	}
	result := h.Execute(context.Background(), "mutation { signup }", vars)
	require.Empty(t, result.Errors)
	data, _ := result.Data.(map[string]interface{})
	signup, _ := data["signup"].(map[string]interface{})
	token, _ = signup["token"].(string)
	user, _ := signup["user"].(map[string]interface{})
	userID, _ = user["id"].(string)
	require.NotEmpty(t, token)
	require.NotEmpty(t, userID)
	return
}

func authCtx(token string) context.Context {
	return context.WithValue(context.Background(), "raw_token", token)
}

func TestBaby_Query(t *testing.T) {
	t.Run("babies returns empty list initially", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "parent@example.com", "pass123!")
		ctx := authCtx(token)

		result := h.Execute(ctx, "query { babies }", nil)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		babies, ok := data["babies"].([]map[string]interface{})
		require.True(t, ok, "babies should be a list")
		assert.Empty(t, babies, "no babies yet")
	})

	t.Run("babies requires authentication", func(t *testing.T) {
		h := newTestHandler()
		result := h.Execute(context.Background(), "query { babies }", nil)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})

	t.Run("baby by id returns baby", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "parent2@example.com", "pass123!")
		ctx := authCtx(token)

		// Create first
		createVars := map[string]interface{}{
			"input": map[string]interface{}{
				"name": "Emma",
				"dob":  "2026-01-15",
				"sex":  "female",
			},
		}
		createResult := h.Execute(ctx, "mutation { createBaby }", createVars)
		require.Empty(t, createResult.Errors)
		createData, _ := createResult.Data.(map[string]interface{})
		created, _ := createData["createBaby"].(map[string]interface{})
		babyID, _ := created["id"].(string)
		require.NotEmpty(t, babyID)

		// Query by id
		qVars := map[string]interface{}{"id": babyID}
		qResult := h.Execute(ctx, "query { baby }", qVars)
		require.Empty(t, qResult.Errors)
		qData, _ := qResult.Data.(map[string]interface{})
		baby, _ := qData["baby"].(map[string]interface{})
		require.NotNil(t, baby)
		assert.Equal(t, babyID, baby["id"])
		assert.Equal(t, "Emma", baby["name"])
		assert.Equal(t, "2026-01-15", baby["dob"])
		assert.Equal(t, "female", baby["sex"])
	})

	t.Run("baby by id not found", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "parent3@example.com", "pass123!")
		ctx := authCtx(token)

		qVars := map[string]interface{}{"id": "non-existent-id"}
		result := h.Execute(ctx, "query { baby }", qVars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})

	t.Run("baby by id requires authentication", func(t *testing.T) {
		h := newTestHandler()
		qVars := map[string]interface{}{"id": "some-id"}
		result := h.Execute(context.Background(), "query { baby }", qVars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})
}

func TestBaby_Create(t *testing.T) {
	t.Run("create baby with all fields", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "create@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"name":     "Noah",
				"dob":      "2026-03-20",
				"sex":      "male",
				"photoUrl": "https://example.com/photo.jpg",
			},
		}
		result := h.Execute(ctx, "mutation { createBaby }", vars)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		baby, ok := data["createBaby"].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "Noah", baby["name"])
		assert.Equal(t, "2026-03-20", baby["dob"])
		assert.Equal(t, "male", baby["sex"])
		assert.Equal(t, "https://example.com/photo.jpg", baby["photoUrl"])
		assert.NotEmpty(t, baby["id"])
		assert.NotEmpty(t, baby["createdAt"])
	})

	t.Run("create baby requires authentication", func(t *testing.T) {
		h := newTestHandler()
		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"name": "NoAuth",
				"dob":  "2026-01-01",
				"sex":  "male",
			},
		}
		result := h.Execute(context.Background(), "mutation { createBaby }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})

	t.Run("create baby missing required fields", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "missing@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"dob": "2026-01-01",
				"sex": "male",
			},
		}
		result := h.Execute(ctx, "mutation { createBaby }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "name required")
	})

	t.Run("create baby with flat variables", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "flat@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{
			"name": "Liam",
			"dob":  "2026-02-10",
			"sex":  "male",
		}
		result := h.Execute(ctx, "mutation { createBaby }", vars)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		baby, _ := data["createBaby"].(map[string]interface{})
		require.NotNil(t, baby)
		assert.Equal(t, "Liam", baby["name"])
	})
}

func TestBaby_Update(t *testing.T) {
	t.Run("update baby name", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "update@example.com", "pass123!")
		ctx := authCtx(token)

		// Create
		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"name": "OldName",
				"dob":  "2026-04-01",
				"sex":  "female",
			},
		}
		createResult := h.Execute(ctx, "mutation { createBaby }", vars)
		createData, _ := createResult.Data.(map[string]interface{})
		created, _ := createData["createBaby"].(map[string]interface{})
		babyID, _ := created["id"].(string)

		// Update
		updateVars := map[string]interface{}{
			"input": map[string]interface{}{
				"id":   babyID,
				"name": "NewName",
			},
		}
		updateResult := h.Execute(ctx, "mutation { updateBaby }", updateVars)
		require.Empty(t, updateResult.Errors)
		updateData, _ := updateResult.Data.(map[string]interface{})
		updated, _ := updateData["updateBaby"].(map[string]interface{})
		require.NotNil(t, updated)
		assert.Equal(t, "NewName", updated["name"])
	})

	t.Run("update non-existent baby", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "update2@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"id":   "non-existent",
				"name": "Ghost",
			},
		}
		result := h.Execute(ctx, "mutation { updateBaby }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})

	t.Run("update baby requires authentication", func(t *testing.T) {
		h := newTestHandler()
		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"id":   "some-id",
				"name": "Hacker",
			},
		}
		result := h.Execute(context.Background(), "mutation { updateBaby }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})
}

func TestBaby_Delete(t *testing.T) {
	t.Run("delete existing baby", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "delete@example.com", "pass123!")
		ctx := authCtx(token)

		// Create
		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"name": "ToDelete",
				"dob":  "2026-05-01",
				"sex":  "male",
			},
		}
		createResult := h.Execute(ctx, "mutation { createBaby }", vars)
		createData, _ := createResult.Data.(map[string]interface{})
		created, _ := createData["createBaby"].(map[string]interface{})
		babyID, _ := created["id"].(string)

		// Delete
		delVars := map[string]interface{}{"id": babyID}
		delResult := h.Execute(ctx, "mutation { deleteBaby }", delVars)
		require.Empty(t, delResult.Errors)
		delData, _ := delResult.Data.(map[string]interface{})
		deleted, _ := delData["deleteBaby"].(map[string]interface{})
		require.NotNil(t, deleted)
		assert.Equal(t, babyID, deleted["id"])

		// Verify it's gone
		qVars := map[string]interface{}{"id": babyID}
		qResult := h.Execute(ctx, "query { baby }", qVars)
		require.NotEmpty(t, qResult.Errors)
		assert.Contains(t, qResult.Errors[0].Message, "not found")
	})

	t.Run("delete non-existent baby", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "delete2@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{"id": "non-existent"}
		result := h.Execute(ctx, "mutation { deleteBaby }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})

	t.Run("delete baby requires authentication", func(t *testing.T) {
		h := newTestHandler()
		vars := map[string]interface{}{"id": "some-id"}
		result := h.Execute(context.Background(), "mutation { deleteBaby }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})
}

func TestBaby_Isolation(t *testing.T) {
	t.Run("babies are isolated per user", func(t *testing.T) {
		h := newTestHandler()
		token1, _ := signupAndLogin(t, h, "userA@example.com", "pass123!")
		token2, _ := signupAndLogin(t, h, "userB@example.com", "pass123!")

		ctx1 := authCtx(token1)
		ctx2 := authCtx(token2)

		// User A creates a baby
		varsA := map[string]interface{}{
			"input": map[string]interface{}{
				"name": "AliceBaby",
				"dob":  "2026-06-01",
				"sex":  "female",
			},
		}
		h.Execute(ctx1, "mutation { createBaby }", varsA)

		// User B should have empty list
		resultB := h.Execute(ctx2, "query { babies }", nil)
		dataB, _ := resultB.Data.(map[string]interface{})
		babiesB, _ := dataB["babies"].([]map[string]interface{})
		assert.Empty(t, babiesB)

		// User A should have 1
		resultA := h.Execute(ctx1, "query { babies }", nil)
		dataA, _ := resultA.Data.(map[string]interface{})
		babiesA, _ := dataA["babies"].([]map[string]interface{})
		assert.Len(t, babiesA, 1)
	})
}

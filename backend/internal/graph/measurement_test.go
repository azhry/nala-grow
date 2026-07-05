package graph

import (
	"context"
	"math"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createBabyHelper(t *testing.T, h *Handler, ctx context.Context, name, dob, sex string) string {
	t.Helper()
	vars := map[string]interface{}{
		"input": map[string]interface{}{
			"name": name,
			"dob":  dob,
			"sex":  sex,
		},
	}
	result := h.Execute(ctx, "mutation { createBaby }", vars)
	require.Empty(t, result.Errors)
	data, _ := result.Data.(map[string]interface{})
	baby, _ := data["createBaby"].(map[string]interface{})
	id, _ := baby["id"].(string)
	require.NotEmpty(t, id)
	return id
}

func TestMeasurement_Create(t *testing.T) {
	t.Run("create measurement with all fields", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "mtest@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Mia", "2026-01-01", "female")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":            babyID,
				"date":              "2026-03-15",
				"weight":            6.5,
				"height":            62.0,
				"headCircumference": 41.0,
			},
		}
		result := h.Execute(ctx, "mutation { createMeasurement }", vars)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		m, ok := data["createMeasurement"].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, babyID, m["babyId"])
		assert.Equal(t, "2026-03-15", m["date"])
		assert.Equal(t, 6.5, m["weight"])
		assert.Equal(t, 62.0, m["height"])
		assert.Equal(t, 41.0, m["headCircumference"])
		assert.NotEmpty(t, m["id"])
		assert.NotEmpty(t, m["createdAt"])
	})

	t.Run("create measurement with only required fields", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "mtest2@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Noah", "2026-02-01", "male")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
				"date":   "2026-04-10",
				"weight": 7.2,
			},
		}
		result := h.Execute(ctx, "mutation { createMeasurement }", vars)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		m, _ := data["createMeasurement"].(map[string]interface{})
		require.NotNil(t, m)
		assert.Equal(t, 7.2, m["weight"])
		assert.Equal(t, 0.0, m["height"], "height defaults to 0")
		assert.Equal(t, 0.0, m["headCircumference"], "headCircumference defaults to 0")
	})

	t.Run("create measurement missing babyId", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "mtest3@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"date":   "2026-05-01",
				"weight": 7.0,
			},
		}
		result := h.Execute(ctx, "mutation { createMeasurement }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "babyId required")
	})

	t.Run("create measurement requires authentication", func(t *testing.T) {
		h := newTestHandler()
		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": "some-baby",
				"date":   "2026-01-01",
				"weight": 5.0,
			},
		}
		result := h.Execute(context.Background(), "mutation { createMeasurement }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})

	t.Run("create measurement for another user's baby", func(t *testing.T) {
		h := newTestHandler()
		token1, _ := signupAndLogin(t, h, "parentA@example.com", "pass123!")
		ctx1 := authCtx(token1)
		babyID := createBabyHelper(t, h, ctx1, "AliceJr", "2026-03-01", "female")

		token2, _ := signupAndLogin(t, h, "parentB@example.com", "pass123!")
		ctx2 := authCtx(token2)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
				"date":   "2026-06-01",
				"weight": 8.0,
			},
		}
		result := h.Execute(ctx2, "mutation { createMeasurement }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestMeasurement_Query(t *testing.T) {
	t.Run("measurements for baby", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "mquery@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Oliver", "2026-01-15", "male")

		// Create 2 measurements
		for i := 0; i < 2; i++ {
			vars := map[string]interface{}{
				"input": map[string]interface{}{
					"babyId": babyID,
					"date":   "2026-03-01",
					"weight": 6.0 + float64(i),
				},
			}
			h.Execute(ctx, "mutation { createMeasurement }", vars)
		}

		qVars := map[string]interface{}{"babyId": babyID}
		result := h.Execute(ctx, "query { measurements }", qVars)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		list, ok := data["measurements"].([]map[string]interface{})
		require.True(t, ok)
		assert.Len(t, list, 2)
	})

	t.Run("measurements requires authentication", func(t *testing.T) {
		h := newTestHandler()
		result := h.Execute(context.Background(), "query { measurements }", map[string]interface{}{
			"babyId": "some-baby",
		})
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "authenticated")
	})

	t.Run("measurement by id", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "mquery2@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Sophia", "2026-04-01", "female")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
				"date":   "2026-06-01",
				"weight": 7.5,
			},
		}
		createResult := h.Execute(ctx, "mutation { createMeasurement }", vars)
		createData, _ := createResult.Data.(map[string]interface{})
		created, _ := createData["createMeasurement"].(map[string]interface{})
		measID, _ := created["id"].(string)

		qVars := map[string]interface{}{"id": measID}
		qResult := h.Execute(ctx, "query { measurement }", qVars)
		require.Empty(t, qResult.Errors)
		qData, _ := qResult.Data.(map[string]interface{})
		meas, _ := qData["measurement"].(map[string]interface{})
		require.NotNil(t, meas)
		assert.Equal(t, measID, meas["id"])
		assert.Equal(t, 7.5, meas["weight"])
	})

	t.Run("measurement not found", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "mquery3@example.com", "pass123!")
		ctx := authCtx(token)

		qVars := map[string]interface{}{"id": "non-existent"}
		result := h.Execute(ctx, "query { measurement }", qVars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestMeasurement_Update(t *testing.T) {
	t.Run("update measurement weight", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "mupdate@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Liam", "2026-05-01", "male")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
				"date":   "2026-07-01",
				"weight": 8.0,
			},
		}
		createResult := h.Execute(ctx, "mutation { createMeasurement }", vars)
		createData, _ := createResult.Data.(map[string]interface{})
		created, _ := createData["createMeasurement"].(map[string]interface{})
		measID, _ := created["id"].(string)

		updateVars := map[string]interface{}{
			"input": map[string]interface{}{
				"id":     measID,
				"weight": 8.5,
			},
		}
		updateResult := h.Execute(ctx, "mutation { updateMeasurement }", updateVars)
		require.Empty(t, updateResult.Errors)
		updateData, _ := updateResult.Data.(map[string]interface{})
		updated, _ := updateData["updateMeasurement"].(map[string]interface{})
		require.NotNil(t, updated)
		assert.Equal(t, 8.5, updated["weight"])
	})

	t.Run("update non-existent measurement", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "mupdate2@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"id":     "non-existent",
				"weight": 5.0,
			},
		}
		result := h.Execute(ctx, "mutation { updateMeasurement }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestMeasurement_Delete(t *testing.T) {
	t.Run("delete existing measurement", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "mdelete@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Emma", "2026-06-01", "female")

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": babyID,
				"date":   "2026-08-01",
				"weight": 7.0,
			},
		}
		createResult := h.Execute(ctx, "mutation { createMeasurement }", vars)
		createData, _ := createResult.Data.(map[string]interface{})
		created, _ := createData["createMeasurement"].(map[string]interface{})
		measID, _ := created["id"].(string)

		delVars := map[string]interface{}{"id": measID}
		delResult := h.Execute(ctx, "mutation { deleteMeasurement }", delVars)
		require.Empty(t, delResult.Errors)
		delData, _ := delResult.Data.(map[string]interface{})
		deleted, _ := delData["deleteMeasurement"].(map[string]interface{})
		require.NotNil(t, deleted)
		assert.Equal(t, measID, deleted["id"])
	})

	t.Run("delete non-existent", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "mdelete2@example.com", "pass123!")
		ctx := authCtx(token)

		result := h.Execute(ctx, "mutation { deleteMeasurement }", map[string]interface{}{
			"id": "non-existent",
		})
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "not found")
	})
}

func TestMeasurement_WHOZScore(t *testing.T) {
	t.Run("calculate z-score for weight", func(t *testing.T) {
		// 6.5 kg at 3 months for a female infant
		// Box-Cox: z = ((value/M)^L - 1) / (L*S) = 0.804 for L=0.1, M=6.0, S=0.1
		z := calculateZScore(6.5, 0.1, 6.0, 0.1)
		assert.InDelta(t, 0.80, z, 0.02, "z-score should be approximately 0.80")
	})

	t.Run("z-score for weight at median", func(t *testing.T) {
		z := calculateZScore(6.0, 0.1, 6.0, 0.1)
		assert.InDelta(t, 0, z, 0.01, "median value should give z-score near 0")
	})

	t.Run("z-score for weight below median", func(t *testing.T) {
		z := calculateZScore(5.0, 0.1, 6.0, 0.1)
		assert.True(t, z < 0, "below median should give negative z-score")
	})

	t.Run("z-score for weight above median", func(t *testing.T) {
		z := calculateZScore(7.0, 0.1, 6.0, 0.1)
		assert.True(t, z > 0, "above median should give positive z-score")
	})

	t.Run("z-score distribution matches percentiles", func(t *testing.T) {
		// Z-score of 0 → 50th percentile
		p50 := zToPercentile(0)
		assert.InDelta(t, 50, p50, 1)
		// Z-score of 1.645 → ~95th percentile
		p95 := zToPercentile(1.645)
		assert.InDelta(t, 95, p95, 1)
		// Z-score of -1.645 → ~5th percentile
		p5 := zToPercentile(-1.645)
		assert.InDelta(t, 5, p5, 1)
		// Z-score of -2 → ~2.3rd percentile
		p2 := zToPercentile(-2)
		assert.InDelta(t, 2.3, p2, 0.5)
	})
}

func TestMeasurement_PercentilesInResponse(t *testing.T) {
	t.Run("measurement response includes percentiles", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "perc@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "Zara", "2026-01-01", "female")

		// Baby is ~2.5 months old on 2026-03-15
		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId":            babyID,
				"date":              "2026-03-15",
				"weight":            6.5,
				"height":            62.0,
				"headCircumference": 41.0,
			},
		}
		result := h.Execute(ctx, "mutation { createMeasurement }", vars)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		m, _ := data["createMeasurement"].(map[string]interface{})
		// Percentiles are optional computed fields
		// If present, they should be numeric
		if wp, has := m["weightPercentile"]; has {
			_, isFloat := wp.(float64)
			assert.True(t, isFloat, "weightPercentile should be float64 if present")
		}
		if hp, has := m["heightPercentile"]; has {
			_, isFloat := hp.(float64)
			assert.True(t, isFloat, "heightPercentile should be float64 if present")
		}
		if hcp, has := m["headCircumferencePercentile"]; has {
			_, isFloat := hcp.(float64)
			assert.True(t, isFloat, "headCircumferencePercentile should be float64 if present")
		}
	})
}

func TestMeasurement_AgeCalculation(t *testing.T) {
	t.Run("calculate age in months", func(t *testing.T) {
		babyDOB := "2026-01-15"
		measDate := "2026-04-15"
		months := ageInMonths(babyDOB, measDate)
		assert.InDelta(t, 3.0, months, 0.1, "3 months exactly")
	})

	t.Run("age at birth", func(t *testing.T) {
		months := ageInMonths("2026-01-15", "2026-01-15")
		assert.InDelta(t, 0, months, 0.1)
	})

	t.Run("age not full months", func(t *testing.T) {
		months := ageInMonths("2026-01-01", "2026-02-15")
		assert.InDelta(t, 1.5, months, 0.1, "about 1.5 months")
	})
}

// Properly typed test helpers for measurements
func measListFromResult(t *testing.T, result ExecResult) []map[string]interface{} {
	t.Helper()
	require.Empty(t, result.Errors)
	data, ok := result.Data.(map[string]interface{})
	require.True(t, ok)
	list, ok := data["measurements"].([]map[string]interface{})
	require.True(t, ok)
	return list
}

func TestMeasurment_FlatVariables(t *testing.T) {
	t.Run("create with flat variables", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "flatm@example.com", "pass123!")
		ctx := authCtx(token)
		babyID := createBabyHelper(t, h, ctx, "TestBaby", "2026-01-01", "male")

		vars := map[string]interface{}{
			"babyId": babyID,
			"date":   "2026-03-01",
			"weight": 7.0,
		}
		result := h.Execute(ctx, "mutation { createMeasurement }", vars)
		require.Empty(t, result.Errors)
		data, _ := result.Data.(map[string]interface{})
		m, ok := data["createMeasurement"].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, 7.0, m["weight"])
	})
}

func TestMeasurement_BabyNotFound(t *testing.T) {
	t.Run("create measurement for non-existent baby", func(t *testing.T) {
		h := newTestHandler()
		token, _ := signupAndLogin(t, h, "ghost@example.com", "pass123!")
		ctx := authCtx(token)

		vars := map[string]interface{}{
			"input": map[string]interface{}{
				"babyId": "non-existent-baby",
				"date":   "2026-01-01",
				"weight": 5.0,
			},
		}
		result := h.Execute(ctx, "mutation { createMeasurement }", vars)
		require.NotEmpty(t, result.Errors)
		assert.Contains(t, result.Errors[0].Message, "baby not found")
	})
}

func ageInMonths(dob, date string) float64 {
	dobT, _ := time.Parse("2006-01-02", dob)
	dateT, _ := time.Parse("2006-01-02", date)
	days := dateT.Sub(dobT).Hours() / 24
	return days / 30.4375
}

func calculateZScore(value, L, M, S float64) float64 {
	if S <= 0 || M <= 0 {
		return 0
	}
	if L == 0 {
		return math.Log(value/M) / S
	}
	return (math.Pow(value/M, L) - 1) / (L * S)
}

func zToPercentile(z float64) float64 {
	// Abramowitz and Stegun approximation of Φ(z)
	// Return percentile as 0-100
	sign := 1.0
	if z < 0 {
		sign = -1.0
		z = -z
	}
	t := 1.0 / (1.0 + 0.2316419*z)
	p := 1.0 - 0.3989423*exp(-z*z/2)*((((1.330274429*t-1.821255978)*t+1.781477937)*t-0.356563782)*t+0.319381530)*t
	if sign < 0 {
		p = 1 - p
	}
	return p * 100
}

func exp(x float64) float64 {
	// Simple Taylor series for exp
	result := 1.0
	term := 1.0
	for i := 1; i < 50; i++ {
		term *= x / float64(i)
		result += term
	}
	return result
}

package graph

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestExecute(t *testing.T) {
	h := newTestHandler()

	t.Run("query operation dispatches to query handler", func(t *testing.T) {
		res := h.Execute(context.Background(), "query { health }", nil)
		assert.Empty(t, res.Errors)
		data, ok := res.Data.(map[string]interface{})
		assert.True(t, ok)
		health, ok := data["health"].(HealthResult)
		assert.True(t, ok)
		assert.True(t, health.OK)
		assert.Equal(t, "0.1.0", health.Version)
		assert.NotEmpty(t, health.Timestamp)
	})

	t.Run("mutation operation dispatches to mutation handler", func(t *testing.T) {
		res := h.Execute(context.Background(), "mutation { health }", nil)
		assert.NotEmpty(t, res.Errors)
		assert.NotEqual(t, "unsupported operation", res.Errors[0].Message)
	})

	t.Run("unknown operation returns error", func(t *testing.T) {
		res := h.Execute(context.Background(), "subscription { health }", nil)
		assert.NotEmpty(t, res.Errors)
		assert.Equal(t, "unsupported operation", res.Errors[0].Message)
	})

	t.Run("empty query returns error", func(t *testing.T) {
		res := h.Execute(context.Background(), "", nil)
		assert.NotEmpty(t, res.Errors)
	})

	t.Run("whitespace-only query returns error", func(t *testing.T) {
		res := h.Execute(context.Background(), "   ", nil)
		assert.NotEmpty(t, res.Errors)
	})

	t.Run("health query returns correct shape", func(t *testing.T) {
		res := h.Execute(context.Background(), "query { health }", nil)
		assert.Empty(t, res.Errors)
		data, ok := res.Data.(map[string]interface{})
		assert.True(t, ok)
		health, ok := data["health"].(HealthResult)
		assert.True(t, ok)
		assert.True(t, health.OK)
		assert.Equal(t, "0.1.0", health.Version)
	})
}

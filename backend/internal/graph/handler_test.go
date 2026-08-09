package graph

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExecute(t *testing.T) {
	h := newTestHandler()
	healthQuery := "query { health { ok timestamp version } }"

	t.Run("query operation dispatches to query handler", func(t *testing.T) {
		res := h.Execute(context.Background(), healthQuery, nil)
		assert.Empty(t, res.Errors)
		data, ok := res.Data.(map[string]interface{})
		assert.True(t, ok)
		health, ok := data["health"].(map[string]interface{})
		assert.True(t, ok)
		assert.Equal(t, true, health["ok"])
		assert.Equal(t, "0.1.0", health["version"])
		assert.NotEmpty(t, health["timestamp"])
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
		res := h.Execute(context.Background(), healthQuery, nil)
		assert.Empty(t, res.Errors)
		data, ok := res.Data.(map[string]interface{})
		assert.True(t, ok)
		health, ok := data["health"].(map[string]interface{})
		assert.True(t, ok)
		assert.Equal(t, true, health["ok"])
		assert.Equal(t, "0.1.0", health["version"])
	})
}

func TestGraphQLSchemaRejectsUnknownField(t *testing.T) {
	h := newTestHandler()
	res := h.Execute(context.Background(), "query { unknownField }", nil)
	require.NotEmpty(t, res.Errors)
	assert.Contains(t, res.Errors[0].Message, "Cannot query field")
}

func TestGraphQLSchemaRejectsDedicatedDemoField(t *testing.T) {
	h := newTestHandler()
	res := h.Execute(context.Background(), "query { demoData }", nil)
	require.NotEmpty(t, res.Errors)
	assert.Contains(t, res.Errors[0].Message, "Cannot query field")
}

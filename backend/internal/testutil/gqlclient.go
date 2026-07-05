package testutil

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/azhry/nala-grow/backend/internal/auth"
	"github.com/azhry/nala-grow/backend/internal/graph"
)

// GQLResult wraps graph.ExecResult for easier test assertions.
type GQLResult struct {
	Data   map[string]interface{} `json:"data,omitempty"`
	Errors []graph.GraphQLError   `json:"errors,omitempty"`
}

// NewTestHandler creates a graph.Handler with an in-memory auth service suitable for tests.
func NewTestHandler() *graph.Handler {
	authSvc := auth.NewService("test-secret-change-in-test")
	return graph.NewHandler(nil, authSvc)
}

// ExecuteQuery is a convenience wrapper around handler.Execute for tests.
func ExecuteQuery(handler *graph.Handler, query string, variables map[string]interface{}) GQLResult {
	result := handler.Execute(context.Background(), query, variables)
	var data map[string]interface{}
	if result.Data != nil {
		switch v := result.Data.(type) {
		case map[string]interface{}:
			data = v
		default:
			b, _ := json.Marshal(result.Data)
			json.Unmarshal(b, &data)
		}
	}
	return GQLResult{Data: data, Errors: result.Errors}
}

// HasError checks if any error contains the given substring.
func HasError(errors []graph.GraphQLError, substr string) bool {
	for _, e := range errors {
		if strings.Contains(e.Message, substr) {
			return true
		}
	}
	return false
}

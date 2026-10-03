package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/azhry/nala-grow/backend/internal/graph"
	"github.com/azhry/nala-grow/backend/internal/middleware"
)

type graphqlRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables"`
}

func graphqlEndpoint(handler *graph.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			w.Header().Set("Content-Type", "text/html")
			_, _ = w.Write(graph.PlaygroundHTML)
			return
		}
		if r.Method != http.MethodPost {
			middleware.SetErrorCode(r.Context(), "method_not_allowed")
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		var req graphqlRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			middleware.SetErrorCode(r.Context(), "invalid_request_body")
			slog.WarnContext(r.Context(), "GraphQL request rejected",
				"request_id", middleware.RequestIDFromContext(r.Context()),
				"error_code", "invalid_request_body",
			)
			writeError(w, "invalid request body")
			return
		}

		result := handler.Execute(r.Context(), req.Query, req.Variables)
		logGraphQLRequest(r.Context(), req.Query, result)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(result)
	}
}

func logGraphQLRequest(ctx context.Context, query string, response graph.ExecResult) {
	operationType, operationName := graphqlOperationMetadata(query)
	errorCount := len(response.Errors)
	middleware.SetGraphQLErrorCount(ctx, errorCount)

	attrs := []any{
		"operation_type", operationType,
		"operation_name", operationName,
		"error_count", errorCount,
		"has_data", response.Data != nil,
	}
	if requestID := middleware.RequestIDFromContext(ctx); requestID != "" {
		attrs = append(attrs, "request_id", requestID)
	}
	if errorCount > 0 {
		attrs = append(attrs, "error_class", "graphql_operation_error")
		slog.ErrorContext(ctx, "graphql request", attrs...)
		return
	}
	slog.InfoContext(ctx, "graphql request", attrs...)
}

func graphqlOperationMetadata(query string) (string, string) {
	query = strings.TrimSpace(query)
	if strings.HasPrefix(query, "{") {
		return "query", ""
	}

	operationType, next := nextGraphQLName(query, 0)
	if operationType != "query" && operationType != "mutation" && operationType != "subscription" {
		return "unknown", ""
	}
	operationName, _ := nextGraphQLName(query, next)
	return operationType, operationName
}

func nextGraphQLName(query string, start int) (string, int) {
	index := start
	for index < len(query) {
		switch query[index] {
		case ' ', '\t', '\r', '\n', ',':
			index++
		case '#':
			for index < len(query) && query[index] != '\n' {
				index++
			}
		default:
			goto tokenStart
		}
	}

tokenStart:
	if index >= len(query) || !isGraphQLNameStart(query[index]) {
		return "", index
	}
	tokenEnd := index + 1
	for tokenEnd < len(query) && isGraphQLNameContinue(query[tokenEnd]) {
		tokenEnd++
	}
	return query[index:tokenEnd], tokenEnd
}

func isGraphQLNameStart(char byte) bool {
	return char == '_' || char >= 'A' && char <= 'Z' || char >= 'a' && char <= 'z'
}

func isGraphQLNameContinue(char byte) bool {
	return isGraphQLNameStart(char) || char >= '0' && char <= '9'
}

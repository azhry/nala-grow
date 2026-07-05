package graph

import (
	"context"
	"strings"
)

type Handler struct {
	db interface{ Close() }
}

func NewHandler(db interface{ Close() }) *Handler {
	return &Handler{db: db}
}

type ExecResult struct {
	Data   interface{} `json:"data,omitempty"`
	Errors []GraphQLError `json:"errors,omitempty"`
}

func (h *Handler) Execute(ctx context.Context, query string, variables map[string]interface{}) ExecResult {
	query = strings.TrimSpace(query)

	switch {
	case strings.HasPrefix(query, "query"):
		return h.execQuery(ctx, query, variables)
	case strings.HasPrefix(query, "mutation"):
		return h.execMutation(ctx, query, variables)
	default:
		return ExecResult{Errors: []GraphQLError{{Message: "unsupported operation"}}}
	}
}

func (h *Handler) execQuery(ctx context.Context, query string, variables map[string]interface{}) ExecResult {
	body := strings.ToLower(query)

	if strings.Contains(body, "health") {
		return ExecResult{Data: map[string]interface{}{
			"health": NewHealth(),
		}}
	}

	return ExecResult{Errors: []GraphQLError{{Message: "unknown query"}}}
}

func (h *Handler) execMutation(ctx context.Context, query string, variables map[string]interface{}) ExecResult {
	return ExecResult{Errors: []GraphQLError{{Message: "not implemented"}}}
}

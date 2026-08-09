package graph

import (
	"context"
	"strings"

	"github.com/azhry/nala-grow/backend/internal/auth"
	"github.com/graphql-go/graphql"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	db             *pgxpool.Pool
	auth           *auth.Service
	googleVerifier *auth.GoogleTokenVerifier
	resetTokens    *auth.ResetTokenStore
	googleClientID string
	schema         graphql.Schema
	schemaErr      error
}

// NewHandler requires PostgreSQL. GraphQL operations never use process-local
// state as a persistence substitute.
func NewHandler(db *pgxpool.Pool, authSvc *auth.Service) *Handler {
	h := &Handler{
		db:             db,
		auth:           authSvc,
		googleVerifier: auth.NewGoogleTokenVerifier(),
		resetTokens:    auth.NewResetTokenStore(),
	}
	h.schema, h.schemaErr = newSchema(h)
	return h
}

// SetGoogleClientID configures the expected Google OAuth client ID for token verification.
func (h *Handler) SetGoogleClientID(clientID string) {
	h.googleClientID = clientID
}

func (h *Handler) Execute(ctx context.Context, query string, variables map[string]interface{}) ExecResult {
	query = strings.TrimSpace(query)
	if query == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "query is required"}}}
	}
	if strings.HasPrefix(strings.ToLower(query), "subscription") {
		return ExecResult{Errors: []GraphQLError{{Message: "unsupported operation"}}}
	}
	if legacyQuery, operation, field, ok := normalizeLegacyRequest(query, variables); ok {
		if legacyMissingRequired(operation, field, variables) {
			return legacyValidationResult(operation, field, variables)
		}
		query = legacyQuery
	}
	if h.schemaErr != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "graphql schema unavailable"}}}
	}

	result := graphql.Do(graphql.Params{
		Schema:         h.schema,
		RequestString:  query,
		VariableValues: variables,
		Context:        ctx,
	})
	execResult := ExecResult{Data: normalizeGraphQLData(result.Data)}
	for _, err := range result.Errors {
		execResult.Errors = append(execResult.Errors, GraphQLError{Message: err.Message})
	}
	return execResult
}

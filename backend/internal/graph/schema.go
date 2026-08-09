package graph

import "github.com/graphql-go/graphql"

// newSchema assembles the transport contract from focused type, query, and
// mutation modules. Each root field receives its own resolver function; the
// request executor only delegates parsing, validation, and execution to
// graphql-go.
func newSchema(h *Handler) (graphql.Schema, error) {
	types := newGraphTypes()
	query := graphql.NewObject(graphql.ObjectConfig{
		Name:   "Query",
		Fields: newQueryFields(h, types),
	})
	mutation := graphql.NewObject(graphql.ObjectConfig{
		Name:   "Mutation",
		Fields: newMutationFields(h, types),
	})

	return graphql.NewSchema(graphql.SchemaConfig{
		Query:    query,
		Mutation: mutation,
	})
}

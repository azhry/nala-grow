package graph

import (
	"context"

	"github.com/azhry/nala-grow/backend/internal/auth"
)

func newTestHandler() *Handler {
	authSvc := auth.NewService("test-secret-integration")
	return NewHandler(nil, authSvc)
}

func authCtx(token string) context.Context {
	return context.WithValue(context.Background(), "raw_token", token)
}

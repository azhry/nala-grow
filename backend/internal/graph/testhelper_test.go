package graph

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/azhry/nala-grow/backend/internal/auth"
	"github.com/azhry/nala-grow/backend/internal/dbtest"
	"github.com/jackc/pgx/v5/pgxpool"
)

var testPool *pgxpool.Pool

func TestMain(m *testing.M) {
	ctx, cancel := context.WithTimeout(context.Background(), dbtest.DefaultTimeout)
	defer cancel()

	harness, err := dbtest.Start(ctx)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Testcontainers PostgreSQL is required for graph tests:", err)
		os.Exit(1)
	}
	testPool = harness.Pool

	if _, err := testPool.Exec(ctx, "TRUNCATE TABLE milestones, measurements, sleep_sessions, feeding_sessions, babies, users CASCADE"); err != nil {
		fmt.Fprintln(os.Stderr, "could not reset graph test database:", err)
		_ = harness.Close(ctx)
		os.Exit(1)
	}
	code := m.Run()
	if err := harness.Close(ctx); err != nil {
		fmt.Fprintln(os.Stderr, "could not stop graph test PostgreSQL container:", err)
		if code == 0 {
			code = 1
		}
	}
	os.Exit(code)
}

func newTestHandler() *Handler {
	authSvc := auth.NewService("test-secret-integration")
	return NewHandler(testPool, authSvc)
}

func authCtx(token string) context.Context {
	return context.WithValue(context.Background(), "raw_token", token)
}

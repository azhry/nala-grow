package graph

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/azhry/nala-grow/backend/internal/auth"
	"github.com/azhry/nala-grow/backend/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

var testPool *pgxpool.Pool

func TestMain(m *testing.M) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://nalagrow:nalagrow@localhost:5432/nalagrow?sslmode=disable"
	}
	if err := db.RunMigrations(databaseURL); err != nil {
		fmt.Fprintln(os.Stderr, "PostgreSQL is required for graph tests:", err)
		os.Exit(1)
	}
	pool, err := db.Connect(ctx, databaseURL)
	if err != nil {
		fmt.Fprintln(os.Stderr, "PostgreSQL is required for graph tests:", err)
		os.Exit(1)
	}
	testPool = pool
	defer pool.Close()

	if _, err := pool.Exec(ctx, "TRUNCATE TABLE milestones, measurements, sleep_sessions, feeding_sessions, babies, users CASCADE"); err != nil {
		fmt.Fprintln(os.Stderr, "could not reset graph test database:", err)
		os.Exit(1)
	}
	os.Exit(m.Run())
}

func newTestHandler() *Handler {
	authSvc := auth.NewService("test-secret-integration")
	return NewHandler(testPool, authSvc)
}

func authCtx(token string) context.Context {
	return context.WithValue(context.Background(), "raw_token", token)
}

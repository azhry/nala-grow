package dbtest

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/azhry/nala-grow/backend/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

const postgresImage = "postgres:16-alpine"

// Harness is an isolated PostgreSQL database provisioned by Testcontainers.
type Harness struct {
	DatabaseURL string
	Pool        *pgxpool.Pool
	container   testcontainers.Container
}

// Start provisions PostgreSQL, applies all migrations, and returns a ready pool.
// Call Close when the test package completes.
func Start(ctx context.Context) (*Harness, error) {
	container, err := postgres.Run(
		ctx,
		postgresImage,
		postgres.WithDatabase("nalagrow_test"),
		postgres.WithUsername("nalagrow_test"),
		postgres.WithPassword("nalagrow_test"),
		postgres.BasicWaitStrategies(),
	)
	if err != nil {
		return nil, fmt.Errorf("start postgres container: %w", err)
	}

	cleanup := func() {
		_ = container.Terminate(context.Background())
	}

	databaseURL, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		cleanup()
		return nil, fmt.Errorf("get postgres connection string: %w", err)
	}
	if err := db.RunMigrations(databaseURL); err != nil {
		cleanup()
		return nil, fmt.Errorf("run migrations: %w", err)
	}

	pool, err := db.Connect(ctx, databaseURL)
	if err != nil {
		cleanup()
		return nil, fmt.Errorf("connect postgres pool: %w", err)
	}

	return &Harness{DatabaseURL: databaseURL, Pool: pool, container: container}, nil
}

// Close releases the pool and removes the Testcontainers database.
func (h *Harness) Close(ctx context.Context) error {
	if h.Pool != nil {
		h.Pool.Close()
	}
	if h.container == nil {
		return nil
	}
	return h.container.Terminate(ctx)
}

// SeedFile executes a deterministic SQL fixture against the migrated database.
func (h *Harness) SeedFile(ctx context.Context, path string) error {
	seedSQL, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read seed file: %w", err)
	}

	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin seed transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if _, err := tx.Exec(ctx, string(seedSQL)); err != nil {
		return fmt.Errorf("execute seed SQL: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit seed transaction: %w", err)
	}
	return nil
}

// DefaultTimeout bounds container startup and package cleanup.
const DefaultTimeout = 2 * time.Minute

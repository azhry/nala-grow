package db

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConnectInvalidURL(t *testing.T) {
	t.Run("empty database URL", func(t *testing.T) {
		ctx := context.Background()
		pool, err := Connect(ctx, "")
		assert.Error(t, err)
		assert.Nil(t, pool)
	})

	t.Run("malformed database URL", func(t *testing.T) {
		ctx := context.Background()
		pool, err := Connect(ctx, "not-a-valid-url")
		assert.Error(t, err)
		assert.Nil(t, pool)
	})

	t.Run("invalid scheme", func(t *testing.T) {
		ctx := context.Background()
		pool, err := Connect(ctx, "http://localhost:5432/db")
		assert.Error(t, err)
		assert.Nil(t, pool)
	})

	t.Run("unreachable host", func(t *testing.T) {
		ctx := context.Background()
		pool, err := Connect(ctx, "postgres://localhost:19999/testdb?connect_timeout=1")
		assert.Error(t, err, "connection to unreachable host should fail")
		assert.Nil(t, pool)
	})
}

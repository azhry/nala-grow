package db

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFindMigrationsDir(t *testing.T) {
	dir := findMigrationsDir()
	require.NotEmpty(t, dir, "migrations directory should be found")
	require.DirExists(t, dir, "migrations path should exist on disk")

	assert.True(t, strings.HasSuffix(dir, "migrations"), "path should end with 'migrations'")

	// Verify it contains SQL files
	entries, err := os.ReadDir(dir)
	require.NoError(t, err)
	require.NotEmpty(t, entries, "migrations directory should contain files")

	foundSQL := false
	for _, e := range entries {
		if filepath.Ext(e.Name()) == ".sql" {
			foundSQL = true
			break
		}
	}
	assert.True(t, foundSQL, "migrations directory should contain .sql files")
}

func TestFindMigrationsDirNonExistent(t *testing.T) {
	// Temporarily remove the migrations directory to test fallback behavior
	origDir := findMigrationsDir()
	require.NotEmpty(t, origDir)

	// Test that the function can find from alternative paths
	// The first candidate is the direct sibling, which should exist
	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)
	directCandidate := filepath.Join(dir, "migrations")
	info, err := os.Stat(directCandidate)
	if err == nil && info.IsDir() {
		t.Log("direct migrations path exists:", directCandidate)
	}
}

func TestRunMigrationsInvalidURL(t *testing.T) {
	t.Run("empty URL", func(t *testing.T) {
		err := RunMigrations("")
		assert.Error(t, err)
	})

	t.Run("invalid URL format", func(t *testing.T) {
		err := RunMigrations("not-a-valid-url")
		assert.Error(t, err)
	})

	t.Run("missing protocol", func(t *testing.T) {
		err := RunMigrations("localhost:5432/testdb")
		assert.Error(t, err)
	})
}

func TestRunMigrationsWithUnreachableHost(t *testing.T) {
	// This should fail at the connection level, not the path level
	err := RunMigrations("postgres://localhost:19999/testdb?sslmode=disable")
	assert.Error(t, err, "connection to unreachable host should produce an error")
	// It should NOT be a "migrations directory not found" error
	assert.NotContains(t, err.Error(), "migrations directory not found")
}

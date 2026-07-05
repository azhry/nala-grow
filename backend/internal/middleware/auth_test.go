package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuth(t *testing.T) {
	t.Run("no Authorization header passes through", func(t *testing.T) {
		var capturedCtx context.Context
		handler := Auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			capturedCtx = r.Context()
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		token, _ := capturedCtx.Value("raw_token").(string)
		assert.Empty(t, token, "no token should be set in context")
	})

	t.Run("Bearer token sets raw_token in context", func(t *testing.T) {
		var capturedCtx context.Context
		handler := Auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			capturedCtx = r.Context()
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer my-test-token")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		require.NotNil(t, capturedCtx)
		token, _ := capturedCtx.Value("raw_token").(string)
		assert.Equal(t, "my-test-token", token)
	})

	t.Run("malformed Bearer prefix does not set token", func(t *testing.T) {
		var capturedCtx context.Context
		handler := Auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			capturedCtx = r.Context()
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "NotBearer something")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		token, _ := capturedCtx.Value("raw_token").(string)
		assert.Empty(t, token, "malformed prefix should not set token")
	})

	t.Run("empty Bearer value does not set token", func(t *testing.T) {
		var capturedCtx context.Context
		handler := Auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			capturedCtx = r.Context()
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer ")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		token, _ := capturedCtx.Value("raw_token").(string)
		assert.Empty(t, token, "empty bearer value should not set token")
	})

	t.Run("Authorization with no space after Bearer", func(t *testing.T) {
		var capturedCtx context.Context
		handler := Auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			capturedCtx = r.Context()
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearersomething")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		token, _ := capturedCtx.Value("raw_token").(string)
		assert.Empty(t, token, "no Bearer prefix match")
	})

	t.Run("subsequent requests do not share context values", func(t *testing.T) {
		handler := Auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		req1 := httptest.NewRequest(http.MethodGet, "/", nil)
		req1.Header.Set("Authorization", "Bearer token-one")
		rec1 := httptest.NewRecorder()
		handler.ServeHTTP(rec1, req1)

		req2 := httptest.NewRequest(http.MethodGet, "/", nil)
		// No Authorization header
		rec2 := httptest.NewRecorder()
		handler.ServeHTTP(rec2, req2)

		assert.Equal(t, http.StatusOK, rec1.Code)
		assert.Equal(t, http.StatusOK, rec2.Code)
	})
}

func TestUserIDFromContext(t *testing.T) {
	t.Run("returns empty when not set", func(t *testing.T) {
		ctx := context.Background()
		assert.Empty(t, UserIDFromContext(ctx))
	})

	t.Run("returns value when set", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), UserIDKey, "user-123")
		assert.Equal(t, "user-123", UserIDFromContext(ctx))
	})

	t.Run("returns empty for wrong type", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), UserIDKey, 42)
		assert.Empty(t, UserIDFromContext(ctx))
	})
}

func TestUserEmailFromContext(t *testing.T) {
	t.Run("returns empty when not set", func(t *testing.T) {
		ctx := context.Background()
		assert.Empty(t, UserEmailFromContext(ctx))
	})

	t.Run("returns value when set", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), UserEmailKey, "test@example.com")
		assert.Equal(t, "test@example.com", UserEmailFromContext(ctx))
	})

	t.Run("returns empty for wrong type", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), UserEmailKey, true)
		assert.Empty(t, UserEmailFromContext(ctx))
	})
}

package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRecovery(t *testing.T) {
	t.Run("passes through when no panic", func(t *testing.T) {
		var handlerCalled bool
		handler := Recovery(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("hello"))
		}))

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "hello", rec.Body.String())
	})

	t.Run("recovers from panic and returns 500", func(t *testing.T) {
		handler := Recovery(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			panic("something went wrong")
		}))

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusInternalServerError, rec.Code)
		assert.Contains(t, rec.Body.String(), "PANIC")
	})

	t.Run("recovers from panic with nil", func(t *testing.T) {
		handler := Recovery(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			panic(nil)
		}))

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusInternalServerError, rec.Code)
		assert.Contains(t, rec.Body.String(), "PANIC")
	})

	t.Run("recovers from panic with structured value", func(t *testing.T) {
		handler := Recovery(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			panic(map[string]string{"reason": "db timeout"})
		}))

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusInternalServerError, rec.Code)
		assert.Contains(t, rec.Body.String(), "PANIC")
	})

	t.Run("response is valid JSON", func(t *testing.T) {
		handler := Recovery(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			panic("crash")
		}))

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusInternalServerError, rec.Code)
		assert.JSONEq(t, `{"error":"internal server error","code":"PANIC"}`, rec.Body.String())
	})
}

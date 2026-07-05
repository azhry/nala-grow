package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRequestLogger(t *testing.T) {
	t.Run("logs and passes through to handler", func(t *testing.T) {
		var handlerCalled bool
		handler := RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("ok"))
		}))

		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.True(t, handlerCalled, "underlying handler should be called")
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "ok", rec.Body.String())
	})

	t.Run("captures non-200 status codes", func(t *testing.T) {
		handler := RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("not found"))
		}))

		req := httptest.NewRequest(http.MethodGet, "/missing", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusNotFound, rec.Code)
	})

	t.Run("captures error status codes", func(t *testing.T) {
		handler := RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("error"))
		}))

		req := httptest.NewRequest(http.MethodPost, "/api/data", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusInternalServerError, rec.Code)
	})

	t.Run("default status is 200 when WriteHeader not called", func(t *testing.T) {
		var rw *responseWriter
		handler := RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var ok bool
			rw, ok = w.(*responseWriter)
			assert.True(t, ok, "handler should receive *responseWriter")
			w.Write([]byte("no explicit status"))
		}))

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		if rw != nil {
			assert.Equal(t, http.StatusOK, rw.status, "default status should be 200")
		}
	})

	t.Run("responseWriter WriteHeader sets status", func(t *testing.T) {
		rw := &responseWriter{ResponseWriter: httptest.NewRecorder(), status: http.StatusOK}
		rw.WriteHeader(http.StatusTeapot)
		assert.Equal(t, http.StatusTeapot, rw.status)
	})
}

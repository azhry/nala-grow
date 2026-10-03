package middleware

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
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

func TestRecoveryLogsCorrelatedPanicTypeWithoutValueOrStack(t *testing.T) {
	var output bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&output, nil)))
	t.Cleanup(func() { slog.SetDefault(previousLogger) })

	router := chi.NewRouter()
	router.Use(RequestLogger)
	router.Use(Recovery)
	router.Get("/items/{id}", func(http.ResponseWriter, *http.Request) {
		panic("private panic value")
	})
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/items/1", nil))

	if response.Code != http.StatusInternalServerError {
		t.Fatalf("panic response status = %d", response.Code)
	}
	var record map[string]any
	if err := json.Unmarshal(bytes.TrimSpace(output.Bytes()), &record); err != nil {
		t.Fatalf("panic log is not valid JSON: %v (%q)", err, output.String())
	}
	if record["status"] != float64(http.StatusInternalServerError) || record["error_code"] != "panic" || record["panic_type"] != "string" {
		t.Fatalf("panic fields = %#v", record)
	}
	if record["route"] != "/items/{id}" || response.Header().Get("X-Request-ID") != record["request_id"] {
		t.Fatalf("panic correlation fields = %#v header=%q", record, response.Header().Get("X-Request-ID"))
	}
	if strings.Contains(output.String(), "private panic value") || strings.Contains(output.String(), "goroutine") {
		t.Fatalf("panic value or stack leaked into log: %q", output.String())
	}
}

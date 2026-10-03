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

func TestRequestLogger(t *testing.T) {
	var output bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&output, nil)))
	t.Cleanup(func() { slog.SetDefault(previousLogger) })

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

func TestRequestLoggerCorrelatesErrorAndOmitsConcretePathAndQuery(t *testing.T) {
	var output bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&output, nil)))
	t.Cleanup(func() { slog.SetDefault(previousLogger) })

	router := chi.NewRouter()
	router.Use(RequestLogger)
	router.Get("/items/{id}", func(w http.ResponseWriter, r *http.Request) {
		SetErrorCode(r.Context(), "item_not_found")
		http.Error(w, "not found", http.StatusNotFound)
	})
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/items/private-id?access_token=private-token", nil)
	request.Header.Set("X-Request-ID", "client-supplied-id")
	router.ServeHTTP(response, request)

	requestID := response.Header().Get("X-Request-ID")
	if requestID == "" || requestID == "client-supplied-id" {
		t.Fatalf("request ID was missing or accepted from the client: %q", requestID)
	}
	var record map[string]any
	record = lastMiddlewareLogRecord(t, output.String())
	if record["request_id"] != requestID || record["route"] != "/items/{id}" || record["method"] != http.MethodGet {
		t.Fatalf("correlation fields = %#v", record)
	}
	if record["status"] != float64(http.StatusNotFound) || record["error_code"] != "item_not_found" || record["error_class"] != "client_error" {
		t.Fatalf("error fields = %#v", record)
	}
	if record["duration_ms"] == nil || record["response_bytes"] == nil {
		t.Fatalf("duration/response size missing: %#v", record)
	}
	if strings.Contains(output.String(), "private-id") || strings.Contains(output.String(), "access_token") || strings.Contains(output.String(), "private-token") {
		t.Fatalf("concrete path or query data leaked into log: %q", output.String())
	}
}

func TestRequestLoggerClassifiesGraphQLErrorsWithHTTP200(t *testing.T) {
	var output bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&output, nil)))
	t.Cleanup(func() { slog.SetDefault(previousLogger) })

	handler := RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		SetGraphQLErrorCount(r.Context(), 2)
		w.WriteHeader(http.StatusOK)
	}))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/graphql", nil))

	var record map[string]any
	record = lastMiddlewareLogRecord(t, output.String())
	if record["status"] != float64(http.StatusOK) || record["graphql_error_count"] != float64(2) || record["error_class"] != "graphql_operation_error" {
		t.Fatalf("GraphQL diagnostic fields = %#v", record)
	}
}

func lastMiddlewareLogRecord(t *testing.T, output string) map[string]any {
	t.Helper()
	lines := strings.Split(strings.TrimSpace(output), "\n")
	if len(lines) == 0 || lines[0] == "" {
		t.Fatalf("structured log record is missing: %q", output)
	}
	var record map[string]any
	if err := json.Unmarshal([]byte(lines[len(lines)-1]), &record); err != nil {
		t.Fatalf("last request log is not a JSON record: %v (%q)", err, output)
	}
	return record
}

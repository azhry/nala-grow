package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/go-chi/chi/v5"
)

type requestDiagnosticKey struct{}

type requestDiagnosticState struct {
	requestID     string
	errorCode     string
	panicType     string
	graphqlErrors int
}

type responseWriter struct {
	http.ResponseWriter
	status    int
	bytes     int
	wroteHead bool
}

func (rw *responseWriter) WriteHeader(code int) {
	if rw.wroteHead {
		return
	}
	rw.status = code
	rw.wroteHead = true
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(body []byte) (int, error) {
	if !rw.wroteHead {
		rw.WriteHeader(http.StatusOK)
	}
	written, err := rw.ResponseWriter.Write(body)
	rw.bytes += written
	return written, err
}

func (rw *responseWriter) Flush() {
	if !rw.wroteHead {
		rw.WriteHeader(http.StatusOK)
	}
	if flusher, ok := rw.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		state := &requestDiagnosticState{requestID: newRequestID()}
		ctx := context.WithValue(r.Context(), requestDiagnosticKey{}, state)
		r = r.WithContext(ctx)
		rw := &responseWriter{ResponseWriter: w}
		rw.Header().Set("X-Request-ID", state.requestID)
		next.ServeHTTP(rw, r)

		status := rw.status
		if status == 0 {
			status = http.StatusOK
		}
		route := routeTemplate(r.Context())
		attrs := []any{
			"event", "http_request",
			"request_id", state.requestID,
			"method", r.Method,
			"route", route,
			"status", status,
			"duration_ms", float64(time.Since(started).Microseconds()) / 1000,
			"response_bytes", rw.bytes,
		}
		if state.errorCode != "" {
			attrs = append(attrs, "error_code", state.errorCode)
		}
		if state.panicType != "" {
			attrs = append(attrs, "panic_type", state.panicType)
		}
		if state.graphqlErrors > 0 {
			attrs = append(attrs, "graphql_error_count", state.graphqlErrors)
		}

		switch {
		case status >= http.StatusInternalServerError || state.panicType != "":
			attrs = append(attrs, "error_class", "server_error")
			slog.ErrorContext(r.Context(), "HTTP request completed", attrs...)
		case status >= http.StatusBadRequest:
			attrs = append(attrs, "error_class", "client_error")
			slog.WarnContext(r.Context(), "HTTP request completed", attrs...)
		case state.graphqlErrors > 0:
			attrs = append(attrs, "error_class", "graphql_operation_error")
			slog.ErrorContext(r.Context(), "HTTP request completed", attrs...)
		default:
			slog.InfoContext(r.Context(), "HTTP request completed", attrs...)
		}
	})
}

func RequestIDFromContext(ctx context.Context) string {
	if state, ok := ctx.Value(requestDiagnosticKey{}).(*requestDiagnosticState); ok && state != nil {
		return state.requestID
	}
	return ""
}

func SetErrorCode(ctx context.Context, code string) {
	if state, ok := ctx.Value(requestDiagnosticKey{}).(*requestDiagnosticState); ok && state != nil {
		state.errorCode = safeDiagnosticCode(code)
	}
}

func SetPanic(ctx context.Context, panicType string) {
	if state, ok := ctx.Value(requestDiagnosticKey{}).(*requestDiagnosticState); ok && state != nil {
		state.errorCode = "panic"
		state.panicType = safePanicType(panicType)
	}
}

func SetGraphQLErrorCount(ctx context.Context, errorCount int) {
	if state, ok := ctx.Value(requestDiagnosticKey{}).(*requestDiagnosticState); ok && state != nil {
		state.graphqlErrors = errorCount
	}
}

func routeTemplate(ctx context.Context) string {
	if routeContext := chi.RouteContext(ctx); routeContext != nil {
		if pattern := routeContext.RoutePattern(); pattern != "" {
			return pattern
		}
	}
	return "unmatched"
}

func safeDiagnosticCode(value string) string {
	if len(value) > 80 {
		return ""
	}
	for _, char := range value {
		if (char < 'a' || char > 'z') && (char < 'A' || char > 'Z') && (char < '0' || char > '9') && char != '_' && char != '-' && char != '.' {
			return ""
		}
	}
	return value
}

func safePanicType(value string) string {
	if len(value) > 80 {
		return "other"
	}
	for _, char := range value {
		if (char < 'a' || char > 'z') && (char < 'A' || char > 'Z') && (char < '0' || char > '9') && char != '_' && char != '-' && char != '.' && char != '*' && char != '[' && char != ']' {
			return "other"
		}
	}
	return value
}

var fallbackRequestID atomic.Uint64

func newRequestID() string {
	var id [16]byte
	if _, err := rand.Read(id[:]); err == nil {
		return hex.EncodeToString(id[:])
	}
	return "fallback-" + time.Now().UTC().Format("20060102T150405.000000000") + "-" + strconv.FormatUint(fallbackRequestID.Add(1), 10)
}

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
	requestID             string
	method                string
	errorCode             string
	panicType             string
	graphqlErrors         int
	endpointFailureLogged atomic.Bool
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
		state := &requestDiagnosticState{requestID: newRequestID(), method: r.Method}
		ctx := context.WithValue(r.Context(), requestDiagnosticKey{}, state)
		r = r.WithContext(ctx)
		rw := &responseWriter{ResponseWriter: w}
		rw.Header().Set("X-Request-ID", state.requestID)
		next.ServeHTTP(rw, r)

		status := rw.status
		if status == 0 {
			status = http.StatusOK
		}
		if status >= http.StatusBadRequest && !state.endpointFailureLogged.Load() {
			code := state.errorCode
			if code == "" {
				code = fallbackErrorCode(status)
			}
			LogEndpointFailure(r.Context(), status, fallbackFailureStage(status, code), code, errorClassForStatus(status), "")
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

// LogEndpointFailure records safe diagnostics at a handler or resolver error
// boundary. It intentionally omits request values, query text, and raw errors.
func LogEndpointFailure(ctx context.Context, status int, stage, code, errorClass, field string) {
	state, ok := ctx.Value(requestDiagnosticKey{}).(*requestDiagnosticState)
	if !ok || state == nil {
		return
	}
	state.endpointFailureLogged.Store(true)
	attrs := []any{
		"event", "endpoint_error",
		"request_id", state.requestID,
		"method", state.method,
		"route", routeTemplate(ctx),
		"status", status,
		"failure_stage", stage,
		"error_class", errorClass,
	}
	if safeCode := safeDiagnosticCode(code); safeCode != "" {
		attrs = append(attrs, "error_code", safeCode)
	}
	if safeField := safeDiagnosticCode(field); safeField != "" {
		attrs = append(attrs, "field", safeField)
	}
	if status >= http.StatusInternalServerError || errorClass == "resolver_error" || errorClass == "dependency_error" || status < http.StatusBadRequest {
		slog.ErrorContext(ctx, "API endpoint failed", attrs...)
		return
	}
	slog.WarnContext(ctx, "API endpoint failed", attrs...)
}

func RequestIDFromContext(ctx context.Context) string {
	if state, ok := ctx.Value(requestDiagnosticKey{}).(*requestDiagnosticState); ok && state != nil {
		return state.requestID
	}
	return ""
}

func EndpointFailureLogged(ctx context.Context) bool {
	if state, ok := ctx.Value(requestDiagnosticKey{}).(*requestDiagnosticState); ok && state != nil {
		return state.endpointFailureLogged.Load()
	}
	return false
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

func errorClassForStatus(status int) string {
	if status >= http.StatusInternalServerError {
		return "server_error"
	}
	return "client_error"
}

func fallbackErrorCode(status int) string {
	switch status {
	case http.StatusNotFound:
		return "route_not_found"
	case http.StatusMethodNotAllowed:
		return "method_not_allowed"
	default:
		return "http_error"
	}
}

func fallbackFailureStage(status int, code string) string {
	switch {
	case code == "panic":
		return "panic_recovery"
	case status == http.StatusUnauthorized:
		return "authentication"
	case status == http.StatusForbidden:
		return "authorization"
	case status == http.StatusNotFound:
		return "route_dispatch"
	case status == http.StatusMethodNotAllowed:
		return "method_dispatch"
	case status == http.StatusBadRequest:
		return "request_validation"
	case status >= http.StatusInternalServerError:
		return "server_operation"
	default:
		return "endpoint_response"
	}
}

var fallbackRequestID atomic.Uint64

func newRequestID() string {
	var id [16]byte
	if _, err := rand.Read(id[:]); err == nil {
		return hex.EncodeToString(id[:])
	}
	return "fallback-" + time.Now().UTC().Format("20060102T150405.000000000") + "-" + strconv.FormatUint(fallbackRequestID.Add(1), 10)
}

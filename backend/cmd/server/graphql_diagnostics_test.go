package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/azhry/nala-grow/backend/internal/graph"
	"github.com/azhry/nala-grow/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

func TestGraphQLResolverFailureLogsCorrelatedFieldWithSafeResponseDetails(t *testing.T) {
	var output bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&output, nil)))
	defer slog.SetDefault(previousLogger)

	router := chi.NewRouter()
	router.Use(middleware.RequestLogger)
	router.Use(middleware.Recovery)
	router.Use(middleware.Auth)
	router.Post("/graphql", graphqlEndpoint(graph.NewHandler(nil, nil)))
	requestBody := `{"query":"query BabyList { babies { id } }","variables":{"accessToken":"private-body-canary"}}`
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/graphql", strings.NewReader(requestBody)))

	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "not authenticated") {
		t.Fatalf("GraphQL resolver response changed: status=%d body=%q", response.Code, response.Body.String())
	}
	var failure map[string]any
	scanner := bufio.NewScanner(strings.NewReader(output.String()))
	for scanner.Scan() {
		var record map[string]any
		if err := json.Unmarshal(scanner.Bytes(), &record); err != nil {
			t.Fatalf("invalid structured log record: %v", err)
		}
		if record["event"] == "endpoint_error" {
			failure = record
			break
		}
	}
	if err := scanner.Err(); err != nil {
		t.Fatalf("read log records: %v", err)
	}
	if failure == nil {
		t.Fatalf("resolver failure event missing from logs: %q", output.String())
	}
	if failure["request_id"] != response.Header().Get("X-Request-ID") || failure["method"] != http.MethodPost || failure["route"] != "/graphql" || failure["field"] != "babies" {
		t.Fatalf("resolver failure is not correlated to its API field: %#v", failure)
	}
	if failure["status"] != float64(http.StatusOK) || failure["failure_stage"] != "authentication" || failure["error_code"] != "authentication_failed" || failure["error_class"] != "client_error" {
		t.Fatalf("resolver failure fields = %#v", failure)
	}
	if !strings.Contains(output.String(), `"variables":"[redacted]"`) {
		t.Fatalf("redacted GraphQL variables missing from diagnostics: %q", output.String())
	}
	if strings.Contains(output.String(), "private-body-canary") || strings.Contains(output.String(), "query BabyList") {
		t.Fatalf("GraphQL secret or query text leaked into diagnostics: %q", output.String())
	}
	if !strings.Contains(output.String(), "not authenticated") {
		t.Fatalf("safe GraphQL response error missing from diagnostics: %q", output.String())
	}
}

func TestGraphQLMalformedBodyLogsEndpointFailure(t *testing.T) {
	var output bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&output, nil)))
	defer slog.SetDefault(previousLogger)

	router := chi.NewRouter()
	router.Use(middleware.RequestLogger)
	router.Post("/graphql", graphqlEndpoint(graph.NewHandler(nil, nil)))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/graphql", strings.NewReader(`{"query":`)))

	if response.Code != http.StatusBadRequest {
		t.Fatalf("malformed body status = %d, want %d", response.Code, http.StatusBadRequest)
	}
	var failure map[string]any
	scanner := bufio.NewScanner(strings.NewReader(output.String()))
	for scanner.Scan() {
		var record map[string]any
		if err := json.Unmarshal(scanner.Bytes(), &record); err != nil {
			t.Fatalf("invalid structured log record: %v", err)
		}
		if record["event"] == "endpoint_error" {
			failure = record
			break
		}
	}
	if failure == nil || failure["route"] != "/graphql" || failure["failure_stage"] != "request_decode" || failure["error_code"] != "invalid_request_body" || failure["status"] != float64(http.StatusBadRequest) {
		t.Fatalf("malformed request failure event = %#v (%q)", failure, output.String())
	}
}

func TestGraphQLValidationFailureLogsEndpointFailureWithSanitizedResponseDetails(t *testing.T) {
	var output bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&output, nil)))
	defer slog.SetDefault(previousLogger)

	router := chi.NewRouter()
	router.Use(middleware.RequestLogger)
	router.Post("/graphql", graphqlEndpoint(graph.NewHandler(nil, nil)))
	query := `query InvalidField { privateUnknownField }`
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/graphql", strings.NewReader(`{"query":`+`"`+query+`"}`)))

	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "Cannot query field") {
		t.Fatalf("GraphQL validation response changed: status=%d body=%q", response.Code, response.Body.String())
	}
	var failure map[string]any
	scanner := bufio.NewScanner(strings.NewReader(output.String()))
	for scanner.Scan() {
		var record map[string]any
		if err := json.Unmarshal(scanner.Bytes(), &record); err != nil {
			t.Fatalf("invalid structured log record: %v", err)
		}
		if record["event"] == "endpoint_error" {
			failure = record
			break
		}
	}
	if err := scanner.Err(); err != nil {
		t.Fatalf("read log records: %v", err)
	}
	if failure == nil || failure["request_id"] != response.Header().Get("X-Request-ID") || failure["route"] != "/graphql" || failure["status"] != float64(http.StatusOK) || failure["failure_stage"] != "graphql_execution" || failure["error_code"] != "graphql_operation_failed" {
		t.Fatalf("validation failure event = %#v (%q)", failure, output.String())
	}
	if strings.Contains(output.String(), query) || !strings.Contains(output.String(), "Cannot query field") || !strings.Contains(output.String(), "privateUnknownField") {
		t.Fatalf("GraphQL query source or sanitized response error missing from diagnostics: %q", output.String())
	}
}

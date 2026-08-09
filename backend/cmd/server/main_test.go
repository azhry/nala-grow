package main

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/azhry/nala-grow/backend/internal/auth"
	"github.com/azhry/nala-grow/backend/internal/graph"
)

func TestLoadConfigDefaultsToFrontendDevOrigin(t *testing.T) {
	t.Setenv("ALLOWED_ORIGIN", "")

	if got := loadConfig().AllowedOrigin; got != "http://localhost:3000" {
		t.Fatalf("AllowedOrigin = %q, want http://localhost:3000", got)
	}
}

func TestGraphQLOperationMetadata(t *testing.T) {
	tests := []struct {
		name          string
		query         string
		operationType string
		operationName string
	}{
		{name: "named query", query: "query Health { health { ok } }", operationType: "query", operationName: "Health"},
		{name: "named mutation", query: "mutation CreateBaby { createBaby }", operationType: "mutation", operationName: "CreateBaby"},
		{name: "shorthand query", query: "{ health { ok } }", operationType: "query", operationName: ""},
		{name: "comment before operation", query: "# generated\n mutation Save { health }", operationType: "mutation", operationName: "Save"},
		{name: "unknown document", query: "fragment BabyFields on Baby { id }", operationType: "unknown", operationName: ""},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			operationType, operationName := graphqlOperationMetadata(test.query)
			if operationType != test.operationType || operationName != test.operationName {
				t.Fatalf("graphqlOperationMetadata() = (%q, %q), want (%q, %q)", operationType, operationName, test.operationType, test.operationName)
			}
		})
	}
}

func TestSanitizeGraphQLLogValueRedactsNestedSensitiveFieldsAndBoundsStrings(t *testing.T) {
	value := map[string]interface{}{
		"password": "plain-password",
		"nested": map[string]interface{}{
			"access_token": "plain-token",
			"safe":         strings.Repeat("x", graphqlLogMaxStringLength+10),
		},
		"items": []interface{}{map[string]interface{}{"cookie": "session-cookie"}},
	}

	sanitized, ok := sanitizeGraphQLLogValue(value).(map[string]interface{})
	if !ok {
		t.Fatalf("sanitized value has type %T, want map[string]interface{}", sanitizeGraphQLLogValue(value))
	}
	if sanitized["password"] != graphqlLogRedacted {
		t.Fatalf("password = %v, want redaction", sanitized["password"])
	}
	nested := sanitized["nested"].(map[string]interface{})
	if nested["access_token"] != graphqlLogRedacted {
		t.Fatalf("access_token = %v, want redaction", nested["access_token"])
	}
	bounded := nested["safe"].(string)
	if len([]rune(bounded)) != graphqlLogMaxStringLength || !strings.HasSuffix(bounded, graphqlLogTruncation) {
		t.Fatalf("bounded string length/suffix = (%d, %q), want %d and %q", len([]rune(bounded)), bounded[len(bounded)-len(graphqlLogTruncation):], graphqlLogMaxStringLength, graphqlLogTruncation)
	}
	items := sanitized["items"].([]interface{})
	if items[0].(map[string]interface{})["cookie"] != graphqlLogRedacted {
		t.Fatal("nested cookie should be redacted")
	}
}

func TestSanitizeGraphQLQueryRedactsInlineLiteralsAndComments(t *testing.T) {
	query := `mutation Login { login(email: "parent@example.com", password: "inline-password") { token } } # inline-token`
	sanitized := sanitizeGraphQLQuery(query)
	if strings.Contains(sanitized, "parent@example.com") || strings.Contains(sanitized, "inline-password") || strings.Contains(sanitized, "inline-token") {
		t.Fatalf("sanitized query contains an inline secret: %q", sanitized)
	}
	if !strings.Contains(sanitized, `mutation Login`) || !strings.Contains(sanitized, `login`) {
		t.Fatalf("sanitized query lost operation context: %q", sanitized)
	}
}

func TestGraphQLEndpointLogsRequestAndPreservesResponse(t *testing.T) {
	var logs bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	t.Cleanup(func() { slog.SetDefault(previousLogger) })

	handler := graph.NewHandler(nil, auth.NewService("test-secret"))
	req := httptest.NewRequest(http.MethodPost, "/graphql", strings.NewReader(`{"query":"query Health { health { ok timestamp version } }","variables":{"password":"plain-password","nested":{"accessToken":"plain-token"},"safe":"value"}}`))
	recorder := httptest.NewRecorder()
	graphqlEndpoint(handler).ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	var response map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	data := response["data"].(map[string]interface{})
	if data["health"].(map[string]interface{})["ok"] != true {
		t.Fatalf("response = %v, want healthy response", response)
	}

	var event map[string]interface{}
	if err := json.Unmarshal(logs.Bytes(), &event); err != nil {
		t.Fatalf("decode log event: %v; logs = %s", err, logs.String())
	}
	if event["msg"] != "graphql request" || event["operation_type"] != "query" || event["operation_name"] != "Health" {
		t.Fatalf("log metadata = %v, want graphql request/query/Health", event)
	}
	if !strings.Contains(event["query"].(string), "query Health") {
		t.Fatalf("query log = %q, want operation context", event["query"])
	}
	if strings.Contains(logs.String(), "plain-password") || strings.Contains(logs.String(), "plain-token") {
		t.Fatalf("log contains a sensitive value: %s", logs.String())
	}
}

func TestGraphQLEndpointLogsMalformedBodyWithoutRawRequest(t *testing.T) {
	var logs bytes.Buffer
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	t.Cleanup(func() { slog.SetDefault(previousLogger) })

	rawBody := `{"query":"query Health { health }","password":"raw-password"}`
	req := httptest.NewRequest(http.MethodPost, "/graphql", strings.NewReader(rawBody[:len(rawBody)-1]))
	recorder := httptest.NewRecorder()
	graphqlEndpoint(graph.NewHandler(nil, auth.NewService("test-secret"))).ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusBadRequest)
	}
	if strings.Contains(logs.String(), "raw-password") || !strings.Contains(logs.String(), "invalid request body") {
		t.Fatalf("malformed request log = %s, want warning without raw body", logs.String())
	}
}

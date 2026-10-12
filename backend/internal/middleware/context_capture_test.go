package middleware

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"testing"
)

func TestDiagnosticContextKeepsShapeAndRedactsValues(t *testing.T) {
	var capture bodyCapture
	capture.add([]byte(`{"password":"private-password","value":"vault-secret","apps":[{"name":"private-app"}],"pagination":{"page":1,"pageSize":20,"total":5}}`))
	encoded, err := json.Marshal(capture.summary())
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(encoded), "private-password") || strings.Contains(string(encoded), "vault-secret") || !strings.Contains(string(encoded), "private-app") {
		t.Fatalf("secret entered body summary: %s", encoded)
	}
	if !strings.Contains(string(encoded), `"apps":[{"name":"private-app"}]`) || !strings.Contains(string(encoded), `"total":5`) {
		t.Fatalf("useful body shape missing: %s", encoded)
	}

	headers := diagnosticHeaders(http.Header{"Authorization": {"Bearer private-token"}, "Content-Type": {"application/json"}})
	if headers["Authorization"] != "[redacted]" || headers["Content-Type"].([]string)[0] != "application/json" {
		t.Fatalf("header redaction = %#v", headers)
	}
	query := diagnosticQuery(url.Values{"page": {"2"}, "access_token": {"private-token"}, "limit": {"invalid"}, "code": {"oauth-code"}, "state": {"oauth-state"}})
	if query["page"] != int64(2) || query["access_token"] != "[redacted]" || query["limit"].([]string)[0] != "invalid" || query["code"] != "[redacted]" || query["state"] != "[redacted]" {
		t.Fatalf("query redaction = %#v", query)
	}
	if got := sanitizeDiagnosticText("Bearer private-token token=private-token postgres://user:password@db.example/nala"); got != "Bearer [redacted] token=[redacted] postgres://[redacted]@db.example/nala" {
		t.Fatalf("text secrets were not redacted: %q", got)
	}
	if got := sanitizeDiagnosticText(`{"password":"raw-password"`); strings.Contains(got, "raw-password") {
		t.Fatalf("malformed-body text secret was not redacted: %q", got)
	}
	if invalid := diagnosticQuery(url.Values{"page": {"not-a-number"}})["page"].([]string)[0]; invalid != "not-a-number" {
		t.Fatalf("invalid non-secret query value was not retained: %q", invalid)
	}
}

func TestDiagnosticBodyCaptureIsBounded(t *testing.T) {
	var capture bodyCapture
	capture.add([]byte(strings.Repeat("x", diagnosticBodyLimit+100)))
	if len(capture.data) != diagnosticBodyLimit || capture.total != diagnosticBodyLimit+100 {
		t.Fatalf("capture length = %d, total = %d", len(capture.data), capture.total)
	}
	if capture.summary().(map[string]any)["truncated"] != true {
		t.Fatal("truncated body was not marked")
	}
}

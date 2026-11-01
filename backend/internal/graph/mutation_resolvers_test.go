package graph

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/azhry/nala-grow/backend/internal/auth"
	"github.com/stretchr/testify/require"
)

func TestSignupReportsCasdoorDuplicateActionably(t *testing.T) {
	var signupRequests int
	var userLookups int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			writeTestJSON(t, w, map[string]string{
				"issuer":                 "http://" + r.Host,
				"token_endpoint":         "http://" + r.Host + "/oauth/token",
				"authorization_endpoint": "http://" + r.Host + "/oauth/authorize",
				"jwks_uri":               "http://" + r.Host + "/jwks",
			})
		case "/oauth/token":
			if err := r.ParseForm(); err != nil {
				t.Errorf("parse client credentials request: %v", err)
			}
			if got := r.Form.Get("grant_type"); got != "client_credentials" {
				t.Errorf("grant_type = %q, want client_credentials", got)
			}
			writeTestJSON(t, w, map[string]interface{}{"access_token": "client-access-token", "token_type": "Bearer", "expires_in": 3600})
		case "/api/get-user":
			userLookups++
			if r.Method != http.MethodGet || r.URL.Query().Get("owner") != "NalaGrow" || r.URL.Query().Get("email") != "parent@example.com" {
				t.Errorf("user lookup = %s %s?%s", r.Method, r.URL.Path, r.URL.RawQuery)
			}
			if got := r.Header.Get("Authorization"); got != "Bearer client-access-token" {
				t.Errorf("user lookup Authorization = %q, want client token", got)
			}
			writeTestJSON(t, w, map[string]interface{}{"status": "ok", "data": map[string]string{"name": "parent"}})
		case "/api/signup":
			signupRequests++
			writeTestJSON(t, w, map[string]interface{}{"status": "ok"})
		default:
			t.Errorf("unexpected request = %s %s", r.Method, r.URL.Path)
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	casdoor, err := auth.NewCasdoorClient(auth.CasdoorConfig{
		Enabled:      true,
		Issuer:       server.URL,
		ClientID:     "nala-grow",
		ClientSecret: "client-secret",
		Organization: "NalaGrow",
		Application:  "nala-grow-web",
	})
	require.NoError(t, err)
	h := newTestHandler()
	h.auth.Casdoor = casdoor

	result := h.Execute(context.Background(), `mutation Signup($email: String!, $password: String!) {
		signup(email: $email, password: $password) { token }
	}`, map[string]interface{}{
		"email":    "parent@example.com",
		"password": "not-a-real-account-password",
	})

	require.Len(t, result.Errors, 1)
	require.Equal(t, "an account with this email already exists; please log in instead", result.Errors[0].Message)
	require.Equal(t, 0, signupRequests, "existing accounts must be rejected before Casdoor signup")
	require.Equal(t, 1, userLookups, "Casdoor's organization-scoped email lookup detects existing accounts")
}

func writeTestJSON(t *testing.T, w http.ResponseWriter, value interface{}) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		t.Errorf("encode test JSON response: %v", err)
	}
}

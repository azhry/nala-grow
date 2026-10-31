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

func TestSignupReportsCasdoorRegistrationConflictActionably(t *testing.T) {
	var addUserRequests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			writeTestJSON(t, w, map[string]string{
				"issuer":         "http://" + r.Host,
				"token_endpoint": "http://" + r.Host + "/oauth/token",
				"jwks_uri":       "http://" + r.Host + "/jwks",
			})
		case "/oauth/token":
			writeTestJSON(t, w, map[string]string{"access_token": "client-access-token"})
		case "/api/get-user":
			writeTestJSON(t, w, map[string]interface{}{
				"status": "ok",
				"data":   map[string]string{"name": "parent"},
			})
		case "/api/add-user":
			addUserRequests++
			writeTestJSON(t, w, map[string]interface{}{"status": "ok", "data": true})
		default:
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
	require.Zero(t, addUserRequests, "signup must not call add-user for an existing account")
}

func writeTestJSON(t *testing.T, w http.ResponseWriter, value interface{}) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		t.Errorf("encode test JSON response: %v", err)
	}
}

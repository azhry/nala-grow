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
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/signup" {
			t.Errorf("request = %s %s, want POST /api/signup", r.Method, r.URL.Path)
			http.NotFound(w, r)
			return
		}
		signupRequests++
		writeTestJSON(t, w, map[string]interface{}{"status": "error", "msg": "check:Email already exists"})
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
	require.Equal(t, 1, signupRequests, "Casdoor signup is the authoritative duplicate check")
}

func writeTestJSON(t *testing.T, w http.ResponseWriter, value interface{}) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		t.Errorf("encode test JSON response: %v", err)
	}
}

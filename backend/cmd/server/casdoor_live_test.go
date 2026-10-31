package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/azhry/nala-grow/backend/internal/auth"
	"github.com/azhry/nala-grow/backend/internal/graph"
	"github.com/azhry/nala-grow/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type noCasdoorAccountWrites struct {
	attempted atomic.Bool
}

func (t *noCasdoorAccountWrites) RoundTrip(request *http.Request) (*http.Response, error) {
	if request.Method == http.MethodPost && request.URL.Path == "/api/add-user" {
		t.attempted.Store(true)
		return nil, errors.New("blocked account creation in read-only live test")
	}
	return http.DefaultTransport.RoundTrip(request)
}

func TestLiveCasdoorDuplicateSignupReturnsActionableError(t *testing.T) {
	email := strings.TrimSpace(os.Getenv("NALA_LIVE_CASDOOR_DUPLICATE_EMAIL"))
	if email == "" {
		t.Skip("set NALA_LIVE_CASDOOR_DUPLICATE_EMAIL to an existing NalaGrow account")
	}

	config, err := loadRuntimeConfig()
	if err != nil || !config.Casdoor.Enabled {
		t.Fatal("could not load Vault-backed Casdoor configuration")
	}
	transport := &noCasdoorAccountWrites{}
	config.Casdoor.HTTPClient = &http.Client{Transport: transport}
	authService, err := auth.NewServiceWithCasdoor(config.JWTSecret, config.Casdoor)
	if err != nil {
		t.Fatal("could not initialize the Casdoor client")
	}
	handler := graph.NewHandler(nil, authService)
	router := chi.NewRouter()
	router.Use(middleware.RequestLogger)
	router.Use(middleware.Recovery)
	router.Use(middleware.Auth)
	router.Post("/graphql", graphqlEndpoint(handler))
	body, err := json.Marshal(graphqlRequest{
		Query: `mutation Signup($email: String!, $password: String!) {
		signup(email: $email, password: $password) { token }
	}`,
		Variables: map[string]interface{}{
			"email":    email,
			"password": "read-only-duplicate-check",
		},
	})
	if err != nil {
		t.Fatal("could not encode the live GraphQL request")
	}
	request := httptest.NewRequest(http.MethodPost, "/graphql", bytes.NewReader(body))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	var result struct {
		Data   map[string]json.RawMessage `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal("live GraphQL endpoint returned invalid JSON")
	}

	if response.Code != http.StatusOK || string(result.Data["signup"]) != "null" || len(result.Errors) != 1 || result.Errors[0].Message != "an account with this email already exists; please log in instead" {
		t.Fatalf("live signup response status=%d, data=%s, errors=%v", response.Code, result.Data["signup"], result.Errors)
	}
	if transport.attempted.Load() {
		t.Fatal("live duplicate signup attempted to create a Casdoor account")
	}
	t.Logf("Observed GraphQL signup error: %s", result.Errors[0].Message)
}

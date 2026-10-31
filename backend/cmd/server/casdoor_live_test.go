package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"regexp"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/azhry/nala-grow/backend/internal/auth"
	"github.com/azhry/nala-grow/backend/internal/db"
	"github.com/azhry/nala-grow/backend/internal/graph"
	"github.com/azhry/nala-grow/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type noCasdoorAccountWrites struct {
	attempted atomic.Bool
}

type liveCasdoorUserStatus struct {
	Owner             string `json:"owner"`
	Name              string `json:"name"`
	EmailVerified     bool   `json:"emailVerified"`
	IsForbidden       bool   `json:"isForbidden"`
	SignupApplication string `json:"signupApplication"`
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

func TestLiveCasdoorSignupCreatesProfileAndLogsIn(t *testing.T) {
	if os.Getenv("NALA_LIVE_CASDOOR_SIGNUP") != "1" {
		t.Skip("set NALA_LIVE_CASDOOR_SIGNUP=1 to create and clean up a real Casdoor test user")
	}

	config, err := loadRuntimeConfig()
	if err != nil || !config.Casdoor.Enabled {
		t.Fatal("could not load Vault-backed Casdoor configuration")
	}
	ctx, cancel := context.WithTimeout(t.Context(), 45*time.Second)
	defer cancel()
	pool, err := db.Connect(ctx, config.DatabaseURL)
	if err != nil {
		t.Fatal("could not connect to the configured PostgreSQL database")
	}
	t.Cleanup(pool.Close)
	var databaseName string
	if err := pool.QueryRow(ctx, "SELECT current_database()").Scan(&databaseName); err != nil {
		t.Fatal("could not verify the configured database")
	}
	if databaseName != "nalagrow" {
		t.Fatal("live signup test is restricted to the nalagrow database")
	}

	localPart := "codex-live-" + strings.ReplaceAll(uuid.NewString(), "-", "")
	email := localPart + "@example.com"
	password := "NalaGrow!Live9-" + uuid.NewString()
	client := &http.Client{Timeout: 10 * time.Second}
	token, err := liveCasdoorClientToken(ctx, client, config.Casdoor)
	if err != nil {
		t.Fatal("could not obtain the Casdoor client token for the live check")
	}
	exists, err := liveCasdoorUserExists(ctx, client, config.Casdoor, token, email)
	if err != nil {
		t.Fatal("could not check whether the generated live test email already exists")
	}
	if exists {
		t.Fatal("generated live test email unexpectedly already exists")
	}
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cleanupCancel()
		if err := deleteLiveCasdoorUser(cleanupCtx, config.Casdoor, email); err != nil {
			t.Errorf("could not remove the live Casdoor test user: %v", err)
		}
		if _, err := pool.Exec(cleanupCtx, "DELETE FROM public.users WHERE lower(email) = lower($1)", email); err != nil {
			t.Errorf("could not remove the live NalaGrow profile: %v", err)
		}
	})

	authService, err := auth.NewServiceWithCasdoor(config.JWTSecret, config.Casdoor)
	if err != nil {
		t.Fatal("could not initialize the Casdoor client")
	}
	router := chi.NewRouter()
	router.Use(middleware.RequestLogger)
	router.Use(middleware.Recovery)
	router.Use(middleware.Auth)
	router.Post("/graphql", graphqlEndpoint(graph.NewHandler(pool, authService)))

	mutation := `mutation Signup($email: String!, $password: String!) {
		signup(email: $email, password: $password) {
			token refreshToken expiresIn user { id email subject authProvider }
		}
	}`
	signupResult := postLiveGraphQL(t, router, mutation, map[string]interface{}{"email": email, "password": password})
	if signupResult.Code != http.StatusOK {
		t.Fatalf("live signup returned HTTP %d", signupResult.Code)
	}
	var signup struct {
		Data struct {
			Signup *struct {
				Token string `json:"token"`
				User  struct {
					ID           string `json:"id"`
					Email        string `json:"email"`
					Subject      string `json:"subject"`
					AuthProvider string `json:"authProvider"`
				} `json:"user"`
			} `json:"signup"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(signupResult.Body).Decode(&signup); err != nil {
		t.Fatal("live signup returned invalid GraphQL JSON")
	}
	if len(signup.Errors) != 0 || signup.Data.Signup == nil || signup.Data.Signup.Token == "" || signup.Data.Signup.User.Subject == "" || signup.Data.Signup.User.Email != email || signup.Data.Signup.User.AuthProvider != "casdoor" {
		if len(signup.Errors) > 0 {
			statusToken, tokenErr := liveCasdoorClientToken(ctx, &http.Client{Timeout: 10 * time.Second}, config.Casdoor)
			if tokenErr == nil {
				user, exists, statusErr := liveCasdoorUserDetails(ctx, &http.Client{Timeout: 10 * time.Second}, config.Casdoor, statusToken, email)
				if statusErr == nil && exists {
					t.Logf("created Casdoor user state: owner_matches=%t, username_is_email=%t, email_verified=%t, forbidden=%t, signup_application_matches=%t", user.Owner == config.Casdoor.Organization, user.Name == email, user.EmailVerified, user.IsForbidden, user.SignupApplication == config.Casdoor.Application)
					loginStatus, loginCode, loginMessage, loginErr := liveCasdoorPasswordLogin(ctx, config.Casdoor, user.Name, password)
					if loginErr != nil {
						t.Logf("direct Casdoor API password check failed: %v", loginErr)
					} else {
						t.Logf("direct Casdoor API password check: status=%s code=%s message=%q", loginStatus, loginCode, loginMessage)
					}
				}
			}
			_, _, grantErr := authService.Casdoor.PasswordGrant(ctx, email, password)
			t.Logf("live Casdoor password grant error category: %v", grantErr)
			t.Fatalf("live signup failed: %s", signup.Errors[0].Message)
		}
		t.Fatal("live signup did not return a Casdoor-linked user")
	}

	var subject string
	var passwordHashIsNull bool
	if err := pool.QueryRow(ctx, `SELECT casdoor_subject, password_hash IS NULL
		FROM public.users WHERE lower(email) = lower($1)`, email).Scan(&subject, &passwordHashIsNull); err != nil {
		t.Fatal("live signup did not persist the NalaGrow profile")
	}
	if subject != signup.Data.Signup.User.Subject || !passwordHashIsNull {
		t.Fatal("live signup profile does not match the Casdoor identity contract")
	}

	login := `mutation Login($email: String!, $password: String!) {
		login(email: $email, password: $password) { token user { email subject authProvider } }
	}`
	loginResult := postLiveGraphQL(t, router, login, map[string]interface{}{"email": email, "password": password})
	if loginResult.Code != http.StatusOK {
		t.Fatalf("live login returned HTTP %d", loginResult.Code)
	}
	var loginResponse struct {
		Data struct {
			Login *struct {
				Token string `json:"token"`
				User  struct {
					Email        string `json:"email"`
					Subject      string `json:"subject"`
					AuthProvider string `json:"authProvider"`
				} `json:"user"`
			} `json:"login"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(loginResult.Body).Decode(&loginResponse); err != nil {
		t.Fatal("live login returned invalid GraphQL JSON")
	}
	if len(loginResponse.Errors) != 0 || loginResponse.Data.Login == nil || loginResponse.Data.Login.Token == "" || loginResponse.Data.Login.User.Subject != subject || loginResponse.Data.Login.User.Email != email || loginResponse.Data.Login.User.AuthProvider != "casdoor" {
		if len(loginResponse.Errors) > 0 {
			t.Fatalf("live login failed: %s", loginResponse.Errors[0].Message)
		}
		t.Fatal("live login did not return the created Casdoor identity")
	}
}

func postLiveGraphQL(t *testing.T, router http.Handler, query string, variables map[string]interface{}) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(graphqlRequest{Query: query, Variables: variables})
	if err != nil {
		t.Fatal("could not encode the live GraphQL request")
	}
	request := httptest.NewRequest(http.MethodPost, "/graphql", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func liveCasdoorPasswordLogin(ctx context.Context, config auth.CasdoorConfig, username, password string) (string, string, string, error) {
	payload := struct {
		Type         string `json:"type"`
		Organization string `json:"organization"`
		Username     string `json:"username"`
		Password     string `json:"password"`
		Application  string `json:"application"`
		SigninMethod string `json:"signinMethod"`
	}{
		Type:         "login",
		Organization: config.Organization,
		Username:     username,
		Password:     password,
		Application:  config.Application,
		SigninMethod: "Password",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", "", "", errors.New("could not encode direct Casdoor login request")
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(config.Issuer, "/")+"/api/login", bytes.NewReader(body))
	if err != nil {
		return "", "", "", errors.New("could not create direct Casdoor login request")
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept-Language", "en")
	client := &http.Client{Timeout: 10 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return "", "", "", errors.New("direct Casdoor login request failed")
	}
	defer response.Body.Close()
	var result struct {
		Status string `json:"status"`
		Code   string `json:"code"`
		Msg    string `json:"msg"`
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 64*1024)).Decode(&result); err != nil {
		return "", "", "", errors.New("direct Casdoor login returned invalid JSON")
	}
	status := result.Status
	if status != "ok" && status != "error" {
		status = "unknown"
	}
	code := result.Code
	if code == "" {
		code = classifyLiveCasdoorLoginMessage(result.Msg)
	}
	if code != "" && !isSafeCasdoorLoginCode(code) {
		code = "unspecified"
	}
	return status, code, sanitizeLiveCasdoorLoginMessage(result.Msg, config, username, password), nil
}

func sanitizeLiveCasdoorLoginMessage(message string, config auth.CasdoorConfig, username, password string) string {
	message = strings.ToLower(message)
	for _, value := range []string{username, password, config.Organization, config.Application, config.ClientID, config.ClientSecret, config.AdminToken} {
		if value != "" {
			message = strings.ReplaceAll(message, strings.ToLower(value), "[redacted]")
		}
	}
	message = regexp.MustCompile(`(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}`).ReplaceAllString(message, "[email]")
	message = regexp.MustCompile(`(?i)eyJ[a-z0-9_-]{8,}\.[a-z0-9_-]{8,}\.[a-z0-9_-]{8,}`).ReplaceAllString(message, "[token]")
	message = regexp.MustCompile(`(?i)\b[a-f0-9]{8}-[a-f0-9-]{27,}\b`).ReplaceAllString(message, "[id]")
	message = regexp.MustCompile(`\b[A-Za-z0-9_-]{32,}\b`).ReplaceAllString(message, "[redacted]")
	message = strings.Join(strings.Fields(message), " ")
	if len(message) > 160 {
		message = message[:160]
	}
	return message
}

func classifyLiveCasdoorLoginMessage(message string) string {
	message = strings.ToLower(strings.TrimSpace(message))
	switch {
	case strings.Contains(message, "application") && (strings.Contains(message, "does not exist") || strings.Contains(message, "doesn't exist")):
		return "application-not-found"
	case strings.Contains(message, "password") && (strings.Contains(message, "incorrect") || strings.Contains(message, "invalid") || strings.Contains(message, "wrong")):
		return "wrong-password"
	case strings.Contains(message, "does not exist") || strings.Contains(message, "doesn't exist") || strings.Contains(message, "user-not-found"):
		return "user-not-found"
	case strings.Contains(message, "password") && strings.Contains(message, "not enabled"):
		return "password-login-disabled"
	case strings.Contains(message, "captcha") || strings.Contains(message, "turing test"):
		return "captcha-required"
	case strings.Contains(message, "multi-factor") || strings.Contains(message, "mfa"):
		return "mfa-required"
	case strings.Contains(message, "forbidden") || strings.Contains(message, "disabled") || strings.Contains(message, "frozen"):
		return "account-disabled"
	case strings.Contains(message, "email") && (strings.Contains(message, "verified") || strings.Contains(message, "verification")):
		return "email-verification-required"
	case message != "":
		return "other-rejection"
	default:
		return "unspecified"
	}
}

func isSafeCasdoorLoginCode(code string) bool {
	for _, r := range code {
		if !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9') && r != '-' && r != '_' {
			return false
		}
	}
	return true
}

func deleteLiveCasdoorUser(ctx context.Context, config auth.CasdoorConfig, email string) error {
	client := &http.Client{Timeout: 10 * time.Second}
	tokens := make([]string, 0, 2)
	if token, err := liveCasdoorClientToken(ctx, client, config); err == nil {
		tokens = append(tokens, token)
	}
	if config.AdminToken != "" {
		tokens = append(tokens, config.AdminToken)
	}
	if len(tokens) == 0 {
		return errors.New("no cleanup token is available")
	}
	var lastErr error
	for _, token := range tokens {
		user, exists, err := liveCasdoorUserDetails(ctx, client, config, token, email)
		if err != nil {
			lastErr = err
			continue
		}
		if !exists {
			return nil
		}
		if user.Owner == "" {
			user.Owner = config.Organization
		}
		for attempt := 0; attempt < 2; attempt++ {
			body, err := json.Marshal(map[string]string{"owner": user.Owner, "name": user.Name})
			if err != nil {
				return errors.New("could not encode Casdoor cleanup request")
			}
			request, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(config.Issuer, "/")+"/api/delete-user", bytes.NewReader(body))
			if err != nil {
				return errors.New("could not create Casdoor cleanup request")
			}
			request.Header.Set("Authorization", "Bearer "+token)
			request.Header.Set("Content-Type", "application/json")
			request.Header.Set("Accept-Language", "en")
			response, err := client.Do(request)
			if err != nil {
				lastErr = errors.New("Casdoor cleanup request failed")
				break
			}
			var result struct {
				Status string `json:"status"`
				Data   bool   `json:"data"`
			}
			decodeErr := json.NewDecoder(response.Body).Decode(&result)
			response.Body.Close()
			if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices || decodeErr != nil || strings.EqualFold(result.Status, "error") {
				lastErr = fmt.Errorf("Casdoor cleanup returned HTTP %d", response.StatusCode)
				break
			}
			if !result.Data {
				break
			}
		}
		exists, err = liveCasdoorUserExists(ctx, client, config, token, email)
		if err == nil && !exists {
			return nil
		}
		if err != nil {
			lastErr = err
		} else {
			lastErr = errors.New("Casdoor test user still exists after cleanup")
		}
	}
	if lastErr == nil {
		lastErr = errors.New("could not confirm Casdoor test user cleanup")
	}
	return lastErr
}

func liveCasdoorUserExists(ctx context.Context, client *http.Client, config auth.CasdoorConfig, token, email string) (bool, error) {
	_, exists, err := liveCasdoorUserDetails(ctx, client, config, token, email)
	return exists, err
}

func liveCasdoorUserDetails(ctx context.Context, client *http.Client, config auth.CasdoorConfig, token, email string) (liveCasdoorUserStatus, bool, error) {
	values := url.Values{"owner": {config.Organization}, "email": {email}}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(config.Issuer, "/")+"/api/get-user?"+values.Encode(), nil)
	if err != nil {
		return liveCasdoorUserStatus{}, false, errors.New("could not create Casdoor cleanup lookup")
	}
	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("Accept-Language", "en")
	response, err := client.Do(request)
	if err != nil {
		return liveCasdoorUserStatus{}, false, errors.New("Casdoor cleanup lookup failed")
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return liveCasdoorUserStatus{}, false, fmt.Errorf("Casdoor cleanup lookup returned HTTP %d", response.StatusCode)
	}
	var result struct {
		Status string          `json:"status"`
		Data   json.RawMessage `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil || strings.EqualFold(result.Status, "error") {
		return liveCasdoorUserStatus{}, false, errors.New("Casdoor cleanup lookup returned invalid data")
	}
	if len(result.Data) == 0 || strings.TrimSpace(string(result.Data)) == "null" {
		return liveCasdoorUserStatus{}, false, nil
	}
	var user liveCasdoorUserStatus
	if err := json.Unmarshal(result.Data, &user); err != nil || user.Name == "" {
		return liveCasdoorUserStatus{}, false, errors.New("Casdoor cleanup lookup returned invalid user data")
	}
	return user, true, nil
}

func liveCasdoorClientToken(ctx context.Context, client *http.Client, config auth.CasdoorConfig) (string, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(config.Issuer, "/")+"/.well-known/openid-configuration", nil)
	if err != nil {
		return "", errors.New("could not create Casdoor discovery request")
	}
	discoveryResponse, err := client.Do(request)
	if err != nil {
		return "", errors.New("Casdoor discovery request failed")
	}
	var discovery struct {
		TokenEndpoint string `json:"token_endpoint"`
	}
	decodeErr := json.NewDecoder(discoveryResponse.Body).Decode(&discovery)
	discoveryResponse.Body.Close()
	if discoveryResponse.StatusCode < http.StatusOK || discoveryResponse.StatusCode >= http.StatusMultipleChoices || decodeErr != nil || discovery.TokenEndpoint == "" {
		return "", errors.New("Casdoor discovery response was invalid")
	}
	form := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {config.ClientID},
		"client_secret": {config.ClientSecret},
	}
	if config.Organization != "" {
		form.Set("organization", config.Organization)
	}
	if config.Application != "" {
		form.Set("application", config.Application)
	}
	request, err = http.NewRequestWithContext(ctx, http.MethodPost, discovery.TokenEndpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return "", errors.New("could not create Casdoor token request")
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	tokenResponse, err := client.Do(request)
	if err != nil {
		return "", errors.New("Casdoor token request failed")
	}
	defer tokenResponse.Body.Close()
	var token struct {
		AccessToken string `json:"access_token"`
	}
	if tokenResponse.StatusCode < http.StatusOK || tokenResponse.StatusCode >= http.StatusMultipleChoices || json.NewDecoder(tokenResponse.Body).Decode(&token) != nil || token.AccessToken == "" {
		return "", fmt.Errorf("Casdoor token request returned HTTP %d", tokenResponse.StatusCode)
	}
	return token.AccessToken, nil
}

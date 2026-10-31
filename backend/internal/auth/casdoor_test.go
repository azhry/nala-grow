package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestCasdoorPasswordGrantValidatesOIDCTokenAndIAMClaims(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate signing key: %v", err)
	}
	var tokenRequests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			writeJSON(t, w, map[string]string{
				"issuer":                 "http://" + r.Host,
				"token_endpoint":         "http://" + r.Host + "/oauth/token",
				"authorization_endpoint": "http://" + r.Host + "/oauth/authorize",
				"jwks_uri":               "http://" + r.Host + "/jwks",
			})
		case "/jwks":
			writeJSON(t, w, map[string]interface{}{"keys": []interface{}{rsaJWK(privateKey)}})
		case "/oauth/token":
			tokenRequests++
			if err := r.ParseForm(); err != nil || r.Form.Get("grant_type") != "password" {
				t.Fatalf("token grant = %q, want password", r.Form.Get("grant_type"))
			}
			writeJSON(t, w, map[string]interface{}{
				"access_token":  signedCasdoorToken(t, privateKey, "parent-1", "parent@example.com", "Nala Parent", "http://"+r.Host),
				"refresh_token": "refresh-token",
				"token_type":    "Bearer",
				"expires_in":    3600,
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewCasdoorClient(CasdoorConfig{
		Enabled:      true,
		Issuer:       server.URL,
		ClientID:     "nala-grow",
		ClientSecret: "client-secret",
		Audience:     "nala-grow",
	})
	if err != nil {
		t.Fatalf("NewCasdoorClient() error = %v", err)
	}
	token, principal, err := client.PasswordGrant(t.Context(), "parent@example.com", "password")
	if err != nil {
		t.Fatalf("PasswordGrant() error = %v", err)
	}
	if token.RefreshToken != "refresh-token" || token.ExpiresIn != 3600 {
		t.Fatalf("token metadata = %+v", token)
	}
	if principal.Subject != "parent-1" || principal.Email != "parent@example.com" || !principal.IsAdmin {
		t.Fatalf("principal identity = %+v", principal)
	}
	if !contains(principal.Roles, "Parent") || !contains(principal.Permissions, "feeding:write") {
		t.Fatalf("principal IAM claims = %+v", principal)
	}
	if tokenRequests != 1 {
		t.Fatalf("token requests = %d, want 1", tokenRequests)
	}
}

func TestCasdoorAuthorizationCodeRequiresConfiguredRedirectAndRejectsWrongIssuer(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate signing key: %v", err)
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			writeJSON(t, w, map[string]string{
				"issuer":         serverIssuer(r),
				"token_endpoint": "http://" + r.Host + "/oauth/token",
				"jwks_uri":       "http://" + r.Host + "/jwks",
			})
		case "/jwks":
			writeJSON(t, w, map[string]interface{}{"keys": []interface{}{rsaJWK(privateKey)}})
		case "/oauth/token":
			if err := r.ParseForm(); err != nil || r.Form.Get("grant_type") != "authorization_code" {
				t.Fatalf("token grant = %q, want authorization_code", r.Form.Get("grant_type"))
			}
			writeJSON(t, w, map[string]interface{}{
				"access_token": signedCasdoorToken(t, privateKey, "parent-2", "google@example.com", "Google Parent", serverIssuer(r)),
				"expires_in":   3600,
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewCasdoorClient(CasdoorConfig{
		Enabled:      true,
		Issuer:       server.URL,
		ClientID:     "nala-grow",
		ClientSecret: "client-secret",
		Audience:     "nala-grow",
		RedirectURI:  "http://localhost:3000/auth/casdoor/callback",
	})
	if err != nil {
		t.Fatalf("NewCasdoorClient() error = %v", err)
	}
	if _, _, err := client.AuthorizationCodeGrant(t.Context(), "code", "http://evil.example/callback"); err == nil {
		t.Fatal("AuthorizationCodeGrant() accepted an unconfigured redirect URI")
	}
	_, principal, err := client.AuthorizationCodeGrant(t.Context(), "code", "http://localhost:3000/auth/casdoor/callback")
	if err != nil {
		t.Fatalf("AuthorizationCodeGrant() error = %v", err)
	}
	if principal.Subject != "parent-2" {
		t.Fatalf("principal subject = %q, want parent-2", principal.Subject)
	}

	badToken := signedCasdoorToken(t, privateKey, "parent-2", "google@example.com", "Google Parent", "https://other-issuer.example")
	if _, err := client.ValidateAccessToken(t.Context(), badToken); err == nil {
		t.Fatal("ValidateAccessToken() accepted a token from another issuer")
	}
}

func TestCasdoorRegisterUserPrefersClientCredentialsOverAdminToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			writeJSON(t, w, map[string]string{
				"issuer":         "http://" + r.Host,
				"token_endpoint": "http://" + r.Host + "/oauth/token",
				"jwks_uri":       "http://" + r.Host + "/jwks",
			})
		case "/oauth/token":
			if err := r.ParseForm(); err != nil {
				t.Errorf("parse token request: %v", err)
				return
			}
			if got := r.Form.Get("grant_type"); got != "client_credentials" {
				t.Errorf("grant_type = %q, want client_credentials", got)
			}
			writeJSON(t, w, map[string]string{"access_token": "client-access-token"})
		case "/api/get-user":
			if got := r.Header.Get("Authorization"); got != "Bearer client-access-token" {
				t.Errorf("Authorization = %q, want client credentials token", got)
			}
			if r.URL.Query().Get("owner") != "NalaGrow" || r.URL.Query().Get("email") != "parent@example.com" {
				t.Errorf("user lookup query = %v", r.URL.Query())
			}
			writeJSON(t, w, map[string]interface{}{"status": "ok", "data": nil})
		case "/api/add-user":
			if got := r.Header.Get("Authorization"); got != "Bearer client-access-token" {
				t.Errorf("Authorization = %q, want client credentials token", got)
			}
			var payload map[string]string
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Errorf("decode registration payload: %v", err)
				return
			}
			if payload["email"] != "parent@example.com" || payload["password"] != "secret" {
				t.Errorf("registration payload = %#v", payload)
			}
			writeJSON(t, w, map[string]interface{}{"status": "ok", "data": true})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewCasdoorClient(CasdoorConfig{
		Enabled:      true,
		Issuer:       server.URL,
		ClientID:     "nala-grow",
		ClientSecret: "client-secret",
		Organization: "NalaGrow",
		Application:  "nala-grow-web",
		AdminToken:   "stale-admin-token",
	})
	if err != nil {
		t.Fatalf("NewCasdoorClient() error = %v", err)
	}
	if err := client.RegisterUser(t.Context(), "Parent@Example.com", "secret", "Parent"); err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
}

func TestCasdoorRegisterUserFallsBackToAdminTokenWhenClientTokenUnavailable(t *testing.T) {
	var tokenRequests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			writeJSON(t, w, map[string]string{
				"issuer":         "http://" + r.Host,
				"token_endpoint": "http://" + r.Host + "/oauth/token",
				"jwks_uri":       "http://" + r.Host + "/jwks",
			})
		case "/oauth/token":
			tokenRequests++
			http.Error(w, "unavailable", http.StatusServiceUnavailable)
		case "/api/get-user":
			if got := r.Header.Get("Authorization"); got != "Bearer admin-token" {
				t.Errorf("Authorization = %q, want configured admin token fallback", got)
			}
			writeJSON(t, w, map[string]interface{}{"status": "ok", "data": nil})
		case "/api/add-user":
			if got := r.Header.Get("Authorization"); got != "Bearer admin-token" {
				t.Errorf("Authorization = %q, want configured admin token fallback", got)
			}
			var payload map[string]string
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Errorf("decode registration payload: %v", err)
				return
			}
			if payload["email"] != "parent@example.com" || payload["password"] != "secret" {
				t.Errorf("registration payload = %#v", payload)
			}
			writeJSON(t, w, map[string]interface{}{"status": "ok", "data": true})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewCasdoorClient(CasdoorConfig{
		Enabled:      true,
		Issuer:       server.URL,
		ClientID:     "nala-grow",
		ClientSecret: "client-secret",
		Organization: "NalaGrow",
		Application:  "nala-grow-web",
		AdminToken:   "admin-token",
	})
	if err != nil {
		t.Fatalf("NewCasdoorClient() error = %v", err)
	}
	if err := client.RegisterUser(t.Context(), "Parent@Example.com", "secret", "Parent"); err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	if tokenRequests != 1 {
		t.Fatalf("client credential requests = %d, want 1", tokenRequests)
	}
}

func TestCasdoorRegisterUserReturnsSafeConflictForDuplicateResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			writeJSON(t, w, map[string]string{
				"issuer":         "http://" + r.Host,
				"token_endpoint": "http://" + r.Host + "/oauth/token",
				"jwks_uri":       "http://" + r.Host + "/jwks",
			})
		case "/oauth/token":
			writeJSON(t, w, map[string]string{"access_token": "client-access-token"})
		case "/api/get-user":
			writeJSON(t, w, map[string]interface{}{"status": "ok", "data": nil})
		case "/api/add-user":
			writeJSON(t, w, map[string]interface{}{
				"status": "error",
				"data":   false,
				"msg":    "email already exists",
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewCasdoorClient(CasdoorConfig{
		Enabled:      true,
		Issuer:       server.URL,
		ClientID:     "nala-grow",
		ClientSecret: "client-secret",
		Organization: "NalaGrow",
		Application:  "nala-grow-web",
	})
	if err != nil {
		t.Fatalf("NewCasdoorClient() error = %v", err)
	}
	err = client.RegisterUser(t.Context(), "parent@example.com", "password", "Parent")
	if !errors.Is(err, ErrCasdoorEmailAlreadyExists) {
		t.Fatalf("RegisterUser() error = %v, want existing email", err)
	}
	if strings.Contains(err.Error(), "parent@example.com") || strings.Contains(err.Error(), "email already exists") {
		t.Fatalf("RegisterUser() exposed provider details: %v", err)
	}
}

func TestCasdoorRegisterUserRejectsExistingEmailBeforeCreate(t *testing.T) {
	var addUserRequests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			writeJSON(t, w, map[string]string{
				"issuer":         "http://" + r.Host,
				"token_endpoint": "http://" + r.Host + "/oauth/token",
				"jwks_uri":       "http://" + r.Host + "/jwks",
			})
		case "/oauth/token":
			writeJSON(t, w, map[string]string{"access_token": "client-access-token"})
		case "/api/get-user":
			if r.URL.Query().Get("owner") != "NalaGrow" || r.URL.Query().Get("email") != "parent@example.com" {
				t.Errorf("user lookup query = %v", r.URL.Query())
			}
			writeJSON(t, w, map[string]interface{}{"status": "ok", "data": map[string]string{"name": "parent"}})
		case "/api/add-user":
			addUserRequests++
			writeJSON(t, w, map[string]interface{}{"status": "ok", "data": true})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewCasdoorClient(CasdoorConfig{
		Enabled:      true,
		Issuer:       server.URL,
		ClientID:     "nala-grow",
		ClientSecret: "client-secret",
		Organization: "NalaGrow",
		Application:  "nala-grow-web",
	})
	if err != nil {
		t.Fatalf("NewCasdoorClient() error = %v", err)
	}
	err = client.RegisterUser(t.Context(), "Parent@Example.com", "password", "Parent")
	if !errors.Is(err, ErrCasdoorEmailAlreadyExists) {
		t.Fatalf("RegisterUser() error = %v, want existing email", err)
	}
	if addUserRequests != 0 {
		t.Fatalf("Casdoor add-user requests = %d, want 0 for an existing email", addUserRequests)
	}
}

func TestCasdoorUserLookupFailureIsDistinctFromMissingUser(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			writeJSON(t, w, map[string]string{
				"issuer":         "http://" + r.Host,
				"token_endpoint": "http://" + r.Host + "/oauth/token",
				"jwks_uri":       "http://" + r.Host + "/jwks",
			})
		case "/oauth/token":
			writeJSON(t, w, map[string]string{"access_token": "client-access-token"})
		case "/api/get-user":
			writeJSON(t, w, map[string]interface{}{"status": "error", "data": nil})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewCasdoorClient(CasdoorConfig{
		Enabled:      true,
		Issuer:       server.URL,
		ClientID:     "nala-grow",
		ClientSecret: "client-secret",
		Organization: "NalaGrow",
	})
	if err != nil {
		t.Fatalf("NewCasdoorClient() error = %v", err)
	}
	err = client.RegisterUser(t.Context(), "parent@example.com", "password", "Parent")
	if !errors.Is(err, ErrCasdoorUserLookupFailed) {
		t.Fatalf("RegisterUser() error = %v, want lookup failure", err)
	}
}

func TestCasdoorRegistrationConflictMessageRecognizesDuplicateVariants(t *testing.T) {
	for _, message := range []string{
		"email already exists",
		"email already in use",
		"username is already registered",
		"duplicate key value violates unique constraint",
		"account has been taken",
	} {
		if !isCasdoorRegistrationConflict(message) {
			t.Errorf("isCasdoorRegistrationConflict(%q) = false, want true", message)
		}
	}
	for _, message := range []string{"invalid organization", "permission denied", "password is too short"} {
		if isCasdoorRegistrationConflict(message) {
			t.Errorf("isCasdoorRegistrationConflict(%q) = true, want false", message)
		}
	}
}

func TestCasdoorEmailConflictRequiresEmailContext(t *testing.T) {
	if !isCasdoorEmailConflict("email already exists") {
		t.Fatal("isCasdoorEmailConflict() = false, want true")
	}
	if isCasdoorEmailConflict("username already exists") {
		t.Fatal("isCasdoorEmailConflict() = true for username conflict, want false")
	}
}

func TestCasdoorValidationFallsBackToUserInfoForIdentityClaims(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate signing key: %v", err)
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			writeJSON(t, w, map[string]string{
				"issuer":            serverIssuer(r),
				"token_endpoint":    "http://" + r.Host + "/oauth/token",
				"userinfo_endpoint": "http://" + r.Host + "/userinfo",
				"jwks_uri":          "http://" + r.Host + "/jwks",
			})
		case "/jwks":
			writeJSON(t, w, map[string]interface{}{"keys": []interface{}{rsaJWK(privateKey)}})
		case "/userinfo":
			if r.Header.Get("Authorization") == "" {
				t.Fatal("userinfo request did not include bearer token")
			}
			writeJSON(t, w, map[string]interface{}{"data": map[string]interface{}{
				"id": "userinfo-user", "email": "userinfo@example.com", "roles": []string{"Admin"},
			}})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewCasdoorClient(CasdoorConfig{
		Enabled:      true,
		Issuer:       server.URL,
		ClientID:     "nala-grow",
		ClientSecret: "client-secret",
		Audience:     "nala-grow",
	})
	if err != nil {
		t.Fatalf("NewCasdoorClient() error = %v", err)
	}
	claims := jwt.MapClaims{
		"iss": server.URL, "aud": "nala-grow", "sub": "userinfo-user",
		"iat": time.Now().Unix(), "exp": time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = "casdoor-test"
	rawToken, err := token.SignedString(privateKey)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	principal, err := client.ValidateAccessToken(t.Context(), rawToken)
	if err != nil {
		t.Fatalf("ValidateAccessToken() error = %v", err)
	}
	if principal.Email != "userinfo@example.com" || !contains(principal.Roles, "Admin") {
		t.Fatalf("userinfo principal = %+v", principal)
	}
}

func signedCasdoorToken(t *testing.T, key *rsa.PrivateKey, subject, email, name, issuer string) string {
	t.Helper()
	claims := jwt.MapClaims{
		"iss":         issuer,
		"aud":         "nala-grow",
		"sub":         subject,
		"email":       email,
		"name":        name,
		"owner":       "NalaGrow",
		"roles":       []string{"Parent", "Admin"},
		"permissions": []string{"feeding:write"},
		"isAdmin":     true,
		"iat":         time.Now().Unix(),
		"exp":         time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = "casdoor-test"
	signed, err := token.SignedString(key)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return signed
}

func rsaJWK(key *rsa.PrivateKey) map[string]string {
	return map[string]string{
		"kid": "casdoor-test",
		"kty": "RSA",
		"alg": "RS256",
		"use": "sig",
		"n":   base64.RawURLEncoding.EncodeToString(key.PublicKey.N.Bytes()),
		"e":   base64.RawURLEncoding.EncodeToString([]byte{byte(key.PublicKey.E >> 24), byte(key.PublicKey.E >> 16), byte(key.PublicKey.E >> 8), byte(key.PublicKey.E)}),
	}
}

func serverIssuer(r *http.Request) string {
	return "http://" + r.Host
}

func writeJSON(t *testing.T, w http.ResponseWriter, value interface{}) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		t.Fatalf("write JSON: %v", err)
	}
}

func contains(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}

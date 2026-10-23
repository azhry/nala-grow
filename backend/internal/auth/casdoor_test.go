package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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

func TestCasdoorRegisterUserUsesAdminTokenWithoutLoggingCredentials(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/add-user" {
			http.NotFound(w, r)
			return
		}
		if got := r.Header.Get("Authorization"); got != "Bearer admin-token" {
			t.Fatalf("Authorization = %q", got)
		}
		var payload map[string]string
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode registration payload: %v", err)
		}
		if payload["email"] != "parent@example.com" || payload["password"] != "secret" {
			t.Fatalf("registration payload = %#v", payload)
		}
		writeJSON(t, w, map[string]interface{}{"status": "ok", "data": true})
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

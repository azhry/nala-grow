package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
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
	var passwordTokenRequests int
	var clientTokenRequests int
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
		case "/api/get-user":
			if r.URL.Query().Get("owner") != "NalaGrow" || r.URL.Query().Get("email") != "parent@example.com" {
				t.Errorf("user lookup query = %v", r.URL.Query())
			}
			if r.Header.Get("Authorization") != "Bearer client-access-token" {
				t.Errorf("user lookup Authorization = %q, want client token", r.Header.Get("Authorization"))
			}
			writeJSON(t, w, map[string]interface{}{"status": "ok", "data": map[string]string{"name": "parent"}})
		case "/oauth/token":
			if err := r.ParseForm(); err != nil {
				t.Fatalf("parse token form: %v", err)
			}
			switch r.Form.Get("grant_type") {
			case "client_credentials":
				clientTokenRequests++
				writeJSON(t, w, map[string]interface{}{"access_token": "client-access-token"})
			case "password":
				passwordTokenRequests++
				if got := r.Form.Get("username"); got != "parent" {
					t.Errorf("password grant username = %q, want Casdoor username parent", got)
				}
			default:
				t.Errorf("token grant = %q, want client_credentials or password", r.Form.Get("grant_type"))
				http.Error(w, "unsupported grant", http.StatusBadRequest)
				return
			}
			if r.Form.Get("grant_type") == "password" {
				writeJSON(t, w, map[string]interface{}{
					"access_token":  signedCasdoorToken(t, privateKey, "parent-1", "parent@example.com", "Nala Parent", "http://"+r.Host),
					"refresh_token": "refresh-token",
					"token_type":    "Bearer",
					"expires_in":    3600,
				})
			}
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
	if passwordTokenRequests != 1 || clientTokenRequests != 1 {
		t.Fatalf("password token requests = %d, client token requests = %d, want one each", passwordTokenRequests, clientTokenRequests)
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

func TestCasdoorRefreshTokenUsesNativeRefreshEndpoint(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/login/oauth/refresh_token" {
			t.Errorf("refresh request = %s %s, want POST /api/login/oauth/refresh_token", r.Method, r.URL.Path)
			http.NotFound(w, r)
			return
		}
		if got := r.Header.Get("Content-Type"); got != "application/json" {
			t.Errorf("refresh content type = %q, want application/json", got)
		}
		var payload map[string]string
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Errorf("decode refresh request: %v", err)
			return
		}
		if payload["grant_type"] != "refresh_token" || payload["client_id"] != "nala-grow" || payload["scope"] != "openid email profile" {
			t.Errorf("refresh request parameters are incomplete")
		}
		if payload["client_secret"] != "client-secret" || payload["refresh_token"] != "refresh-token" {
			t.Errorf("refresh credentials are missing or changed")
		}
		writeJSON(t, w, map[string]interface{}{
			"access_token":  "rotated-access-token",
			"refresh_token": "rotated-refresh-token",
			"token_type":    "Bearer",
			"expires_in":    3600,
		})
	}))
	defer server.Close()

	client, err := NewCasdoorClient(CasdoorConfig{
		Enabled:      true,
		Issuer:       server.URL,
		ClientID:     "nala-grow",
		ClientSecret: "client-secret",
	})
	if err != nil {
		t.Fatalf("NewCasdoorClient() error = %v", err)
	}
	token, err := client.RefreshToken(t.Context(), "refresh-token")
	if err != nil {
		t.Fatalf("RefreshToken() error = %v", err)
	}
	if token.AccessToken != "rotated-access-token" || token.RefreshToken != "rotated-refresh-token" || token.ExpiresIn != 3600 {
		t.Fatalf("refreshed token metadata is incomplete")
	}
}

func TestCasdoorRegisterUserUsesPublicSignupAPI(t *testing.T) {
	var signupRequests int
	var lookupRequests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if serveCasdoorSignupPreflight(t, w, r, "parent@example.com", false) {
			lookupRequests++
			return
		}
		if r.URL.Path != "/api/signup" || r.Method != http.MethodPost {
			t.Errorf("request = %s %s, want POST /api/signup", r.Method, r.URL.Path)
			http.NotFound(w, r)
			return
		}
		signupRequests++
		if got := r.Header.Get("Authorization"); got != "" {
			t.Errorf("signup Authorization = %q, want no privileged token", got)
		}
		var payload map[string]string
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Errorf("decode signup payload: %v", err)
			return
		}
		want := map[string]string{
			"type": "signup", "organization": "NalaGrow", "username": "parent",
			"password": "secret", "name": "Parent", "email": "parent@example.com",
			"application": "nala-grow-web",
		}
		if !reflect.DeepEqual(payload, want) {
			t.Errorf("signup payload = %#v, want %#v", payload, want)
		}
		writeJSON(t, w, map[string]interface{}{"status": "ok", "data": map[string]interface{}{}})
	}))
	defer server.Close()

	client, err := NewCasdoorClient(CasdoorConfig{
		Enabled: true, Issuer: server.URL, ClientID: "nala-grow",
		ClientSecret: "client-secret", Organization: "NalaGrow", Application: "nala-grow-web",
	})
	if err != nil {
		t.Fatalf("NewCasdoorClient() error = %v", err)
	}
	if err := client.RegisterUser(t.Context(), "Parent@Example.com", "secret", "Parent"); err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	if signupRequests != 1 {
		t.Fatalf("signup requests = %d, want 1", signupRequests)
	}
	if lookupRequests != 3 {
		t.Fatalf("preflight requests = %d, want discovery, client token, and user lookup", lookupRequests)
	}
}

func TestCasdoorRegisterUserRejectsExistingAccountBeforeSignup(t *testing.T) {
	var signupRequests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if serveCasdoorSignupPreflight(t, w, r, "parent@example.com", true) {
			return
		}
		if r.URL.Path == "/api/signup" {
			signupRequests++
		}
		http.NotFound(w, r)
	}))
	defer server.Close()
	client, err := NewCasdoorClient(CasdoorConfig{
		Enabled: true, Issuer: server.URL, ClientID: "nala-grow", ClientSecret: "client-secret",
		Organization: "NalaGrow", Application: "nala-grow-web",
	})
	if err != nil {
		t.Fatalf("NewCasdoorClient() error = %v", err)
	}
	if err := client.RegisterUser(t.Context(), "parent@example.com", "new-password", "Parent"); !errors.Is(err, ErrCasdoorEmailAlreadyExists) {
		t.Fatalf("RegisterUser() error = %v, want %v", err, ErrCasdoorEmailAlreadyExists)
	}
	if signupRequests != 0 {
		t.Fatalf("signup requests = %d, want 0 for an existing email", signupRequests)
	}
}

func TestCasdoorRegisterUserClassifiesSignupRejections(t *testing.T) {
	cases := []struct {
		name    string
		message string
		want    error
	}{
		{name: "email exists", message: "check:Email already exists", want: ErrCasdoorEmailAlreadyExists},
		{name: "signup disabled", message: "The application does not allow to sign up new account", want: ErrCasdoorSignupDisabled},
		{name: "password rejected", message: "password is too short", want: ErrCasdoorPasswordRejected},
		{name: "verification required", message: "email verification code is required", want: ErrCasdoorVerificationRequired},
		{name: "unknown provider rejection", message: "internal provider error", want: ErrCasdoorSignupRejected},
	}
	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if serveCasdoorSignupPreflight(t, w, r, "parent@example.com", false) {
					return
				}
				writeJSON(t, w, map[string]interface{}{"status": "error", "msg": test.message})
			}))
			defer server.Close()
			client, err := NewCasdoorClient(CasdoorConfig{
				Enabled: true, Issuer: server.URL, ClientID: "nala-grow", ClientSecret: "client-secret",
				Organization: "NalaGrow", Application: "nala-grow-web",
			})
			if err != nil {
				t.Fatalf("NewCasdoorClient() error = %v", err)
			}
			err = client.RegisterUser(t.Context(), "parent@example.com", "password", "Parent")
			if !errors.Is(err, test.want) {
				t.Fatalf("RegisterUser() error = %v, want %v", err, test.want)
			}
		})
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

func TestCasdoorTokenRejectionsUseSafeFailureCategories(t *testing.T) {
	cases := []struct {
		name        string
		code        string
		description string
		want        error
	}{
		{name: "missing user", code: "invalid_grant", description: "the user does not exist", want: ErrCasdoorUserNotFound},
		{name: "wrong password", code: "invalid_grant", description: "invalid username or password: password mismatch", want: ErrCasdoorCredentialsRejected},
		{name: "unsupported password type", code: "invalid_grant", description: "invalid username or password: unsupported password type: ", want: ErrCasdoorPasswordTypeUnsupported},
		{name: "mfa required", code: "invalid_grant", description: "the user has MFA enabled", want: ErrCasdoorMFARequired},
		{name: "oauth account", code: "invalid_grant", description: "OAuth users cannot use password grant type", want: ErrCasdoorPasswordGrantBlocked},
		{name: "unknown invalid grant", code: "invalid_grant", want: ErrCasdoorTokenRejected},
	}
	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			err := classifyCasdoorTokenRejection(test.code, test.description, http.StatusBadRequest)
			if !errors.Is(err, test.want) {
				t.Fatalf("classifyCasdoorTokenRejection() = %v, want %v", err, test.want)
			}
			if test.description != "" && strings.Contains(err.Error(), test.description) {
				t.Fatal("provider error description escaped into the returned error")
			}
		})
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

func serveCasdoorSignupPreflight(t *testing.T, w http.ResponseWriter, r *http.Request, email string, exists bool) bool {
	t.Helper()
	switch r.URL.Path {
	case "/.well-known/openid-configuration":
		writeJSON(t, w, map[string]string{
			"issuer":                 serverIssuer(r),
			"token_endpoint":         serverIssuer(r) + "/oauth/token",
			"authorization_endpoint": serverIssuer(r) + "/oauth/authorize",
			"jwks_uri":               serverIssuer(r) + "/jwks",
		})
	case "/oauth/token":
		if err := r.ParseForm(); err != nil {
			t.Fatalf("parse Casdoor signup preflight token request: %v", err)
		}
		if r.Form.Get("grant_type") != "client_credentials" {
			t.Errorf("signup preflight grant = %q, want client_credentials", r.Form.Get("grant_type"))
			http.Error(w, "unexpected grant", http.StatusBadRequest)
			return true
		}
		writeJSON(t, w, map[string]interface{}{"access_token": "client-access-token", "token_type": "Bearer", "expires_in": 3600})
	case "/api/get-user":
		if r.Method != http.MethodGet || r.URL.Query().Get("owner") != "NalaGrow" || r.URL.Query().Get("email") != email {
			t.Errorf("signup preflight lookup = %s %s?%s", r.Method, r.URL.Path, r.URL.RawQuery)
		}
		if r.Header.Get("Authorization") != "Bearer client-access-token" {
			t.Errorf("signup preflight Authorization = %q, want client token", r.Header.Get("Authorization"))
		}
		var data interface{}
		if exists {
			data = map[string]string{"name": "parent"}
		}
		writeJSON(t, w, map[string]interface{}{"status": "ok", "data": data})
	default:
		return false
	}
	return true
}

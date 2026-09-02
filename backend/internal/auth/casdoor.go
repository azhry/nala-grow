package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrCasdoorNotConfigured = errors.New("casdoor is not configured")
	ErrCasdoorTokenInvalid  = errors.New("invalid Casdoor token")
)

// CasdoorConfig contains non-sensitive identifiers and runtime credentials
// needed to use Casdoor as NalaGrow's identity provider. Secrets are supplied
// by the process environment or Vault and are never serialized by this type.
type CasdoorConfig struct {
	Enabled      bool
	Issuer       string
	ClientID     string
	ClientSecret string
	Organization string
	Application  string
	Audience     string
	RedirectURI  string
	AdminToken   string
	HTTPClient   *http.Client
}

func (c CasdoorConfig) configured() bool {
	return strings.TrimSpace(c.Issuer) != "" && strings.TrimSpace(c.ClientID) != "" && strings.TrimSpace(c.ClientSecret) != ""
}

// CasdoorToken is the OAuth response returned by Casdoor. AccessToken and
// RefreshToken are deliberately kept out of logs by callers.
type CasdoorToken struct {
	AccessToken  string `json:"access_token"`
	IDToken      string `json:"id_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
}

// CasdoorPrincipal is the normalized identity and IAM data emitted by a
// validated Casdoor token.
type CasdoorPrincipal struct {
	Issuer        string
	Subject       string
	Email         string
	Name          string
	DisplayName   string
	Owner         string
	Organization  string
	Roles         []string
	Permissions   []string
	IsAdmin       bool
	IsGlobalAdmin bool
	IsForbidden   bool
}

type casdoorDiscovery struct {
	Issuer           string `json:"issuer"`
	TokenEndpoint    string `json:"token_endpoint"`
	AuthorizationURL string `json:"authorization_endpoint"`
	UserInfoEndpoint string `json:"userinfo_endpoint"`
	JWKSURL          string `json:"jwks_uri"`
}

type casdoorJWKSet struct {
	Keys []casdoorJWK `json:"keys"`
}

type casdoorJWK struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Alg string `json:"alg"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type casdoorUser struct {
	Owner             string `json:"owner"`
	Name              string `json:"name"`
	DisplayName       string `json:"displayName"`
	Email             string `json:"email"`
	Password          string `json:"password"`
	SignupApplication string `json:"signupApplication"`
}

// CasdoorClient implements the small OAuth/OIDC surface needed by the
// application. It intentionally uses the standard protocol endpoints rather
// than coupling GraphQL resolvers to Casdoor-specific response details.
type CasdoorClient struct {
	config CasdoorConfig
	client *http.Client

	mu             sync.RWMutex
	discovery      *casdoorDiscovery
	discoveryFetch time.Time
	keys           map[string]*rsa.PublicKey
	keysFetch      time.Time
}

func NewCasdoorClient(config CasdoorConfig) (*CasdoorClient, error) {
	if !config.Enabled {
		return nil, nil
	}
	if !config.configured() {
		return nil, fmt.Errorf("Casdoor requires issuer, client ID, and client secret")
	}
	issuer := strings.TrimRight(strings.TrimSpace(config.Issuer), "/")
	parsed, err := url.Parse(issuer)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return nil, fmt.Errorf("invalid Casdoor issuer")
	}
	config.Issuer = issuer
	if strings.TrimSpace(config.Audience) == "" {
		config.Audience = config.ClientID
	}
	client := config.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	return &CasdoorClient{config: config, client: client}, nil
}

func (c *CasdoorClient) Config() CasdoorConfig {
	if c == nil {
		return CasdoorConfig{}
	}
	config := c.config
	config.ClientSecret = ""
	config.AdminToken = ""
	config.HTTPClient = nil
	return config
}

func (c *CasdoorClient) discoveryDocument(ctx context.Context) (*casdoorDiscovery, error) {
	if c == nil {
		return nil, ErrCasdoorNotConfigured
	}
	c.mu.RLock()
	if c.discovery != nil && time.Since(c.discoveryFetch) < 5*time.Minute {
		discovery := *c.discovery
		c.mu.RUnlock()
		return &discovery, nil
	}
	c.mu.RUnlock()

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, c.config.Issuer+"/.well-known/openid-configuration", nil)
	if err != nil {
		return nil, fmt.Errorf("create Casdoor discovery request: %w", err)
	}
	response, err := c.client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("fetch Casdoor discovery document: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		_, _ = io.Copy(io.Discard, response.Body)
		return nil, fmt.Errorf("Casdoor discovery returned HTTP %d", response.StatusCode)
	}
	var discovery casdoorDiscovery
	if err := json.NewDecoder(response.Body).Decode(&discovery); err != nil {
		return nil, fmt.Errorf("decode Casdoor discovery document: %w", err)
	}
	if strings.TrimRight(discovery.Issuer, "/") != c.config.Issuer || discovery.TokenEndpoint == "" || discovery.JWKSURL == "" {
		return nil, fmt.Errorf("Casdoor discovery document is incompatible with configured issuer")
	}

	c.mu.Lock()
	c.discovery = &discovery
	c.discoveryFetch = time.Now()
	c.mu.Unlock()
	return &discovery, nil
}

func (c *CasdoorClient) publicKeys(ctx context.Context, forceRefresh bool) (map[string]*rsa.PublicKey, error) {
	if c == nil {
		return nil, ErrCasdoorNotConfigured
	}
	c.mu.RLock()
	if !forceRefresh && len(c.keys) > 0 && time.Since(c.keysFetch) < 5*time.Minute {
		keys := cloneKeys(c.keys)
		c.mu.RUnlock()
		return keys, nil
	}
	c.mu.RUnlock()

	discovery, err := c.discoveryDocument(ctx)
	if err != nil {
		return nil, err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, discovery.JWKSURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create Casdoor JWKS request: %w", err)
	}
	response, err := c.client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("fetch Casdoor JWKS: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		_, _ = io.Copy(io.Discard, response.Body)
		return nil, fmt.Errorf("Casdoor JWKS returned HTTP %d", response.StatusCode)
	}
	var set casdoorJWKSet
	if err := json.NewDecoder(response.Body).Decode(&set); err != nil {
		return nil, fmt.Errorf("decode Casdoor JWKS: %w", err)
	}
	keys := make(map[string]*rsa.PublicKey, len(set.Keys))
	for _, key := range set.Keys {
		if key.Kid == "" || key.Kty != "RSA" || (key.Alg != "" && key.Alg != "RS256") || key.N == "" || key.E == "" {
			continue
		}
		publicKey, err := jwkToRSA(key)
		if err != nil {
			continue
		}
		keys[key.Kid] = publicKey
	}
	if len(keys) == 0 {
		return nil, fmt.Errorf("Casdoor JWKS did not contain an RSA signing key")
	}
	c.mu.Lock()
	c.keys = keys
	c.keysFetch = time.Now()
	c.mu.Unlock()
	return cloneKeys(keys), nil
}

func cloneKeys(keys map[string]*rsa.PublicKey) map[string]*rsa.PublicKey {
	clone := make(map[string]*rsa.PublicKey, len(keys))
	for kid, key := range keys {
		clone[kid] = key
	}
	return clone
}

func jwkToRSA(key casdoorJWK) (*rsa.PublicKey, error) {
	modulus, err := base64.RawURLEncoding.DecodeString(key.N)
	if err != nil {
		return nil, fmt.Errorf("decode Casdoor RSA modulus: %w", err)
	}
	exponentBytes, err := base64.RawURLEncoding.DecodeString(key.E)
	if err != nil {
		return nil, fmt.Errorf("decode Casdoor RSA exponent: %w", err)
	}
	if len(modulus) == 0 || len(exponentBytes) == 0 || len(exponentBytes) > 4 {
		return nil, fmt.Errorf("invalid Casdoor RSA key")
	}
	var exponent uint32
	for _, value := range exponentBytes {
		exponent = exponent<<8 | uint32(value)
	}
	if exponent == 0 {
		return nil, fmt.Errorf("invalid Casdoor RSA exponent")
	}
	return &rsa.PublicKey{N: new(big.Int).SetBytes(modulus), E: int(exponent)}, nil
}

func (c *CasdoorClient) tokenRequest(ctx context.Context, values url.Values) (*CasdoorToken, error) {
	discovery, err := c.discoveryDocument(ctx)
	if err != nil {
		return nil, err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, discovery.TokenEndpoint, strings.NewReader(values.Encode()))
	if err != nil {
		return nil, fmt.Errorf("create Casdoor token request: %w", err)
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response, err := c.client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("request Casdoor token: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		_, _ = io.Copy(io.Discard, response.Body)
		return nil, fmt.Errorf("Casdoor token request returned HTTP %d", response.StatusCode)
	}
	var token CasdoorToken
	if err := json.NewDecoder(response.Body).Decode(&token); err != nil {
		return nil, fmt.Errorf("decode Casdoor token response: %w", err)
	}
	if token.AccessToken == "" {
		return nil, fmt.Errorf("Casdoor token response did not include an access token")
	}
	return &token, nil
}

func (c *CasdoorClient) PasswordGrant(ctx context.Context, email, password string) (*CasdoorToken, *CasdoorPrincipal, error) {
	if c == nil {
		return nil, nil, ErrCasdoorNotConfigured
	}
	values := url.Values{
		"grant_type":    {"password"},
		"client_id":     {c.config.ClientID},
		"client_secret": {c.config.ClientSecret},
		"username":      {strings.TrimSpace(strings.ToLower(email))},
		"password":      {password},
		"scope":         {"openid email profile"},
	}
	setOptionalTokenValue(values, "organization", c.config.Organization)
	setOptionalTokenValue(values, "application", c.config.Application)
	token, err := c.tokenRequest(ctx, values)
	if err != nil {
		return nil, nil, err
	}
	principal, err := c.ValidateAccessToken(ctx, token.AccessToken)
	if err != nil {
		return nil, nil, err
	}
	return token, principal, nil
}

func (c *CasdoorClient) AuthorizationCodeGrant(ctx context.Context, code, redirectURI string) (*CasdoorToken, *CasdoorPrincipal, error) {
	if c == nil {
		return nil, nil, ErrCasdoorNotConfigured
	}
	if err := c.validateRedirectURI(redirectURI); err != nil {
		return nil, nil, err
	}
	values := url.Values{
		"grant_type":    {"authorization_code"},
		"client_id":     {c.config.ClientID},
		"client_secret": {c.config.ClientSecret},
		"code":          {code},
		"redirect_uri":  {redirectURI},
	}
	setOptionalTokenValue(values, "organization", c.config.Organization)
	setOptionalTokenValue(values, "application", c.config.Application)
	token, err := c.tokenRequest(ctx, values)
	if err != nil {
		return nil, nil, err
	}
	principal, err := c.ValidateAccessToken(ctx, token.AccessToken)
	if err != nil {
		return nil, nil, err
	}
	return token, principal, nil
}

func (c *CasdoorClient) RefreshToken(ctx context.Context, refreshToken string) (*CasdoorToken, error) {
	if c == nil {
		return nil, ErrCasdoorNotConfigured
	}
	if strings.TrimSpace(refreshToken) == "" {
		return nil, fmt.Errorf("refresh token is required")
	}
	values := url.Values{
		"grant_type":    {"refresh_token"},
		"client_id":     {c.config.ClientID},
		"client_secret": {c.config.ClientSecret},
		"refresh_token": {refreshToken},
	}
	setOptionalTokenValue(values, "organization", c.config.Organization)
	setOptionalTokenValue(values, "application", c.config.Application)
	return c.tokenRequest(ctx, values)
}

func (c *CasdoorClient) clientCredentialsToken(ctx context.Context) (*CasdoorToken, error) {
	values := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {c.config.ClientID},
		"client_secret": {c.config.ClientSecret},
	}
	setOptionalTokenValue(values, "organization", c.config.Organization)
	setOptionalTokenValue(values, "application", c.config.Application)
	return c.tokenRequest(ctx, values)
}

func setOptionalTokenValue(values url.Values, key, value string) {
	if strings.TrimSpace(value) != "" {
		values.Set(key, strings.TrimSpace(value))
	}
}

// RegisterUser uses Casdoor's authenticated Public API. The application
// client must be granted the required user-management permission in Casdoor;
// otherwise the operation fails safely and no local account is created.
func (c *CasdoorClient) RegisterUser(ctx context.Context, email, password, displayName string) error {
	if c == nil {
		return ErrCasdoorNotConfigured
	}
	accessToken := strings.TrimSpace(c.config.AdminToken)
	if accessToken == "" {
		token, err := c.clientCredentialsToken(ctx)
		if err != nil {
			return err
		}
		accessToken = token.AccessToken
	}
	owner := c.config.Organization
	if owner == "" {
		owner = "built-in"
	}
	user := casdoorUser{
		Owner:             owner,
		Name:              casdoorUsername(email),
		DisplayName:       displayName,
		Email:             strings.TrimSpace(strings.ToLower(email)),
		Password:          password,
		SignupApplication: c.config.Application,
	}
	body, err := json.Marshal(user)
	if err != nil {
		return fmt.Errorf("encode Casdoor user request: %w", err)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.config.Issuer+"/api/add-user", strings.NewReader(string(body)))
	if err != nil {
		return fmt.Errorf("create Casdoor user request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+accessToken)
	request.Header.Set("Content-Type", "application/json")
	response, err := c.client.Do(request)
	if err != nil {
		return fmt.Errorf("request Casdoor user registration: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		_, _ = io.Copy(io.Discard, response.Body)
		return fmt.Errorf("Casdoor user registration returned HTTP %d", response.StatusCode)
	}
	var result struct {
		Status string `json:"status"`
		Data   bool   `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return fmt.Errorf("decode Casdoor user registration response: %w", err)
	}
	if strings.EqualFold(result.Status, "error") || !result.Data {
		return fmt.Errorf("Casdoor user registration was rejected")
	}
	return nil
}

func casdoorUsername(email string) string {
	localPart := strings.SplitN(strings.TrimSpace(strings.ToLower(email)), "@", 2)[0]
	var builder strings.Builder
	for _, char := range localPart {
		if (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char == '_' || char == '-' {
			builder.WriteRune(char)
		} else {
			builder.WriteRune('_')
		}
	}
	username := strings.Trim(builder.String(), "_-")
	if username == "" {
		return "nalagrow-user"
	}
	return username
}

func (c *CasdoorClient) validateRedirectURI(redirectURI string) error {
	redirectURI = strings.TrimSpace(redirectURI)
	if redirectURI == "" || c.config.RedirectURI == "" || redirectURI != c.config.RedirectURI {
		return fmt.Errorf("redirect URI is not allowed")
	}
	return nil
}

func (c *CasdoorClient) ValidateAccessToken(ctx context.Context, rawToken string) (*CasdoorPrincipal, error) {
	if c == nil {
		return nil, ErrCasdoorNotConfigured
	}
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return nil, ErrCasdoorTokenInvalid
	}
	keys, err := c.publicKeys(ctx, false)
	if err != nil {
		return nil, err
	}
	claims := jwt.MapClaims{}
	parsed, err := jwt.ParseWithClaims(rawToken, claims, func(token *jwt.Token) (interface{}, error) {
		if token.Method.Alg() != jwt.SigningMethodRS256.Alg() {
			return nil, fmt.Errorf("unexpected Casdoor signing method")
		}
		kid, _ := token.Header["kid"].(string)
		if key := keys[kid]; key != nil {
			return key, nil
		}
		return nil, fmt.Errorf("Casdoor signing key not found")
	}, jwt.WithValidMethods([]string{jwt.SigningMethodRS256.Alg()}))
	if err != nil || parsed == nil || !parsed.Valid {
		return nil, ErrCasdoorTokenInvalid
	}
	if _, hasExpiry := claims["exp"]; !hasExpiry {
		return nil, ErrCasdoorTokenInvalid
	}
	issuer, _ := claims["iss"].(string)
	if strings.TrimRight(issuer, "/") != c.config.Issuer {
		return nil, ErrCasdoorTokenInvalid
	}
	if !audienceContains(claims["aud"], c.config.Audience) {
		return nil, ErrCasdoorTokenInvalid
	}
	principal := principalFromClaims(claims)
	principal.Issuer = c.config.Issuer
	if principal.Subject == "" || principal.Email == "" || !hasAnyClaim(claims, "roles", "Roles", "groups", "Groups", "permissions", "Permissions") {
		discovery, discoveryErr := c.discoveryDocument(ctx)
		if discoveryErr == nil && discovery.UserInfoEndpoint != "" {
			userinfo, userinfoErr := c.userInfo(ctx, rawToken, discovery.UserInfoEndpoint)
			if userinfoErr == nil {
				claims = mergeClaims(claims, userinfo)
				principal = principalFromClaims(claims)
				principal.Issuer = c.config.Issuer
			}
		}
	}
	if principal.Subject == "" || principal.Email == "" || principal.IsForbidden {
		return nil, ErrCasdoorTokenInvalid
	}
	if expectedOwner := strings.TrimSpace(c.config.Organization); expectedOwner != "" &&
		principal.Owner != expectedOwner && principal.Organization != expectedOwner {
		return nil, ErrCasdoorTokenInvalid
	}
	return principal, nil
}

func (c *CasdoorClient) userInfo(ctx context.Context, rawToken, endpoint string) (jwt.MapClaims, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create Casdoor userinfo request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+rawToken)
	response, err := c.client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("request Casdoor userinfo: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		_, _ = io.Copy(io.Discard, response.Body)
		return nil, fmt.Errorf("Casdoor userinfo returned HTTP %d", response.StatusCode)
	}
	var payload map[string]interface{}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode Casdoor userinfo: %w", err)
	}
	if nested, ok := payload["data"].(map[string]interface{}); ok {
		if firstStringClaim(jwt.MapClaims(payload), "sub", "id", "email") == "" || firstStringClaim(jwt.MapClaims(nested), "sub", "id", "email") != "" {
			payload = nested
		}
	}
	return jwt.MapClaims(payload), nil
}

func mergeClaims(base, supplement jwt.MapClaims) jwt.MapClaims {
	merged := make(jwt.MapClaims, len(base)+len(supplement))
	for key, value := range base {
		merged[key] = value
	}
	for key, value := range supplement {
		if _, exists := merged[key]; !exists || isEmptyClaim(merged[key]) {
			merged[key] = value
		}
	}
	return merged
}

func isEmptyClaim(value interface{}) bool {
	switch value := value.(type) {
	case nil:
		return true
	case string:
		return strings.TrimSpace(value) == ""
	case []interface{}:
		return len(value) == 0
	case []string:
		return len(value) == 0
	default:
		return false
	}
}

func hasAnyClaim(claims jwt.MapClaims, names ...string) bool {
	for _, name := range names {
		if value, ok := claims[name]; ok && !isEmptyClaim(value) {
			return true
		}
	}
	return false
}

func audienceContains(value interface{}, expected string) bool {
	if expected == "" {
		return true
	}
	switch audience := value.(type) {
	case string:
		return audience == expected
	case []interface{}:
		for _, item := range audience {
			if item == expected {
				return true
			}
		}
	case []string:
		for _, item := range audience {
			if item == expected {
				return true
			}
		}
	}
	return false
}

func principalFromClaims(claims jwt.MapClaims) *CasdoorPrincipal {
	principal := &CasdoorPrincipal{
		Subject:       firstStringClaim(claims, "sub", "id", "User"),
		Email:         strings.ToLower(firstStringClaim(claims, "email")),
		Name:          firstStringClaim(claims, "preferred_username", "name", "Name"),
		DisplayName:   firstStringClaim(claims, "displayName", "DisplayName", "name"),
		Owner:         firstStringClaim(claims, "owner", "Owner", "organization", "Organization"),
		Organization:  firstStringClaim(claims, "organization", "Organization", "owner", "Owner"),
		Roles:         stringSliceClaim(claims, "roles", "Roles", "groups", "Groups"),
		Permissions:   stringSliceClaim(claims, "permissions", "Permissions"),
		IsAdmin:       boolClaim(claims, "isAdmin", "IsAdmin"),
		IsGlobalAdmin: boolClaim(claims, "isGlobalAdmin", "IsGlobalAdmin"),
		IsForbidden:   boolClaim(claims, "isForbidden", "IsForbidden"),
	}
	if len(principal.Roles) == 0 {
		principal.Roles = []string{"Parent"}
	}
	if len(principal.Permissions) == 0 {
		principal.Permissions = []string{"*"}
	}
	return principal
}

func firstStringClaim(claims jwt.MapClaims, names ...string) string {
	for _, name := range names {
		if value, ok := claims[name].(string); ok && strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func stringSliceClaim(claims jwt.MapClaims, names ...string) []string {
	for _, name := range names {
		switch values := claims[name].(type) {
		case []interface{}:
			result := make([]string, 0, len(values))
			for _, value := range values {
				if item, ok := value.(string); ok && strings.TrimSpace(item) != "" {
					result = append(result, strings.TrimSpace(item))
				}
			}
			if len(result) > 0 {
				return result
			}
		case []string:
			if len(values) > 0 {
				return append([]string(nil), values...)
			}
		case string:
			parts := strings.Split(values, ",")
			result := make([]string, 0, len(parts))
			for _, part := range parts {
				if item := strings.TrimSpace(part); item != "" {
					result = append(result, item)
				}
			}
			if len(result) > 0 {
				return result
			}
		}
	}
	return nil
}

func boolClaim(claims jwt.MapClaims, names ...string) bool {
	for _, name := range names {
		switch value := claims[name].(type) {
		case bool:
			if value {
				return true
			}
		case string:
			if strings.EqualFold(value, "true") {
				return true
			}
		}
	}
	return false
}

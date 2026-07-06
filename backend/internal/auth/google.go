package auth

import (
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"
)

// GoogleUser represents the verified user info extracted from a Google ID token.
type GoogleUser struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

// googleJWK represents a single JSON Web Key from Google's JWK set.
type googleJWK struct {
	KID string `json:"kid"`
	Alg string `json:"alg"`
	Kty string `json:"kty"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

// googleJWKSet is the response from Google's certs endpoint.
type googleJWKSet struct {
	Keys []googleJWK `json:"keys"`
}

// googleIDTokenPayload is the standard claims in a Google ID token.
type googleIDTokenPayload struct {
	Iss           string `json:"iss"`
	Azp           string `json:"azp"`
	Aud           string `json:"aud"`
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	AtHash        string `json:"at_hash"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Iat           int64  `json:"iat"`
	Exp           int64  `json:"exp"`
}

// idTokenSegments holds the decoded parts of a JWT.
type idTokenSegments struct {
	Header    string
	Payload   string
	Signature []byte
	HeaderObj struct {
		Alg string `json:"alg"`
		Kid string `json:"kid"`
		Typ string `json:"typ"`
	}
}

// GoogleTokenVerifier verifies Google ID tokens using Google's public JWKs.
type GoogleTokenVerifier struct {
	client         *http.Client
	jwkURL         string
	cache          map[string]*rsa.PublicKey
	cacheMu        sync.RWMutex
	cacheExpiry    time.Time
	cacheTTL       time.Duration
	now            func() time.Time // for testability
}

// NewGoogleTokenVerifier creates a new verifier with the default Google JWK endpoint.
func NewGoogleTokenVerifier() *GoogleTokenVerifier {
	return &GoogleTokenVerifier{
		client: &http.Client{Timeout: 10 * time.Second},
		jwkURL: "https://www.googleapis.com/oauth2/v3/certs",
		cache:  make(map[string]*rsa.PublicKey),
		cacheTTL: 1 * time.Hour,
		now:    time.Now,
	}
}

// VerifyIDToken verifies a Google ID token and returns the user info.
// clientID is the expected audience (your Google OAuth client ID).
// If clientID is empty, audience verification is skipped.
func (v *GoogleTokenVerifier) VerifyIDToken(idToken string, clientID string) (*GoogleUser, error) {
	if idToken == "" {
		return nil, fmt.Errorf("id token is empty")
	}

	// Decode the JWT segments
	segs, err := decodeIDToken(idToken)
	if err != nil {
		return nil, fmt.Errorf("decode token: %w", err)
	}

	// Verify the algorithm
	if segs.HeaderObj.Alg != "RS256" {
		return nil, fmt.Errorf("unexpected algorithm: %s (expected RS256)", segs.HeaderObj.Alg)
	}

	// Get the public key
	pubKey, err := v.getPublicKey(segs.HeaderObj.Kid)
	if err != nil {
		return nil, fmt.Errorf("get public key: %w", err)
	}

	// Verify the signature
	if err := verifyRS256Signature(segs.Header+"."+segs.Payload, segs.Signature, pubKey); err != nil {
		return nil, fmt.Errorf("signature verification: %w", err)
	}

	// Decode and verify the payload
	payload, err := decodeIDTokenPayload(segs.Payload)
	if err != nil {
		return nil, fmt.Errorf("decode payload: %w", err)
	}

	// Verify issuer
	if payload.Iss != "https://accounts.google.com" && payload.Iss != "accounts.google.com" {
		return nil, fmt.Errorf("invalid issuer: %s", payload.Iss)
	}

	// Verify audience
	if clientID != "" && payload.Aud != clientID {
		return nil, fmt.Errorf("invalid audience: %s (expected %s)", payload.Aud, clientID)
	}

	// Verify expiry
	now := v.now().Unix()
	if payload.Exp < now {
		return nil, fmt.Errorf("token expired at %d, now is %d", payload.Exp, now)
	}

	// Verify not before (if present)
	if payload.Iat > 0 && payload.Iat > now+300 {
		return nil, fmt.Errorf("token issued in the future: %d", payload.Iat)
	}

	return &GoogleUser{
		Sub:   payload.Sub,
		Email: payload.Email,
		Name:  payload.Name,
	}, nil
}

// getPublicKey fetches and caches Google's public keys, returning the key with the given KID.
func (v *GoogleTokenVerifier) getPublicKey(kid string) (*rsa.PublicKey, error) {
	// Check cache first
	v.cacheMu.RLock()
	if v.cacheExpiry.After(v.now()) {
		if key, ok := v.cache[kid]; ok {
			v.cacheMu.RUnlock()
			return key, nil
		}
	}
	v.cacheMu.RUnlock()

	// Cache miss or expired — fetch new keys
	if err := v.refreshKeys(); err != nil {
		// Try the stale cache as a fallback
		v.cacheMu.RLock()
		key, ok := v.cache[kid]
		v.cacheMu.RUnlock()
		if ok {
			return key, nil
		}
		return nil, fmt.Errorf("fetch keys: %w", err)
	}

	// Look up the key again
	v.cacheMu.RLock()
	key, ok := v.cache[kid]
	v.cacheMu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("key with kid %s not found", kid)
	}
	return key, nil
}

// refreshKeys fetches the JWK set from Google and updates the cache.
func (v *GoogleTokenVerifier) refreshKeys() error {
	resp, err := v.client.Get(v.jwkURL)
	if err != nil {
		return fmt.Errorf("http get: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	var jwkSet googleJWKSet
	if err := json.NewDecoder(resp.Body).Decode(&jwkSet); err != nil {
		return fmt.Errorf("decode jwk: %w", err)
	}

	newCache := make(map[string]*rsa.PublicKey, len(jwkSet.Keys))
	for _, jwk := range jwkSet.Keys {
		if jwk.Kty != "RSA" {
			continue
		}
		key, err := jwkToPublicKey(jwk)
		if err != nil {
			continue // skip malformed keys
		}
		newCache[jwk.KID] = key
	}

	if len(newCache) == 0 {
		return fmt.Errorf("no valid RSA keys found")
	}

	v.cacheMu.Lock()
	v.cache = newCache
	v.cacheExpiry = v.now().Add(v.cacheTTL)
	v.cacheMu.Unlock()

	return nil
}

// decodeIDToken splits and decodes a JWT into its three segments.
func decodeIDToken(token string) (*idTokenSegments, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token: expected 3 segments, got %d", len(parts))
	}

	segs := &idTokenSegments{
		Header:  parts[0],
		Payload: parts[1],
	}

	// Decode header
	headerJSON, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("decode header: %w", err)
	}
	if err := json.Unmarshal(headerJSON, &segs.HeaderObj); err != nil {
		return nil, fmt.Errorf("parse header: %w", err)
	}

	// Decode signature
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, fmt.Errorf("decode signature: %w", err)
	}
	segs.Signature = sig

	return segs, nil
}

// decodeIDTokenPayload decodes the JWT payload from base64.
func decodeIDTokenPayload(payloadB64 string) (*googleIDTokenPayload, error) {
	payloadJSON, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return nil, fmt.Errorf("base64 decode: %w", err)
	}
	var payload googleIDTokenPayload
	if err := json.Unmarshal(payloadJSON, &payload); err != nil {
		return nil, fmt.Errorf("json parse: %w", err)
	}
	return &payload, nil
}

// verifyRS256Signature verifies a RS256 signature.
func verifyRS256Signature(data string, sig []byte, pubKey *rsa.PublicKey) error {
	hashed := sha256.Sum256([]byte(data))
	return rsa.VerifyPKCS1v15(pubKey, 0, hashed[:], sig)
}

// jwkToPublicKey converts a Google JWK to a Go *rsa.PublicKey.
func jwkToPublicKey(jwk googleJWK) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(jwk.N)
	if err != nil {
		return nil, fmt.Errorf("decode modulus: %w", err)
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(jwk.E)
	if err != nil {
		return nil, fmt.Errorf("decode exponent: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	e := 0
	if len(eBytes) <= 4 {
		// Pad eBytes to 4 bytes for binary.BigEndian
		padded := make([]byte, 4)
		copy(padded[4-len(eBytes):], eBytes)
		e = int(binary.BigEndian.Uint32(padded))
	} else {
		return nil, fmt.Errorf("exponent too large: %d bytes", len(eBytes))
	}

	return &rsa.PublicKey{
		N: n,
		E: e,
	}, nil
}

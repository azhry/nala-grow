package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"math/big"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testKeyPair holds an RSA key pair for testing.
type testKeyPair struct {
	PrivateKey *rsa.PrivateKey
	PublicKey  *rsa.PublicKey
	Kid        string
}

// generateTestKeyPair creates a new RSA key pair for testing.
func generateTestKeyPair() (*testKeyPair, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, fmt.Errorf("generate key: %w", err)
	}
	kid := fmt.Sprintf("test-kid-%d", time.Now().UnixNano())
	return &testKeyPair{
		PrivateKey: key,
		PublicKey:  &key.PublicKey,
		Kid:        kid,
	}, nil
}

// encodeRS256Token creates a self-signed JWT with RS256 signature.
func encodeRS256Token(key *testKeyPair, payload map[string]interface{}) (string, error) {
	// Create header
	header := map[string]string{
		"alg": "RS256",
		"kid": key.Kid,
		"typ": "JWT",
	}
	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", fmt.Errorf("marshal header: %w", err)
	}
	headerB64 := base64.RawURLEncoding.EncodeToString(headerJSON)

	// Create payload
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal payload: %w", err)
	}
	payloadB64 := base64.RawURLEncoding.EncodeToString(payloadJSON)

	// Sign
	sigInput := headerB64 + "." + payloadB64
	hashed := sha256.Sum256([]byte(sigInput))
	sig, err := rsa.SignPKCS1v15(rand.Reader, key.PrivateKey, 0, hashed[:])
	if err != nil {
		return "", fmt.Errorf("sign: %w", err)
	}
	sigB64 := base64.RawURLEncoding.EncodeToString(sig)

	return sigInput + "." + sigB64, nil
}

// jwkFromTestKey converts a testKeyPair to a googleJWK.
func jwkFromTestKey(key *testKeyPair) googleJWK {
	n := base64.RawURLEncoding.EncodeToString(key.PublicKey.N.Bytes())
	e := base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.PublicKey.E)).Bytes())
	return googleJWK{
		KID: key.Kid,
		Alg: "RS256",
		Kty: "RSA",
		Use: "sig",
		N:   n,
		E:   e,
	}
}

// Test verifier that uses a custom JWK fetcher (via a custom URL and handler).
// We inject keys by setting up a test server.
func TestGoogleTokenVerifier_VerifyIDToken(t *testing.T) {
	key, err := generateTestKeyPair()
	require.NoError(t, err)

	fixedNow := time.Date(2026, 7, 6, 12, 0, 0, 0, time.UTC)

	t.Run("valid token", func(t *testing.T) {
		v := NewGoogleTokenVerifier()
		v.now = func() time.Time { return fixedNow }
		// Manually set cache with our test key
		v.cacheMu.Lock()
		v.cache[key.Kid] = key.PublicKey
		v.cacheExpiry = fixedNow.Add(1 * time.Hour)
		v.cacheMu.Unlock()

		token, err := encodeRS256Token(key, map[string]interface{}{
			"iss": "https://accounts.google.com",
			"aud": "test-client-id-123",
			"sub": "google-user-456",
			"email": "testuser@gmail.com",
			"email_verified": true,
			"name": "Test User",
			"iat": fixedNow.Add(-10 * time.Minute).Unix(),
			"exp": fixedNow.Add(30 * time.Minute).Unix(),
		})
		require.NoError(t, err)

		user, err := v.VerifyIDToken(token, "test-client-id-123")
		require.NoError(t, err)
		require.NotNil(t, user)
		assert.Equal(t, "google-user-456", user.Sub)
		assert.Equal(t, "testuser@gmail.com", user.Email)
		assert.Equal(t, "Test User", user.Name)
	})

	t.Run("valid token without client ID verification", func(t *testing.T) {
		v := NewGoogleTokenVerifier()
		v.now = func() time.Time { return fixedNow }
		v.cacheMu.Lock()
		v.cache[key.Kid] = key.PublicKey
		v.cacheExpiry = fixedNow.Add(1 * time.Hour)
		v.cacheMu.Unlock()

		token, err := encodeRS256Token(key, map[string]interface{}{
			"iss": "accounts.google.com",
			"aud": "some-other-client",
			"sub": "google-user-789",
			"email": "another@gmail.com",
			"name":  "Another User",
			"iat":   fixedNow.Add(-5 * time.Minute).Unix(),
			"exp":   fixedNow.Add(30 * time.Minute).Unix(),
		})
		require.NoError(t, err)

		// No client ID verification — should pass
		user, err := v.VerifyIDToken(token, "")
		require.NoError(t, err)
		require.NotNil(t, user)
		assert.Equal(t, "another@gmail.com", user.Email)
	})

	t.Run("wrong audience", func(t *testing.T) {
		v := NewGoogleTokenVerifier()
		v.now = func() time.Time { return fixedNow }
		v.cacheMu.Lock()
		v.cache[key.Kid] = key.PublicKey
		v.cacheExpiry = fixedNow.Add(1 * time.Hour)
		v.cacheMu.Unlock()

		token, err := encodeRS256Token(key, map[string]interface{}{
			"iss":   "https://accounts.google.com",
			"aud":   "wrong-client-id",
			"sub":   "google-user-456",
			"email": "testuser@gmail.com",
			"name":  "Test User",
			"iat":   fixedNow.Add(-10 * time.Minute).Unix(),
			"exp":   fixedNow.Add(30 * time.Minute).Unix(),
		})
		require.NoError(t, err)

		_, err = v.VerifyIDToken(token, "expected-client-id")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid audience")
	})

	t.Run("expired token", func(t *testing.T) {
		v := NewGoogleTokenVerifier()
		v.now = func() time.Time { return fixedNow }
		v.cacheMu.Lock()
		v.cache[key.Kid] = key.PublicKey
		v.cacheExpiry = fixedNow.Add(1 * time.Hour)
		v.cacheMu.Unlock()

		token, err := encodeRS256Token(key, map[string]interface{}{
			"iss":   "https://accounts.google.com",
			"aud":   "test-client-id-123",
			"sub":   "google-user-456",
			"email": "testuser@gmail.com",
			"name":  "Test User",
			"iat":   fixedNow.Add(-60 * time.Minute).Unix(),
			"exp":   fixedNow.Add(-1 * time.Minute).Unix(),
		})
		require.NoError(t, err)

		_, err = v.VerifyIDToken(token, "test-client-id-123")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "expired")
	})

	t.Run("wrong issuer", func(t *testing.T) {
		v := NewGoogleTokenVerifier()
		v.now = func() time.Time { return fixedNow }
		v.cacheMu.Lock()
		v.cache[key.Kid] = key.PublicKey
		v.cacheExpiry = fixedNow.Add(1 * time.Hour)
		v.cacheMu.Unlock()

		token, err := encodeRS256Token(key, map[string]interface{}{
			"iss":   "https://evil.com",
			"aud":   "test-client-id-123",
			"sub":   "google-user-456",
			"email": "testuser@gmail.com",
			"name":  "Test User",
			"iat":   fixedNow.Add(-10 * time.Minute).Unix(),
			"exp":   fixedNow.Add(30 * time.Minute).Unix(),
		})
		require.NoError(t, err)

		_, err = v.VerifyIDToken(token, "test-client-id-123")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid issuer")
	})

	t.Run("tampered signature", func(t *testing.T) {
		v := NewGoogleTokenVerifier()
		v.now = func() time.Time { return fixedNow }
		v.cacheMu.Lock()
		v.cache[key.Kid] = key.PublicKey
		v.cacheExpiry = fixedNow.Add(1 * time.Hour)
		v.cacheMu.Unlock()

		validToken, err := encodeRS256Token(key, map[string]interface{}{
			"iss":   "https://accounts.google.com",
			"aud":   "test-client-id-123",
			"sub":   "google-user-456",
			"email": "testuser@gmail.com",
			"name":  "Test User",
			"iat":   fixedNow.Add(-10 * time.Minute).Unix(),
			"exp":   fixedNow.Add(30 * time.Minute).Unix(),
		})
		require.NoError(t, err)

		// Tamper with the signature
		parts := strings.Split(validToken, ".")
		require.Len(t, parts, 3)
		tamperedSig := base64.RawURLEncoding.EncodeToString([]byte("tampered-signature-data"))
		tamperedToken := parts[0] + "." + parts[1] + "." + tamperedSig

		_, err = v.VerifyIDToken(tamperedToken, "test-client-id-123")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "signature verification")
	})

	t.Run("wrong algorithm", func(t *testing.T) {
		v := NewGoogleTokenVerifier()
		v.now = func() time.Time { return fixedNow }

		// Use HS256 instead of RS256
		header := map[string]string{"alg": "HS256", "kid": key.Kid, "typ": "JWT"}
		headerJSON, _ := json.Marshal(header)
		headerB64 := base64.RawURLEncoding.EncodeToString(headerJSON)

		payload := map[string]interface{}{
			"iss": "https://accounts.google.com",
			"aud": "test-client-id-123",
			"sub": "google-user-456",
			"email": "testuser@gmail.com",
			"name":  "Test User",
			"iat":   fixedNow.Add(-10 * time.Minute).Unix(),
			"exp":   fixedNow.Add(30 * time.Minute).Unix(),
		}
		payloadJSON, _ := json.Marshal(payload)
		payloadB64 := base64.RawURLEncoding.EncodeToString(payloadJSON)
		token := headerB64 + "." + payloadB64 + ".fake-signature"

		_, err := v.VerifyIDToken(token, "test-client-id-123")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unexpected algorithm")
	})

	t.Run("empty token", func(t *testing.T) {
		v := NewGoogleTokenVerifier()
		_, err := v.VerifyIDToken("", "test-client-id-123")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "empty")
	})

	t.Run("malformed token", func(t *testing.T) {
		v := NewGoogleTokenVerifier()
		_, err := v.VerifyIDToken("not-a-valid-jwt", "test-client-id-123")
		assert.Error(t, err)
	})

	t.Run("key not found in cache", func(t *testing.T) {
		v := NewGoogleTokenVerifier()
		v.now = func() time.Time { return fixedNow }
		// Empty cache
		v.cacheMu.Lock()
		v.cache = make(map[string]*rsa.PublicKey)
		v.cacheExpiry = fixedNow.Add(1 * time.Hour)
		v.cacheMu.Unlock()

		otherKey, err := generateTestKeyPair()
		require.NoError(t, err)

		token, err := encodeRS256Token(otherKey, map[string]interface{}{
			"iss":   "https://accounts.google.com",
			"aud":   "test-client-id-123",
			"sub":   "google-user-456",
			"email": "testuser@gmail.com",
			"name":  "Test User",
			"iat":   fixedNow.Add(-10 * time.Minute).Unix(),
			"exp":   fixedNow.Add(30 * time.Minute).Unix(),
		})
		require.NoError(t, err)

		// Will try to fetch keys from Google but we don't have a server, so it should fail
		_, err = v.VerifyIDToken(token, "test-client-id-123")
		assert.Error(t, err)
	})
}

func TestGoogleTokenVerifier_RefreshKeys(t *testing.T) {
	t.Run("fetch fails gracefully", func(t *testing.T) {
		v := NewGoogleTokenVerifier()
		v.jwkURL = "https://nonexistent.example.com/certs"
		v.cacheMu.Lock()
		v.cache[keyFromKid("existing")] = &rsa.PublicKey{N: big.NewInt(12345), E: 65537}
		v.cacheExpiry = time.Now().Add(-1 * time.Hour) // expired
		v.cacheMu.Unlock()

		// refreshKeys should fail (no network), but stale cache remains
		err := v.refreshKeys()
		assert.Error(t, err)
	})
}

func TestVerifyIDToken_EdgeCases(t *testing.T) {
	t.Run("token with future iat", func(t *testing.T) {
		key, err := generateTestKeyPair()
		require.NoError(t, err)

		fixedNow := time.Date(2026, 7, 6, 12, 0, 0, 0, time.UTC)
		v := NewGoogleTokenVerifier()
		v.now = func() time.Time { return fixedNow }
		v.cacheMu.Lock()
		v.cache[key.Kid] = key.PublicKey
		v.cacheExpiry = fixedNow.Add(1 * time.Hour)
		v.cacheMu.Unlock()

		token, err := encodeRS256Token(key, map[string]interface{}{
			"iss":   "https://accounts.google.com",
			"aud":   "test-client-id-123",
			"sub":   "google-user-456",
			"email": "testuser@gmail.com",
			"name":  "Test User",
			"iat":   fixedNow.Add(10 * time.Minute).Unix(), // 10 min in future
			"exp":   fixedNow.Add(30 * time.Minute).Unix(),
		})
		require.NoError(t, err)

		// More than 5 minutes in future should be rejected
		_, err = v.VerifyIDToken(token, "test-client-id-123")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "issued in the future")
	})

	t.Run("token with acceptable future iat (within 5 min skew)", func(t *testing.T) {
		key, err := generateTestKeyPair()
		require.NoError(t, err)

		fixedNow := time.Date(2026, 7, 6, 12, 0, 0, 0, time.UTC)
		v := NewGoogleTokenVerifier()
		v.now = func() time.Time { return fixedNow }
		v.cacheMu.Lock()
		v.cache[key.Kid] = key.PublicKey
		v.cacheExpiry = fixedNow.Add(1 * time.Hour)
		v.cacheMu.Unlock()

		// 2 minutes in future — within 5 min skew should pass
		token, err := encodeRS256Token(key, map[string]interface{}{
			"iss":   "https://accounts.google.com",
			"aud":   "test-client-id-123",
			"sub":   "google-user-456",
			"email": "testuser@gmail.com",
			"name":  "Test User",
			"iat":   fixedNow.Add(2 * time.Minute).Unix(),
			"exp":   fixedNow.Add(30 * time.Minute).Unix(),
		})
		require.NoError(t, err)

		user, err := v.VerifyIDToken(token, "test-client-id-123")
		require.NoError(t, err)
		assert.Equal(t, "google-user-456", user.Sub)
	})
}

func TestJWKToPublicKey(t *testing.T) {
	t.Run("valid JWK to public key", func(t *testing.T) {
		key, err := generateTestKeyPair()
		require.NoError(t, err)

		jwk := jwkFromTestKey(key)
		pubKey, err := jwkToPublicKey(jwk)
		require.NoError(t, err)
		require.NotNil(t, pubKey)
		assert.Equal(t, key.PublicKey.N, pubKey.N)
		assert.Equal(t, key.PublicKey.E, pubKey.E)
	})

	t.Run("invalid modulus", func(t *testing.T) {
		jwk := googleJWK{KID: "test", Kty: "RSA", N: "!!!invalid-base64!!!", E: "AQAB"}
		_, err := jwkToPublicKey(jwk)
		assert.Error(t, err)
	})

	t.Run("invalid exponent", func(t *testing.T) {
		jwk := googleJWK{KID: "test", Kty: "RSA", N: "aW52YWxpZA", E: "!!!invalid-base64!!!"}
		_, err := jwkToPublicKey(jwk)
		assert.Error(t, err)
	})
}

func TestDecodeIDToken(t *testing.T) {
	t.Run("valid three segments", func(t *testing.T) {
		header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256","kid":"abc","typ":"JWT"}`))
		payload := base64.RawURLEncoding.EncodeToString([]byte(`{"sub":"123"}`))
		sig := base64.RawURLEncoding.EncodeToString([]byte("signature"))
		token := header + "." + payload + "." + sig

		segs, err := decodeIDToken(token)
		require.NoError(t, err)
		assert.Equal(t, header, segs.Header)
		assert.Equal(t, payload, segs.Payload)
		assert.Equal(t, "RS256", segs.HeaderObj.Alg)
		assert.Equal(t, "abc", segs.HeaderObj.Kid)
	})

	t.Run("less than 3 segments", func(t *testing.T) {
		_, err := decodeIDToken("header.payload")
		assert.Error(t, err)
	})

	t.Run("empty token", func(t *testing.T) {
		_, err := decodeIDToken("..")
		assert.Error(t, err)
	})
}

func TestDecodeIDTokenPayload(t *testing.T) {
	t.Run("valid payload", func(t *testing.T) {
		payloadB64 := base64.RawURLEncoding.EncodeToString([]byte(
			`{"iss":"https://accounts.google.com","sub":"123","email":"test@test.com","name":"Test"}`,
		))
		payload, err := decodeIDTokenPayload(payloadB64)
		require.NoError(t, err)
		assert.Equal(t, "https://accounts.google.com", payload.Iss)
		assert.Equal(t, "123", payload.Sub)
		assert.Equal(t, "test@test.com", payload.Email)
		assert.Equal(t, "Test", payload.Name)
	})

	t.Run("invalid base64", func(t *testing.T) {
		_, err := decodeIDTokenPayload("!!!not-base64!!!")
		assert.Error(t, err)
	})

	t.Run("invalid JSON", func(t *testing.T) {
		payloadB64 := base64.RawURLEncoding.EncodeToString([]byte("{invalid json"))
		_, err := decodeIDTokenPayload(payloadB64)
		assert.Error(t, err)
	})
}

// Helper to create a minimal test key entry.
func keyFromKid(kid string) string {
	return kid
}

// Test that a full verification with a different key fails (key mismatch).
func TestGoogleTokenVerifier_WrongKey(t *testing.T) {
	key1, err := generateTestKeyPair()
	require.NoError(t, err)
	key2, err := generateTestKeyPair()
	require.NoError(t, err)

	fixedNow := time.Date(2026, 7, 6, 12, 0, 0, 0, time.UTC)
	v := NewGoogleTokenVerifier()
	v.now = func() time.Time { return fixedNow }

	// Cache key2 but token is signed by key1
	v.cacheMu.Lock()
	v.cache[key2.Kid] = key2.PublicKey
	v.cacheExpiry = fixedNow.Add(1 * time.Hour)
	v.cacheMu.Unlock()

	token, err := encodeRS256Token(key1, map[string]interface{}{
		"iss":   "https://accounts.google.com",
		"aud":   "test-client-id",
		"sub":   "google-user-456",
		"email": "testuser@gmail.com",
		"name":  "Test User",
		"iat":   fixedNow.Add(-10 * time.Minute).Unix(),
		"exp":   fixedNow.Add(30 * time.Minute).Unix(),
	})
	require.NoError(t, err)

	// Token's kid (key1) won't be in cache (key2 is), so refreshKeys will fail
	// and stale cache won't have it either
	_, err = v.VerifyIDToken(token, "test-client-id")
	assert.Error(t, err)
}

// Test x509 key encoding roundtrip.
func TestKeyEncoding(t *testing.T) {
	key, err := generateTestKeyPair()
	require.NoError(t, err)

	// Encode private key to PEM
	privBytes := x509.MarshalPKCS1PrivateKey(key.PrivateKey)
	privPEM := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: privBytes})
	require.NotEmpty(t, privPEM)

	// Parse it back
	block, _ := pem.Decode(privPEM)
	require.NotNil(t, block)
	parsedKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	require.NoError(t, err)
	assert.True(t, key.PrivateKey.Equal(parsedKey))
}

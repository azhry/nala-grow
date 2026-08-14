package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestLoadRuntimeEnvironmentReadsVaultConfigFromParent(t *testing.T) {
	root := t.TempDir()
	nested := filepath.Join(root, "backend", "cmd")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatalf("os.MkdirAll() error = %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, runtimeVaultConfigFile), []byte("VAULT_ADDR=https://file.example\nVAULT_TOKEN=file-token\nVAULT_KV_PATH=nala-labs/nala-grow\nIGNORED=value\n"), 0o600); err != nil {
		t.Fatalf("os.WriteFile() error = %v", err)
	}

	merged, err := loadRuntimeEnvironment(map[string]string{
		"VAULT_ADDR":     "https://process.example",
		"VAULT_KV_MOUNT": "process-mount",
	}, nested)
	if err != nil {
		t.Fatalf("loadRuntimeEnvironment() error = %v", err)
	}
	if merged["VAULT_ADDR"] != "https://process.example" {
		t.Fatalf("VAULT_ADDR = %q, want process value", merged["VAULT_ADDR"])
	}
	if merged["VAULT_TOKEN"] != "file-token" || merged["VAULT_KV_PATH"] != "nala-labs/nala-grow" {
		t.Fatalf("file Vault values were not loaded: %#v", merged)
	}
	if _, ok := merged["IGNORED"]; ok {
		t.Fatalf("unsupported key from .vault-config was loaded")
	}
}

func TestLoadRuntimeConfigUsesVaultConfigFile(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Vault-Token") != "file-token" {
			t.Fatalf("Vault token = %q, want file token", r.Header.Get("X-Vault-Token"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"data":{"DATABASE_URL":"postgres://vault.example/nalagrow"}}}`))
	}))
	defer server.Close()

	workingDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(workingDir, runtimeVaultConfigFile), []byte("VAULT_ADDR="+server.URL+"\nVAULT_TOKEN=file-token\n"), 0o600); err != nil {
		t.Fatalf("os.WriteFile() error = %v", err)
	}

	config, err := loadRuntimeConfigFromEnvironment(map[string]string{}, workingDir, server.Client())
	if err != nil {
		t.Fatalf("loadRuntimeConfigFromEnvironment() error = %v", err)
	}
	if config.DatabaseURL != "postgres://vault.example/nalagrow" {
		t.Fatalf("DatabaseURL = %q, want Vault value", config.DatabaseURL)
	}
}

func TestLoadRuntimeConfigUsesVaultValuesWithToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/v1/secret/data/nala-labs/nala-grow" {
			t.Fatalf("Vault request = %s %s, want GET /v1/secret/data/nala-labs/nala-grow", r.Method, r.URL.Path)
		}
		if got := r.Header.Get("X-Vault-Token"); got != "vault-token" {
			t.Fatalf("Vault token = %q, want test token", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": map[string]any{
				"data": map[string]string{
					"DATABASE_URL":        "postgres://vault.example/nalagrow",
					"JWT_SECRET":          "vault-jwt-secret",
					"GOOGLE_CLIENT_ID":    "vault-google-client",
					"HEALTHCHECK_TIMEOUT": "750ms",
				},
			},
		})
	}))
	defer server.Close()

	t.Setenv("VAULT_ADDR", server.URL)
	t.Setenv("VAULT_TOKEN", "vault-token")
	t.Setenv("VAULT_ROLE_ID", "")
	t.Setenv("VAULT_SECRET_ID", "")
	t.Setenv("VAULT_KV_MOUNT", "secret")
	t.Setenv("VAULT_KV_PATH", "nala-labs/nala-grow")
	t.Setenv("DATABASE_URL", "postgres://process.example/nalagrow")
	t.Setenv("JWT_SECRET", "process-jwt-secret")
	t.Setenv("GOOGLE_CLIENT_ID", "process-google-client")
	t.Setenv("PORT", "4555")

	config, err := loadRuntimeConfigWithClient(server.Client())
	if err != nil {
		t.Fatalf("loadRuntimeConfigWithClient() error = %v", err)
	}
	if config.DatabaseURL != "postgres://vault.example/nalagrow" {
		t.Fatalf("DatabaseURL = %q, want Vault value", config.DatabaseURL)
	}
	if config.JWTSecret != "vault-jwt-secret" || config.GoogleClientID != "vault-google-client" {
		t.Fatalf("Vault application values were not applied: %+v", config)
	}
	if config.Port != "4555" {
		t.Fatalf("Port = %q, want process value for key absent from Vault", config.Port)
	}
	if config.Health.Timeout != 750*time.Millisecond {
		t.Fatalf("Healthcheck timeout = %s, want 750ms", config.Health.Timeout)
	}
}

func TestLoadRuntimeConfigSupportsAppRole(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/v1/auth/approle/login":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"auth":{"client_token":"approle-token"}}`))
		case r.Method == http.MethodGet && r.URL.Path == "/v1/secret/data/nala-labs/nala-grow":
			if r.Header.Get("X-Vault-Token") != "approle-token" {
				t.Fatalf("AppRole token was not used for KV read")
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"data":{"data":{"GOOGLE_CLIENT_ID":"approle-google-client"}}}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	t.Setenv("VAULT_ADDR", server.URL)
	t.Setenv("VAULT_TOKEN", "")
	t.Setenv("VAULT_ROLE_ID", "role-id")
	t.Setenv("VAULT_SECRET_ID", "secret-id")
	t.Setenv("VAULT_KV_MOUNT", "")
	t.Setenv("VAULT_KV_PATH", "")

	config, err := loadRuntimeConfigWithClient(server.Client())
	if err != nil {
		t.Fatalf("loadRuntimeConfigWithClient() error = %v", err)
	}
	if config.GoogleClientID != "approle-google-client" {
		t.Fatalf("GoogleClientID = %q, want AppRole Vault value", config.GoogleClientID)
	}
}

func TestLoadRuntimeConfigFailsWhenConfiguredVaultCannotAuthenticate(t *testing.T) {
	t.Setenv("VAULT_ADDR", "https://vault.example")
	t.Setenv("VAULT_TOKEN", "")
	t.Setenv("VAULT_ROLE_ID", "role-id")
	t.Setenv("VAULT_SECRET_ID", "")

	_, err := loadRuntimeConfigWithClient(http.DefaultClient)
	if err == nil || !strings.Contains(err.Error(), "both VAULT_ROLE_ID and VAULT_SECRET_ID") {
		t.Fatalf("loadRuntimeConfigWithClient() error = %v, want actionable AppRole configuration error", err)
	}
	if strings.Contains(err.Error(), "role-id") {
		t.Fatalf("configuration error leaked a credential: %v", err)
	}
}

func TestLoadRuntimeConfigFailsWithoutFallingBackWhenVaultReturnsError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "internal Vault response", http.StatusInternalServerError)
	}))
	defer server.Close()

	t.Setenv("VAULT_ADDR", server.URL)
	t.Setenv("VAULT_TOKEN", "vault-token")
	t.Setenv("VAULT_ROLE_ID", "")
	t.Setenv("VAULT_SECRET_ID", "")
	t.Setenv("DATABASE_URL", "process-database-url")

	_, err := loadRuntimeConfigWithClient(server.Client())
	if err == nil || !strings.Contains(err.Error(), "HTTP 500") {
		t.Fatalf("loadRuntimeConfigWithClient() error = %v, want Vault HTTP error", err)
	}
	if strings.Contains(err.Error(), "vault-token") || strings.Contains(err.Error(), "process-database-url") {
		t.Fatalf("Vault failure leaked configuration: %v", err)
	}
}

func TestLoadRuntimeConfigWithoutVaultUsesProcessEnvironment(t *testing.T) {
	t.Setenv("VAULT_ADDR", "")
	t.Setenv("VAULT_TOKEN", "")
	t.Setenv("VAULT_ROLE_ID", "")
	t.Setenv("VAULT_SECRET_ID", "")
	t.Setenv("DATABASE_URL", "postgres://process.example/nalagrow")

	config, err := loadRuntimeConfigWithClient(nil)
	if err != nil {
		t.Fatalf("loadRuntimeConfigWithClient() error = %v", err)
	}
	if config.DatabaseURL != "postgres://process.example/nalagrow" {
		t.Fatalf("DatabaseURL = %q, want process environment value", config.DatabaseURL)
	}
}

func TestVaultKVURL(t *testing.T) {
	got := vaultKVURL("https://vault.example/", "secret", "nala-labs/nala-grow")
	want := "https://vault.example/v1/secret/data/nala-labs/nala-grow"
	if got != want {
		t.Fatalf("vaultKVURL() = %q, want %q", got, want)
	}
}

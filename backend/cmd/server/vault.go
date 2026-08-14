package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	defaultVaultMount = "secret"
	defaultVaultPath  = "nala-labs/nala-grow"
)

var vaultConfigKeys = map[string]struct{}{
	"HOST":                {},
	"PORT":                {},
	"DATABASE_URL":        {},
	"ALLOWED_ORIGIN":      {},
	"JWT_SECRET":          {},
	"GOOGLE_CLIENT_ID":    {},
	"CASDOOR_ISSUER":      {},
	"MONGODB_ADDR":        {},
	"MONGODB_URI":         {},
	"REDIS_ADDR":          {},
	"REDIS_URL":           {},
	"KAFKA_ADDR":          {},
	"KAFKA_BROKERS":       {},
	"HEALTHCHECK_TIMEOUT": {},
}

type vaultKVResponse struct {
	Data struct {
		Data map[string]string `json:"data"`
	} `json:"data"`
}

type vaultAppRoleResponse struct {
	Auth struct {
		ClientToken string `json:"client_token"`
	} `json:"auth"`
}

func loadRuntimeConfig() (Config, error) {
	return loadRuntimeConfigWithClient(&http.Client{Timeout: 10 * time.Second})
}

func loadRuntimeConfigWithClient(httpClient *http.Client) (Config, error) {
	environment := environmentMap()
	vaultValues, vaultEnabled, err := loadVaultEnvironment(environment, httpClient)
	if err != nil {
		return Config{}, err
	}
	if vaultEnabled {
		for key, value := range vaultValues {
			environment[key] = value
		}
	}
	return configFromEnvironment(environment), nil
}

func environmentMap() map[string]string {
	values := make(map[string]string)
	for _, entry := range os.Environ() {
		key, value, ok := strings.Cut(entry, "=")
		if ok {
			values[key] = value
		}
	}
	return values
}

func loadVaultEnvironment(environment map[string]string, httpClient *http.Client) (map[string]string, bool, error) {
	address := strings.TrimRight(strings.TrimSpace(environment["VAULT_ADDR"]), "/")
	if address == "" {
		return nil, false, nil
	}
	if httpClient == nil {
		httpClient = http.DefaultClient
	}

	token, err := vaultToken(address, environment, httpClient)
	if err != nil {
		return nil, true, err
	}
	values, err := readVaultKV(
		address,
		token,
		getEnvFrom(environment, "VAULT_KV_MOUNT", defaultVaultMount),
		getEnvFrom(environment, "VAULT_KV_PATH", defaultVaultPath),
		httpClient,
	)
	if err != nil {
		return nil, true, err
	}

	filtered := make(map[string]string, len(values))
	for key, value := range values {
		if _, ok := vaultConfigKeys[key]; ok {
			filtered[key] = value
		}
	}
	return filtered, true, nil
}

func vaultToken(address string, environment map[string]string, httpClient *http.Client) (string, error) {
	if token := strings.TrimSpace(environment["VAULT_TOKEN"]); token != "" {
		return token, nil
	}

	roleID := strings.TrimSpace(environment["VAULT_ROLE_ID"])
	secretID := strings.TrimSpace(environment["VAULT_SECRET_ID"])
	if roleID == "" && secretID == "" {
		return "", fmt.Errorf("Vault requires VAULT_TOKEN or both VAULT_ROLE_ID and VAULT_SECRET_ID")
	}
	if roleID == "" || secretID == "" {
		return "", fmt.Errorf("Vault AppRole authentication requires both VAULT_ROLE_ID and VAULT_SECRET_ID")
	}

	body, err := json.Marshal(map[string]string{"role_id": roleID, "secret_id": secretID})
	if err != nil {
		return "", fmt.Errorf("encode Vault AppRole request: %w", err)
	}
	request, err := http.NewRequest(http.MethodPost, address+"/v1/auth/approle/login", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create Vault AppRole request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := httpClient.Do(request)
	if err != nil {
		return "", fmt.Errorf("Vault AppRole authentication failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		_, _ = io.Copy(io.Discard, response.Body)
		return "", fmt.Errorf("Vault AppRole authentication returned HTTP %d", response.StatusCode)
	}

	var payload vaultAppRoleResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return "", fmt.Errorf("decode Vault AppRole response: %w", err)
	}
	if payload.Auth.ClientToken == "" {
		return "", fmt.Errorf("Vault AppRole response did not include a client token")
	}
	return payload.Auth.ClientToken, nil
}

func readVaultKV(address, token, mount, path string, httpClient *http.Client) (map[string]string, error) {
	request, err := http.NewRequest(http.MethodGet, vaultKVURL(address, mount, path), nil)
	if err != nil {
		return nil, fmt.Errorf("create Vault KV request: %w", err)
	}
	request.Header.Set("X-Vault-Token", token)
	response, err := httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("read Vault KV configuration: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		_, _ = io.Copy(io.Discard, response.Body)
		return nil, fmt.Errorf("read Vault KV configuration returned HTTP %d", response.StatusCode)
	}

	var payload vaultKVResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode Vault KV configuration: %w", err)
	}
	if payload.Data.Data == nil {
		return nil, fmt.Errorf("Vault KV configuration did not include data")
	}
	return payload.Data.Data, nil
}

func vaultKVURL(address, mount, path string) string {
	normalizedMount := strings.Trim(mount, "/")
	normalizedPath := strings.Trim(path, "/")
	parts := []string{"v1"}
	if strings.HasPrefix(normalizedPath, normalizedMount+"/data/") {
		for _, part := range strings.Split(normalizedPath, "/") {
			if part != "" {
				parts = append(parts, url.PathEscape(part))
			}
		}
		return strings.TrimRight(address, "/") + "/" + strings.Join(parts, "/")
	}
	for _, part := range append(strings.Split(normalizedMount, "/"), "data") {
		if part != "" {
			parts = append(parts, url.PathEscape(part))
		}
	}
	for _, part := range strings.Split(normalizedPath, "/") {
		if part != "" {
			parts = append(parts, url.PathEscape(part))
		}
	}
	return strings.TrimRight(address, "/") + "/" + strings.Join(parts, "/")
}

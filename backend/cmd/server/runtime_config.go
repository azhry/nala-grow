package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const runtimeVaultConfigFile = ".vault-config"

var runtimeVaultConfigKeys = map[string]struct{}{
	"VAULT_ADDR":      {},
	"VAULT_TOKEN":     {},
	"VAULT_ROLE_ID":   {},
	"VAULT_SECRET_ID": {},
	"VAULT_KV_MOUNT":  {},
	"VAULT_KV_PATH":   {},
}

// loadRuntimeEnvironment combines process configuration with the local Vault
// transport file used by development commands. Process values win so
// deployments can continue supplying runtime configuration through the shell.
func loadRuntimeEnvironment(environment map[string]string, workingDir string) (map[string]string, error) {
	merged := make(map[string]string, len(environment)+len(runtimeVaultConfigKeys))
	for key, value := range environment {
		merged[key] = value
	}

	fileValues, found, err := readRuntimeVaultConfig(workingDir)
	if err != nil {
		return nil, err
	}
	if !found {
		return merged, nil
	}

	for key, value := range fileValues {
		if _, exists := merged[key]; !exists {
			merged[key] = value
		}
	}
	return merged, nil
}

func readRuntimeVaultConfig(workingDir string) (map[string]string, bool, error) {
	if workingDir == "" {
		var err error
		workingDir, err = os.Getwd()
		if err != nil {
			return nil, false, fmt.Errorf("locate local Vault config file: %w", err)
		}
	}

	for {
		configPath := filepath.Join(workingDir, runtimeVaultConfigFile)
		configBytes, err := os.ReadFile(configPath)
		if err == nil {
			values, parseErr := parseRuntimeVaultConfig(configBytes)
			for index := range configBytes {
				configBytes[index] = 0
			}
			if parseErr != nil {
				return nil, true, fmt.Errorf("parse local Vault config file %s: %w", runtimeVaultConfigFile, parseErr)
			}
			return values, true, nil
		}
		if !errors.Is(err, os.ErrNotExist) {
			return nil, false, fmt.Errorf("read local Vault config file %s: %w", runtimeVaultConfigFile, err)
		}

		parentDir := filepath.Dir(workingDir)
		if parentDir == workingDir {
			break
		}
		workingDir = parentDir
	}

	return nil, false, nil
}

func parseRuntimeVaultConfig(contents []byte) (map[string]string, error) {
	values := make(map[string]string)
	for lineNumber, line := range strings.Split(string(contents), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			return nil, fmt.Errorf("line %d must contain KEY=value", lineNumber+1)
		}
		key = strings.TrimSpace(key)
		if key == "" {
			return nil, fmt.Errorf("line %d must contain a key", lineNumber+1)
		}
		if _, ok := runtimeVaultConfigKeys[key]; ok {
			values[key] = strings.TrimSpace(value)
		}
	}
	return values, nil
}

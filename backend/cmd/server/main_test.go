package main

import "testing"

func TestLoadConfigDefaultsToFrontendDevOrigin(t *testing.T) {
	t.Setenv("ALLOWED_ORIGIN", "")

	if got := loadConfig().AllowedOrigin; got != "http://localhost:3000" {
		t.Fatalf("AllowedOrigin = %q, want http://localhost:3000", got)
	}
}

func TestLoadConfigHostDefaultsToAllInterfaces(t *testing.T) {
	t.Setenv("HOST", "")

	if got := loadConfig().Host; got != "" {
		t.Fatalf("Host = %q, want empty host for the production-compatible all-interface default", got)
	}
}

func TestLoadConfigAcceptsLoopbackHost(t *testing.T) {
	t.Setenv("HOST", "127.0.0.1")

	if got := loadConfig().Host; got != "127.0.0.1" {
		t.Fatalf("Host = %q, want 127.0.0.1", got)
	}
}

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

	if got := loadConfig().Host; got != "0.0.0.0" {
		t.Fatalf("Host = %q, want explicit all-interface default 0.0.0.0", got)
	}
}

func TestLoadConfigAcceptsLoopbackHost(t *testing.T) {
	t.Setenv("HOST", "127.0.0.1")

	if got := loadConfig().Host; got != "127.0.0.1" {
		t.Fatalf("Host = %q, want 127.0.0.1", got)
	}
}

func TestListenAddressDefaultsToAllInterfaces(t *testing.T) {
	t.Setenv("HOST", "")
	t.Setenv("PORT", "4000")

	if got := loadConfig().ListenAddress(); got != "0.0.0.0:4000" {
		t.Fatalf("ListenAddress() = %q, want 0.0.0.0:4000", got)
	}
}

func TestListenAddressUsesConfiguredHost(t *testing.T) {
	cfg := Config{Host: "127.0.0.1", Port: "4000"}

	if got := cfg.ListenAddress(); got != "127.0.0.1:4000" {
		t.Fatalf("ListenAddress() = %q, want 127.0.0.1:4000", got)
	}
}

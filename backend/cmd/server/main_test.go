package main

import "testing"

func TestLoadConfigDefaultsToFrontendDevOrigin(t *testing.T) {
	t.Setenv("ALLOWED_ORIGIN", "")

	if got := loadConfig().AllowedOrigin; got != "http://localhost:3000" {
		t.Fatalf("AllowedOrigin = %q, want http://localhost:3000", got)
	}
}

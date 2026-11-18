package health

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

type fakePinger struct {
	err error
}

func (p fakePinger) Ping(context.Context) error {
	return p.err
}

func TestHealthHandlerReportsAllDependenciesHealthy(t *testing.T) {
	var pathsMu sync.Mutex
	paths := make(map[string]int)
	httpServer := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		pathsMu.Lock()
		paths[request.URL.Path]++
		pathsMu.Unlock()
		writer.WriteHeader(http.StatusNoContent)
	}))
	t.Cleanup(httpServer.Close)

	checker := NewChecker(Config{
		CasdoorIssuer: httpServer.URL,
		VaultAddress:  httpServer.URL,
	}, fakePinger{})
	recorder := httptest.NewRecorder()
	Handler(checker).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/healthz", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("health status = %d, want %d; body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	if contentType := recorder.Header().Get("Content-Type"); !strings.HasPrefix(contentType, "application/json") {
		t.Fatalf("health content type = %q, want application/json", contentType)
	}
	var response Response
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode health response: %v", err)
	}
	if response.Status != StatusOK {
		t.Fatalf("overall health status = %q, want %q", response.Status, StatusOK)
	}
	for name, dependency := range map[string]DependencyStatus{
		"casdoor":    response.Dependencies.Casdoor,
		"vault":      response.Dependencies.Vault,
		"postgresql": response.Dependencies.PostgreSQL,
	} {
		if dependency.Status != StatusOK {
			t.Errorf("dependency %q status = %q, want %q", name, dependency.Status, StatusOK)
		}
	}
	pathsMu.Lock()
	defer pathsMu.Unlock()
	if paths["/.well-known/openid-configuration"] != 1 || paths["/v1/sys/health"] != 1 {
		t.Fatalf("HTTP probe paths = %v", paths)
	}
}

func TestHealthHandlerReportsDegradedForUnavailableAndUnconfiguredDependencies(t *testing.T) {
	secretError := errors.New("postgres://user:super-secret@example.test/nalagrow")
	checker := NewChecker(Config{}, fakePinger{err: secretError})
	recorder := httptest.NewRecorder()
	Handler(checker).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/healthz", nil))

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("health status = %d, want %d", recorder.Code, http.StatusServiceUnavailable)
	}
	if strings.Contains(recorder.Body.String(), "super-secret") || strings.Contains(recorder.Body.String(), "postgres://") {
		t.Fatalf("health response leaked probe details: %s", recorder.Body.String())
	}
	var response Response
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode health response: %v", err)
	}
	if response.Status != StatusDegraded {
		t.Fatalf("overall health status = %q, want %q", response.Status, StatusDegraded)
	}
	if response.Dependencies.PostgreSQL.Status != StatusUnavailable {
		t.Fatalf("PostgreSQL status = %q, want %q", response.Dependencies.PostgreSQL.Status, StatusUnavailable)
	}
	for name, dependency := range map[string]DependencyStatus{
		"casdoor": response.Dependencies.Casdoor,
		"vault":   response.Dependencies.Vault,
	} {
		if dependency.Status != StatusNotConfigured {
			t.Errorf("dependency %q status = %q, want %q", name, dependency.Status, StatusNotConfigured)
		}
	}
}

func TestHealthCheckerReportsHTTPStatusFailures(t *testing.T) {
	httpServer := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path == "/v1/sys/health" {
			writer.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		writer.WriteHeader(http.StatusNoContent)
	}))
	t.Cleanup(httpServer.Close)

	response := NewChecker(Config{
		CasdoorIssuer: httpServer.URL,
		VaultAddress:  httpServer.URL,
	}, nil).Check(context.Background())

	if response.Dependencies.Casdoor.Status != StatusOK {
		t.Fatalf("Casdoor status = %q, want %q", response.Dependencies.Casdoor.Status, StatusOK)
	}
	if response.Dependencies.Vault.Status != StatusUnavailable {
		t.Fatalf("Vault status = %q, want %q", response.Dependencies.Vault.Status, StatusUnavailable)
	}
}

func TestHealthCheckerBoundsProbeTimeout(t *testing.T) {
	checker := checkerWithProbes(map[string]Probe{
		"casdoor": func(ctx context.Context) error {
			<-ctx.Done()
			return ctx.Err()
		},
	})
	checker.timeout = 10 * time.Millisecond

	started := time.Now()
	response := checker.Check(context.Background())
	if elapsed := time.Since(started); elapsed > time.Second {
		t.Fatalf("health probes exceeded bounded timeout: %s", elapsed)
	}
	if response.Dependencies.Casdoor.Status != StatusUnavailable {
		t.Fatalf("Casdoor status = %q, want %q", response.Dependencies.Casdoor.Status, StatusUnavailable)
	}
}

func TestHealthHandlerReturnsNotConfiguredWhenCheckerIsNil(t *testing.T) {
	recorder := httptest.NewRecorder()
	Handler(nil).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/healthz", nil))

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("health status = %d, want %d", recorder.Code, http.StatusServiceUnavailable)
	}
	var response Response
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode health response: %v", err)
	}
	if response.Dependencies.Casdoor.Status != StatusNotConfigured || response.Dependencies.PostgreSQL.Status != StatusNotConfigured {
		t.Fatalf("nil checker dependencies = %+v, want not_configured", response.Dependencies)
	}
}

func checkerWithProbes(probes map[string]Probe) *Checker {
	definitions := make([]probeDefinition, len(dependencyNames))
	for index, name := range dependencyNames {
		definitions[index] = probeDefinition{name: name, probe: probes[name]}
	}
	return &Checker{probes: definitions, timeout: DefaultTimeout}
}

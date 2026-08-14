package health

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const DefaultTimeout = 2 * time.Second

const (
	StatusOK            = "ok"
	StatusDegraded      = "degraded"
	StatusUnavailable   = "unavailable"
	StatusNotConfigured = "not_configured"
)

var dependencyNames = [...]string{
	"casdoor",
	"vault",
	"postgresql",
	"mongodb",
	"redis",
	"kafka",
}

// Config contains non-secret dependency addresses used by the health endpoint.
// URI values are retained only to derive host/port addresses for TCP probes.
type Config struct {
	CasdoorIssuer string
	VaultAddress  string
	MongoAddress  string
	MongoURI      string
	RedisAddress  string
	RedisURL      string
	KafkaAddress  string
	KafkaBrokers  string
	Timeout       time.Duration
	HTTPClient    *http.Client
}

type Pinger interface {
	Ping(context.Context) error
}

type Probe func(context.Context) error

type Checker struct {
	probes  []probeDefinition
	timeout time.Duration
}

type probeDefinition struct {
	name  string
	probe Probe
}

type DependencyStatus struct {
	Status string `json:"status"`
}

type Dependencies struct {
	Casdoor    DependencyStatus `json:"casdoor"`
	Vault      DependencyStatus `json:"vault"`
	PostgreSQL DependencyStatus `json:"postgresql"`
	MongoDB    DependencyStatus `json:"mongodb"`
	Redis      DependencyStatus `json:"redis"`
	Kafka      DependencyStatus `json:"kafka"`
}

type Response struct {
	Status       string       `json:"status"`
	Dependencies Dependencies `json:"dependencies"`
}

// NewChecker wires dependency probes using the existing PostgreSQL pool and
// environment-derived addresses for the other platform services.
func NewChecker(config Config, postgres Pinger) *Checker {
	httpClient := config.HTTPClient
	if httpClient == nil {
		httpClient = http.DefaultClient
	}

	var postgresProbe Probe
	if postgres != nil {
		postgresProbe = postgres.Ping
	}

	return &Checker{
		probes: []probeDefinition{
			{name: "casdoor", probe: httpProbe(config.CasdoorIssuer, "/.well-known/openid-configuration", httpClient)},
			{name: "vault", probe: httpProbe(config.VaultAddress, "/v1/sys/health", httpClient)},
			{name: "postgresql", probe: postgresProbe},
			{name: "mongodb", probe: tcpProbeFromValues(config.MongoAddress, config.MongoURI, "27017")},
			{name: "redis", probe: tcpProbeFromValues(config.RedisAddress, config.RedisURL, "6379")},
			{name: "kafka", probe: tcpProbeFromValues(config.KafkaAddress, config.KafkaBrokers, "9092")},
		},
		timeout: config.Timeout,
	}
}

func (c *Checker) Check(ctx context.Context) Response {
	if ctx == nil {
		ctx = context.Background()
	}
	timeout := DefaultTimeout
	if c != nil && c.timeout > 0 {
		timeout = c.timeout
	}
	checkContext, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	definitions := []probeDefinition(nil)
	if c != nil {
		definitions = c.probes
	}
	statuses := make([]string, len(dependencyNames))
	for index := range statuses {
		statuses[index] = StatusNotConfigured
	}
	var waitGroup sync.WaitGroup
	for index, name := range dependencyNames {
		var probe Probe
		if index < len(definitions) && definitions[index].name == name {
			probe = definitions[index].probe
		}
		if probe == nil {
			statuses[index] = StatusNotConfigured
			continue
		}

		waitGroup.Add(1)
		go func(index int, probe Probe) {
			defer waitGroup.Done()
			if err := probe(checkContext); err != nil {
				statuses[index] = StatusUnavailable
				return
			}
			statuses[index] = StatusOK
		}(index, probe)
	}
	waitGroup.Wait()

	response := Response{Status: StatusOK}
	response.Dependencies = Dependencies{
		Casdoor:    DependencyStatus{Status: statuses[0]},
		Vault:      DependencyStatus{Status: statuses[1]},
		PostgreSQL: DependencyStatus{Status: statuses[2]},
		MongoDB:    DependencyStatus{Status: statuses[3]},
		Redis:      DependencyStatus{Status: statuses[4]},
		Kafka:      DependencyStatus{Status: statuses[5]},
	}
	for _, status := range statuses {
		if status != StatusOK {
			response.Status = StatusDegraded
			break
		}
	}
	return response
}

func Handler(checker *Checker) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		response := checker.Check(request.Context())
		statusCode := http.StatusServiceUnavailable
		if response.Status == StatusOK {
			statusCode = http.StatusOK
		}
		writer.Header().Set("Content-Type", "application/json")
		writer.WriteHeader(statusCode)
		_ = json.NewEncoder(writer).Encode(response)
	}
}

func httpProbe(baseAddress, suffix string, client *http.Client) Probe {
	if strings.TrimSpace(baseAddress) == "" {
		return nil
	}
	if client == nil {
		client = http.DefaultClient
	}
	return func(ctx context.Context) error {
		probeURL, err := appendHealthPath(baseAddress, suffix)
		if err != nil {
			return err
		}
		request, err := http.NewRequestWithContext(ctx, http.MethodGet, probeURL, nil)
		if err != nil {
			return err
		}
		response, err := client.Do(request)
		if err != nil {
			return err
		}
		defer response.Body.Close()
		_, _ = io.Copy(io.Discard, response.Body)
		if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
			return fmt.Errorf("health probe returned HTTP %d", response.StatusCode)
		}
		return nil
	}
}

func tcpProbeFromValues(preferred, fallback, defaultPort string) Probe {
	address := serviceAddress(preferred, defaultPort)
	if address == "" {
		address = serviceAddress(fallback, defaultPort)
	}
	if address == "" {
		return nil
	}
	return func(ctx context.Context) error {
		connection, err := (&net.Dialer{}).DialContext(ctx, "tcp", address)
		if err != nil {
			return err
		}
		return connection.Close()
	}
}

func serviceAddress(value, defaultPort string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	value = strings.TrimSpace(strings.Split(value, ",")[0])
	if value == "" {
		return ""
	}
	if strings.Contains(value, "://") {
		parsed, err := url.Parse(value)
		if err != nil || parsed.Host == "" {
			return ""
		}
		value = parsed.Host
	}
	if host, port, err := net.SplitHostPort(value); err == nil {
		if host == "" || port == "" {
			return ""
		}
		return net.JoinHostPort(host, port)
	}
	if strings.HasPrefix(value, "[") && strings.HasSuffix(value, "]") {
		value = strings.TrimSuffix(strings.TrimPrefix(value, "["), "]")
	}
	if strings.Count(value, ":") > 1 {
		return net.JoinHostPort(value, defaultPort)
	}
	if strings.Contains(value, ":") {
		return ""
	}
	return net.JoinHostPort(value, defaultPort)
}

func appendHealthPath(baseAddress, suffix string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(baseAddress))
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		if err == nil {
			err = fmt.Errorf("health address must include a scheme and host")
		}
		return "", err
	}
	parsed.Path = strings.TrimRight(parsed.Path, "/") + suffix
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return parsed.String(), nil
}

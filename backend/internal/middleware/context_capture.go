package middleware

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"unicode/utf8"
)

const diagnosticBodyLimit = 4096
const diagnosticFieldLimit = 256

var diagnosticSecretPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\bBearer\s+[A-Za-z0-9._~+/-]+=*`),
	regexp.MustCompile(`\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b`),
	regexp.MustCompile(`(?i)\b(password|passwd|token|secret|api[_-]?key|authorization|cookie|credential|private[_-]?key|state|nonce|client[_-]?secret|database[_-]?url|connection[_-]?string)\b"?\s*[:=]\s*("[^"]*"|'[^']*'|[^,\s;&]+)`),
	regexp.MustCompile(`(?i)\b((?:https?|wss?|postgres(?:ql)?|mongodb(?:\+srv)?|redis|amqps?)://)[^/@\s:]+:[^/@\s]+@`),
}

type bodyCapture struct {
	data  []byte
	total int
}

func (c *bodyCapture) add(p []byte) {
	c.total += len(p)
	if room := diagnosticBodyLimit - len(c.data); room > 0 {
		if len(p) < room {
			room = len(p)
		}
		c.data = append(c.data, p[:room]...)
	}
}

type capturingBody struct {
	io.ReadCloser
	capture *bodyCapture
}

func (b *capturingBody) Read(p []byte) (int, error) {
	n, err := b.ReadCloser.Read(p)
	if n > 0 {
		b.capture.add(p[:n])
	}
	return n, err
}

func (c *bodyCapture) summary() any {
	if c.total == 0 {
		return nil
	}
	result := map[string]any{"bytes": c.total, "truncated": c.total > len(c.data)}
	if c.total != len(c.data) {
		return result
	}
	var value any
	if json.Unmarshal(c.data, &value) == nil {
		result["json"] = redactedJSON(value, "", 0)
	} else if utf8.Valid(c.data) {
		result["text"] = sanitizeDiagnosticText(string(c.data))
	}
	return result
}

func redactedJSON(value any, key string, depth int) any {
	if depth >= 4 {
		return "[nested]"
	}
	if sensitiveDiagnosticKey(key) {
		return "[redacted]"
	}
	switch value := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(value))
		for childKey, item := range value {
			if len(childKey) > 80 || len(out) >= 32 {
				continue
			}
			out[childKey] = redactedJSON(item, childKey, depth+1)
		}
		return out
	case []any:
		out := make([]any, 0, min(len(value), 10))
		for _, item := range value[:min(len(value), 10)] {
			out = append(out, redactedJSON(item, key, depth+1))
		}
		if len(value) > len(out) {
			return map[string]any{"items": out, "count": len(value), "truncated": true}
		}
		return out
	case string:
		if key == "query" || key == "variables" {
			return "[redacted]"
		}
		return sanitizeDiagnosticText(value)
	case float64, bool:
		return value
	case nil:
		return nil
	default:
		return "[unsupported]"
	}
}

func diagnosticHeaders(headers http.Header) map[string]any {
	out := make(map[string]any, len(headers))
	for key, values := range headers {
		if len(key) > 80 || len(out) >= 32 {
			continue
		}
		canonical := http.CanonicalHeaderKey(key)
		switch canonical {
		case "Content-Length":
			if len(values) == 1 {
				if parsed, err := strconv.ParseInt(values[0], 10, 64); err == nil && parsed >= 0 {
					out[key] = parsed
					break
				}
			}
			out[key] = "[redacted]"
		default:
			if sensitiveDiagnosticKey(key) || len(values) > 8 {
				out[key] = "[redacted]"
				continue
			}
			safeValues := make([]string, 0, len(values))
			for _, value := range values {
				safeValues = append(safeValues, sanitizeDiagnosticText(value))
			}
			out[key] = safeValues
		}
	}
	return out
}

func sensitiveDiagnosticKey(key string) bool {
	key = strings.ToLower(key)
	key = strings.NewReplacer("_", "", "-", "", ".", "").Replace(key)
	for _, marker := range []string{"password", "passwd", "token", "secret", "apikey", "authorization", "cookie", "credential", "privatekey", "refresh", "idtoken", "accesstoken", "signature", "assertion", "state", "nonce", "codeverifier", "onetim", "databaseurl", "connectionstring", "clientsecret", "value", "query", "variables"} {
		if strings.Contains(key, marker) {
			return true
		}
	}
	return false
}

func sanitizeDiagnosticText(value string) string {
	value = boundedString(value)
	value = diagnosticSecretPatterns[0].ReplaceAllString(value, "Bearer [redacted]")
	value = diagnosticSecretPatterns[1].ReplaceAllString(value, "[redacted]")
	value = diagnosticSecretPatterns[2].ReplaceAllString(value, "$1=[redacted]")
	value = diagnosticSecretPatterns[3].ReplaceAllString(value, "$1[redacted]@")
	return value
}

func diagnosticQuery(query url.Values) map[string]any {
	out := make(map[string]any, len(query))
	for key, values := range query {
		if len(key) > 80 || len(out) >= 32 {
			continue
		}
		if sensitiveDiagnosticKey(key) || sensitiveQueryKey(key) {
			out[key] = "[redacted]"
			continue
		}
		switch key {
		case "page", "pageSize", "cursor", "limit", "tailLines":
			if len(values) == 1 {
				if parsed, err := strconv.ParseInt(values[0], 10, 64); err == nil {
					out[key] = parsed
					break
				}
			}
			if len(values) > 8 {
				out[key] = "[redacted]"
				break
			}
			safeValues := make([]string, 0, len(values))
			for _, value := range values {
				safeValues = append(safeValues, sanitizeDiagnosticText(value))
			}
			out[key] = safeValues
		default:
			if len(values) > 8 {
				out[key] = "[redacted]"
				continue
			}
			safeValues := make([]string, 0, len(values))
			for _, value := range values {
				safeValues = append(safeValues, sanitizeDiagnosticText(value))
			}
			out[key] = safeValues
		}
	}
	return out
}

func boundedString(value string) string {
	if len(value) > diagnosticFieldLimit {
		return value[:diagnosticFieldLimit] + "[truncated]"
	}
	return value
}

func sensitiveQueryKey(key string) bool {
	key = strings.ToLower(key)
	key = strings.NewReplacer("_", "", "-", "", ".", "").Replace(key)
	return strings.Contains(key, "code") || strings.Contains(key, "state") || strings.Contains(key, "nonce") || strings.Contains(key, "signature")
}

// diagnosticStack records code locations without runtime argument values.
func diagnosticStack() []string {
	pcs := make([]uintptr, 32)
	n := runtime.Callers(3, pcs)
	frames := runtime.CallersFrames(pcs[:n])
	stack := make([]string, 0, n)
	for len(stack) < 24 {
		frame, more := frames.Next()
		stack = append(stack, frame.Function+" "+frame.File+":"+strconv.Itoa(frame.Line))
		if !more {
			break
		}
	}
	return stack
}

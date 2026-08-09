package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"unicode"

	"github.com/azhry/nala-grow/backend/internal/graph"
)

const (
	graphqlLogMaxStringLength = 4096
	graphqlLogTruncation      = "...[truncated]"
	graphqlLogRedacted        = "[REDACTED]"
)

type graphqlRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables"`
}

func graphqlEndpoint(handler *graph.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			w.Header().Set("Content-Type", "text/html")
			_, _ = w.Write(graph.PlaygroundHTML)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		var req graphqlRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			slog.Warn("graphql request", "error", "invalid request body")
			writeError(w, "invalid request body")
			return
		}

		result := handler.Execute(r.Context(), req.Query, req.Variables)
		logGraphQLRequest(req.Query, req.Variables, result)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(result)
	}
}

func logGraphQLRequest(query string, variables map[string]interface{}, response graph.ExecResult) {
	operationType, operationName := graphqlOperationMetadata(query)
	slog.Info("graphql request",
		"operation_type", operationType,
		"operation_name", operationName,
		"query", sanitizeGraphQLQuery(query),
		"variables", sanitizeGraphQLLogValue(variables),
		"response", sanitizeGraphQLLogValue(response),
	)
}

func graphqlOperationMetadata(query string) (string, string) {
	query = strings.TrimSpace(query)
	if strings.HasPrefix(query, "{") {
		return "query", ""
	}

	operationType, next := nextGraphQLName(query, 0)
	if operationType != "query" && operationType != "mutation" && operationType != "subscription" {
		return "unknown", ""
	}
	operationName, _ := nextGraphQLName(query, next)
	return operationType, operationName
}

func nextGraphQLName(query string, start int) (string, int) {
	index := start
	for index < len(query) {
		switch query[index] {
		case ' ', '\t', '\r', '\n', ',':
			index++
		case '#':
			for index < len(query) && query[index] != '\n' {
				index++
			}
		default:
			goto tokenStart
		}
	}

tokenStart:
	if index >= len(query) || !isGraphQLNameStart(query[index]) {
		return "", index
	}
	tokenEnd := index + 1
	for tokenEnd < len(query) && isGraphQLNameContinue(query[tokenEnd]) {
		tokenEnd++
	}
	return query[index:tokenEnd], tokenEnd
}

func isGraphQLNameStart(char byte) bool {
	return char == '_' || char >= 'A' && char <= 'Z' || char >= 'a' && char <= 'z'
}

func isGraphQLNameContinue(char byte) bool {
	return isGraphQLNameStart(char) || char >= '0' && char <= '9'
}

func sanitizeGraphQLQuery(query string) string {
	var sanitized strings.Builder
	for index := 0; index < len(query); {
		switch {
		case query[index] == '#':
			sanitized.WriteString("# [REDACTED]")
			for index < len(query) && query[index] != '\n' {
				index++
			}
		case strings.HasPrefix(query[index:], `"""`):
			sanitized.WriteString(`"""[REDACTED]"""`)
			index += 3
			for index < len(query) && !strings.HasPrefix(query[index:], `"""`) {
				index++
			}
			if index < len(query) {
				index += 3
			}
		case query[index] == '"':
			sanitized.WriteString(`"[REDACTED]"`)
			index++
			for index < len(query) {
				if query[index] == '\\' {
					index += 2
					continue
				}
				if query[index] == '"' {
					index++
					break
				}
				index++
			}
		default:
			sanitized.WriteByte(query[index])
			index++
		}
	}
	return truncateGraphQLString(sanitized.String())
}

func sanitizeGraphQLLogValue(value interface{}) interface{} {
	encoded, err := json.Marshal(value)
	if err != nil {
		return "[UNSERIALIZABLE]"
	}

	var normalized interface{}
	if err := json.Unmarshal(encoded, &normalized); err != nil {
		return "[UNSERIALIZABLE]"
	}
	return sanitizeGraphQLJSONValue(normalized)
}

func sanitizeGraphQLJSONValue(value interface{}) interface{} {
	switch value := value.(type) {
	case map[string]interface{}:
		sanitized := make(map[string]interface{}, len(value))
		for key, nested := range value {
			if isSensitiveGraphQLKey(key) {
				sanitized[key] = graphqlLogRedacted
				continue
			}
			sanitized[key] = sanitizeGraphQLJSONValue(nested)
		}
		return sanitized
	case []interface{}:
		sanitized := make([]interface{}, len(value))
		for index, nested := range value {
			sanitized[index] = sanitizeGraphQLJSONValue(nested)
		}
		return sanitized
	case string:
		return truncateGraphQLString(value)
	default:
		return value
	}
}

func isSensitiveGraphQLKey(key string) bool {
	var normalized strings.Builder
	for _, char := range strings.ToLower(key) {
		if unicode.IsLetter(char) {
			normalized.WriteRune(char)
		}
	}
	key = normalized.String()
	for _, sensitivePart := range []string{"password", "token", "secret", "authorization", "cookie"} {
		if strings.Contains(key, sensitivePart) {
			return true
		}
	}
	return false
}

func truncateGraphQLString(value string) string {
	runes := []rune(value)
	if len(runes) <= graphqlLogMaxStringLength {
		return value
	}
	limit := graphqlLogMaxStringLength - len([]rune(graphqlLogTruncation))
	return string(runes[:limit]) + graphqlLogTruncation
}

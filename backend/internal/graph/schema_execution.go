package graph

import (
	"encoding/json"
	"errors"
	"regexp"
	"strconv"
	"strings"
)

func resolverValue(result ExecResult, field string) (interface{}, error) {
	if len(result.Errors) > 0 {
		return nil, errors.New(result.Errors[0].Message)
	}
	if data, ok := result.Data.(map[string]interface{}); ok {
		return data[field], nil
	}
	return result.Data, nil
}

func normalizeGraphQLData(value interface{}) interface{} {
	switch value := value.(type) {
	case map[string]interface{}:
		result := make(map[string]interface{}, len(value))
		for key, item := range value {
			result[key] = normalizeGraphQLData(item)
		}
		return result
	case []interface{}:
		items := make([]interface{}, len(value))
		allObjects := true
		for index, item := range value {
			items[index] = normalizeGraphQLData(item)
			if _, ok := items[index].(map[string]interface{}); !ok {
				allObjects = false
			}
		}
		if allObjects {
			objects := make([]map[string]interface{}, len(items))
			for index, item := range items {
				objects[index] = item.(map[string]interface{})
			}
			return objects
		}
		return items
	case int:
		return float64(value)
	case int8:
		return float64(value)
	case int16:
		return float64(value)
	case int32:
		return float64(value)
	case int64:
		return float64(value)
	default:
		return value
	}
}

var legacyRequestPattern = regexp.MustCompile(`(?is)^\s*(query|mutation)(\s+[A-Za-z_][A-Za-z0-9_]*)?\s*\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\s*$`)

func normalizeLegacyRequest(query string, variables map[string]interface{}) (string, string, string, bool) {
	matches := legacyRequestPattern.FindStringSubmatch(query)
	if len(matches) != 4 {
		return "", "", "", false
	}

	operation := strings.ToLower(matches[1])
	field := matches[3]
	selection, known := legacySelections[field]
	if !known {
		return "", "", "", false
	}

	args := make([]string, 0, len(legacyArguments[field]))
	for _, name := range legacyArguments[field] {
		value, exists := legacyValue(variables, name)
		if !exists || value == nil {
			continue
		}
		literal, ok := graphqlLiteral(value)
		if ok {
			args = append(args, name+": "+literal)
		}
	}

	request := operation + " { " + field
	if len(args) > 0 {
		request += "(" + strings.Join(args, ", ") + ")"
	}
	request += selection + " }"
	return request, operation, field, true
}

func legacyMissingRequired(operation, field string, variables map[string]interface{}) bool {
	for _, name := range legacyRequiredArguments[operation+":"+field] {
		value, exists := legacyValue(variables, name)
		if !exists || value == nil {
			return true
		}
	}
	return false
}

func legacyValue(variables map[string]interface{}, name string) (interface{}, bool) {
	if variables == nil {
		return nil, false
	}
	if input, ok := variables["input"].(map[string]interface{}); ok {
		if value, exists := input[name]; exists {
			return value, true
		}
	}
	value, exists := variables[name]
	return value, exists
}

func graphqlLiteral(value interface{}) (string, bool) {
	switch value := value.(type) {
	case string:
		encoded, err := json.Marshal(value)
		return string(encoded), err == nil
	case bool:
		return strconv.FormatBool(value), true
	case int:
		return strconv.Itoa(value), true
	case int8:
		return strconv.FormatInt(int64(value), 10), true
	case int16:
		return strconv.FormatInt(int64(value), 10), true
	case int32:
		return strconv.FormatInt(int64(value), 10), true
	case int64:
		return strconv.FormatInt(value, 10), true
	case uint:
		return strconv.FormatUint(uint64(value), 10), true
	case uint8:
		return strconv.FormatUint(uint64(value), 10), true
	case uint16:
		return strconv.FormatUint(uint64(value), 10), true
	case uint32:
		return strconv.FormatUint(uint64(value), 10), true
	case uint64:
		return strconv.FormatUint(value, 10), true
	case float32:
		return strconv.FormatFloat(float64(value), 'f', -1, 32), true
	case float64:
		return strconv.FormatFloat(value, 'f', -1, 64), true
	default:
		encoded, err := json.Marshal(value)
		if err != nil {
			return "", false
		}
		return string(encoded), true
	}
}

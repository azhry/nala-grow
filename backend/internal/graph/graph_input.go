package graph

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
)

func getVar(vars map[string]interface{}, key string) string {
	if vars == nil {
		return ""
	}
	input, _ := vars["input"].(map[string]interface{})
	if input != nil {
		if v, ok := input[key].(string); ok {
			return v
		}
	}
	if v, ok := vars[key].(string); ok {
		return v
	}
	return ""
}

func uuid() string {
	b := make([]byte, 16)
	rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func jsonBytes(v interface{}) []byte {
	b, _ := json.Marshal(v)
	return b
}

func getVarFloat(vars map[string]interface{}, key string) float64 {
	if vars == nil {
		return 0
	}
	input, _ := vars["input"].(map[string]interface{})
	if input != nil {
		if v, ok := input[key].(float64); ok {
			return v
		}
	}
	if v, ok := vars[key].(float64); ok {
		return v
	}
	return 0
}

func getVarBool(vars map[string]interface{}, key string) bool {
	if vars == nil {
		return false
	}
	input, _ := vars["input"].(map[string]interface{})
	if input != nil {
		if v, ok := input[key].(bool); ok {
			return v
		}
	}
	if v, ok := vars[key].(bool); ok {
		return v
	}
	return false
}

func getVarInt(vars map[string]interface{}, key string) int {
	if vars == nil {
		return 0
	}
	input, _ := vars["input"].(map[string]interface{})
	if input != nil {
		if v, ok := input[key].(float64); ok {
			return int(v)
		}
		if v, ok := input[key].(int); ok {
			return v
		}
	}
	if v, ok := vars[key].(float64); ok {
		return int(v)
	}
	if v, ok := vars[key].(int); ok {
		return v
	}
	return 0
}

package graph

import "strings"

func csvEscape(s string) string {
	if strings.Contains(s, ",") || strings.Contains(s, "\"") || strings.Contains(s, "\n") {
		s = strings.ReplaceAll(s, "\"", "\"\"")
		return "\"" + s + "\""
	}
	return s
}

func inDateRange(dateStr, from, to string) bool {
	if from == "" && to == "" {
		return true
	}
	if dateStr == "" {
		// Items without a date are always included (can't filter)
		return true
	}
	// Extract date portion (handle full timestamps like "2026-03-15T10:00:00Z")
	datePart := dateStr
	if len(dateStr) >= 10 {
		datePart = dateStr[:10]
	}
	if from != "" && datePart < from {
		return false
	}
	if to != "" && datePart > to {
		return false
	}
	return true
}

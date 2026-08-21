package auth

import "strings"

// HasPermission is deliberately small and provider-neutral. Casdoor claims
// are the source of truth in production, while local/test identities receive
// the wildcard permission so existing functionality remains enabled.
func HasPermission(principal *Principal, permission string) bool {
	if principal == nil || principal.IsGlobalAdmin || principal.IsAdmin {
		return principal != nil
	}
	permission = strings.TrimSpace(permission)
	if permission == "" {
		return false
	}
	for _, granted := range principal.Permissions {
		if granted == "*" || strings.EqualFold(strings.TrimSpace(granted), permission) {
			return true
		}
	}
	return false
}

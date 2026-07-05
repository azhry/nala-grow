package graph

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/azhry/nala-grow/backend/internal/auth"
)

type storedUser struct {
	Email        string
	PasswordHash string
	DisplayName  string
}

var (
	usersMu sync.RWMutex
	users   = map[string]storedUser{}
)

type Handler struct {
	db   interface{ Close() }
	auth *auth.Service
}

func NewHandler(db interface{ Close() }, authSvc *auth.Service) *Handler {
	return &Handler{db: db, auth: authSvc}
}

type ExecResult struct {
	Data   interface{}    `json:"data,omitempty"`
	Errors []GraphQLError `json:"errors,omitempty"`
}

type GraphQLError struct {
	Message string `json:"message"`
}

type HealthResult struct {
	OK        bool   `json:"ok"`
	Timestamp string `json:"timestamp"`
	Version   string `json:"version"`
}

func NewHealth() HealthResult {
	return HealthResult{
		OK:        true,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Version:   "0.1.0",
	}
}

func (h *Handler) Execute(ctx context.Context, query string, variables map[string]interface{}) ExecResult {
	query = strings.TrimSpace(query)

	switch {
	case strings.HasPrefix(query, "query"):
		return h.execQuery(ctx, query, variables)
	case strings.HasPrefix(query, "mutation"):
		return h.execMutation(ctx, query, variables)
	default:
		return ExecResult{Errors: []GraphQLError{{Message: "unsupported operation"}}}
	}
}

func (h *Handler) execQuery(ctx context.Context, query string, variables map[string]interface{}) ExecResult {
	body := strings.ToLower(query)

	if strings.Contains(body, "health") {
		return ExecResult{Data: map[string]interface{}{
			"health": NewHealth(),
		}}
	}

	if strings.Contains(body, "me") || strings.Contains(body, "{me") {
		token, _ := ctx.Value("raw_token").(string)
		if token == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "not authenticated"}}}
		}
		if h.auth != nil {
			claims, err := h.auth.JWT.ValidateToken(token)
			if err == nil && claims != nil {
				u, ok := func() (storedUser, bool) {
					usersMu.RLock()
					defer usersMu.RUnlock()
					u, ok := users[claims.UserID]
					return u, ok
				}()
				if !ok {
					return ExecResult{Errors: []GraphQLError{{Message: "user not found"}}}
				}
				return ExecResult{Data: map[string]interface{}{
					"me": map[string]interface{}{
						"id":          claims.UserID,
						"email":       u.Email,
						"displayName": u.DisplayName,
						"photoUrl":    "",
						"createdAt":   time.Now().UTC().Format(time.RFC3339),
					},
				}}
			}
		}
		return ExecResult{Errors: []GraphQLError{{Message: "invalid token"}}}
	}

	return ExecResult{Errors: []GraphQLError{{Message: "unknown query"}}}
}

func (h *Handler) execMutation(ctx context.Context, query string, variables map[string]interface{}) ExecResult {
	body := strings.ToLower(query)

	if strings.Contains(body, "signup") {
		email := getVar(variables, "email")
		password := getVar(variables, "password")
		displayName := getVar(variables, "displayName")
		if email == "" || password == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "email and password required"}}}
		}
		if displayName == "" {
			displayName = email[:strings.Index(email, "@")]
		}
		userID := uuid()
		if h.auth != nil {
			hash, err := h.auth.Password.Hash(password)
			if err != nil {
				return ExecResult{Errors: []GraphQLError{{Message: "failed to hash password"}}}
			}
			usersMu.Lock()
			users[userID] = storedUser{Email: email, PasswordHash: hash, DisplayName: displayName}
			usersMu.Unlock()
			token, err := h.auth.JWT.GenerateToken(userID, email)
			if err != nil {
				return ExecResult{Errors: []GraphQLError{{Message: "failed to generate token"}}}
			}
			return ExecResult{Data: map[string]interface{}{
				"signup": map[string]interface{}{
					"token": token,
					"user": map[string]interface{}{
						"id":          userID,
						"email":       email,
						"displayName": displayName,
						"photoUrl":    "",
						"createdAt":   time.Now().UTC().Format(time.RFC3339),
					},
				},
			}}
		}
		return ExecResult{Data: map[string]interface{}{
			"signup": map[string]interface{}{
				"token": "jwt-placeholder-" + email,
				"user": map[string]interface{}{
					"id":          userID,
					"email":       email,
					"displayName": displayName,
					"photoUrl":    "",
					"createdAt":   time.Now().UTC().Format(time.RFC3339),
				},
			},
		}}
	}

	if strings.Contains(body, "login") {
		email := getVar(variables, "email")
		password := getVar(variables, "password")
		if email == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "email required"}}}
		}
		var foundID string
		var found storedUser
		usersMu.RLock()
		for id, u := range users {
			if u.Email == email {
				foundID = id
				found = u
				break
			}
		}
		usersMu.RUnlock()
		if foundID == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "invalid email or password"}}}
		}
		if h.auth != nil {
			if !h.auth.Password.Verify(password, found.PasswordHash) {
				return ExecResult{Errors: []GraphQLError{{Message: "invalid email or password"}}}
			}
			token, err := h.auth.JWT.GenerateToken(foundID, found.Email)
			if err != nil {
				return ExecResult{Errors: []GraphQLError{{Message: "failed to generate token"}}}
			}
			return ExecResult{Data: map[string]interface{}{
				"login": map[string]interface{}{
					"token": token,
					"user": map[string]interface{}{
						"id":          foundID,
						"email":       found.Email,
						"displayName": found.DisplayName,
						"photoUrl":    "",
						"createdAt":   time.Now().UTC().Format(time.RFC3339),
					},
				},
			}}
		}
		return ExecResult{Errors: []GraphQLError{{Message: "auth service unavailable"}}}
	}

	if strings.Contains(body, "requestpasswordreset") || strings.Contains(body, "requestPasswordReset") {
		return ExecResult{Data: map[string]interface{}{
			"requestPasswordReset": true,
		}}
	}

	if strings.Contains(body, "resetpassword") || strings.Contains(body, "resetPassword") {
		return ExecResult{Data: map[string]interface{}{
			"resetPassword": true,
		}}
	}

	return ExecResult{Errors: []GraphQLError{{Message: "unknown mutation"}}}
}

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

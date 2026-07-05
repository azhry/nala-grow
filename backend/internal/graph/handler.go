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
	usersMu         sync.RWMutex
	users           = map[string]storedUser{}
	babiesMu        sync.RWMutex
	babies          = map[string]BabyProfile{}
	measurementsMu  sync.RWMutex
	measurements    = map[string]Measurement{}
)

type BabyProfile struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	DOB       string `json:"dob"`
	Sex       string `json:"sex"`
	PhotoURL  string `json:"photoUrl"`
	CreatedAt string `json:"createdAt"`
	UserID    string `json:"userId"`
}

type Measurement struct {
	ID                string  `json:"id"`
	BabyID            string  `json:"babyId"`
	Date              string  `json:"date"`
	Weight            float64 `json:"weight"`
	Height            float64 `json:"height"`
	HeadCircumference float64 `json:"headCircumference"`
	CreatedAt         string  `json:"createdAt"`
}

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

func authenticatedUser(ctx context.Context, h *Handler) (string, ExecResult) {
	token, _ := ctx.Value("raw_token").(string)
	if token == "" {
		return "", ExecResult{Errors: []GraphQLError{{Message: "not authenticated"}}}
	}
	if h.auth == nil {
		return "", ExecResult{Errors: []GraphQLError{{Message: "not authenticated"}}}
	}
	claims, err := h.auth.JWT.ValidateToken(token)
	if err != nil || claims == nil {
		return "", ExecResult{Errors: []GraphQLError{{Message: "not authenticated"}}}
	}
	return claims.UserID, ExecResult{}
}

func (h *Handler) execQuery(ctx context.Context, query string, variables map[string]interface{}) ExecResult {
	body := strings.ToLower(query)

	if strings.Contains(body, "health") {
		return ExecResult{Data: map[string]interface{}{
			"health": NewHealth(),
		}}
	}

	if strings.Contains(body, "baby") || strings.Contains(body, "babies") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		if strings.Contains(body, "babies") {
			babiesMu.RLock()
			var list []map[string]interface{}
			for _, b := range babies {
				if b.UserID == userID {
					list = append(list, babyToMap(b))
				}
			}
			babiesMu.RUnlock()
			if list == nil {
				list = []map[string]interface{}{}
			}
			return ExecResult{Data: map[string]interface{}{
				"babies": list,
			}}
		}
		// single baby by id
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		babiesMu.RLock()
		b, ok := babies[id]
		babiesMu.RUnlock()
		if !ok || b.UserID != userID {
			return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"baby": babyToMap(b),
		}}
	}

	if strings.Contains(body, "measurements") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		babyID := getVar(variables, "babyId")
		if babyID == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
		}
		babiesMu.RLock()
		b, ok := babies[babyID]
		babiesMu.RUnlock()
		if !ok || b.UserID != userID {
			return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
		}
		measurementsMu.RLock()
		var list []map[string]interface{}
		for _, m := range measurements {
			if m.BabyID == babyID {
				list = append(list, measurementToMap(m))
			}
		}
		measurementsMu.RUnlock()
		if list == nil {
			list = []map[string]interface{}{}
		}
		return ExecResult{Data: map[string]interface{}{
			"measurements": list,
		}}
	}

	if strings.Contains(body, "measurement") && !strings.Contains(body, "measurements") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		measurementsMu.RLock()
		m, ok := measurements[id]
		measurementsMu.RUnlock()
		if !ok {
			return ExecResult{Errors: []GraphQLError{{Message: "measurement not found"}}}
		}
		// Verify the baby belongs to the user
		babiesMu.RLock()
		b, babyOk := babies[m.BabyID]
		babiesMu.RUnlock()
		if !babyOk || b.UserID != userID {
			return ExecResult{Errors: []GraphQLError{{Message: "measurement not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"measurement": measurementToMap(m),
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

	if strings.Contains(body, "createbaby") || strings.Contains(body, "createBaby") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		name := getVar(variables, "name")
		if name == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "name required"}}}
		}
		baby := BabyProfile{
			ID:        uuid(),
			Name:      name,
			DOB:       getVar(variables, "dob"),
			Sex:       getVar(variables, "sex"),
			PhotoURL:  getVar(variables, "photoUrl"),
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
			UserID:    userID,
		}
		babiesMu.Lock()
		babies[baby.ID] = baby
		babiesMu.Unlock()
		return ExecResult{Data: map[string]interface{}{
			"createBaby": babyToMap(baby),
		}}
	}

	if strings.Contains(body, "updatebaby") || strings.Contains(body, "updateBaby") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		babiesMu.Lock()
		b, ok := babies[id]
		if !ok || b.UserID != userID {
			babiesMu.Unlock()
			return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
		}
		if name := getVar(variables, "name"); name != "" {
			b.Name = name
		}
		if dob := getVar(variables, "dob"); dob != "" {
			b.DOB = dob
		}
		if sex := getVar(variables, "sex"); sex != "" {
			b.Sex = sex
		}
		if photoURL := getVar(variables, "photoUrl"); photoURL != "" {
			b.PhotoURL = photoURL
		}
		babies[id] = b
		babiesMu.Unlock()
		return ExecResult{Data: map[string]interface{}{
			"updateBaby": babyToMap(b),
		}}
	}

	if strings.Contains(body, "deletebaby") || strings.Contains(body, "deleteBaby") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		var deleted *BabyProfile
		babiesMu.Lock()
		if b, exists := babies[id]; exists && b.UserID == userID {
			deleted = &b
			delete(babies, id)
		}
		babiesMu.Unlock()
		if deleted == nil {
			return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"deleteBaby": babyToMap(*deleted),
		}}
	}

	if strings.Contains(body, "createmeasurement") || strings.Contains(body, "createMeasurement") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		babyID := getVar(variables, "babyId")
		if babyID == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
		}
		babiesMu.RLock()
		b, ok := babies[babyID]
		babiesMu.RUnlock()
		if !ok || b.UserID != userID {
			return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
		}
		m := Measurement{
			ID:                uuid(),
			BabyID:            babyID,
			Date:              getVar(variables, "date"),
			Weight:            getVarFloat(variables, "weight"),
			Height:            getVarFloat(variables, "height"),
			HeadCircumference: getVarFloat(variables, "headCircumference"),
			CreatedAt:         time.Now().UTC().Format(time.RFC3339),
		}
		measurementsMu.Lock()
		measurements[m.ID] = m
		measurementsMu.Unlock()
		result := measurementToMap(m)
		// Compute and attach percentiles
		ageMonths := AgeInMonths(b.DOB, m.Date)
		if m.Weight > 0 {
			L, M, S := whoLMS(b.Sex, ageMonths, "weight")
			if M > 0 && S > 0 {
				z := CalculateZScore(m.Weight, L, M, S)
				result["weightPercentile"] = ZToPercentile(z)
			}
		}
		if m.Height > 0 {
			L, M, S := whoLMS(b.Sex, ageMonths, "height")
			if M > 0 && S > 0 {
				z := CalculateZScore(m.Height, L, M, S)
				result["heightPercentile"] = ZToPercentile(z)
			}
		}
		if m.HeadCircumference > 0 {
			L, M, S := whoLMS(b.Sex, ageMonths, "headCircumference")
			if M > 0 && S > 0 {
				z := CalculateZScore(m.HeadCircumference, L, M, S)
				result["headCircumferencePercentile"] = ZToPercentile(z)
			}
		}
		return ExecResult{Data: map[string]interface{}{
			"createMeasurement": result,
		}}
	}

	if strings.Contains(body, "updatemeasurement") || strings.Contains(body, "updateMeasurement") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		measurementsMu.Lock()
		m, exists := measurements[id]
		if !exists {
			measurementsMu.Unlock()
			return ExecResult{Errors: []GraphQLError{{Message: "measurement not found"}}}
		}
		// Verify baby ownership
		babiesMu.RLock()
		b, babyOk := babies[m.BabyID]
		babiesMu.RUnlock()
		if !babyOk || b.UserID != userID {
			measurementsMu.Unlock()
			return ExecResult{Errors: []GraphQLError{{Message: "measurement not found"}}}
		}
		if date := getVar(variables, "date"); date != "" {
			m.Date = date
		}
		if weight := getVarFloat(variables, "weight"); weight != 0 {
			m.Weight = weight
		}
		if height := getVarFloat(variables, "height"); height != 0 {
			m.Height = height
		}
		if hc := getVarFloat(variables, "headCircumference"); hc != 0 {
			m.HeadCircumference = hc
		}
		measurements[id] = m
		measurementsMu.Unlock()
		return ExecResult{Data: map[string]interface{}{
			"updateMeasurement": measurementToMap(m),
		}}
	}

	if strings.Contains(body, "deletemeasurement") || strings.Contains(body, "deleteMeasurement") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		var deleted *Measurement
		measurementsMu.Lock()
		if m, exists := measurements[id]; exists {
			// Verify baby ownership
			babiesMu.RLock()
			b, babyOk := babies[m.BabyID]
			babiesMu.RUnlock()
			if babyOk && b.UserID == userID {
				deleted = &m
				delete(measurements, id)
			}
		}
		measurementsMu.Unlock()
		if deleted == nil {
			return ExecResult{Errors: []GraphQLError{{Message: "measurement not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"deleteMeasurement": measurementToMap(*deleted),
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

func babyToMap(b BabyProfile) map[string]interface{} {
	return map[string]interface{}{
		"id":        b.ID,
		"name":      b.Name,
		"dob":       b.DOB,
		"sex":       b.Sex,
		"photoUrl":  b.PhotoURL,
		"createdAt": b.CreatedAt,
		"userId":    b.UserID,
	}
}

func measurementToMap(m Measurement) map[string]interface{} {
	return map[string]interface{}{
		"id":                m.ID,
		"babyId":            m.BabyID,
		"date":              m.Date,
		"weight":            m.Weight,
		"height":            m.Height,
		"headCircumference": m.HeadCircumference,
		"createdAt":         m.CreatedAt,
	}
}

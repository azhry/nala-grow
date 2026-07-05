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
	usersMu            sync.RWMutex
	users              = map[string]storedUser{}
	babiesMu           sync.RWMutex
	babies             = map[string]BabyProfile{}
	measurementsMu     sync.RWMutex
	measurements       = map[string]Measurement{}
	feedingSessionsMu  sync.RWMutex
	feedingSessions    = map[string]FeedingSession{}
	sleepSessionsMu    sync.RWMutex
	sleepSessions      = map[string]SleepSession{}
	milestonesMu       sync.RWMutex
	milestones         = map[string]Milestone{}
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

type Milestone struct {
	ID          string `json:"id"`
	BabyID      string `json:"babyId"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	AchievedAt  string `json:"achievedAt"`
	Note        string `json:"note"`
	PhotoURL    string `json:"photoUrl"`
	IsCustom    bool   `json:"isCustom"`
	CreatedAt   string `json:"createdAt"`
}

type SleepSession struct {
	ID        string `json:"id"`
	BabyID    string `json:"babyId"`
	StartedAt string `json:"startedAt"`
	EndedAt   string `json:"endedAt"`
	Location  string `json:"location"`
	Notes     string `json:"notes"`
	CreatedAt string `json:"createdAt"`
}

type FeedingSession struct {
	ID               string  `json:"id"`
	BabyID           string  `json:"babyId"`
	FeedType         string  `json:"feedType"`
	StartedAt        string  `json:"startedAt"`
	EndedAt          string  `json:"endedAt"`
	LeftDurationSec  int     `json:"leftDurationSec"`
	RightDurationSec int     `json:"rightDurationSec"`
	AmountML         float64 `json:"amountMl"`
	MilkType         string  `json:"milkType"`
	FoodName         string  `json:"foodName"`
	Reaction         string  `json:"reaction"`
	Notes            string  `json:"notes"`
	CreatedAt        string  `json:"createdAt"`
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

	if strings.Contains(body, "milestones") {
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
		milestonesMu.RLock()
		var list []map[string]interface{}
		for _, m := range milestones {
			if m.BabyID == babyID {
				list = append(list, milestoneToMap(m))
			}
		}
		milestonesMu.RUnlock()
		if list == nil {
			list = []map[string]interface{}{}
		}
		return ExecResult{Data: map[string]interface{}{
			"milestones": list,
		}}
	}

	if strings.Contains(body, "milestone") && !strings.Contains(body, "milestones") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		milestonesMu.RLock()
		m, ok := milestones[id]
		milestonesMu.RUnlock()
		if !ok {
			return ExecResult{Errors: []GraphQLError{{Message: "milestone not found"}}}
		}
		babiesMu.RLock()
		b, babyOk := babies[m.BabyID]
		babiesMu.RUnlock()
		if !babyOk || b.UserID != userID {
			return ExecResult{Errors: []GraphQLError{{Message: "milestone not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"milestone": milestoneToMap(m),
		}}
	}

	if strings.Contains(body, "sleepsessions") || strings.Contains(body, "sleep_sessions") {
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
		sleepSessionsMu.RLock()
		var list []map[string]interface{}
		for _, s := range sleepSessions {
			if s.BabyID == babyID {
				list = append(list, sleepSessionToMap(s))
			}
		}
		sleepSessionsMu.RUnlock()
		if list == nil {
			list = []map[string]interface{}{}
		}
		return ExecResult{Data: map[string]interface{}{
			"sleepSessions": list,
		}}
	}

	if strings.Contains(body, "sleepsession") && !strings.Contains(body, "sleepsessions") && !strings.Contains(body, "sleep_sessions") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		sleepSessionsMu.RLock()
		s, ok := sleepSessions[id]
		sleepSessionsMu.RUnlock()
		if !ok {
			return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
		}
		babiesMu.RLock()
		b, babyOk := babies[s.BabyID]
		babiesMu.RUnlock()
		if !babyOk || b.UserID != userID {
			return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"sleepSession": sleepSessionToMap(s),
		}}
	}

	if strings.Contains(body, "feedingsessions") || strings.Contains(body, "feeding_sessions") {
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
		feedingSessionsMu.RLock()
		var list []map[string]interface{}
		for _, s := range feedingSessions {
			if s.BabyID == babyID {
				list = append(list, feedingSessionToMap(s))
			}
		}
		feedingSessionsMu.RUnlock()
		if list == nil {
			list = []map[string]interface{}{}
		}
		return ExecResult{Data: map[string]interface{}{
			"feedingSessions": list,
		}}
	}

	if strings.Contains(body, "feedingsession") && !strings.Contains(body, "feedingsessions") && !strings.Contains(body, "feeding_sessions") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		feedingSessionsMu.RLock()
		s, ok := feedingSessions[id]
		feedingSessionsMu.RUnlock()
		if !ok {
			return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
		}
		babiesMu.RLock()
		b, babyOk := babies[s.BabyID]
		babiesMu.RUnlock()
		if !babyOk || b.UserID != userID {
			return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"feedingSession": feedingSessionToMap(s),
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

	if strings.Contains(body, "createmilestone") || strings.Contains(body, "createMilestone") {
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
		title := getVar(variables, "title")
		if title == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "title required"}}}
		}
		category := getVar(variables, "category")
		if category == "" {
			category = "general"
		}
		m := Milestone{
			ID:          uuid(),
			BabyID:      babyID,
			Title:       title,
			Description: getVar(variables, "description"),
			Category:    category,
			AchievedAt:  getVar(variables, "achievedAt"),
			Note:        getVar(variables, "note"),
			PhotoURL:    getVar(variables, "photoUrl"),
			IsCustom:    getVarBool(variables, "isCustom"),
			CreatedAt:   time.Now().UTC().Format(time.RFC3339),
		}
		milestonesMu.Lock()
		milestones[m.ID] = m
		milestonesMu.Unlock()
		return ExecResult{Data: map[string]interface{}{
			"createMilestone": milestoneToMap(m),
		}}
	}

	if strings.Contains(body, "updatemilestone") || strings.Contains(body, "updateMilestone") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		milestonesMu.Lock()
		m, exists := milestones[id]
		if !exists {
			milestonesMu.Unlock()
			return ExecResult{Errors: []GraphQLError{{Message: "milestone not found"}}}
		}
		babiesMu.RLock()
		b, babyOk := babies[m.BabyID]
		babiesMu.RUnlock()
		if !babyOk || b.UserID != userID {
			milestonesMu.Unlock()
			return ExecResult{Errors: []GraphQLError{{Message: "milestone not found"}}}
		}
		if title := getVar(variables, "title"); title != "" {
			m.Title = title
		}
		if description := getVar(variables, "description"); description != "" {
			m.Description = description
		}
		if category := getVar(variables, "category"); category != "" {
			m.Category = category
		}
		if achievedAt := getVar(variables, "achievedAt"); achievedAt != "" {
			m.AchievedAt = achievedAt
		}
		if note := getVar(variables, "note"); note != "" {
			m.Note = note
		}
		if photoURL := getVar(variables, "photoUrl"); photoURL != "" {
			m.PhotoURL = photoURL
		}
		if isCustom := getVarBool(variables, "isCustom"); isCustom {
			m.IsCustom = isCustom
		}
		milestones[m.ID] = m
		milestonesMu.Unlock()
		return ExecResult{Data: map[string]interface{}{
			"updateMilestone": milestoneToMap(m),
		}}
	}

	if strings.Contains(body, "deletemilestone") || strings.Contains(body, "deleteMilestone") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		var deleted *Milestone
		milestonesMu.Lock()
		if m, exists := milestones[id]; exists {
			babiesMu.RLock()
			b, babyOk := babies[m.BabyID]
			babiesMu.RUnlock()
			if babyOk && b.UserID == userID {
				deleted = &m
				delete(milestones, id)
			}
		}
		milestonesMu.Unlock()
		if deleted == nil {
			return ExecResult{Errors: []GraphQLError{{Message: "milestone not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"deleteMilestone": milestoneToMap(*deleted),
		}}
	}

	if strings.Contains(body, "createsleepsession") || strings.Contains(body, "createSleepSession") {
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
		location := getVar(variables, "location")
		if location == "" {
			location = "crib"
		}
		s := SleepSession{
			ID:        uuid(),
			BabyID:    babyID,
			StartedAt: getVar(variables, "startedAt"),
			EndedAt:   getVar(variables, "endedAt"),
			Location:  location,
			Notes:     getVar(variables, "notes"),
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
		}
		sleepSessionsMu.Lock()
		sleepSessions[s.ID] = s
		sleepSessionsMu.Unlock()
		return ExecResult{Data: map[string]interface{}{
			"createSleepSession": sleepSessionToMap(s),
		}}
	}

	if strings.Contains(body, "updatesleepsession") || strings.Contains(body, "updateSleepSession") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		sleepSessionsMu.Lock()
		s, exists := sleepSessions[id]
		if !exists {
			sleepSessionsMu.Unlock()
			return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
		}
		babiesMu.RLock()
		b, babyOk := babies[s.BabyID]
		babiesMu.RUnlock()
		if !babyOk || b.UserID != userID {
			sleepSessionsMu.Unlock()
			return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
		}
		if startedAt := getVar(variables, "startedAt"); startedAt != "" {
			s.StartedAt = startedAt
		}
		if endedAt := getVar(variables, "endedAt"); endedAt != "" {
			s.EndedAt = endedAt
		}
		if location := getVar(variables, "location"); location != "" {
			s.Location = location
		}
		if notes := getVar(variables, "notes"); notes != "" {
			s.Notes = notes
		}
		sleepSessions[id] = s
		sleepSessionsMu.Unlock()
		return ExecResult{Data: map[string]interface{}{
			"updateSleepSession": sleepSessionToMap(s),
		}}
	}

	if strings.Contains(body, "deletesleepsession") || strings.Contains(body, "deleteSleepSession") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		var deleted *SleepSession
		sleepSessionsMu.Lock()
		if s, exists := sleepSessions[id]; exists {
			babiesMu.RLock()
			b, babyOk := babies[s.BabyID]
			babiesMu.RUnlock()
			if babyOk && b.UserID == userID {
				deleted = &s
				delete(sleepSessions, id)
			}
		}
		sleepSessionsMu.Unlock()
		if deleted == nil {
			return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"deleteSleepSession": sleepSessionToMap(*deleted),
		}}
	}

	if strings.Contains(body, "createfeedingsession") || strings.Contains(body, "createFeedingSession") {
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
		feedType := getVar(variables, "feedType")
		if feedType == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "feedType required"}}}
		}
		s := FeedingSession{
			ID:               uuid(),
			BabyID:           babyID,
			FeedType:         feedType,
			StartedAt:        getVar(variables, "startedAt"),
			EndedAt:          getVar(variables, "endedAt"),
			LeftDurationSec:  getVarInt(variables, "leftDurationSec"),
			RightDurationSec: getVarInt(variables, "rightDurationSec"),
			AmountML:         getVarFloat(variables, "amountMl"),
			MilkType:         getVar(variables, "milkType"),
			FoodName:         getVar(variables, "foodName"),
			Reaction:         getVar(variables, "reaction"),
			Notes:            getVar(variables, "notes"),
			CreatedAt:        time.Now().UTC().Format(time.RFC3339),
		}
		feedingSessionsMu.Lock()
		feedingSessions[s.ID] = s
		feedingSessionsMu.Unlock()
		return ExecResult{Data: map[string]interface{}{
			"createFeedingSession": feedingSessionToMap(s),
		}}
	}

	if strings.Contains(body, "updatefeedingsession") || strings.Contains(body, "updateFeedingSession") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		feedingSessionsMu.Lock()
		s, exists := feedingSessions[id]
		if !exists {
			feedingSessionsMu.Unlock()
			return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
		}
		babiesMu.RLock()
		b, babyOk := babies[s.BabyID]
		babiesMu.RUnlock()
		if !babyOk || b.UserID != userID {
			feedingSessionsMu.Unlock()
			return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
		}
		if feedType := getVar(variables, "feedType"); feedType != "" {
			s.FeedType = feedType
		}
		if startedAt := getVar(variables, "startedAt"); startedAt != "" {
			s.StartedAt = startedAt
		}
		if endedAt := getVar(variables, "endedAt"); endedAt != "" {
			s.EndedAt = endedAt
		}
		if leftDur := getVarInt(variables, "leftDurationSec"); leftDur != 0 {
			s.LeftDurationSec = leftDur
		}
		if rightDur := getVarInt(variables, "rightDurationSec"); rightDur != 0 {
			s.RightDurationSec = rightDur
		}
		if amountML := getVarFloat(variables, "amountMl"); amountML != 0 {
			s.AmountML = amountML
		}
		if milkType := getVar(variables, "milkType"); milkType != "" {
			s.MilkType = milkType
		}
		if foodName := getVar(variables, "foodName"); foodName != "" {
			s.FoodName = foodName
		}
		if reaction := getVar(variables, "reaction"); reaction != "" {
			s.Reaction = reaction
		}
		if notes := getVar(variables, "notes"); notes != "" {
			s.Notes = notes
		}
		feedingSessions[id] = s
		feedingSessionsMu.Unlock()
		return ExecResult{Data: map[string]interface{}{
			"updateFeedingSession": feedingSessionToMap(s),
		}}
	}

	if strings.Contains(body, "deletefeedingsession") || strings.Contains(body, "deleteFeedingSession") {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		var deleted *FeedingSession
		feedingSessionsMu.Lock()
		if s, exists := feedingSessions[id]; exists {
			babiesMu.RLock()
			b, babyOk := babies[s.BabyID]
			babiesMu.RUnlock()
			if babyOk && b.UserID == userID {
				deleted = &s
				delete(feedingSessions, id)
			}
		}
		feedingSessionsMu.Unlock()
		if deleted == nil {
			return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"deleteFeedingSession": feedingSessionToMap(*deleted),
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

func milestoneToMap(m Milestone) map[string]interface{} {
	return map[string]interface{}{
		"id":          m.ID,
		"babyId":      m.BabyID,
		"title":       m.Title,
		"description": m.Description,
		"category":    m.Category,
		"achievedAt":  m.AchievedAt,
		"note":        m.Note,
		"photoUrl":    m.PhotoURL,
		"isCustom":    m.IsCustom,
		"createdAt":   m.CreatedAt,
	}
}

func sleepSessionToMap(s SleepSession) map[string]interface{} {
	return map[string]interface{}{
		"id":        s.ID,
		"babyId":    s.BabyID,
		"startedAt": s.StartedAt,
		"endedAt":   s.EndedAt,
		"location":  s.Location,
		"notes":     s.Notes,
		"createdAt": s.CreatedAt,
	}
}

func feedingSessionToMap(s FeedingSession) map[string]interface{} {
	return map[string]interface{}{
		"id":               s.ID,
		"babyId":           s.BabyID,
		"feedType":         s.FeedType,
		"startedAt":        s.StartedAt,
		"endedAt":          s.EndedAt,
		"leftDurationSec":  float64(s.LeftDurationSec),
		"rightDurationSec": float64(s.RightDurationSec),
		"amountMl":         s.AmountML,
		"milkType":         s.MilkType,
		"foodName":         s.FoodName,
		"reaction":         s.Reaction,
		"notes":            s.Notes,
		"createdAt":        s.CreatedAt,
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

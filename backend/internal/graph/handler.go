package graph

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/azhry/nala-grow/backend/internal/auth"
	"github.com/graphql-go/graphql"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type storedUser struct {
	Email        string
	PasswordHash string
	DisplayName  string
}

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
	ID               string   `json:"id"`
	BabyID           string   `json:"babyId"`
	FeedType         string   `json:"feedType"`
	StartedAt        string   `json:"startedAt"`
	EndedAt          string   `json:"endedAt"`
	LeftDurationSec  int      `json:"leftDurationSec"`
	RightDurationSec int      `json:"rightDurationSec"`
	AmountML         float64  `json:"amountMl"`
	MilkType         string   `json:"milkType"`
	FoodName         string   `json:"foodName"`
	Reaction         string   `json:"reaction"`
	Temperature      *string  `json:"temperature"`
	Quantity         *float64 `json:"quantity"`
	QuantityUnit     *string  `json:"quantityUnit"`
	Notes            string   `json:"notes"`
	CreatedAt        string   `json:"createdAt"`
}

type Handler struct {
	db             *pgxpool.Pool
	auth           *auth.Service
	googleVerifier *auth.GoogleTokenVerifier
	resetTokens    *auth.ResetTokenStore
	googleClientID string
	schema         graphql.Schema
	schemaErr      error
}

// NewHandler requires PostgreSQL. GraphQL operations never use process-local
// state as a persistence substitute.
func NewHandler(db *pgxpool.Pool, authSvc *auth.Service) *Handler {
	h := &Handler{
		db:             db,
		auth:           authSvc,
		googleVerifier: auth.NewGoogleTokenVerifier(),
		resetTokens:    auth.NewResetTokenStore(),
	}
	h.schema, h.schemaErr = newSchema(h)
	return h
}

// SetGoogleClientID configures the expected Google OAuth client ID for token verification.
func (h *Handler) SetGoogleClientID(clientID string) {
	h.googleClientID = clientID
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
	if query == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "query is required"}}}
	}
	if strings.HasPrefix(strings.ToLower(query), "subscription") {
		return ExecResult{Errors: []GraphQLError{{Message: "unsupported operation"}}}
	}
	if legacyQuery, operation, field, ok := normalizeLegacyRequest(query, variables); ok {
		if legacyMissingRequired(operation, field, variables) {
			if operation == "query" {
				return h.resolveQuery(ctx, field, variables)
			}
			return h.resolveMutation(ctx, field, variables)
		}
		query = legacyQuery
	}
	if h.schemaErr != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "graphql schema unavailable"}}}
	}

	result := graphql.Do(graphql.Params{
		Schema:         h.schema,
		RequestString:  query,
		VariableValues: variables,
		Context:        ctx,
	})
	execResult := ExecResult{Data: normalizeGraphQLData(result.Data)}
	for _, err := range result.Errors {
		execResult.Errors = append(execResult.Errors, GraphQLError{Message: err.Message})
	}
	return execResult
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

func (h *Handler) resolveQuery(ctx context.Context, field string, variables map[string]interface{}) ExecResult {

	if field == "health" {
		return ExecResult{Data: map[string]interface{}{
			"health": NewHealth(),
		}}
	}

	if field == "demoData" {
		data, err := loadDemoData(ctx, h.db)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not load demo data"}}}
		}
		return ExecResult{Data: map[string]interface{}{"demoData": data}}
	}

	// Match the baby fields themselves, rather than every query that contains a
	// `babyId` variable. Dashboard list queries carry that variable too.
	if field == "babies" || field == "baby" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		if field == "babies" {
			profiles, err := loadBabies(ctx, h.db, userID)
			if err != nil {
				return ExecResult{Errors: []GraphQLError{{Message: "could not load babies"}}}
			}
			list := make([]map[string]interface{}, 0, len(profiles))
			for _, b := range profiles {
				list = append(list, babyToMap(b))
			}
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
		b, err := loadBaby(ctx, h.db, id, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"baby": babyToMap(b),
		}}
	}

	if field == "exportCSV" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		babyID := getVar(variables, "babyId")
		if babyID == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
		}
		b, err := loadBaby(ctx, h.db, babyID, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
		}
		dateFrom := getVar(variables, "dateFrom")
		dateTo := getVar(variables, "dateTo")

		csv := "Baby Growth Report\n"
		csv += "Name," + csvEscape(b.Name) + "\n"
		csv += "DOB," + csvEscape(b.DOB) + "\n"
		csv += "Sex," + csvEscape(b.Sex) + "\n\n"

		// Feeding sessions
		feeds, err := loadFeedingSessions(ctx, h.db, babyID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
		}
		csv += "Feeding Sessions\n"
		csv += "Feed Type,Started,Ended,Left (sec),Right (sec),Amount (ml),Milk Type,Food,Reaction,Notes\n"
		feedCount := 0
		for _, s := range feeds {
			if !inDateRange(s.StartedAt, dateFrom, dateTo) {
				continue
			}
			csv += csvEscape(s.FeedType) + ","
			csv += csvEscape(s.StartedAt) + ","
			csv += csvEscape(s.EndedAt) + ","
			csv += fmt.Sprintf("%d,%d,", s.LeftDurationSec, s.RightDurationSec)
			csv += fmt.Sprintf("%.1f,", s.AmountML)
			csv += csvEscape(s.MilkType) + ","
			csv += csvEscape(s.FoodName) + ","
			csv += csvEscape(s.Reaction) + ","
			csv += csvEscape(s.Notes) + "\n"
			feedCount++
		}
		if feedCount == 0 {
			csv += "No records found\n"
		}
		csv += "\n"

		// Sleep sessions
		sleeps, err := loadSleepSessions(ctx, h.db, babyID, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
		}
		csv += "Sleep Sessions\n"
		csv += "Sleep Location,Started,Ended,Notes\n"
		sleepCount := 0
		for _, s := range sleeps {
			if !inDateRange(s.StartedAt, dateFrom, dateTo) {
				continue
			}
			csv += csvEscape(s.Location) + ","
			csv += csvEscape(s.StartedAt) + ","
			csv += csvEscape(s.EndedAt) + ","
			csv += csvEscape(s.Notes) + "\n"
			sleepCount++
		}
		if sleepCount == 0 {
			csv += "No records found\n"
		}
		csv += "\n"

		// Measurements
		measurementRecords, err := loadMeasurements(ctx, h.db, babyID, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
		}
		csv += "Growth Measurements\n"
		csv += "Date,Weight (kg),Height (cm),Head Circumference (cm)\n"
		measCount := 0
		for _, m := range measurementRecords {
			if !inDateRange(m.Date, dateFrom, dateTo) {
				continue
			}
			csv += csvEscape(m.Date) + ","
			csv += fmt.Sprintf("%.2f,", m.Weight)
			csv += fmt.Sprintf("%.2f,", m.Height)
			csv += fmt.Sprintf("%.2f\n", m.HeadCircumference)
			measCount++
		}
		if measCount == 0 {
			csv += "No records found\n"
		}
		csv += "\n"

		// Milestones
		milestoneRecords, err := loadMilestones(ctx, h.db, babyID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
		}
		csv += "Milestones\n"
		csv += "Title,Category,Achieved At,Notes\n"
		msCount := 0
		for _, m := range milestoneRecords {
			if !inDateRange(m.AchievedAt, dateFrom, dateTo) {
				continue
			}
			csv += csvEscape(m.Title) + ","
			csv += csvEscape(m.Category) + ","
			csv += csvEscape(m.AchievedAt) + ","
			csv += csvEscape(m.Note) + "\n"
			msCount++
		}
		if msCount == 0 {
			csv += "No records found\n"
		}

		return ExecResult{Data: map[string]interface{}{
			"exportCSV": csv,
		}}
	}

	if field == "exportData" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		babyID := getVar(variables, "babyId")
		if babyID == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
		}
		b, err := loadBaby(ctx, h.db, babyID, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
		}
		dateFrom := getVar(variables, "dateFrom")
		dateTo := getVar(variables, "dateTo")

		// Feeding sessions
		feeds, err := loadFeedingSessions(ctx, h.db, babyID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
		}
		var feedList []map[string]interface{}
		for _, s := range feeds {
			if !inDateRange(s.StartedAt, dateFrom, dateTo) {
				continue
			}
			feedList = append(feedList, feedingSessionToMap(s))
		}

		// Sleep sessions
		sleeps, err := loadSleepSessions(ctx, h.db, babyID, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
		}
		var sleepList []map[string]interface{}
		for _, s := range sleeps {
			if !inDateRange(s.StartedAt, dateFrom, dateTo) {
				continue
			}
			sleepList = append(sleepList, sleepSessionToMap(s))
		}

		// Measurements
		measurementRecords, err := loadMeasurements(ctx, h.db, babyID, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
		}
		var measList []map[string]interface{}
		for _, m := range measurementRecords {
			if !inDateRange(m.Date, dateFrom, dateTo) {
				continue
			}
			measList = append(measList, measurementToMap(m))
		}

		// Milestones
		milestoneRecords, err := loadMilestones(ctx, h.db, babyID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
		}
		var msList []map[string]interface{}
		for _, m := range milestoneRecords {
			if !inDateRange(m.AchievedAt, dateFrom, dateTo) {
				continue
			}
			msList = append(msList, milestoneToMap(m))
		}

		return ExecResult{Data: map[string]interface{}{
			"exportData": map[string]interface{}{
				"babyName":      b.Name,
				"babyDob":       b.DOB,
				"babySex":       b.Sex,
				"feedSessions":  feedList,
				"sleepSessions": sleepList,
				"measurements":  measList,
				"milestones":    msList,
				"dateFrom":      dateFrom,
				"dateTo":        dateTo,
			},
		}}
	}

	if field == "milestones" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		babyID := getVar(variables, "babyId")
		if babyID == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
		}
		if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
		}
		records, err := loadMilestones(ctx, h.db, babyID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not load milestones"}}}
		}
		var list []map[string]interface{}
		for _, m := range records {
			list = append(list, milestoneToMap(m))
		}
		if list == nil {
			list = []map[string]interface{}{}
		}
		return ExecResult{Data: map[string]interface{}{
			"milestones": list,
		}}
	}

	if field == "milestone" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		m, err := loadMilestone(ctx, h.db, id, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "milestone not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"milestone": milestoneToMap(m),
		}}
	}

	if field == "sleepSessions" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		babyID := getVar(variables, "babyId")
		if babyID == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
		}
		if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
		}
		var list []map[string]interface{}
		sessions, err := loadSleepSessions(ctx, h.db, babyID, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not load sleep sessions"}}}
		}
		for _, s := range sessions {
			list = append(list, sleepSessionToMap(s))
		}
		if list == nil {
			list = []map[string]interface{}{}
		}
		return ExecResult{Data: map[string]interface{}{
			"sleepSessions": list,
		}}
	}

	if field == "sleepSession" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		s, err := loadSleepSession(ctx, h.db, id)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
		}
		if _, err := loadBaby(ctx, h.db, s.BabyID, userID); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"sleepSession": sleepSessionToMap(s),
		}}
	}

	if field == "feedingSessions" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		babyID := getVar(variables, "babyId")
		if babyID == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
		}
		if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
		}
		var list []map[string]interface{}
		sessions, err := loadFeedingSessions(ctx, h.db, babyID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not load feeding sessions"}}}
		}
		for _, s := range sessions {
			list = append(list, feedingSessionToMap(s))
		}
		if list == nil {
			list = []map[string]interface{}{}
		}
		return ExecResult{Data: map[string]interface{}{
			"feedingSessions": list,
		}}
	}

	if field == "feedingSession" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		s, err := loadFeedingSession(ctx, h.db, id)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
		}
		if _, err := loadBaby(ctx, h.db, s.BabyID, userID); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"feedingSession": feedingSessionToMap(s),
		}}
	}

	if field == "measurements" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		babyID := getVar(variables, "babyId")
		if babyID == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
		}
		if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
		}
		var list []map[string]interface{}
		records, err := loadMeasurements(ctx, h.db, babyID, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not load measurements"}}}
		}
		for _, m := range records {
			list = append(list, measurementToMap(m))
		}
		if list == nil {
			list = []map[string]interface{}{}
		}
		return ExecResult{Data: map[string]interface{}{
			"measurements": list,
		}}
	}

	if field == "measurement" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		m, err := loadMeasurement(ctx, h.db, id, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "measurement not found"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"measurement": measurementToMap(m),
		}}
	}

	if field == "me" {
		token, _ := ctx.Value("raw_token").(string)
		if token == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "not authenticated"}}}
		}
		if h.auth != nil {
			claims, err := h.auth.JWT.ValidateToken(token)
			if err == nil && claims != nil {
				u, err := loadUserByID(ctx, h.db, claims.UserID)
				if err != nil {
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

func (h *Handler) resolveMutation(ctx context.Context, field string, variables map[string]interface{}) ExecResult {

	if field == "signup" {
		email := getVar(variables, "email")
		password := getVar(variables, "password")
		displayName := getVar(variables, "displayName")
		if email == "" || password == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "email and password required"}}}
		}
		if displayName == "" {
			displayName = email[:strings.Index(email, "@")]
		}

		if h.auth == nil {
			return ExecResult{Errors: []GraphQLError{{Message: "auth service unavailable"}}}
		}
		hash, err := h.auth.Password.Hash(password)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "failed to hash password"}}}
		}
		userID, existing, err := loadUserByEmail(ctx, h.db, email)
		if err != nil && err != pgx.ErrNoRows {
			return ExecResult{Errors: []GraphQLError{{Message: "could not load user"}}}
		}
		if err == pgx.ErrNoRows {
			userID = uuid()
			if _, err := h.db.Exec(ctx, "INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)", userID, email, hash, displayName); err != nil {
				return ExecResult{Errors: []GraphQLError{{Message: "could not create user"}}}
			}
			existing = storedUser{Email: email, PasswordHash: hash, DisplayName: displayName}
		} else if _, err := h.db.Exec(ctx, "UPDATE users SET password_hash = $2 WHERE id = $1", userID, hash); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not update user"}}}
		}
		token, err := h.auth.JWT.GenerateToken(userID, email)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "failed to generate token"}}}
		}
		return authResult("signup", token, userID, existing)
	}

	if field == "loginWithGoogle" {
		idToken := getVar(variables, "idToken")
		if idToken == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "idToken required"}}}
		}
		if h.auth == nil {
			return ExecResult{Errors: []GraphQLError{{Message: "auth service unavailable"}}}
		}
		googleUser, err := h.googleVerifier.VerifyIDToken(idToken, h.googleClientID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "invalid Google token: " + err.Error()}}}
		}
		foundID, found, err := loadUserByEmail(ctx, h.db, googleUser.Email)
		if err != nil && err != pgx.ErrNoRows {
			return ExecResult{Errors: []GraphQLError{{Message: "could not load user"}}}
		}
		if err == pgx.ErrNoRows {
			// Create new user
			foundID = uuid()
			displayName := googleUser.Name
			if displayName == "" {
				displayName = googleUser.Email[:strings.Index(googleUser.Email, "@")]
			}
			// Generate a placeholder password hash (user logs in via Google only)
			placeholderHash, _ := h.auth.Password.Hash(uuid() + uuid())
			found = storedUser{
				Email:        googleUser.Email,
				PasswordHash: placeholderHash,
				DisplayName:  displayName,
			}
			if _, err := h.db.Exec(ctx, "INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)", foundID, found.Email, found.PasswordHash, found.DisplayName); err != nil {
				return ExecResult{Errors: []GraphQLError{{Message: "could not create user"}}}
			}
		}
		token, err := h.auth.JWT.GenerateToken(foundID, found.Email)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "failed to generate token"}}}
		}
		return authResult("loginWithGoogle", token, foundID, found)
	}

	if field == "login" {
		email := getVar(variables, "email")
		password := getVar(variables, "password")
		if email == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "email required"}}}
		}
		foundID, found, err := loadUserByEmail(ctx, h.db, email)
		if err != nil {
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
			return authResult("login", token, foundID, found)
		}
		return ExecResult{Errors: []GraphQLError{{Message: "auth service unavailable"}}}
	}

	if field == "requestPasswordReset" {
		email := getVar(variables, "email")
		if email == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "email required"}}}
		}
		// Check if user exists (but don't reveal to prevent email enumeration)
		_, _, lookupErr := loadUserByEmail(ctx, h.db, email)
		userExists := lookupErr == nil
		if !userExists {
			// Return success anyway to prevent email enumeration
			return ExecResult{Data: map[string]interface{}{
				"requestPasswordReset": true,
			}}
		}
		tokenStr, err := h.resetTokens.GenerateToken(email)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "failed to generate reset token"}}}
		}
		// In dev/demo mode, return the token directly so the frontend can use it
		return ExecResult{Data: map[string]interface{}{
			"requestPasswordReset": tokenStr,
		}}
	}

	if field == "resetPassword" {
		tokenStr := getVar(variables, "token")
		newPassword := getVar(variables, "newPassword")
		if tokenStr == "" || newPassword == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "token and newPassword required"}}}
		}
		email, err := h.resetTokens.ValidateToken(tokenStr)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "invalid or expired reset token"}}}
		}
		foundID, _, err := loadUserByEmail(ctx, h.db, email)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "user not found"}}}
		}
		// Hash the new password
		if h.auth == nil {
			return ExecResult{Errors: []GraphQLError{{Message: "auth service unavailable"}}}
		}
		hash, err := h.auth.Password.Hash(newPassword)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "failed to hash password"}}}
		}
		if _, err := h.db.Exec(ctx, "UPDATE users SET password_hash = $2 WHERE id = $1", foundID, hash); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not update password"}}}
		}
		// Invalidate the token
		h.resetTokens.InvalidateToken(tokenStr)
		return ExecResult{Data: map[string]interface{}{
			"resetPassword": true,
		}}
	}

	if field == "createBaby" {
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
		if _, err := h.db.Exec(ctx, "INSERT INTO babies (id, user_id, name, dob, sex, photo_url) VALUES ($1, $2, $3, $4::date, $5, $6)", baby.ID, baby.UserID, baby.Name, baby.DOB, baby.Sex, baby.PhotoURL); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not create baby"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"createBaby": babyToMap(baby),
		}}
	}

	if field == "updateBaby" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		b, err := loadBaby(ctx, h.db, id, userID)
		if err != nil {
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
		if _, err := h.db.Exec(ctx, `UPDATE babies SET name = $2, dob = $3::date, sex = $4, photo_url = $5 WHERE id = $1 AND user_id = $6`, id, b.Name, b.DOB, b.Sex, b.PhotoURL, userID); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not update baby"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"updateBaby": babyToMap(b),
		}}
	}

	if field == "deleteBaby" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		deleted, err := loadBaby(ctx, h.db, id, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
		}
		if _, err := h.db.Exec(ctx, "DELETE FROM babies WHERE id = $1 AND user_id = $2", id, userID); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not delete baby"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"deleteBaby": babyToMap(deleted),
		}}
	}

	if field == "createMilestone" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		babyID := getVar(variables, "babyId")
		if babyID == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
		}
		if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
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
		if _, err := h.db.Exec(ctx, `INSERT INTO milestones (id, baby_id, title, description, category, achieved_at, note, photo_url, is_custom, created_at)
			VALUES ($1, $2, $3, $4, $5, NULLIF($6, '')::timestamptz, $7, $8, $9, $10::timestamptz)`, m.ID, m.BabyID, m.Title, m.Description, m.Category, m.AchievedAt, m.Note, m.PhotoURL, m.IsCustom, m.CreatedAt); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not save milestone"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"createMilestone": milestoneToMap(m),
		}}
	}

	if field == "updateMilestone" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		m, err := loadMilestone(ctx, h.db, id, userID)
		if err != nil {
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
		if _, err := h.db.Exec(ctx, `UPDATE milestones SET title=$2, description=$3, category=$4, achieved_at=NULLIF($5, '')::timestamptz, note=$6, photo_url=$7, is_custom=$8 WHERE id=$1`, m.ID, m.Title, m.Description, m.Category, m.AchievedAt, m.Note, m.PhotoURL, m.IsCustom); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not update milestone"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"updateMilestone": milestoneToMap(m),
		}}
	}

	if field == "deleteMilestone" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		deleted, err := loadMilestone(ctx, h.db, id, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "milestone not found"}}}
		}
		if _, err := h.db.Exec(ctx, "DELETE FROM milestones WHERE id = $1", id); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not delete milestone"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"deleteMilestone": milestoneToMap(deleted),
		}}
	}

	if field == "createSleepSession" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		babyID := getVar(variables, "babyId")
		if babyID == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
		}
		if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
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
		if _, err := h.db.Exec(ctx, `INSERT INTO sleep_sessions (id, baby_id, started_at, ended_at, location, notes, created_at)
			VALUES ($1, $2, $3::timestamptz, NULLIF($4, '')::timestamptz, $5, $6, $7::timestamptz)`, s.ID, s.BabyID, s.StartedAt, s.EndedAt, s.Location, s.Notes, s.CreatedAt); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not save sleep session"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"createSleepSession": sleepSessionToMap(s),
		}}
	}

	if field == "updateSleepSession" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		s, err := loadSleepSession(ctx, h.db, id)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
		}
		if _, err := loadBaby(ctx, h.db, s.BabyID, userID); err != nil {
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
		if _, err := h.db.Exec(ctx, `UPDATE sleep_sessions SET started_at = $2::timestamptz, ended_at = NULLIF($3, '')::timestamptz, location = $4, notes = $5 WHERE id = $1`, id, s.StartedAt, s.EndedAt, s.Location, s.Notes); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not update sleep session"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"updateSleepSession": sleepSessionToMap(s),
		}}
	}

	if field == "deleteSleepSession" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		deleted, err := loadSleepSession(ctx, h.db, id)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
		}
		if _, err := loadBaby(ctx, h.db, deleted.BabyID, userID); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
		}
		if _, err := h.db.Exec(ctx, "DELETE FROM sleep_sessions WHERE id = $1", id); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not delete sleep session"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"deleteSleepSession": sleepSessionToMap(deleted),
		}}
	}

	if field == "createFeedingSession" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		babyID := getVar(variables, "babyId")
		if babyID == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
		}
		if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
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
			StartedAt:        feedingStartedAt(variables),
			EndedAt:          getVar(variables, "endedAt"),
			LeftDurationSec:  getVarInt(variables, "leftDurationSec"),
			RightDurationSec: getVarInt(variables, "rightDurationSec"),
			AmountML:         getVarFloat(variables, "amountMl"),
			MilkType:         getVar(variables, "milkType"),
			FoodName:         getVar(variables, "foodName"),
			Reaction:         getVar(variables, "reaction"),
			Temperature:      feedingString(variables, "temperature"),
			Quantity:         feedingQuantity(variables),
			QuantityUnit:     feedingString(variables, "quantityUnit"),
			Notes:            getVar(variables, "notes"),
			CreatedAt:        time.Now().UTC().Format(time.RFC3339),
		}
		if err := insertFeedingSession(ctx, h.db, s); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not save feeding session"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"createFeedingSession": feedingSessionToMap(s),
		}}
	}

	if field == "updateFeedingSession" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		s, err := loadFeedingSession(ctx, h.db, id)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
		}
		if _, err := loadBaby(ctx, h.db, s.BabyID, userID); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
		}
		applyFeedingSessionUpdates(&s, variables)
		if err := updateFeedingSession(ctx, h.db, s); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not update feeding session"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"updateFeedingSession": feedingSessionToMap(s),
		}}
	}

	if field == "deleteFeedingSession" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		s, err := loadFeedingSession(ctx, h.db, id)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
		}
		if _, err := loadBaby(ctx, h.db, s.BabyID, userID); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
		}
		if _, err := h.db.Exec(ctx, "DELETE FROM feeding_sessions WHERE id = $1", id); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not delete feeding session"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"deleteFeedingSession": feedingSessionToMap(s),
		}}
	}

	if field == "createMeasurement" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		babyID := getVar(variables, "babyId")
		if babyID == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
		}
		b, err := loadBaby(ctx, h.db, babyID, userID)
		if err != nil {
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
		if err := saveMeasurement(ctx, h.db, m); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not save measurement"}}}
		}
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

	if field == "updateMeasurement" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		m, err := loadMeasurement(ctx, h.db, id, userID)
		if err != nil {
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
		if err := saveMeasurement(ctx, h.db, m); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not update measurement"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"updateMeasurement": measurementToMap(m),
		}}
	}

	if field == "deleteMeasurement" {
		userID, errResult := authenticatedUser(ctx, h)
		if errResult.Errors != nil {
			return errResult
		}
		id := getVar(variables, "id")
		if id == "" {
			return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
		}
		deleted, err := loadMeasurement(ctx, h.db, id, userID)
		if err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "measurement not found"}}}
		}
		if _, err := h.db.Exec(ctx, "DELETE FROM measurements WHERE group_id = $1", id); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not delete measurement"}}}
		}
		return ExecResult{Data: map[string]interface{}{
			"deleteMeasurement": measurementToMap(deleted),
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
		"temperature":      stringValue(s.Temperature),
		"quantity":         quantityValue(s.Quantity),
		"quantityUnit":     stringValue(s.QuantityUnit),
		"notes":            s.Notes,
		"createdAt":        s.CreatedAt,
	}
}

const feedingSessionColumns = `
	id::text, baby_id::text, feed_type,
	to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
	COALESCE(to_char(ended_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
	left_duration_sec, right_duration_sec, COALESCE(amount_ml, 0)::float8,
	COALESCE(milk_type, ''), COALESCE(food_name, ''), COALESCE(reaction, ''),
	temperature, quantity IS NOT NULL, COALESCE(quantity, 0)::float8, quantity_unit,
	notes,
	to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`

func scanFeedingSession(row pgx.Row) (FeedingSession, error) {
	var session FeedingSession
	var hasQuantity bool
	var quantity float64
	err := row.Scan(
		&session.ID, &session.BabyID, &session.FeedType, &session.StartedAt, &session.EndedAt,
		&session.LeftDurationSec, &session.RightDurationSec, &session.AmountML, &session.MilkType,
		&session.FoodName, &session.Reaction, &session.Temperature, &hasQuantity, &quantity,
		&session.QuantityUnit, &session.Notes, &session.CreatedAt,
	)
	if hasQuantity {
		session.Quantity = &quantity
	}
	return session, err
}

func loadFeedingSession(ctx context.Context, pool *pgxpool.Pool, id string) (FeedingSession, error) {
	return scanFeedingSession(pool.QueryRow(ctx, `SELECT `+feedingSessionColumns+` FROM feeding_sessions WHERE id = $1`, id))
}

func loadBaby(ctx context.Context, pool *pgxpool.Pool, id, userID string) (BabyProfile, error) {
	var baby BabyProfile
	err := pool.QueryRow(ctx, `SELECT id::text, name, to_char(dob, 'YYYY-MM-DD'), sex, photo_url,
		to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), user_id::text
		FROM babies WHERE id = $1 AND user_id = $2`, id, userID).Scan(
		&baby.ID, &baby.Name, &baby.DOB, &baby.Sex, &baby.PhotoURL, &baby.CreatedAt, &baby.UserID,
	)
	return baby, err
}

func loadUserByID(ctx context.Context, pool *pgxpool.Pool, id string) (storedUser, error) {
	var user storedUser
	err := pool.QueryRow(ctx, "SELECT email, password_hash, display_name FROM users WHERE id = $1", id).Scan(&user.Email, &user.PasswordHash, &user.DisplayName)
	return user, err
}

func loadUserByEmail(ctx context.Context, pool *pgxpool.Pool, email string) (string, storedUser, error) {
	var id string
	var user storedUser
	err := pool.QueryRow(ctx, "SELECT id::text, email, password_hash, display_name FROM users WHERE email = $1", email).Scan(&id, &user.Email, &user.PasswordHash, &user.DisplayName)
	return id, user, err
}

func authResult(operation, token, userID string, user storedUser) ExecResult {
	return ExecResult{Data: map[string]interface{}{operation: map[string]interface{}{
		"token": token,
		"user": map[string]interface{}{
			"id": userID, "email": user.Email, "displayName": user.DisplayName,
			"photoUrl": "", "createdAt": time.Now().UTC().Format(time.RFC3339),
		},
	}}}
}

func loadBabies(ctx context.Context, pool *pgxpool.Pool, userID string) ([]BabyProfile, error) {
	rows, err := pool.Query(ctx, `SELECT id::text, name, to_char(dob, 'YYYY-MM-DD'), sex, photo_url,
		to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), user_id::text
		FROM babies WHERE user_id = $1 ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	profiles := make([]BabyProfile, 0)
	for rows.Next() {
		var baby BabyProfile
		if err := rows.Scan(&baby.ID, &baby.Name, &baby.DOB, &baby.Sex, &baby.PhotoURL, &baby.CreatedAt, &baby.UserID); err != nil {
			return nil, err
		}
		profiles = append(profiles, baby)
	}
	return profiles, rows.Err()
}

const demoBabyID = "00000000-0000-0000-0000-000000000001"
const demoUserID = "00000000-0000-0000-0000-000000000000"

func seedDemoDataIfMissing(ctx context.Context, pool *pgxpool.Pool) error {
	var exists int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM babies WHERE id = $1", demoBabyID).Scan(&exists); err != nil {
		return err
	}
	if exists > 0 {
		return nil
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
		demoUserID, "demo@nalagrow.app", "demo", "Demo User"); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `INSERT INTO babies (id, user_id, name, dob, sex) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
		demoBabyID, demoUserID, "Lily", "2025-04-01", "female"); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `INSERT INTO feeding_sessions (id, baby_id, feed_type, started_at, ended_at, left_duration_sec, right_duration_sec, amount_ml, milk_type, notes) VALUES
		($1, $2, $3, $4, $5, $6, $7, $8, $9, $10),
		($11, $12, $13, $14, $15, $16, $17, $18, $19, $20) ON CONFLICT (id) DO NOTHING`,
		"00000000-0000-0000-0000-000000000010", demoBabyID, "bottle", "2026-08-04T07:30:00Z", "2026-08-04T07:45:00Z", 0, 0, 120, "breast_milk", "Demo bottle feed",
		"00000000-0000-0000-0000-000000000011", demoBabyID, "breast", "2026-08-04T11:15:00Z", "2026-08-04T11:35:00Z", 600, 540, 0, "", "Demo breast feed"); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `INSERT INTO sleep_sessions (id, baby_id, started_at, ended_at, location, notes) VALUES
		($1, $2, $3, $4, $5, $6),
		($7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING`,
		"00000000-0000-0000-0000-000000000020", demoBabyID, "2026-08-04T00:00:00Z", "2026-08-04T06:15:00Z", "crib", "Demo nap",
		"00000000-0000-0000-0000-000000000021", demoBabyID, "2026-08-04T09:15:00Z", "2026-08-04T10:30:00Z", "carrier", "Demo carrier sleep"); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `INSERT INTO measurements (id, group_id, baby_id, type, value, unit, date, notes, out_of_range) VALUES
		($1, $2, $3, $4, $5, $6, $7, $8, $9),
		($10, $11, $12, $13, $14, $15, $16, $17, $18),
		($19, $20, $21, $22, $23, $24, $25, $26, $27) ON CONFLICT (id) DO NOTHING`,
		"00000000-0000-0000-0000-000000000030", "00000000-0000-0000-0000-000000000030", demoBabyID, "weight", 3.4, "metric", "2025-04-01", "Birth measurements.", false,
		"00000000-0000-0000-0000-000000000031", "00000000-0000-0000-0000-000000000031", demoBabyID, "weight", 5.1, "metric", "2025-06-01", "Steady growth.", false,
		"00000000-0000-0000-0000-000000000032", "00000000-0000-0000-0000-000000000032", demoBabyID, "weight", 6.4, "metric", "2025-07-30", "Four-month checkup.", false); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `INSERT INTO milestones (id, baby_id, title, description, category, achieved_at, note, is_custom) VALUES
		($1, $2, $3, $4, $5, $6, $7, $8),
		($9, $10, $11, $12, $13, $14, $15, $16) ON CONFLICT (id) DO NOTHING`,
		"00000000-0000-0000-0000-000000000040", demoBabyID, "First smile", "A bright morning smile.", "social", "2025-06-15T00:00:00Z", "A bright morning smile.", false,
		"00000000-0000-0000-0000-000000000041", demoBabyID, "Rolls over from tummy to back", "Rolled over during tummy time.", "physical", "2025-07-10T00:00:00Z", "Rolled over during tummy time.", false); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func loadDemoBaby(ctx context.Context, pool *pgxpool.Pool) (BabyProfile, error) {
	var baby BabyProfile
	err := pool.QueryRow(ctx, `SELECT id::text, name, to_char(dob, 'YYYY-MM-DD'), sex, photo_url,
		to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), user_id::text
		FROM babies WHERE id = $1`, demoBabyID).Scan(
		&baby.ID, &baby.Name, &baby.DOB, &baby.Sex, &baby.PhotoURL, &baby.CreatedAt, &baby.UserID,
	)
	return baby, err
}

func loadDemoFeedingSessions(ctx context.Context, pool *pgxpool.Pool) ([]FeedingSession, error) {
	rows, err := pool.Query(ctx, `SELECT `+feedingSessionColumns+` FROM feeding_sessions WHERE baby_id = $1 ORDER BY started_at DESC, created_at DESC`, demoBabyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var sessions []FeedingSession
	for rows.Next() {
		session, err := scanFeedingSession(rows)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}
	return sessions, rows.Err()
}

func loadDemoSleepSessions(ctx context.Context, pool *pgxpool.Pool) ([]SleepSession, error) {
	rows, err := pool.Query(ctx, `SELECT s.id::text, s.baby_id::text,
		to_char(s.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		COALESCE(to_char(s.ended_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
		s.location, s.notes,
		to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM sleep_sessions s
		WHERE s.baby_id = $1
		ORDER BY s.started_at DESC, s.created_at DESC`, demoBabyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	sessions := make([]SleepSession, 0)
	for rows.Next() {
		var session SleepSession
		if err := rows.Scan(&session.ID, &session.BabyID, &session.StartedAt, &session.EndedAt, &session.Location, &session.Notes, &session.CreatedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}
	return sessions, rows.Err()
}

func loadDemoMeasurements(ctx context.Context, pool *pgxpool.Pool) ([]Measurement, error) {
	rows, err := pool.Query(ctx, `SELECT m.group_id::text, m.baby_id::text, m.type, m.value::float8,
		to_char(m.date, 'YYYY-MM-DD'),
		to_char(m.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM measurements m
		WHERE m.baby_id = $1
		ORDER BY m.date DESC, m.created_at DESC`, demoBabyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byGroup := make(map[string]*Measurement)
	order := make([]string, 0)
	for rows.Next() {
		var groupID string
		var baby string
		var measurementType string
		var value float64
		var date, createdAt string
		if err := rows.Scan(&groupID, &baby, &measurementType, &value, &date, &createdAt); err != nil {
			return nil, err
		}
		record := byGroup[groupID]
		if record == nil {
			record = &Measurement{ID: groupID, BabyID: baby, Date: date, CreatedAt: createdAt}
			byGroup[groupID] = record
			order = append(order, groupID)
		}
		switch measurementType {
		case "weight":
			record.Weight = value
		case "height":
			record.Height = value
		case "head_circumference":
			record.HeadCircumference = value
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	records := make([]Measurement, 0, len(order))
	for _, id := range order {
		records = append(records, *byGroup[id])
	}
	return records, nil
}

func loadDemoMilestones(ctx context.Context, pool *pgxpool.Pool) ([]Milestone, error) {
	rows, err := pool.Query(ctx, "SELECT "+milestoneColumns+" FROM milestones WHERE baby_id = $1 ORDER BY achieved_at DESC NULLS LAST, created_at DESC", demoBabyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]Milestone, 0)
	for rows.Next() {
		milestone, err := scanMilestone(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, milestone)
	}
	return result, rows.Err()
}

func loadDemoData(ctx context.Context, pool *pgxpool.Pool) (map[string]interface{}, error) {
	if err := seedDemoDataIfMissing(ctx, pool); err != nil {
		return nil, err
	}

	baby, err := loadDemoBaby(ctx, pool)
	if err != nil {
		return nil, err
	}

	feeds, err := loadDemoFeedingSessions(ctx, pool)
	if err != nil {
		return nil, err
	}

	sleeps, err := loadDemoSleepSessions(ctx, pool)
	if err != nil {
		return nil, err
	}

	measurements, err := loadDemoMeasurements(ctx, pool)
	if err != nil {
		return nil, err
	}

	milestones, err := loadDemoMilestones(ctx, pool)
	if err != nil {
		return nil, err
	}

	feedingMaps := make([]map[string]interface{}, 0, len(feeds))
	for _, f := range feeds {
		feedingMaps = append(feedingMaps, feedingSessionToMap(f))
	}

	sleepMaps := make([]map[string]interface{}, 0, len(sleeps))
	for _, s := range sleeps {
		sleepMaps = append(sleepMaps, map[string]interface{}{
			"id":        s.ID,
			"babyId":    s.BabyID,
			"startedAt": s.StartedAt,
			"endedAt":   s.EndedAt,
			"location":  s.Location,
			"notes":     s.Notes,
			"createdAt": s.CreatedAt,
		})
	}

	measurementMaps := make([]map[string]interface{}, 0, len(measurements))
	for _, m := range measurements {
		measurementMaps = append(measurementMaps, map[string]interface{}{
			"id":                m.ID,
			"babyId":            m.BabyID,
			"date":              m.Date,
			"weight":            m.Weight,
			"height":            m.Height,
			"headCircumference": m.HeadCircumference,
			"createdAt":         m.CreatedAt,
		})
	}

	milestoneMaps := make([]map[string]interface{}, 0, len(milestones))
	for _, m := range milestones {
		milestoneMaps = append(milestoneMaps, map[string]interface{}{
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
		})
	}

	return map[string]interface{}{
		"baby":            babyToMap(baby),
		"feedingSessions": feedingMaps,
		"sleepSessions":   sleepMaps,
		"measurements":    measurementMaps,
		"milestones":      milestoneMaps,
	}, nil
}

func loadFeedingSessions(ctx context.Context, pool *pgxpool.Pool, babyID string) ([]FeedingSession, error) {
	rows, err := pool.Query(ctx, `SELECT `+feedingSessionColumns+` FROM feeding_sessions WHERE baby_id = $1 ORDER BY started_at DESC, created_at DESC`, babyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []FeedingSession
	for rows.Next() {
		session, err := scanFeedingSession(rows)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}
	return sessions, rows.Err()
}

// loadSleepSessions reads care records through PostgreSQL and verifies the
// requesting user owns the requested baby in the same query.
func loadSleepSessions(ctx context.Context, pool *pgxpool.Pool, babyID, userID string) ([]SleepSession, error) {
	rows, err := pool.Query(ctx, `SELECT s.id::text, s.baby_id::text,
		to_char(s.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		COALESCE(to_char(s.ended_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
		s.location, s.notes,
		to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM sleep_sessions s
		JOIN babies b ON b.id = s.baby_id
		WHERE s.baby_id = $1 AND b.user_id = $2
		ORDER BY s.started_at DESC, s.created_at DESC`, babyID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sessions := make([]SleepSession, 0)
	for rows.Next() {
		var session SleepSession
		if err := rows.Scan(&session.ID, &session.BabyID, &session.StartedAt, &session.EndedAt, &session.Location, &session.Notes, &session.CreatedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}
	return sessions, rows.Err()
}

func loadSleepSession(ctx context.Context, pool *pgxpool.Pool, id string) (SleepSession, error) {
	var session SleepSession
	err := pool.QueryRow(ctx, `SELECT id::text, baby_id::text,
		to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		COALESCE(to_char(ended_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
		location, notes, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM sleep_sessions WHERE id = $1`, id).Scan(&session.ID, &session.BabyID, &session.StartedAt, &session.EndedAt, &session.Location, &session.Notes, &session.CreatedAt)
	return session, err
}

func scanMilestone(row pgx.Row) (Milestone, error) {
	var milestone Milestone
	err := row.Scan(&milestone.ID, &milestone.BabyID, &milestone.Title, &milestone.Description, &milestone.Category,
		&milestone.AchievedAt, &milestone.Note, &milestone.PhotoURL, &milestone.IsCustom, &milestone.CreatedAt)
	return milestone, err
}

const milestoneColumns = `id::text, baby_id::text, title, description, category,
	COALESCE(to_char(achieved_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''), note, photo_url, is_custom,
	to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`

func loadMilestones(ctx context.Context, pool *pgxpool.Pool, babyID string) ([]Milestone, error) {
	rows, err := pool.Query(ctx, "SELECT "+milestoneColumns+" FROM milestones WHERE baby_id = $1 ORDER BY achieved_at DESC NULLS LAST, created_at DESC", babyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]Milestone, 0)
	for rows.Next() {
		milestone, err := scanMilestone(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, milestone)
	}
	return result, rows.Err()
}

func loadMilestone(ctx context.Context, pool *pgxpool.Pool, id, userID string) (Milestone, error) {
	milestone, err := scanMilestone(pool.QueryRow(ctx, "SELECT "+milestoneColumns+" FROM milestones WHERE id = $1", id))
	if err != nil {
		return Milestone{}, err
	}
	if _, err := loadBaby(ctx, pool, milestone.BabyID, userID); err != nil {
		return Milestone{}, err
	}
	return milestone, nil
}

// loadMeasurements maps the normalized measurement row to the API's
// combined measurement shape while maintaining PostgreSQL ownership isolation.
func loadMeasurements(ctx context.Context, pool *pgxpool.Pool, babyID, userID string) ([]Measurement, error) {
	rows, err := pool.Query(ctx, `SELECT m.group_id::text, m.baby_id::text, m.type, m.value::float8,
		to_char(m.date, 'YYYY-MM-DD'),
		to_char(m.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM measurements m
		JOIN babies b ON b.id = m.baby_id
		WHERE m.baby_id = $1 AND b.user_id = $2
		ORDER BY m.date DESC, m.created_at DESC`, babyID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byGroup := make(map[string]*Measurement)
	order := make([]string, 0)
	for rows.Next() {
		var groupID string
		var baby string
		var measurementType string
		var value float64
		var date, createdAt string
		if err := rows.Scan(&groupID, &baby, &measurementType, &value, &date, &createdAt); err != nil {
			return nil, err
		}
		record := byGroup[groupID]
		if record == nil {
			record = &Measurement{ID: groupID, BabyID: baby, Date: date, CreatedAt: createdAt}
			byGroup[groupID] = record
			order = append(order, groupID)
		}
		switch measurementType {
		case "weight":
			record.Weight = value
		case "height":
			record.Height = value
		case "head_circumference":
			record.HeadCircumference = value
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	records := make([]Measurement, 0, len(order))
	for _, id := range order {
		records = append(records, *byGroup[id])
	}
	return records, nil
}

func loadMeasurement(ctx context.Context, pool *pgxpool.Pool, id, userID string) (Measurement, error) {
	rows, err := pool.Query(ctx, `SELECT DISTINCT baby_id::text FROM measurements WHERE group_id = $1`, id)
	if err != nil {
		return Measurement{}, err
	}
	defer rows.Close()
	if !rows.Next() {
		return Measurement{}, pgx.ErrNoRows
	}
	var babyID string
	if err := rows.Scan(&babyID); err != nil {
		return Measurement{}, err
	}
	if _, err := loadBaby(ctx, pool, babyID, userID); err != nil {
		return Measurement{}, err
	}
	records, err := loadMeasurements(ctx, pool, babyID, userID)
	if err != nil {
		return Measurement{}, err
	}
	for _, record := range records {
		if record.ID == id {
			return record, nil
		}
	}
	return Measurement{}, pgx.ErrNoRows
}

func saveMeasurement(ctx context.Context, pool *pgxpool.Pool, record Measurement) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, "DELETE FROM measurements WHERE group_id = $1", record.ID); err != nil {
		return err
	}
	metrics := []struct {
		kind  string
		value float64
	}{{"weight", record.Weight}, {"height", record.Height}, {"head_circumference", record.HeadCircumference}}
	for _, metric := range metrics {
		if metric.value == 0 {
			continue
		}
		if _, err := tx.Exec(ctx, `INSERT INTO measurements (id, group_id, baby_id, type, value, date, created_at)
			VALUES ($1, $2, $3, $4, $5, $6::date, $7::timestamptz)`, uuid(), record.ID, record.BabyID, metric.kind, metric.value, record.Date, record.CreatedAt); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func insertFeedingSession(ctx context.Context, pool *pgxpool.Pool, session FeedingSession) error {
	_, err := pool.Exec(ctx, `
		INSERT INTO feeding_sessions (
			id, baby_id, feed_type, started_at, ended_at, left_duration_sec, right_duration_sec,
			amount_ml, milk_type, food_name, reaction, temperature, quantity, quantity_unit, notes, created_at
		) VALUES (
			$1, $2, $3, $4::timestamptz, NULLIF($5, '')::timestamptz, $6, $7,
			$8, $9, $10, $11, NULLIF($12, ''), $13, NULLIF($14, ''), $15, $16::timestamptz
		)`,
		session.ID, session.BabyID, session.FeedType, session.StartedAt, session.EndedAt,
		session.LeftDurationSec, session.RightDurationSec, session.AmountML, session.MilkType,
		session.FoodName, session.Reaction, session.Temperature, quantityValue(session.Quantity), session.QuantityUnit,
		session.Notes, session.CreatedAt,
	)
	return err
}

func updateFeedingSession(ctx context.Context, pool *pgxpool.Pool, session FeedingSession) error {
	_, err := pool.Exec(ctx, `
		UPDATE feeding_sessions SET
			feed_type = $2, started_at = $3::timestamptz, ended_at = NULLIF($4, '')::timestamptz,
			left_duration_sec = $5, right_duration_sec = $6, amount_ml = $7, milk_type = $8,
			food_name = $9, reaction = $10, temperature = NULLIF($11, ''), quantity = $12,
			quantity_unit = NULLIF($13, ''), notes = $14
		WHERE id = $1`,
		session.ID, session.FeedType, session.StartedAt, session.EndedAt, session.LeftDurationSec,
		session.RightDurationSec, session.AmountML, session.MilkType, session.FoodName, session.Reaction,
		session.Temperature, quantityValue(session.Quantity), session.QuantityUnit, session.Notes,
	)
	return err
}

func applyFeedingSessionUpdates(session *FeedingSession, variables map[string]interface{}) {
	if feedType := getVar(variables, "feedType"); feedType != "" {
		session.FeedType = feedType
	}
	if startedAt := getVar(variables, "startedAt"); startedAt != "" {
		session.StartedAt = startedAt
	}
	if endedAt := getVar(variables, "endedAt"); endedAt != "" {
		session.EndedAt = endedAt
	}
	if leftDur := getVarInt(variables, "leftDurationSec"); leftDur != 0 {
		session.LeftDurationSec = leftDur
	}
	if rightDur := getVarInt(variables, "rightDurationSec"); rightDur != 0 {
		session.RightDurationSec = rightDur
	}
	if amountML := getVarFloat(variables, "amountMl"); amountML != 0 {
		session.AmountML = amountML
	}
	if milkType := getVar(variables, "milkType"); milkType != "" {
		session.MilkType = milkType
	}
	if foodName := getVar(variables, "foodName"); foodName != "" {
		session.FoodName = foodName
	}
	if reaction := getVar(variables, "reaction"); reaction != "" {
		session.Reaction = reaction
	}
	if temperature := feedingString(variables, "temperature"); temperature != nil {
		session.Temperature = temperature
	}
	if quantity, ok := optionalFloatVar(variables, "quantity"); ok {
		session.Quantity = &quantity
	}
	if quantityUnit := feedingString(variables, "quantityUnit"); quantityUnit != nil {
		session.QuantityUnit = quantityUnit
	}
	if notes := getVar(variables, "notes"); notes != "" {
		session.Notes = notes
	}
}

func feedingQuantity(variables map[string]interface{}) *float64 {
	if quantity, ok := optionalFloatVar(variables, "quantity"); ok {
		return &quantity
	}
	return nil
}

func feedingString(variables map[string]interface{}, key string) *string {
	value := getVar(variables, key)
	if value == "" {
		return nil
	}
	return &value
}

func stringValue(value *string) interface{} {
	if value == nil {
		return nil
	}
	return *value
}

func feedingStartedAt(variables map[string]interface{}) string {
	if startedAt := getVar(variables, "startedAt"); startedAt != "" {
		return startedAt
	}
	return time.Now().UTC().Format(time.RFC3339)
}

func optionalFloatVar(vars map[string]interface{}, key string) (float64, bool) {
	if vars == nil {
		return 0, false
	}
	input, _ := vars["input"].(map[string]interface{})
	if input != nil {
		if value, exists := input[key]; exists {
			return floatFromValue(value)
		}
	}
	if value, exists := vars[key]; exists {
		return floatFromValue(value)
	}
	return 0, false
}

func floatFromValue(value interface{}) (float64, bool) {
	switch value := value.(type) {
	case float64:
		return value, true
	case int:
		return float64(value), true
	default:
		return 0, false
	}
}

func quantityValue(quantity *float64) interface{} {
	if quantity == nil {
		return nil
	}
	return *quantity
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

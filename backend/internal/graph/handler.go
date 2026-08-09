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
			return legacyValidationResult(operation, field, variables)
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

package graph

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

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

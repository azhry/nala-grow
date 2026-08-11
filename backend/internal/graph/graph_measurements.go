package graph

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

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

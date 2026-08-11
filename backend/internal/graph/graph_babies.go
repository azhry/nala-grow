package graph

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

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

func loadBaby(ctx context.Context, pool *pgxpool.Pool, id, userID string) (BabyProfile, error) {
	var baby BabyProfile
	err := pool.QueryRow(ctx, `SELECT id::text, name, to_char(dob, 'YYYY-MM-DD'), sex, photo_url,
		to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), user_id::text
		FROM babies WHERE id = $1 AND user_id = $2`, id, userID).Scan(
		&baby.ID, &baby.Name, &baby.DOB, &baby.Sex, &baby.PhotoURL, &baby.CreatedAt, &baby.UserID,
	)
	return baby, err
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

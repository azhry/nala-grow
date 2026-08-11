package graph

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

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

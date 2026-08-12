package graph

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

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

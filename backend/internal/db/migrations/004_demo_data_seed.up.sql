-- +goose Up
INSERT INTO users (id, email, password_hash, display_name)
VALUES ('00000000-0000-0000-0000-000000000000', 'demo@nalagrow.app', 'demo', 'Demo User')
ON CONFLICT (id) DO NOTHING;

INSERT INTO babies (id, user_id, name, dob, sex)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Lily', '2025-04-01', 'female')
ON CONFLICT (id) DO NOTHING;

INSERT INTO feeding_sessions (id, baby_id, feed_type, started_at, ended_at, left_duration_sec, right_duration_sec, amount_ml, milk_type, notes)
VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'bottle', '2026-08-04T07:30:00Z', '2026-08-04T07:45:00Z', 0, 0, 120, 'breast_milk', 'Demo bottle feed'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'breast', '2026-08-04T11:15:00Z', '2026-08-04T11:35:00Z', 600, 540, NULL, '', 'Demo breast feed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sleep_sessions (id, baby_id, started_at, ended_at, location, notes)
VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', '2026-08-04T00:00:00Z', '2026-08-04T06:15:00Z', 'crib', 'Demo nap'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', '2026-08-04T09:15:00Z', '2026-08-04T10:30:00Z', 'carrier', 'Demo carrier sleep')
ON CONFLICT (id) DO NOTHING;

INSERT INTO measurements (id, group_id, baby_id, type, value, unit, date, notes, out_of_range)
VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'weight', 3.4, 'metric', '2025-04-01', 'Birth measurements.', false),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'weight', 5.1, 'metric', '2025-06-01', 'Steady growth.', false),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', 'weight', 6.4, 'metric', '2025-07-30', 'Four-month checkup.', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO milestones (id, baby_id, title, description, category, achieved_at, note, is_custom)
VALUES
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', 'First smile', 'A bright morning smile.', 'social', '2025-06-15T00:00:00Z', 'A bright morning smile.', false),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001', 'Rolls over from tummy to back', 'Rolled over during tummy time.', 'physical', '2025-07-10T00:00:00Z', 'Rolled over during tummy time.', false)
ON CONFLICT (id) DO NOTHING;

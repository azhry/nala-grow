-- +goose Down
DROP INDEX IF EXISTS idx_measurements_group_id;
ALTER TABLE measurements DROP COLUMN IF EXISTS group_id;

-- +goose Up
ALTER TABLE measurements ADD COLUMN group_id UUID;
UPDATE measurements SET group_id = id WHERE group_id IS NULL;
ALTER TABLE measurements ALTER COLUMN group_id SET NOT NULL;
CREATE INDEX idx_measurements_group_id ON measurements(group_id);

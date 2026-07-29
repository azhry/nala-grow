-- +goose Down
ALTER TABLE feeding_sessions
    DROP COLUMN IF EXISTS quantity_unit,
    DROP COLUMN IF EXISTS quantity,
    DROP COLUMN IF EXISTS temperature;

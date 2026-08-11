-- +goose Up
ALTER TABLE feeding_sessions
    DROP CONSTRAINT IF EXISTS feeding_sessions_milk_type_check;

ALTER TABLE feeding_sessions
    ADD CONSTRAINT feeding_sessions_milk_type_check
    CHECK (milk_type IN ('breast_milk', 'formula', 'water', 'combination', ''));

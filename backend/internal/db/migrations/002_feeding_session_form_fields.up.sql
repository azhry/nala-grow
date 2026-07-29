-- +goose Up
ALTER TABLE feeding_sessions
    ADD COLUMN temperature VARCHAR(20),
    ADD COLUMN quantity DECIMAL(8,2),
    ADD COLUMN quantity_unit VARCHAR(20);

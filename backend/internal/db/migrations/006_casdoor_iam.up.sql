ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
    ADD COLUMN casdoor_subject TEXT,
    ADD COLUMN casdoor_owner TEXT NOT NULL DEFAULT '',
    ADD COLUMN roles TEXT[] NOT NULL DEFAULT ARRAY['Parent']::TEXT[],
    ADD COLUMN permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN auth_provider VARCHAR(32) NOT NULL DEFAULT 'local';

CREATE UNIQUE INDEX idx_users_casdoor_subject
    ON users(casdoor_subject)
    WHERE casdoor_subject IS NOT NULL AND casdoor_subject <> '';

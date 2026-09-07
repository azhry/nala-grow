ALTER TABLE users
    ADD COLUMN casdoor_subject TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX idx_users_casdoor_subject
    ON users(casdoor_subject)
    WHERE casdoor_subject <> '';

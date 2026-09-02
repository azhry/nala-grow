DROP INDEX IF EXISTS idx_users_casdoor_subject;

ALTER TABLE users
    DROP COLUMN IF EXISTS casdoor_subject;

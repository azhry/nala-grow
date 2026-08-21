DROP INDEX IF EXISTS idx_users_casdoor_subject;

UPDATE users SET password_hash = '' WHERE password_hash IS NULL;

ALTER TABLE users
    ALTER COLUMN password_hash SET NOT NULL,
    DROP COLUMN IF EXISTS auth_provider,
    DROP COLUMN IF EXISTS permissions,
    DROP COLUMN IF EXISTS roles,
    DROP COLUMN IF EXISTS casdoor_owner,
    DROP COLUMN IF EXISTS casdoor_subject;

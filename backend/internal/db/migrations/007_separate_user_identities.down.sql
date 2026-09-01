ALTER TABLE users
    ADD COLUMN casdoor_subject TEXT,
    ADD COLUMN casdoor_owner TEXT NOT NULL DEFAULT '',
    ADD COLUMN roles TEXT[] NOT NULL DEFAULT ARRAY['Parent']::TEXT[],
    ADD COLUMN permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN auth_provider VARCHAR(32) NOT NULL DEFAULT 'local';

UPDATE users AS u
SET casdoor_subject = identity.subject,
    casdoor_owner = identity.owner,
    roles = identity.roles,
    permissions = identity.permissions,
    auth_provider = identity.provider
FROM user_identities AS identity
WHERE identity.user_id = u.id
  AND identity.provider = 'casdoor';

CREATE UNIQUE INDEX idx_users_casdoor_subject
    ON users(casdoor_subject)
    WHERE casdoor_subject IS NOT NULL AND casdoor_subject <> '';

DROP INDEX IF EXISTS idx_user_identities_email;
DROP INDEX IF EXISTS idx_user_identities_user_id;
DROP TABLE IF EXISTS user_identities;

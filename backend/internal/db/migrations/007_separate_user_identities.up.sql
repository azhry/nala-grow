CREATE TABLE user_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    issuer TEXT NOT NULL,
    subject TEXT NOT NULL,
    owner TEXT NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_identities_provider_issuer_subject_key
        UNIQUE (provider, issuer, subject),
    CONSTRAINT user_identities_user_provider_issuer_key
        UNIQUE (user_id, provider, issuer)
);

INSERT INTO user_identities (
    user_id, provider, issuer, subject, owner, email, roles, permissions
)
SELECT id, 'casdoor', 'legacy', casdoor_subject, casdoor_owner, email, roles, permissions
FROM users
WHERE NULLIF(casdoor_subject, '') IS NOT NULL;

CREATE INDEX idx_user_identities_user_id ON user_identities(user_id);
CREATE INDEX idx_user_identities_email ON user_identities(provider, issuer, email);

ALTER TABLE users
    DROP COLUMN casdoor_subject,
    DROP COLUMN casdoor_owner,
    DROP COLUMN roles,
    DROP COLUMN permissions,
    DROP COLUMN auth_provider;

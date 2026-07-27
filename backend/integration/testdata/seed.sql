INSERT INTO users (id, email, password_hash, display_name)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'integration@example.com',
    'integration-test-hash',
    'Integration Parent'
);

INSERT INTO babies (id, user_id, name, dob, sex)
VALUES (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    'Integration Baby',
    '2025-01-15',
    'other'
);

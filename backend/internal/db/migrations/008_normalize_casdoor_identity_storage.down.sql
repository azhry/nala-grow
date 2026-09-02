DO $$
BEGIN
    RAISE EXCEPTION '008_normalize_casdoor_identity_storage is irreversible after user_identities removal';
END $$;

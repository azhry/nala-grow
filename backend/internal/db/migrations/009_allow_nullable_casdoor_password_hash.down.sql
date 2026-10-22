DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.users
        WHERE password_hash IS NULL
    ) THEN
        RAISE EXCEPTION 'cannot restore users.password_hash NOT NULL while NULL values remain';
    END IF;
END $$;

ALTER TABLE public.users
    ALTER COLUMN password_hash SET NOT NULL;

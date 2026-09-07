ALTER TABLE users
    ADD COLUMN IF NOT EXISTS casdoor_subject TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
    IF to_regclass('public.user_identities') IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.user_identities
        WHERE provider <> 'casdoor'
           OR NULLIF(subject, '') IS NULL
    ) THEN
        RAISE EXCEPTION 'user_identities contains unsupported Casdoor migration rows';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.user_identities identity
        LEFT JOIN public.users user_row ON user_row.id = identity.user_id
        WHERE user_row.id IS NULL
    ) THEN
        RAISE EXCEPTION 'user_identities contains orphaned user references';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.user_identities
        GROUP BY user_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'user_identities contains multiple rows for one user';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.user_identities
        GROUP BY subject
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'user_identities contains duplicate subjects';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.user_identities identity
        JOIN public.users user_row ON user_row.id = identity.user_id
        WHERE NULLIF(user_row.casdoor_subject, '') IS NOT NULL
          AND user_row.casdoor_subject <> identity.subject
    ) THEN
        RAISE EXCEPTION 'users.casdoor_subject conflicts with user_identities';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.user_identities') IS NOT NULL THEN
        EXECUTE $migration$
            UPDATE public.users AS user_row
            SET casdoor_subject = identity.subject
            FROM public.user_identities AS identity
            WHERE identity.provider = 'casdoor'
              AND identity.user_id = user_row.id
              AND NULLIF(user_row.casdoor_subject, '') IS NULL
        $migration$;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.users
        WHERE NULLIF(casdoor_subject, '') IS NOT NULL
        GROUP BY casdoor_subject
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'users.casdoor_subject contains duplicate subjects';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_casdoor_subject
    ON public.users(casdoor_subject)
    WHERE casdoor_subject <> '';

DROP TABLE IF EXISTS public.user_identities;

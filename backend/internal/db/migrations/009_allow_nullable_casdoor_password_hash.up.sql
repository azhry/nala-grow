-- Casdoor owns credentials for mapped profiles. Keep the legacy column only
-- for explicitly configured local-mode users.
ALTER TABLE public.users
    ALTER COLUMN password_hash DROP NOT NULL;

UPDATE public.users
SET password_hash = NULL
WHERE NULLIF(BTRIM(casdoor_subject), '') IS NOT NULL
  AND password_hash IS NOT NULL;

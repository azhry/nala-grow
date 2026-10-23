-- Version 7 was deployed with a temporary user_identities table. Keep this
-- migration version available so golang-migrate can advance those databases
-- to migration 008. New databases keep Casdoor subjects directly on users.
SELECT 1;

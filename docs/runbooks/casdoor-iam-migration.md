# Casdoor IAM migration runbook

This runbook moves NalaGrow authentication to the Casdoor deployment without
changing the existing NalaGrow UI or deleting local user data.

## Prerequisites

- Casdoor is reachable at the configured issuer and uses the existing
  PostgreSQL service.
- The NalaGrow organization and web application exist in Casdoor.
- The Google provider is enabled for that application.
- The application callback is configured to the exact value of
  `CASDOOR_REDIRECT_URI` and the matching `NEXT_PUBLIC_CASDOOR_REDIRECT_URI`.
- Vault contains the application configuration keys listed in
  `backend/cmd/server/vault.go`. Keep client secrets, admin tokens, and test
  passwords in Vault or the approved secret store; never put them in this
  repository.

## Ordered migration

1. Apply the backend migrations. Startup runs the migrations automatically;
   for a controlled rollout, run the same migration command against the target
   database before deploying the new backend.
2. Verify migration `006_casdoor_iam` added the nullable password hash,
   Casdoor subject/owner, role, permission, and provider fields plus the
   unique subject index.
3. Configure `CASDOOR_ENABLED=true`, issuer, client identifiers, audience,
   organization, application, callback, and the approved user-management
   token in Vault. Restart one backend replica and verify its health endpoint.
4. Provision the test identities from
   `.agents/knowledge/defaults.md` (or the corresponding approved defaults
   file in the Nala platform repositories) in Casdoor. Do not copy their
   passwords into source, issue comments, logs, or this runbook.
5. Sign in through the existing NalaGrow email/password form. The backend
   uses Casdoor's password grant, then creates or links the local row by
   Casdoor subject and email. Verify `me` returns the linked user and expected
   roles/permissions.
6. Exercise Google sign-in through the existing Google button. The frontend
   starts Casdoor's authorization-code flow with `provider_hint=google`; the
   callback exchanges the code through `loginWithCasdoor` and links the same
   local identity.
7. Verify a protected baby read/write operation with the Casdoor bearer token
   and confirm the refresh-token path renews the session. Keep the local JWT
   mode available for tests and explicitly disabled in production once the
   cutover is accepted.

## Rollback

1. Set `CASDOOR_ENABLED=false` and redeploy the backend/frontend configuration.
2. Confirm local/test-mode authentication is restored before changing schema.
3. Only roll back migration `006_casdoor_iam` after confirming no Casdoor-only
   identities need to be retained. The down migration restores non-null local
   password hashes and removes the external identity columns/index; it is not
   a data-export mechanism.

## Verification commands

- Backend focused tests: `go test ./internal/auth ./cmd/server`.
- Full backend tests require the repository's PostgreSQL testcontainer runtime:
  `go test ./...`.
- Frontend focused auth tests and the production build must both pass before
  opening the migration PR.

---
name: nala-grow-casdoor-playwright-e2e
description: Use when verifying NalaGrow authentication, session, Google OAuth, or password recovery flows with Playwright against the real configured services.
---

# NalaGrow Casdoor Playwright E2E

Use [REFERENCE.md](REFERENCE.md) for the single Mermaid flow and headed commands.

## Before running

1. Read repository instructions and relevant files under `.agents/knowledge/`.
2. Confirm the real frontend URL and service state from Nala Ctrl or project knowledge. Do not bypass Vault or Casdoor configuration failures.
3. Load only the selected account keys from `.agents/.env` with the non-printing loader in [REFERENCE.md](REFERENCE.md).
4. Use `E2E_SERVICES_EXTERNAL=1` and the confirmed `BASE_URL` so Playwright uses the real running services.

## Follow the flow

- Run the primary spec without `--grep`; it contains one diagram-driven test. Callback and recovery route checks are separate regression evidence.
- Local runs are headed by default. Password login, signup, Terms acceptance, required test-profile setup, and dashboard verification run automatically. The browser is visible while the test runs.
- If password login shows a rejection, automatically try signup with the configured test account. If that account already exists, retry password login. If there is no complete account pair, create a unique disposable `example.test` account.
- If signup creates a user without a baby profile, create a synthetic E2E profile so the flow can reach `/dashboard`. Never use real child data.
- The signup form requires accepting NalaGrow's Terms and Privacy Policy. Set `NALA_GROW_E2E_ACCEPT_TERMS=1` only for a run where the user has explicitly authorized that acceptance; do not save this flag in `.agents/.env`.
- Google is the only branch that may pause. Automatically select the first visible account chooser row. If Google presents a sign-in screen instead, pause there for the user to complete provider authentication.
- Do not pause at signup, login, errors, or the dashboard. Assert `/dashboard` and its visible greeting after login and reload.
- Keep tracing, screenshots, and video disabled. Never log provider URLs, query values, credentials, tokens, or request bodies.

See [REFERENCE.md](REFERENCE.md) for the flow, account loader, and run commands.

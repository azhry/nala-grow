---
name: nala-grow-casdoor-playwright-e2e
description: Use when verifying NalaGrow authentication, session, Google OAuth, or password recovery flows with Playwright against the real configured services.
---

# NalaGrow Casdoor Playwright E2E

Use the browser flow in [REFERENCE.md](REFERENCE.md) for NalaGrow authentication checks. Its first step is checking `.agents/.env`; when a test account is configured, sign in with it. When no account is configured, complete signup and sign-in in the visible browser.

## Before running

1. Read the repository instructions and relevant files under `.agents/knowledge/`.
2. Confirm the actual frontend URL and service state from Nala Ctrl or project knowledge. If Nala Ctrl is unavailable and this check is required, follow its local-run fallback. Do not bypass a Vault or Casdoor configuration failure.
3. Load only the selected account email and password keys from `.agents/.env` with the non-printing Bash loader in [REFERENCE.md](REFERENCE.md). Never print those values or read the file directly.
4. Use `E2E_SERVICES_EXTERNAL=1` and the confirmed `BASE_URL` so Playwright does not reclaim ports or start disposable services.

## Follow the diagram

- Run `frontend/e2e/casdoor-session.spec.ts` as the primary flow. It starts at `/login` when a complete test account pair is loaded and `/signup` when no pair is available. It does not begin at the public landing route.
- The default sign-in method is password. Set `NALA_GROW_E2E_SIGN_IN_METHOD=google` to take the Google branch.
- When Google's chooser displays account rows, the test selects the first visible account. If Google requires a manual sign-in screen, the headed browser pauses there for the user to continue.
- The success state is the authenticated `/dashboard` page with its visible greeting, retained after reload. An onboarding route or a visible error is not reported as the home screen.
- Local runs use `--headed` and `NALA_GROW_E2E_INTERACTIVE=1`. Playwright pauses on the actual result page, leaving the browser open for inspection. Failures also pause on the real error state. Resume the test in Playwright Inspector when finished reviewing.
- Signup requires the user to complete the form and accept any required terms. The test does not accept terms or create profile, feeding, or other application data on the user's behalf.
- Keep tracing, screenshots, and video off when credentials are present. Never log provider URLs, query values, tokens, credentials, or request bodies.

Callback rendering and recovery handoff checks are separate regression evidence in `frontend/e2e/casdoor-session-regressions.spec.ts`; they do not replace the diagram-driven sign-in flow or prove a successful provider login.

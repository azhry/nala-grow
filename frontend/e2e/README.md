# Real frontend/backend integration flow

This runbook documents the reusable, real-browser integration check for changes
that cross the frontend/API boundary. It lives beside the Playwright specs so
agents and developers can run the same lifecycle locally and reproduce its
evidence without relying on a particular pull request description.

## Prerequisites

- Docker is running and can start a `postgres:16-alpine` container.
- Go, Node.js dependencies, and Playwright's desktop Chrome are installed.
- Ports 3000 and 8080 may be reclaimed by this command; port 55410 must be
  available for the dedicated PostgreSQL container.

Run the integration from `frontend/`:

```powershell
npm run test:e2e:integration
```

The command reclaims exact listeners on `127.0.0.1:3000` and `127.0.0.1:8080`, starts a fresh PostgreSQL test database in the dedicated preserved `nalagrow-pg-e2e` container (host port 55410, avoiding the normal project database), builds and starts a stable loopback-only backend executable, starts Next.js explicitly on port 3000, and runs desktop Chrome. It stops only the child processes it owns and stops (but does not remove) PostgreSQL afterward.

The browser flow signs up a disposable account through the UI, opens a fresh
context, verifies failed and successful login, creates a profile, exercises a
failed feeding save and retry, and confirms the saved record after a reload.
It does not seed application data through GraphQL or local storage.

Each run writes an ignored `test-output/full-stack-integration/<timestamp>/evidence.json` plus screenshots. The evidence includes the disposable account, literal UI inputs, sanitized GraphQL variables/responses, returned IDs and timestamps, and observable results. JWTs and cookies are never recorded.

## Manual reproduction

1. Start the command and wait for the test to print its evidence path and disposable email/password.
2. If the test has completed, run `docker start nalagrow-pg-e2e`, start the backend with `DATABASE_URL=postgres://nalagrow:nalagrow@127.0.0.1:55410/nalagrow_test?sslmode=disable`, and start the frontend on port 3000; the container is preserved so the last successful account remains available until the next run resets it.
3. Open `http://127.0.0.1:3000/login`, submit the disposable email with an incorrect password, and verify the visible login error.
4. Log in with the printed password. Use the visible profile control; do not enter a protected URL directly.
5. Confirm the created profile, use visible navigation to open Feeding, and select Bottle.
6. Enter the evidence artifact's amount, milk type, temperature, and notes. Disconnect/intercept the GraphQL save once and verify the retryable error retains the form, then retry normally.
7. Reload the page, open Records, and compare the displayed bottle entry with the `createFeedingSession` and `feedingSessions` entries in `evidence.json`.
8. Review every PNG in the evidence directory at desktop and mobile widths. Confirm the JSON contains no bearer token, authorization header, cookie, project credential, or configuration secret.

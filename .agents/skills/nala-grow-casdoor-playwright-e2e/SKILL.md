---
name: nala-grow-casdoor-playwright-e2e
description: Use when verifying NalaGrow authentication, session, Google OAuth, or password recovery flows with Playwright against the real configured services.
---

# NalaGrow Casdoor Playwright E2E

Use this skill to test the NalaGrow browser flow that is in scope for a task or pull request. It supplements the repository instructions and does not change the app's auth or provider boundaries.

## Before the browser run

1. Read the repository instructions and the relevant files under `.agents/knowledge/`. Load only the documented test account needed for the run. Keep account values, tokens, OAuth state, and request bodies out of output and artifacts.
2. Confirm the real frontend URL and service state from the documented service manager or project knowledge. Do not guess a port.
3. Run the focused spec with `E2E_SERVICES_EXTERNAL=1` and an explicit `BASE_URL`. This prevents the default test setup from reclaiming the running service ports and starting a disposable backend. Use `--headed` for local runs so the browser is visible; omit it only for CI or an explicit headless request.
4. Set Playwright tracing, screenshots, and video to off for credential-bearing runs. Headed mode does not require saving artifacts. Use an isolated browser context.

## Run the flow

1. Start from the normal entry route. Assert the route, heading, and accessible controls before acting.
2. Use the documented account when it exists. If a new identity is required, follow the task's authorization and Terms of Service boundaries. Never accept terms for the user.
3. Use role, label, or test-id locators. Assert result and error states, plus the URL after navigation. Assert a loading state when it remains visible long enough to observe. Use bounded locator or URL waits. Do not use fixed sleeps or treat a click or HTTP status as success.
4. After password sign-in, allow `/dashboard` or `/profile/create` according to the account's profiles. Reload and assert the authenticated route again.
5. Start Google sign-in only when the task calls for it. Assert the provider redirect. If an account chooser appears, stop and give control to the user. Do not choose an account or accept terms. After a user completes the provider step, assert the callback result and the visible NalaGrow destination without logging query values.
6. Follow Forgot Password through the UI. Assert the configured Casdoor handoff. If the provider shows “No verification method,” classify recovery as blocked. Do not submit a reset or change provider configuration to force a result.
7. Label direct callback error-route checks as regression evidence. They do not prove a live provider cancellation or successful callback.

## Evidence and cleanup

- Record each scenario as passed, failed, blocked, not run, or regression-only, with the visible route and state that supports the result.
- Keep external provider behavior separate from UI route assertions. Never mock or stub the provider or persistence for live acceptance.
- Close the isolated browser context. Clean only records created by the run. Do not create profile or feeding data unless the task explicitly requires it and defines cleanup.
- Follow [REFERENCE.md](REFERENCE.md) for the route/state matrix and the focused Playwright command.

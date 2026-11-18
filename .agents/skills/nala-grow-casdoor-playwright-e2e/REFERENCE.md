# Browser state and evidence reference

Use the state table to decide what to assert and when to stop. Each check uses the real configured services unless marked regression-only.

| State | Entry and action | Required evidence | Branch or recovery |
| --- | --- | --- | --- |
| Login ready | Open `/login` from the normal entry point. | URL ends in `/login`; the `Welcome back` heading and labelled email/password fields are visible. | Wait for the page heading with a bounded locator assertion. A successful HTTP response alone is not evidence. |
| Password sign-in | Fill the documented test account and submit once. | Record the disabled/loading submit state when it remains visible long enough to observe. Assert `/dashboard` or `/profile/create` and its visible heading. Reload and assert the same authenticated destination. | If the form shows `role=alert`, record the visible error. Do not resubmit until the first outcome is known. If profile lookup fails, record the retry state instead of calling it an empty profile list. |
| Signup fallback | Use only when no documented account exists and a dedicated identity is authorized. | Assert the signup route, required fields, and the actual completion result. | NalaGrow signup requires Terms acceptance. Do not accept terms for the user. If that step needs the user's action, stop and record it. |
| Google redirect | From `/login`, choose `Continue with Google` only when the task calls for the Google branch. | Assert that the browser leaves the NalaGrow origin for the configured identity provider. Do not print the full URL because it may contain OAuth state. | If an account chooser appears, stop before selecting an account. Let the user choose. Do not accept Terms of Service. |
| Callback loading | Continue only after the user has completed the provider step. | While the app processes the callback, assert the visible `Connecting your Google account` status. Then assert the resulting NalaGrow URL and authenticated heading. | A callback success is not proven by leaving for the provider. Do not report success if the user has not completed the provider step. |
| Callback error UI | Directly open `/auth/callback?error=access_denied` only for a route-rendering check. | Assert `Sign-in needs another try`, the visible alert, and the `Back to Login` link. | Classify this as regression-only. It is not evidence of a live provider cancellation or callback response. |
| Recovery handoff | From `/login`, follow `Forgot Password?` to `/reset-password`. | Assert the reset heading, `Reset through Casdoor` section, and an external `/forget/{application}` link. | If the real provider shows `No verification method`, classify recovery as blocked. Do not submit a reset request or alter provider settings. |
| Timeout or unexpected error | Any bounded navigation or locator wait expires, or the page exposes an error. | Record the expected condition, timeout, visible heading/alert, and sanitized route. | Do not retry a mutation or provider action until the first attempt's outcome is known. Never include query values, credentials, tokens, or request bodies in logs. |

## Focused Playwright run

The project runner defaults to a local setup that may reclaim ports 3000 and 4000. For the existing desktop services, keep `E2E_SERVICES_EXTERNAL=1` on every command and use the verified URL. Disable trace, screenshot, and video when account values are present.

The focused spec is `frontend/e2e/casdoor-session.spec.ts`. It covers documented-account login and reload, provider redirect without account selection, the configured recovery link, and callback error-route rendering. It creates no account or profile and uses no request interception, localStorage seeding, provider stub, or fake persistence.

```bash
E2E_SERVICES_EXTERNAL=1 BASE_URL=http://localhost:3000 npm --prefix frontend run test:e2e -- --project=desktop --reporter=dot --trace=off e2e/casdoor-session.spec.ts
status=$?
printf 'Playwright exit=%s\n' "$status"
```

The password-login case reads `NALA_GROW_E2E_EMAIL` and `NALA_GROW_E2E_PASSWORD` from the process environment and skips when either is absent. Load them from `.agents/knowledge/defaults.md` without printing them. The issue's Step 1 command shows the silent Bash loader. Clear both variables after the run.

## Result classification

- **Passed:** the expected visible route or state was asserted after the action.
- **Failed:** a live result contradicts the expected state or a bounded assertion fails.
- **Blocked:** a real dependency prevents the requested flow, such as the provider reporting no verification method.
- **Not run:** required user input or an unavailable approved account prevents execution.
- **Regression-only:** a direct route assertion checks app rendering without exercising the external provider.

Keep the final note specific: state the scenario, route, visible result, command and exit status when one ran, and any user-controlled or external boundary that remains untested.

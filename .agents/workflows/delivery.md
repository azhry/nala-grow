# Delivery workflow

Apply this workflow to Linear, GitHub, issue, pull-request, and release work.

## Linear

- Treat an issue identifier (for example, `AZH-385`) as a Linear task. Use the connected Linear app to read it; if the tool is not immediately visible, discover available tools before selecting any fallback.
- Do not use direct HTTP, `curl`, guessed GraphQL queries, or credentials from project configuration for Linear while the connected app is available. If the connector is genuinely unavailable after discovery, immediately use the documented API fallback with the official schema or documentation; load only the required credential without output, and report authorization failures rather than bypassing them.
- Read the named issue before changing it; verify its team, project, state, relations, and constraints.
- Read its comments and the team's valid statuses before mutation. Read related issues and project context when they affect scope or sequencing.
- Before implementation, assess whether the description is sufficient for an independent agent to execute. When it is empty, ambiguous, or missing acceptance criteria, inspect the relevant code, tests, and related work first, then update the Linear description using the [issue-description template](../templates/linear-issue-description.md).
- The description must identify the task category, confirmed problem analysis and scope boundaries, an implementation plan, Definition of Done, and correctness checks. Clearly label hypotheses and open questions; do not present them as confirmed defects.
- A design artifact alone (including a complete HTML file, screenshot, mockup, or prototype) is not sufficient. It describes the reference, not the task contract. Add the required analysis and acceptance contract around it before implementation.
- Preserve supplied reference material verbatim, including full HTML, mockups, screenshots, and example payloads. Add the task contract before or after the reference; do not overwrite, shorten, or substitute it with a summary.
- **Readiness gate:** after any necessary code/test inspection, update the issue description and verify that the mutation succeeded. Re-read the issue and confirm it contains Category, Problem analysis, Scope boundary, Implementation plan, Definition of Done, and Correctness checks. Do not create an implementation branch, change issue state, delegate implementation, or edit source files before this gate passes. Private reasoning, a todo list, or a final response is not a substitute for the tracker update.
- Treat the updated Linear description as the implementation contract. Do not begin implementation until it gives a future agent enough information to understand the intended behavior, out-of-scope work, and how success will be verified.
- Move work to the team's active state when implementation begins. Attach the PR and move it to the available review state when handoff starts.
- Mark work complete only when the PR is merged or the user/team workflow confirms completion.
- Use exact IDs for mutations and report changed fields plus blockers.
- When an API fallback is permitted, obtain the needed credential from a non-printing secret store at runtime. Never use a generic file reader that serializes config contents, and never place a literal token in a command, source file, temporary file, transcript, URL, or issue comment. If a safe secret-loading path is unavailable, record the blocker and stop.

## Git and GitHub

- Inspect `git status --short --branch`, the current branch, remote, and project instructions before editing or staging.
- For new work, branch from `main`. For work already in a PR, continue from that branch and update the same PR.
- Complete the GitHub authentication/repository-access preflight and create the required branch before the first implementation write. A later branch creation does not repair edits made on `main`. If the worktree is dirty, preserve it; use an isolated worktree when the task can proceed safely, otherwise report the blocker.
- Stage only intended files. Run proportionate verification and distinguish pre-existing failures from regressions.
- Before staging and before handoff, inspect `git status --short` and the intended diff. Keep generated diagnostics (screenshots, browser traces, lint logs, downloaded samples) outside the repository or in ignored temporary storage. Clean up only artifacts created by the current task.
- A verification claim requires a successful recorded exit status for the exact command or browser flow. A command that reaches partial compilation but exits non-zero is a failure. Report baseline failures separately with their command and affected path; never describe them as a passing build, lint, test, or check.
- Run build, typecheck, lint, and test commands unfiltered before using filters for diagnostics. A pipe to `findstr`, `Select-String`, or a similar filter cannot establish that the original command passed.
- Build the PR body from the applicable repository template: [backend](../templates/github-pr-description-backend.md), [frontend](../templates/github-pr-description-frontend.md), or [tests](../templates/github-pr-description-tests.md). Use the tests template for test-only work, including intentional red-test handoffs. For a cross-cutting PR, start with the template matching the primary implementation and include every applicable section from the others.
- Replace every bracketed placeholder and remove a conditional section only when it genuinely does not apply. Re-read the saved PR body and verify that it records scope, observable outcomes, exact commands and exit statuses, limitations, and the linked work item.
- Push and create/update the PR without asking for confirmation when this repository is in scope. Include summary, verification, limitations, and linked issue reference.
- Prefer connected integration tools; use an authenticated CLI when necessary. Do not expose credentials or bypass authorization failures.

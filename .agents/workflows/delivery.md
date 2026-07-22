# Delivery workflow

Apply this workflow to Linear, GitHub, issue, pull-request, and release work.

## Linear

- Treat an issue identifier (for example, `AZH-385`) as a Linear task. Use the connected Linear app to read it; if the tool is not immediately visible, discover available tools before selecting any fallback.
- Do not use direct HTTP, `curl`, guessed GraphQL queries, or credentials from project configuration for Linear while the connected app is available. If the connector is genuinely unavailable after discovery, immediately use the documented API fallback with the official schema or documentation; load only the required credential without output, and report authorization failures rather than bypassing them.
- Read the named issue before changing it; verify its team, project, state, relations, and constraints.
- Read its comments and the team's valid statuses before mutation. Read related issues and project context when they affect scope or sequencing.
- Before implementation, assess whether the description is sufficient for an independent agent to execute. When it is empty, ambiguous, or missing acceptance criteria, inspect the relevant code, tests, and related work first, then update the Linear description using the [issue-description template](../templates/linear-issue-description.md).
- The description must identify the task category, confirmed problem analysis and scope boundaries, an implementation plan, Definition of Done, and correctness checks. Clearly label hypotheses and open questions; do not present them as confirmed defects.
- Preserve supplied reference material verbatim, including full HTML, mockups, screenshots, and example payloads. Add the task contract before or after the reference; do not overwrite, shorten, or substitute it with a summary.
- Treat the updated Linear description as the implementation contract. Do not begin implementation until it gives a future agent enough information to understand the intended behavior, out-of-scope work, and how success will be verified.
- Move work to the team's active state when implementation begins. Attach the PR and move it to the available review state when handoff starts.
- Mark work complete only when the PR is merged or the user/team workflow confirms completion.
- Use exact IDs for mutations and report changed fields plus blockers.

## Git and GitHub

- Inspect `git status --short --branch`, the current branch, remote, and project instructions before editing or staging.
- For new work, branch from `main`. For work already in a PR, continue from that branch and update the same PR.
- Stage only intended files. Run proportionate verification and distinguish pre-existing failures from regressions.
- Before staging and before handoff, inspect `git status --short` and the intended diff. Keep generated diagnostics (screenshots, browser traces, lint logs, downloaded samples) outside the repository or in ignored temporary storage. Clean up only artifacts created by the current task.
- A verification claim requires a successful recorded exit status for the exact command or browser flow. A command that reaches partial compilation but exits non-zero is a failure. Report baseline failures separately with their command and affected path; never describe them as a passing build, lint, test, or check.
- Push and create/update the PR without asking for confirmation when this repository is in scope. Include summary, verification, limitations, and linked issue reference.
- Prefer connected integration tools; use an authenticated CLI when necessary. Do not expose credentials or bypass authorization failures.

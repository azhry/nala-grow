# Delivery workflow

Apply this workflow to Linear, GitHub, issue, pull-request, and release work.

## Linear

- Read the named issue before changing it; verify its team, project, state, relations, and constraints.
- Move work to the team's active state when implementation begins. Attach the PR and move it to the available review state when handoff starts.
- Mark work complete only when the PR is merged or the user/team workflow confirms completion.
- Use exact IDs for mutations and report changed fields plus blockers.

## Git and GitHub

- Inspect `git status --short --branch`, the current branch, remote, and project instructions before editing or staging.
- For new work, branch from `main`. For work already in a PR, continue from that branch and update the same PR.
- Stage only intended files. Run proportionate verification and distinguish pre-existing failures from regressions.
- Push and create/update the PR without asking for confirmation when this repository is in scope. Include summary, verification, limitations, and linked issue reference.
- Prefer connected integration tools; use an authenticated CLI when necessary. Do not expose credentials or bypass authorization failures.

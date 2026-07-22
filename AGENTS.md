# Project agent instructions

## Required first steps

- Read `./.agents/config.md` before taking task actions. Never print, commit, or transmit credentials found there.
- Make sure all the necessary tools and credentials work before taking task actions.
- Do one task at a time. A task is complete only after implementation, verification, commit, push, PR handoff, and relevant tracker update are complete.
- Preserve unrelated dirty files. Never stage, modify, discard, or overwrite another person's work.

## Branches and publication

- Start new work from `main` on a `task/<topic>` branch.
- For a fix to an existing PR, branch from that PR's branch and update the existing PR; do not open a duplicate unless asked.
- Commit, push, and open a PR without requesting permission when the repository/remote is in scope. Use a draft PR unless asked for ready review.

## Routing

- For UI/frontend work, read [frontend workflow](.agents/workflows/frontend.md) in full, then spawn the required frontend implementation subagent.
- For Linear, GitHub, issue, PR, or release work, read [delivery workflow](.agents/workflows/delivery.md) in full.
- For creating or editing an agent skill, read [skill workflow](.agents/workflows/skills.md) in full.

## Credentials and delivery preflight

- Never print, echo, commit, or transmit `.agents/config.md` or any secret value.
- Do not dot-source config files. Load only allowlisted `KEY=value` entries into the current process environment without output.
- Before changing code for a task that requires GitHub delivery:
  1. Load the configured GitHub token into `GH_TOKEN`.
  2. Run a non-interactive authentication and repository-access check.
  3. Verify the GitHub connector can access the repository if it will be used.
- If authentication or repository access fails, stop before implementation, record the blocker in Linear, and tell the user exactly which credential/integration must be fixed.
- Never invoke interactive `gh auth login` in an unattended agent workflow.
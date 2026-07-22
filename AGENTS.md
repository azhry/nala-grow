# Project agent instructions

## Required first steps

- Read `./.agents/config.md` before taking task actions. Never print, commit, or transmit credentials found there.
- Do one task at a time. A task is complete only after implementation, verification, commit, push, PR handoff, and relevant tracker update are complete.
- Preserve unrelated dirty files. Never stage, modify, discard, or overwrite another person's work.

## Branches and publication

- Start new work from `main` on a `codex/<topic>` branch.
- For a fix to an existing PR, branch from that PR's branch and update the existing PR; do not open a duplicate unless asked.
- Commit, push, and open a PR without requesting permission when the repository/remote is in scope. Use a draft PR unless asked for ready review.

## Routing

- For UI/frontend work, read [frontend workflow](.agents/workflows/frontend.md) in full, then spawn the required frontend implementation subagent.
- For Linear, GitHub, issue, PR, or release work, read [delivery workflow](.agents/workflows/delivery.md) in full.
- For creating or editing an agent skill, read [skill workflow](.agents/workflows/skills.md) in full.

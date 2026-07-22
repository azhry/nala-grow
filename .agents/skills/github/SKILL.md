---
name: nala-grow-github
description: Publishes Nala Grow changes through a safe branch, commit, push, and draft-PR workflow. Use when implementing an AZH task, preparing a pull request, or handling GitHub review handoff.
---

# Nala Grow GitHub

## Before editing

1. Run `git status --short --branch` and preserve unrelated changes.
2. Start every task from updated `main` on `codex/<ticket>-<short-slug>` unless the user supplies a branch name.
3. Do not stage unrelated files, generated artifacts, secrets, or another person's work.

## Implementation handoff

1. Run the smallest relevant tests and record their result. Clearly identify pre-existing failures rather than presenting them as regressions.
2. Review the diff, stage only intended files, and commit with a conventional message such as `feat(feeding): revamp feeding page`.
3. Push only with the user's authorization for external publication. Never print access tokens or place them in commands, commits, or PR text.
4. Open a **draft** PR against `main` unless the user asks for a ready-for-review PR. Include a summary, verification, known limitations, and `Closes AZH-<n>`.
5. Return the PR URL and update the linked Linear issue to `In Review`.

## GitHub access

Prefer the connected GitHub integration. If it lacks repository access, use an already-authenticated `gh` CLI; otherwise report the authentication blocker. Do not attempt to bypass permission failures or expose credentials.

## Example

For AZH-123, create `codex/azh-123-short-title`, commit only its files, run focused tests, push, and create a draft PR targeting `main`.

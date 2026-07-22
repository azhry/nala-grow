---
name: github-delivery
description: Operates GitHub and local Git for repository delivery: branches, commits, pushes, pull requests, issues, reviews, and checks. Use when a user asks to implement and publish code, create or review a PR, inspect GitHub issues or checks, or manage repository history.
---

# GitHub delivery

Git is the local version-control system for branches and commits. GitHub hosts Git repositories and adds pull requests, issues, reviews, Actions checks, releases, and collaboration controls.

## Capabilities

- Inspect repository state, branches, history, remotes, diffs, and changed files.
- Create focused branches and commits; preserve unrelated work in a dirty checkout.
- Push branches and create/update/inspect/comment on/review pull requests.
- Read and manage GitHub issues, labels, assignees, review threads, and CI checks.
- Compare commits and link PRs to external work trackers.

## Workflow

1. Inspect status, current branch, remote, and repository instructions before editing or staging.
2. Derive conventions from the current project; if absent, use a concise topic branch from `main` and a focused conventional commit.
3. Stage only intended files. Run proportional verification and separate pre-existing failures from regressions.
4. Push/create a PR only with explicit user authorization for external publication. Never expose credentials or bypass authorization failure.
5. Report the commit, tests, PR URL, and unresolved risks.

Read [TOOLING.md](TOOLING.md) before operating on GitHub; it maps Git, `gh`, connector calls, and REST endpoints.

## Pull requests

Default to a draft PR unless the user asks for ready review. Include a concise summary, verification performed, known limitations, and an issue reference when one exists.

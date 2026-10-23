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

## Read path selection

- For the complete PR discussion timeline, use the connected `mcp__codex_apps__github_fetch_pr_comments({ repo_full_name, pr_number })` operation. It combines issue comments, inline review comments/replies, and review submissions.
- For inline review threads where resolved/unresolved state matters, use the connected `mcp__codex_apps__github_list_pull_request_review_threads({ repo_full_name, pr_number })` operation. Do not infer resolution from a plain comment timeline.
- For commit metadata, diffs, and the canonical URL, use the connected `mcp__codex_apps__github_fetch_commit({ repo_full_name, commit_sha })` operation.
- For code comments attached to a commit, use the documented `list-commit-comments` REST fallback in [TOOLING.md](TOOLING.md); the active connector has no commit-comments operation.
- Discover the active connector names before selecting a fallback. Keep read operations separate from review-thread mutation operations, and report a missing connector capability instead of silently substituting incomplete data.

## Workflow

1. Inspect status, current branch, remote, and repository instructions before editing or staging.
2. Read TOOLING.md, resolve the official GitHub CLI, and run the non-interactive authentication and repository-access checks required by the repository instructions before source edits. Run them in the current supported execution environment; do not add an escalation/sandbox flag that the active tool does not support or assume that a check failed because of sandboxing.
3. Derive conventions from the current project; if absent, use a concise topic branch from `main` and a focused conventional commit.
4. Stage only intended files. Run proportional verification and separate pre-existing failures from regressions.
5. Follow the repository's publication rules. When the task and repository are in scope and project instructions authorize routine pushes and PR creation/update, proceed without redundant approval. Never expose credentials, change identities, or bypass an authorization failure; merge only when explicitly authorized.
6. Report the commit, tests, PR URL, and unresolved risks.

If the official CLI preflight fails, follow the repository's explicit preflight policy; where it is a hard gate, stop before edits and report the blocker. Otherwise, a connected GitHub app may be used only for operations it independently authorizes—not to evade a denial from the configured account. Do not invoke interactive login, set `GH_TOKEN` from a project file, or use a project token with `curl`. See TOOLING.md for the distinction between an integration-scoped 403 and a user-account authorization failure.

## Pull requests

Default to a draft PR unless the user asks for ready review. Include a concise summary, verification performed, known limitations, and an issue reference when one exists.

For dependent work, keep each active PR stack to at most three open PRs, including its root. For HTTP/API behavior, every PR in the stack carries the same complete ordered end-to-end curl/request-response sequence, with each step tagged to its owning PR and this PR's scope identified. Follow the repository delivery workflow and PR template for sequencing, expected-versus-observed responses, and legacy over-limit stacks.

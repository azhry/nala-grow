# GitHub operations

Use Git for local history, a connected GitHub app for GitHub actions, and an authenticated `gh` CLI when the connector is unavailable or lacks a needed feature.

## Git commands

```sh
git status --short --branch
git switch main && git switch -c <topic-branch>
git diff --check
git add <intended-paths>
git commit -m "feat(scope): summary"
git push -u origin <topic-branch>
```

Run the push only after the user authorizes external publication.

## GitHub app calls

Discover the exact callable names from the active tool list; Codex commonly exposes these as `mcp__codex_apps__github_*`.

| Intent | Connector call |
| --- | --- |
| Create PR | `github_create_pull_request({ repository_full_name, head, base, title, body, draft })` |
| Inspect PR | `github_fetch_pr` or `github_get_pr_info` |
| Find PRs | `github_search_prs` |
| Comment/review | `github_add_comment_to_issue`, `github_add_review_to_pr` |
| Inspect checks | `github_get_commit_combined_status`, `github_fetch_commit_workflow_runs`, or `github_fetch_workflow_run_jobs` |
| Compare branches | `github_compare_commits({ repo_full_name, base, head })` |

## GitHub CLI fallback

```sh
gh pr create --base main --head <topic-branch> --title "..." --body "..." --draft
gh pr view <number> --json url,state,reviewDecision,statusCheckRollup
gh pr checks <number>
gh issue view <number>
```

If `gh` is not authenticated, report that blocker instead of starting an interactive login in an unattended workflow.

## REST API fallback

Use `POST /repos/{owner}/{repo}/pulls` to create a PR and `GET /repos/{owner}/{repo}/pulls/{number}` to inspect one. Obtain credentials only from the execution environment's secret store; never include a token in source, logs, or PR text.

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

## Connected GitHub app calls

Discover the exact callable names from the active tool list; Codex commonly exposes these as `mcp__codex_apps__github_*`.

| Intent | Connector call |
| --- | --- |
| Create PR | `mcp__codex_apps__github_create_pull_request({ repository_full_name, head, base, title, body, draft })` |
| Inspect PR | `mcp__codex_apps__github_get_pr_info({ repo_full_name, pr_number })` |
| Find PRs | `mcp__codex_apps__github_search_prs({ repo_full_name, query })` |
| Fetch complete PR discussion | `mcp__codex_apps__github_fetch_pr_comments({ repo_full_name, pr_number })` |
| Fetch resolved/unresolved inline threads | `mcp__codex_apps__github_list_pull_request_review_threads({ repo_full_name, pr_number })` |
| Inspect commit metadata/diff | `mcp__codex_apps__github_fetch_commit({ repo_full_name, commit_sha })` |
| Comment/review mutation | `mcp__codex_apps__github_add_comment_to_issue`, `mcp__codex_apps__github_add_review_to_pr` |
| Inspect checks | `mcp__codex_apps__github_get_commit_combined_status`, `mcp__codex_apps__github_fetch_commit_workflow_runs`, or `mcp__codex_apps__github_fetch_workflow_run_jobs` |
| Compare branches | `mcp__codex_apps__github_compare_commits({ repo_full_name, base, head })` |

Use `github_fetch_pr_comments` for a chronological discussion timeline and `github_list_pull_request_review_threads` when thread resolution or reply structure is required. The former does not replace the latter. The active connector does not expose commit code comments; use the fallback below for `GET /repos/{owner}/{repo}/commits/{commit_sha}/comments`.

## GitHub CLI fallback

### Resolve and preflight the official CLI

Do this before any source edit, branch creation, commit, push, or PR command. Do not assume that `gh` on PATH is the GitHub CLI: Node/npm packages can shadow it and may prompt for an interactive login.

On PowerShell, prefer a real `gh.exe` outside Node/npm paths, then retain its full path for every subsequent call:

```powershell
$gh = Get-Command gh.exe -All |
  Where-Object { $_.Source -notmatch '(?i)node_modules|\\nodejs\\gh(?:\.cmd|\.ps1)?$' } |
  Select-Object -First 1 -ExpandProperty Source
if (-not $gh) { throw 'Official GitHub CLI executable not found' }
& $gh --version
& $gh auth status
& $gh repo view OWNER/REPO --json nameWithOwner,viewerPermission
```

On POSIX shells, inspect all candidates and use the verified executable path:

```sh
type -a gh
gh_bin="$(command -v gh)"
"$gh_bin" --version
"$gh_bin" auth status
"$gh_bin" repo view OWNER/REPO --json nameWithOwner,viewerPermission
```

The preflight passes only when all three commands succeed and the repository result identifies the intended repository. Do not continue with a different `gh`, an interactive `gh auth login`, `GH_TOKEN` populated from a project config file, or a direct HTTP request containing a project token. Use a connected GitHub app if available; otherwise record the blocker and stop.

The bundled preflight helper performs those checks atomically:

```powershell
& .agents/skills/github/scripts/gh_preflight.ps1 -Repository OWNER/REPO
```

### Deterministic PR handoff

Always pass the repository, base, and head explicitly. Check for an existing PR before creating one so a retry updates the same PR instead of creating a duplicate:

```sh
gh pr list --repo OWNER/REPO --head <branch> --json number,url,state,title,headRefName,baseRefName
gh pr create --repo OWNER/REPO --base main --head <branch> --title "<title>" --body "<body>" --draft
gh pr view <number> --repo OWNER/REPO --json url,state,isDraft,mergeable,statusCheckRollup
```

Use the resolved full executable path in place of `gh` in those commands. Merge only when the user explicitly asks, after confirming the PR is mergeable and reporting its check state.

If `gh` is not authenticated, report that blocker instead of starting an interactive login in an unattended workflow.

### Discussion and commit-comment fallback

Use the connected operations above first. When a connector is unavailable or lacks the required read operation, use an authenticated `gh api` call or the bundled helper. GitHub CLI stores the credential; never add a token to a URL, command string, source file, or log.

For a complete PR discussion timeline, the helper aggregates all three GitHub collections and adds `source`/`kind` fields while preserving the original record fields:

```powershell
python .agents/skills/github/scripts/gh_tooling.py list-pr-threads --owner OWNER --repo REPO --number PR_NUMBER
```

Equivalent direct reads are:

```powershell
gh api --paginate --slurp repos/OWNER/REPO/issues/PR_NUMBER/comments
gh api --paginate --slurp repos/OWNER/REPO/pulls/PR_NUMBER/comments
gh api --paginate --slurp repos/OWNER/REPO/pulls/PR_NUMBER/reviews
```

For commit code comments:

```powershell
python .agents/skills/github/scripts/gh_tooling.py list-commit-comments --owner OWNER --repo REPO --commit-sha COMMIT_SHA
gh api --paginate --slurp repos/OWNER/REPO/commits/COMMIT_SHA/comments
```

The REST fallback preserves inline reply linkage such as `in_reply_to_id`, but it cannot provide GraphQL review-thread resolution state. If resolved/unresolved state is required and the thread connector is unavailable, report that limitation rather than guessing.

## REST API fallback

Use `POST /repos/{owner}/{repo}/pulls` to create a PR and `GET /repos/{owner}/{repo}/pulls/{number}` to inspect one. Obtain credentials only from the execution environment's secret store; never include a token in source, logs, or PR text.

Invoke the bundled [`gh_tooling.py`](scripts/gh_tooling.py) operation before writing custom scripts. If an operation is missing, consult the official schema; API validation errors must not be used as schema discovery.

# Linear operations

Prefer a connected Linear app. Discover the exact callable names and argument schemas from the active tool list; current Codex names commonly use the `mcp__codex_apps__linear_*` prefix. Do not call a guessed unqualified operation name.

| Intent | Connector call |
| --- | --- |
| Read one issue | `mcp__codex_apps__linear_get_issue({ id: "TEAM-123" })` |
| Fetch a generic entity | `mcp__codex_apps__linear_fetch({ id: "issue:TEAM-123" })` — include the entity prefix required by this generic operation |
| Find work by text | `mcp__codex_apps__linear_search({ query, ... })` |
| List/filter work | `mcp__codex_apps__linear_list_issues({ ... })` |
| List valid states | `mcp__codex_apps__linear_list_issue_statuses({ team })` |
| Create/update an issue | `mcp__codex_apps__linear_save_issue({ id, state, assignee, labels, project, ... })` |
| Create/update a comment | `mcp__codex_apps__linear_save_comment({ issueId, body })` |
| Read projects/teams/cycles/documents | `mcp__codex_apps__linear_list_projects`, `linear_list_teams`, `linear_list_cycles`, `linear_list_documents`, `linear_get_document` |
| Read shared agent context | `mcp__codex_apps__linear_get_agent_context({ task })` |
| Create/update project docs | `mcp__codex_apps__linear_save_project`, `linear_save_document` |

`linear_save_issue` creates when `id` is omitted and updates when it is supplied. Resolve state names per team before setting `state`.

## Connector failure routing

- Discover the active tool list and use the exact advertised operation and schema. `Tool <name> not found` means that operation is unavailable at dispatch time even if it appears in the inventory; do not retry the same call under a guessed short name. Use the API fallback below for supported underlying records.
- Correct a schema or entity-reference error from the operation's current schema (for example, generic fetch may require `issue:TEAM-123`) before treating it as a connector failure.
- A connector-only operation such as `get_agent_context` may have no public GraphQL equivalent. Do not fabricate an API route. Read the relevant issue/project/document with supported connector or API operations, and record the missing synthesized context without blocking unrelated work.
- A 401/403 is an authorization failure, not a missing operation. Report it and do not swap credentials, request broader scopes, or use a second identity to evade it.

## HTTP API fallback

When a connector operation is unavailable, use the bundled helper for the operations it supports; it calls Linear's GraphQL API using `LINEAR_API_KEY` from the process environment. Load that key through the repository's approved non-printing secret loader or runtime secret store. Do not put tokens in source, logs, URLs, command text, or issue text. If custom GraphQL is necessary, use the official schema/docs to construct the exact query or mutation; do not guess field names.

Invoke the bundled [`linear_tooling.py`](scripts/linear_tooling.py) operation before writing custom GraphQL. If an operation is missing, consult the official schema; GraphQL validation errors must not be used as schema discovery.

On Windows, resolve Python with `Get-Command py, python -ErrorAction SilentlyContinue`. When neither command resolves to an installed interpreter, use the workspace-bundled runtime.

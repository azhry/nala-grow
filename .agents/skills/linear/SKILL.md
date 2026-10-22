---
name: linear-issue-management
description: Operates Linear, the work tracker for issues, projects, cycles, and team planning. Use when a user asks to inspect, create, update, triage, assign, link, comment on, or report a Linear issue, project, cycle, label, or roadmap item.
---

# Linear issue management

Linear manages issues (individual work items), projects (grouped outcomes), cycles (time-boxed work), teams, labels, and discussion comments.

## Capabilities

- Read/search issues, projects, teams, cycles, labels, documents, comments, and dependencies.
- Create/update issues, projects, milestones, releases, documents, and status updates.
- Set issue state, assignee, priority, estimate, due date, labels, project, cycle, parent, and relations.
- Add comments and external links such as PRs or design documents.

## Workflow

1. Discover the active Linear operations and call the exact advertised tool with its current argument schema. Prefer the dedicated issue tool for an issue ID; use a generic entity fetch only with the entity-reference syntax in its schema.
2. If an operation is absent, or dispatch returns `Tool <name> not found` after discovery, treat that operation as unavailable and immediately use the documented API fallback for the underlying Linear data it supports. Other Linear operations may still work; do not ask the user to reconnect the whole integration for one missing operation.
3. If the tool returns a schema or entity-reference error, check its current schema and correct the arguments once before classifying it as unavailable. For a 401/403 authorization response, report the failure and do not switch credentials or bypass the denial.
4. A connector-only operation such as synthesized agent context may not have an equivalent public Linear API operation. Do not invent an endpoint or query. Use documented issue/project/document API operations for the underlying records, continue from verified repository evidence when safe, and state that the connector-only context was unavailable.
5. Read the target first and derive its team, project, valid states, and conventions from actual workspace data—never hard-code a project. Search/list to resolve ambiguous names, then mutate with an exact ID.
6. Report changed fields, created links, and any remaining blocker.

Read [TOOLING.md](TOOLING.md) before making calls; it maps Linear operations to connector tools and API equivalents.

## HTTP API fallback

When the connector or the specific operation is unavailable, use the supported operations in `.agents/skills/linear/scripts/linear_tooling.py` (check the operation's `--help`). The script reads `LINEAR_API_KEY` from the process environment. Load it only through the repository's approved non-printing secret loader or the runtime secret store; never type a literal token, print the variable, or place it in a prompt, command transcript, or file. For example, after the approved loader has populated the environment (use `py` on Windows only when `python` is unavailable):

```sh
python .agents/skills/linear/scripts/linear_tooling.py read-issue --id AZH-417
```

If the helper does not implement the requested API operation, consult the official Linear schema/documentation before using another operation. A missing connector-only feature is not permission to guess a GraphQL field.

## Delivery handoff

Link the PR to the issue and use the team's available review state. Mark work complete only when the team workflow or user confirms it.

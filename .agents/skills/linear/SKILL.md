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

1. Confirm Linear tools exist; if absent, ask the user to connect Linear.
2. Read the target first and derive its team, project, valid states, and conventions from actual workspace data—never hard-code a project.
3. Search/list to resolve ambiguous names, then mutate with an exact ID.
4. Report changed fields, created links, and any remaining blocker.

Read [TOOLING.md](TOOLING.md) before making calls; it maps Linear operations to connector tools and API equivalents.

## Delivery handoff

Link the PR to the issue and use the team's available review state. Mark work complete only when the team workflow or user confirms it.

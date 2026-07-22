---
name: nala-grow-linear
description: Manages Nala Grow Linear issues from intake through review and completion. Use when a user names an AZH issue, asks to update a Linear ticket, or requests project/task status.
---

# Nala Grow Linear

## Scope

Use this skill for issues in the **Azhary** team and **Nala Grow** project. Read `.agents/config.md` before accessing Linear; it contains identifiers and credentials. Never print or copy credentials into comments, commits, or issue descriptions.

## Ticket workflow

1. Fetch the named issue (for example, `AZH-384`) before changing code or Linear state. Record its title, description, relations, status, project, and branch hint.
2. Verify it belongs to the Azhary team/Nala Grow project. Surface blockers or a conflicting scope before implementing.
3. When work begins, set the issue to `In Progress`. Use `Todo` rather than `Backlog` when reprioritising unstarted work.
4. When a draft PR exists, attach its URL to the issue and set the state to `In Review`.
5. Set the issue to `Done` only after the PR is merged or the user explicitly accepts completion. If verification is blocked, leave it started and add a concise status comment.

## Updates and comments

Include the implementation summary, verification actually run, and any known limitation. Keep comments factual and short. Link the PR rather than duplicating its full description.

## Example

For “do Linear task AZH-123”: fetch `AZH-123`, inspect requirements and relations, start the issue, implement on a ticket branch, then link the draft PR and move it to `In Review`.

# Project agent instructions

## Required first steps

- Read `./.agents/config.md` before taking task actions. Never print, commit, or transmit credentials found there.
- Make sure all the necessary tools and credentials work before taking task actions.
- Do one task at a time. A task is complete only after implementation, verification, commit, push, PR handoff, and relevant tracker update are complete.
- Preserve unrelated dirty files. Never stage, modify, discard, or overwrite another person's work.

## Branches and publication

- Start new work from `main` on a `task/<topic>` branch.
- For a fix to an existing PR, branch from that PR's branch and update the existing PR; do not open a duplicate unless asked.
- Commit, push, and open a PR without requesting permission when the repository/remote is in scope. Use a draft PR unless asked for ready review.

## Routing

- For UI/frontend work, read [frontend workflow](.agents/workflows/frontend.md) in full, then spawn the required frontend implementation subagent.
- For Linear, GitHub, issue, PR, or release work, read [delivery workflow](.agents/workflows/delivery.md) in full.
- For creating or editing an agent skill, read [skill workflow](.agents/workflows/skills.md) in full.

## Task-ID protocol

For a request containing a Linear issue ID such as `AZH-385`:

1. Read `./.agents/config.md` without printing it.
2. Read [the delivery workflow](.agents/workflows/delivery.md) in full before any task-specific repository search, shell command, or implementation.
3. Use the connected Linear tool such as Linear MCP. If it is not immediately visible, discover the available tools first.
4. If the connected Linear tool is genuinely unavailable after discovery, immediately use the documented Linear API fallback. Use the official schema or documentation, load only the required credential without output, and never guess requests or bypass an authorization failure.
5. Read the issue, relations, comments, project, and valid team statuses.
6. If the description is incomplete, analyze it first and update it with the [Linear issue-description template](.agents/templates/linear-issue-description.md).
7. Preserve user-supplied reference material (including HTML, screenshots, designs, and examples) verbatim. Add the implementation contract around it; never replace, trim, or paraphrase the reference unless the user explicitly asks.
8. Treat the completed issue description as the implementation contract. Only then begin implementation. For frontend work, also follow the frontend workflow and its delegation requirement.

## Credentials and delivery preflight

- Never print, echo, commit, or transmit `.agents/config.md` or any secret value.
- Do not dot-source config files. Load only allowlisted `KEY=value` entries into the current process environment without output.
- Reading config does not export values into the current shell environment. Never assume a credential environment variable is available.
- Prefer authenticated connectors for Linear and GitHub. Do not manually inject project secrets into `curl` or other direct HTTP commands.
- Before changing code for a task that requires GitHub delivery:
   1. Resolve the intended GitHub CLI executable with a platform-appropriate path-inspection command. Verify that it is the official GitHub CLI, not an npm package, shell alias, or wrapper.
   2. Run a non-interactive authentication and repository-access check with that resolved executable, without overriding a working stored credential.
   3. Verify the GitHub connector can access the repository if it will be used.
- If authentication or repository access fails, stop before implementation, record the blocker in Linear, and tell the user exactly which credential/integration must be fixed.
- Never invoke interactive `gh auth login` in an unattended agent workflow.
- Never report a check as passed, a build as successful, or a task as complete unless the recorded command exited successfully. State pre-existing failures separately with the exact command and affected path; do not describe a partial compile or filtered output as a successful build.
- Before staging and again before handoff, inspect `git status --short` and preserve unrelated files. Put generated screenshots, browser traces, lint captures, and other diagnostics outside the repository or in an ignored temporary directory; remove only artifacts created by the current task.

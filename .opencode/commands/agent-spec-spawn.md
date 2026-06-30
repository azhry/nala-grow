---
description: Service planned Agent Spec Ops spawn requests for this project.
agent: build
---
<!-- agent-spec-ops:opencode-adapter -->

# Agent Spec Ops Spawn

Service planned harness spawn requests on demand. This command replaces background polling.

1. Run the queue command:

```bash
cd ../my-harnesses/agent-spec-ops
"C:\Users\Lyrid\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts/list-agent-spawn-requests.js runs/NL-001/workflow-state.json --json
```

2. For each request where `status` is `planned`, create a synthetic OpenCode agent id:

```text
opencode:<SPAWN_REQUEST_ID>:<YYYYMMDDHHmmss>
```

3. If the request kind is `pr_review`, invoke `@agent-spec-pr-reviewer` with:

- the synthetic agent id
- the request `id`
- the exact request `prompt`
- the task ids and write scope from the JSON

4. Immediately record the spawn in harness state:

```bash
cd ../my-harnesses/agent-spec-ops
"C:\Users\Lyrid\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts/record-agent-spawn.js runs/NL-001/workflow-state.json <SPAWN_REQUEST_ID> <AGENT_ID>
```

5. Stop after servicing the current planned requests. Do not poll or loop forever.

Safety:
- If OpenCode cannot invoke the subagent, leave the request planned.
- Do not run `submit-task.js`, merge PRs, or edit project files from this command.
- The reviewer records `passed` or `changes_requested` with `record-pr-review.js`.

---
name: codex-session-audit
description: Fetch and audit a local Codex session by ID. Use when asked why an agent made a decision, missed access, followed the wrong instruction, skipped verification, or when a Codex conversation needs an evidence-backed workflow audit.
---

# Codex session audit

Audit one requested local Codex session at a time. Treat the session log as sensitive local data: do not print, commit, upload, or quote credentials, tokens, cookies, or private user content. Summarize only the evidence needed to answer the request.

## Workflow

1. Confirm the exact `session_id`, audit question, and project root. Do not substitute a similarly named session.
2. Run the included extractor from the project root:

   ```powershell
   <python-executable> .agents/skills/codex-session-audit/scripts/fetch_codex_session.py --session-id <session_id>
   ```

   Use `python` when it is on `PATH`; otherwise resolve the workspace-bundled Python before running it. It searches `%USERPROFILE%/.codex/sessions` for `rollout-*-<session_id>.jsonl`, parses every valid JSONL event, and emits a redacted chronological index. If no single file is found, report that evidence and stop; do not guess another path.
3. Read the matching log locally in bounded chunks when the index identifies an event requiring context. Redact sensitive values in notes and never copy full transcripts into Git, Linear, or chat.
4. Inspect only relevant project sources: `AGENTS.md`, `.agents/workflows/`, `.agents/skills/`, `.kilo/rules/`, `kilo.json` when present, and `.codex/` when present. Cite file paths and rule text/heading; distinguish a confirmed influence from a hypothesis.
5. Produce the report format in [audit protocol](references/audit-protocol.md). Trace every root-cause claim to a session event or project source.

## Access diagnosis

For each missing capability, classify the first supported condition:

- **Tool unavailable** — the tool was absent from the available tool list or executable discovery.
- **Tool available but unconfigured** — present, but authentication, endpoint, runtime, or required configuration failed.
- **Credential exists but was not exposed** — evidence shows a credential store/config existed but the agent was not permitted or instructed to load the allowlisted value.
- **Instruction flow prevented correct use** — an applicable instruction mandated a conflicting sequence or prohibited the needed safe operation.
- **Incorrect assumption** — the agent claimed availability/unavailability without running the relevant check.

Never infer credential existence from an error alone. Never recommend placing credentials in source, prompts, or skill files.

## Recommendations

Prefer the smallest change that removes a repeated failure mode. State the exact target file, suggested ordering/wording change, expected benefit, and instruction-weight trade-off. Do not duplicate an existing rule across several files.

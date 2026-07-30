---
name: kilocode-session-audit
description: Fetch and audit a local KiloCode session by ID from its SQLite store. Use when investigating KiloCode tool failures, instruction conflicts, skipped verification, or workflow improvements from an evidence-backed session timeline.
---

# KiloCode session audit

KiloCode session data is local and potentially sensitive. Inspect it read-only. Do not export raw conversations, credentials, tokens, cookies, or private user content into Git, Linear, or chat.

## Workflow

1. Confirm the exact `session_id`, audit question, and project root.
2. Discover the actual database schema before making any session query. Run:

   ```powershell
   <python-executable> .agents/skills/kilocode-session-audit/scripts/fetch_kilocode_session.py --session-id <session_id>
   ```

   On Windows, try `py` or `python` only when either resolves to an installed interpreter. Otherwise resolve the workspace-bundled Python first. The extractor checks `%USERPROFILE%/.local/share/kilo/kilo.db`, inventories tables/columns, and searches only schema-confirmed text columns for the exact ID. It produces redacted row metadata, not conversation bodies.
3. If the database is absent, unreadable, has no matching row, or has an unfamiliar schema, report that condition. Do not invent KiloCode table names or fallback SQL.
4. For a confirmed session, read only the needed rows locally and reconstruct the chronology from schema-confirmed timestamps/order fields. Then apply the shared [audit protocol](../codex-session-audit/references/audit-protocol.md).
5. Audit KiloCode-relevant sources selectively: `.kilo/rules/`, `kilo.json` when present, and project-wide `AGENTS.md`/`.agents` rules that apply to all agents. Inspect `.codex/` only when a session event or applicable project-wide rule shows that Codex policy governed the KiloCode session. Cite that cross-tool relevance or exclude it from findings.

## Evidence and recommendations

Use the same five missing-access classifications and minimal-change recommendation rules as the Codex session audit skill. Do not treat an SQLite access error as evidence that a credential, tool, or instruction was missing.

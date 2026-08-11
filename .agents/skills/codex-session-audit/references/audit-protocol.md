# Session audit protocol

Use this report structure for both session sources.

Before writing it, state coverage as `complete` only after every extractor page was read. A targeted question may shape emphasis but cannot narrow collection or omit unrelated major failures.

## User-signal ledger

After complete page coverage and before writing findings, build a compact user-signal ledger. Treat the ledger as evidence, not sentiment analysis:

- **User turn/chat/steer signals** — record direct requests, clarifications, corrections, contradictions, or requests to change the workflow. Mark a signal as `code-drift` when the preceding agent action or plan no longer matches the requested observable outcome or an applicable workflow rule.
- **User reactions** — record observable confirmation, escalation, correction, contradiction, or request for a different outcome that follows an agent claim, tool result, or verification claim. A reaction is outcome evidence; it is not, by itself, proof of technical cause or user intent.
- **Pairing** — for each material signal, map the user event to the preceding agent claim/action, the next tool/result when available, the observable outcome, and the judgment (`followed`, `violated`, `incomplete`, `ambiguous`, `harmful`, or `not demonstrated`).
- **Minimum fields** — `signal_id`, timestamp, user event ID, signal type, preceding agent event ID/action, observable outcome, and affected finding IDs. Describe sensitive values without reproducing them.

Include the ledger in the coverage record and use it in the timeline, root-cause mapping, and actionable recommendations. Do not omit a material user signal merely because the agent later recovered; record the original divergence before the recovery.

## Output completeness gate

Return the complete detailed audit to the user. Do not compress it into an executive summary, omit evidence mappings for brevity, or merely state that findings were produced.

For every confirmed material finding, include:

- A stable finding ID and concise title.
- Impact and the observed outcome.
- Session evidence: timestamp plus raw JSONL line/event identifier when available.
- Governing instruction evidence: exact repository-relative file, heading, line number, and the operative sentence. If no applicable instruction existed, say so explicitly.
- Judgment: followed, violated, incomplete, ambiguous, harmful, or not demonstrated to have influenced the session.
- Root cause and classification: reasoning, instruction/workflow, tooling, configuration, credential exposure, or external-state mutation.
- The smallest corrective change: exact target file and insertion/replacement location, proposed wording or logic, why it prevents recurrence, and its context/maintenance trade-off.

Keep distinct failures as distinct findings even when they share a root cause. Do not collapse them into a generic theme. Include recoveries only after recording the original failure and its evidence.

If the complete redacted report cannot fit in one response, write the entire report to a unique temporary Markdown file outside the repository, provide a clickable link, and state exactly which sections are in that artifact. Never silently shorten the report.

## 1. Session summary

- Requested question and source/session ID.
- What the user asked, what the agent attempted, and the first point where the outcome diverged.
- Evidence coverage and limitations (missing/truncated/inaccessible events).
- Coverage ledger: immutable snapshot SHA-256/cutoff, page range, session time range, referenced attachments, requests, decisions, failures, verification, unresolved work, and the user-signal ledger.

## 2. Timeline of key events

List ordered, relevant events only: user instruction, instruction-file read, agent decision, tool discovery/call, result, and verification outcome. Cite event IDs/timestamps where available. Describe sensitive values rather than reproducing them.

## 3. Root-cause analysis

- Direct cause.
- Contributing factors.
- Classification: tooling, configuration, credential exposure, instruction/workflow, or reasoning.
- Confirmed findings vs. labelled hypotheses.
- Map each root-cause claim to the finding IDs and session evidence that establish it.

## 4. Instruction and workflow findings

For each relevant source, cite its path, heading/rule, line number, operative sentence, and evidence that it governed the audited session. State whether it was correct, harmful, incomplete, ambiguous, or not demonstrated to have influenced the session. Exclude source-specific rules for another agent platform unless an event or project-wide rule establishes cross-tool relevance.

## 5. Actionable improvements

For every recommendation provide the smallest useful change, exact target file and insertion/replacement location, proposed wording or logic, why it prevents the observed failure, and a context/maintenance trade-off. Tie it to one or more finding IDs. Avoid broad new rules when reordering or clarifying an existing rule is enough.

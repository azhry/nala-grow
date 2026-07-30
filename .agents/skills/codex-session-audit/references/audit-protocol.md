# Session audit protocol

Use this report structure for both session sources.

Before writing it, state coverage as `complete` only after every extractor page was read. A targeted question may shape emphasis but cannot narrow collection or omit unrelated major failures.

## 1. Session summary

- Requested question and source/session ID.
- What the user asked, what the agent attempted, and the first point where the outcome diverged.
- Evidence coverage and limitations (missing/truncated/inaccessible events).
- Coverage ledger: immutable snapshot SHA-256/cutoff, page range, session time range, referenced attachments, requests, decisions, failures, verification, and unresolved work.

## 2. Timeline of key events

List ordered, relevant events only: user instruction, instruction-file read, agent decision, tool discovery/call, result, and verification outcome. Cite event IDs/timestamps where available. Describe sensitive values rather than reproducing them.

## 3. Root-cause analysis

- Direct cause.
- Contributing factors.
- Classification: tooling, configuration, credential exposure, instruction/workflow, or reasoning.
- Confirmed findings vs. labelled hypotheses.

## 4. Instruction and workflow findings

For each relevant source, cite its path, heading/rule, and evidence that it governed the audited session. State whether it was correct, harmful, incomplete, ambiguous, or not demonstrated to have influenced the session. Exclude source-specific rules for another agent platform unless an event or project-wide rule establishes cross-tool relevance.

## 5. Actionable improvements

For every recommendation provide the smallest useful change, exact target file, why it prevents the observed failure, and a context/maintenance trade-off. Avoid broad new rules when reordering or clarifying an existing rule is enough.

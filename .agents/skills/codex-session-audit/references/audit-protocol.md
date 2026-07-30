# Session audit protocol

Use this report structure for both session sources.

## 1. Session summary

- Requested question and source/session ID.
- What the user asked, what the agent attempted, and the first point where the outcome diverged.
- Evidence coverage and limitations (missing/truncated/inaccessible events).

## 2. Timeline of key events

List ordered, relevant events only: user instruction, instruction-file read, agent decision, tool discovery/call, result, and verification outcome. Cite event IDs/timestamps where available. Describe sensitive values rather than reproducing them.

## 3. Root-cause analysis

- Direct cause.
- Contributing factors.
- Classification: tooling, configuration, credential exposure, instruction/workflow, or reasoning.
- Confirmed findings vs. labelled hypotheses.

## 4. Instruction and workflow findings

For each relevant source, cite its path and heading/rule. State whether it was correct, harmful, incomplete, ambiguous, or not demonstrated to have influenced the session.

## 5. Actionable improvements

For every recommendation provide the smallest useful change, exact target file, why it prevents the observed failure, and a context/maintenance trade-off. Avoid broad new rules when reordering or clarifying an existing rule is enough.

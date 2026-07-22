# Linear issue description template

Use this template when creating a task or when an existing task is too incomplete for another agent to implement safely. Replace every bracketed placeholder and remove sections that genuinely do not apply.

## Category

**[Bug | Feature | Refactor | Chore | Research] — [short category qualifier].**

## Problem analysis

### Reference material

- Preserve any user-supplied HTML, mockups, screenshots, and example data below this section verbatim. Treat it as the visual/behavioral source of truth unless the issue explicitly says otherwise.

### Confirmed findings

1. **[Symptom or missing behavior]** — [evidence, affected route/module, and user impact].
2. **[Cause or implementation gap]** — [evidence and affected path].

### Scope boundary

- In scope: [specific behavior, files, routes, or components].
- Out of scope: [nearby work deliberately excluded].
- Open questions / assumptions: [only unresolved decisions; label assumptions explicitly].

## Implementation plan

1. [Concrete change and expected behavior].
2. [Concrete change and expected behavior].
3. Add or update regression coverage at [unit / integration / E2E seam].

## Definition of Done

- [Observable user or system outcome].
- [Accessibility, data, error, or responsive behavior when relevant].
- [No interactive-looking control is left as a no-op, if this is UI work].
- [Relevant automated tests pass, or pre-existing failures are identified separately].
- [Required delivery artifact: commit, PR, tracker update].

## Correctness checks

- Automated: [exact test suite(s), expected assertions, and test seam].
- Interactive: [desktop/mobile/browser flows, keyboard checks, or API scenarios].
- Visual (when a design reference exists): [desktop and mobile comparison against the supplied reference; content/images/colors/typography/layout checklist].
- Build/lint: [commands or CI checks].
- Known limitations / pre-existing failures: [exact failing command, affected path, and why it is unrelated; or "None known"].

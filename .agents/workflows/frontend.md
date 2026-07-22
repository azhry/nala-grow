# Frontend workflow

Apply this workflow to new or changed UI, including fixes to an existing screen.

## Delegation

Spawn a dedicated frontend implementation subagent. It owns implementation, interaction testing, responsive verification, commit, push, and PR handoff.

## Implementation

- Reproduce supplied designs closely and use meaningful demo data when real data is unavailable.
- Implement all interactions represented by the reference or existing page.
- Do not leave clickable-looking buttons, links, tabs, date controls, menus, modal actions, filters, or exports as no-ops. Implement them, remove them, or deliberately disable them with an explanation.
- Make state-changing controls update an observable UI or data outcome, not only their visual styling.

## Acceptance

- Add regression coverage at the correct seam for each new or repaired interaction.
- Verify the rendered application interactively in a browser at desktop and mobile widths. A screenshot alone is insufficient.
- Exercise every relevant control and assert its expected visible/data result; include open/close, navigation, filtering/date changes, editing/deleting, exports, and error/empty states when present.
- Record focused test results and identify pre-existing failures separately.

## Handoff

Stage only intended files, commit, push, and open or update the PR. Link its URL to the related work item when applicable.

# Frontend PR description template

Use this template for UI, interaction, navigation, accessibility, or responsive work. Replace every bracketed placeholder. Remove a conditional section only when it genuinely does not apply.

The PR must record observable browser evidence, not only component names or screenshots. A successful page load or static screenshot does not prove that controls, state changes, navigation, or responsive behavior work.

## Linked work

- Linear issue: [AZH-000 and URL]
- Parent/source issue: [issue ID and URL, or "None"]
- Design/reference: [URL, attachment, or "None"]
- Depends on / unblocks: [issue or PR IDs, or "None"]

## Summary

- [Observable user outcome.]
- [Navigation, interaction, or data-mapping outcome.]
- [Responsive/accessibility outcome.]

## Scope

### Included

- [Routes, components, controls, states, and viewports changed.]

### Excluded

- [Nearby behavior intentionally not changed.]

## Review and merge order

- Delivery shape: [Single focused PR | Stacked PR | Parallel PR group]
- PR link: [Direct URL for this pull request]
- This PR's review position: [Standalone | PR 1 of N | PR N of N | Parallel member A/B]
- Stack size: [1-3 open PRs in this dependent chain | Not stacked | disclose a pre-existing over-limit stack]
- Base branch: [main or predecessor branch]
- Depends on: [PR/commit and the exact delivered behavior, or "None"]
- Review order: [Exact order, or "Any order within <parallel group>"]
- Merge order and conditions: [Exact merge sequence and prerequisite checks, or "Any order; all required checks green"]
- Parallel group: [Group name and independent members, or "None"]
- Human-verification focus: [The one journey, viewport, or interaction a reviewer should prioritize]

## Affected journeys

Describe normal in-product navigation. Do not use direct route entry as the only evidence when a normal path should exist.

| Entry point | Navigation/actions | Expected outcome | Verified |
| --- | --- | --- | --- |
| [Homepage/login/app entry] | [Pointer and keyboard steps] | [Visible destination/state/data result] | [Desktop/mobile/both] |

## Reference fidelity

Remove this section only when no design, screenshot, HTML, or existing reference applies.

| Reference requirement | Implemented result | Evidence |
| --- | --- | --- |
| Content and example data | [Result] | [Browser observation/screenshot reference] |
| Images/icons | [Result, loading and fallback] | [Evidence] |
| Color and typography | [Result] | [Evidence] |
| Spacing and layout | [Result] | [Desktop/mobile evidence] |
| Interaction states | [Hover/focus/active/disabled/loading/error] | [Evidence] |

## Interaction coverage

List every interactive-looking control affected by the issue.

| Page/control | Action | Observable result | Automated coverage | Interactive evidence |
| --- | --- | --- | --- | --- |
| [Route and label] | [Click/type/keyboard/select] | [Navigation/UI/data change] | [Test name] | [Viewport and result] |

No-op decisions:

- Removed controls: [Control and reason, or "None"]
- Deliberately disabled controls: [Control, visible explanation, and reason, or "None"]
- Remaining no-ops: [Must be "None" unless explicitly accepted by the issue]

## Responsive and accessibility verification

- Desktop viewport(s): [Dimensions and observed result]
- Mobile viewport(s): [Dimensions and observed result]
- Keyboard: [Tab order, activation, escape/close behavior, focus return]
- Screen semantics: [Labels, roles, headings, live/error announcements]
- Contrast/focus visibility: [Result]
- Overflow/touch targets: [Result]

## Data and state behavior

- API/service operations: [Exact GraphQL/REST operations, or "None"]
- Loading state: [Observable behavior]
- Empty state: [Observable behavior]
- Error state: [Observable behavior and recovery]
- State-changing controls: [Result persisted/refetched/reverted]
- Demo/fallback data: [Why used and how it matches the reference, or "None"]

## Visual evidence

- Before: [Artifact/link or "Not applicable"]
- After desktop: [Artifact/link]
- After mobile: [Artifact/link]
- Comparison notes: [Any deliberate deviation and authorization]

Keep generated screenshots and browser traces outside the repository unless the issue explicitly requires committed fixtures.

## Verification

Automated tests, typechecks, lint, and builds are supporting checks. They do not replace interactive browser evidence against the real configured application, and fake records or mock endpoints must not be presented as live acceptance.

### Complete manual flow

For a stacked feature with HTTP/API behavior, put the same complete, ordered
end-to-end curl/request-response sequence here and in every stack PR, as if all
changes were integrated in one PR. Tag each behavior step `Scope: #NN` with its
owning PR, identify this PR's steps, and retain predecessor/later-PR steps as
context without claiming unmerged behavior as implemented or observed. If the
feature has no HTTP/API boundary, put the complete browser journey here instead
and mark the interactions this PR changes. Keep each request independently
pasteable with one expected response; report observed results separately.

[Paste the complete ordered sequence or browser journey here.]

| Command or browser flow | Exit/result | Evidence or assertions |
| --- | ---: | --- |
| [Unit/component command] | [0/nonzero/not run] | [Assertions] |
| [Typecheck command] | [0/nonzero/not run] | [Result] |
| [Lint command] | [0/nonzero/not run] | [Result] |
| [Build command] | [0/nonzero/not run] | [Result] |
| [Playwright/E2E command] | [0/nonzero/not run] | [Journeys and viewports] |
| [Manual desktop/mobile flow] | [Pass/fail] | [Controls and visible results] |

## Known limitations and pre-existing failures

- [Exact command, exit status, affected path, and why it is unrelated; or "None known".]

## Reviewer focus

- [Highest-risk interaction, responsive behavior, or data transformation.]
- [Specific route/component to inspect.]

## Completion self-audit

- [ ] Every issue requirement and every listed control has an implemented outcome or explicit blocker.
- [ ] All normal navigation paths work without fragment links, missing routes, or unexplained disabled controls.
- [ ] Pointer and keyboard behavior were exercised.
- [ ] Desktop and mobile verification are recorded separately.
- [ ] Loading, empty, error, success, and state-changing outcomes are covered where applicable.
- [ ] The rendered result was compared with every applicable reference requirement.
- [ ] Exact unfiltered commands and exit statuses are recorded.
- [ ] Stacked HTTP/API work includes the same complete request/response sequence in every PR, with per-step PR ownership and this PR's scope marked.
- [ ] The active dependent stack contains no more than three open PRs, or the body identifies a pre-existing over-limit stack that is not being extended.
- [ ] Screenshots, traces, logs, and unrelated user files are absent from the diff.
- [ ] The linked Linear issue contains the completed evidence and correct handoff state.

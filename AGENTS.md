# NalaGrow — Agent Instructions

Baby growth tracker for parents.

## Preface

Call me "Boss" every time you respond or reply to me. Making sure you still remember the context of the project.

## Harness First

For delivery work, use `agent-spec-ops` before project coding rules.

1. Do not treat a user prompt as direct implementation while NL-001 is active.
2. Run harness context recovery before edits, tests, task changes, or tool-heavy work.
3. Rework request means return to `task_breakdown`; do not patch code first.
4. Orchestrator must not edit project files or run dev/test during implementation.
5. No Linear task ID and matching active dev/test role means no implementation.
6. Do not edit `workflow-state.json` directly or use generic state-field mutation for status, task, gate, or lease updates.
7. Do not invent subagent/session ids. Record only real spawned agent ids returned by the runtime.

## Stack
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS with custom design tokens
- **Icons**: Material Symbols (Google Fonts)
- **State**: Zustand with `persist` middleware
- **Data fetching**: React Query (`@tanstack/react-query`)
- **Fonts**: Quicksand (headings), Public Sans (body)
- **Testing**: Jest + React Testing Library (unit), Playwright (e2e)
- **Charts**: Recharts

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run lint       # Next.js lint
npm run test:unit  # Jest unit tests
npm run test:e2e   # Playwright e2e tests
```

## Project Structure

```
frontend/
  src/
    app/              # Next.js App Router pages
      layout.tsx      # Root layout — Providers, BottomTabNav, fonts, Material Symbols
      page.tsx        # Landing page (login/signup links)
      globals.css     # Tailwind directives, .bento-card, .soft-shadow, .material-symbols-outlined
      design-system/  # FE-010 component showcase (3 tabs: components, colors, typography)
    components/
      ui/             # Reusable design system components (21 total)
        index.ts      # Re-exports all UI components with types
      layout/         # Layout components
        index.ts      # Re-exports BottomTabNav, DesktopSidebar, TopNavBar
        bottom-tab-nav.tsx  # 5-tab mobile nav (Home, Feeding, Sleep, Milestones, Profile)
    lib/
      api-client.ts   # apiFetch<T>() — generic fetch wrapper with ApiError
      providers.tsx   # QueryClientProvider wrapper
      store.ts        # Zustand store (user, activeBaby, babies) with persist
  e2e/                # Playwright e2e tests
  jest.config.js      # next/jest preset, jsdom, @/ path alias
  jest.setup.ts       # @testing-library/jest-dom import
  playwright.config.ts # 3 viewports (mobile/tablet/desktop) + webServer auto-start
  tailwind.config.ts  # Custom color tokens, fonts, spacing, shadows
```

## Design Tokens

All colors, spacing, typography, and shadows from Stitch design system are defined in `tailwind.config.ts`. Key tokens:

- **Colors**: `primary`, `primary-container`, `surface-*`, `on-surface-*`, `secondary`, `tertiary`, `error`, plus `*-fixed` variants
- **Spacing**: `container-margin` (20px), `gutter` (16px), `stack-sm/md/lg`
- **Font sizes**: `headline-lg/md/sm`, `body-lg/md/sm`, `label-md`
- **Shadows**: `soft` (8px/20px), `soft-lg` (12px/24px)
- **Radius tokens**: `sm` (4px), `DEFAULT` (8px), `md` (12px), `lg` (16px), `xl` (24px)
- See `tailwind.config.ts` for complete list.

## Creating a Component

1. Create `<name>.tsx` in `src/components/ui/` with `"use client"` directive
2. Define interface for props (export it)
3. Use `forwardRef` pattern (see `button.tsx` for reference)
4. Use Tailwind classes with design tokens (not hardcoded colors)
5. Use Stitch-compatible font aliases: `font-headline-*` for Quicksand headings, `font-body-*` and `font-label-md` for Public Sans text. Always pair with matching `text-*` size class.
6. Icons use Material Symbols: `<span className="material-symbols-outlined">{iconName}</span>`
6. Fill/font-weight variants: `<span className="material-symbols-outlined fill-1">{iconName}</span>`
7. Add export + type export to `src/components/ui/index.ts`
8. Unit test in `src/components/ui/__tests__/<name>.test.tsx`:
   - Import from `@/components/ui` (use barrel index)
   - Use `render`, `screen.getByText`, `describe`/`it`
   - Use `toHaveClass`, `toBeInTheDocument` from jest-dom
   - Use `container.firstChild` for root element assertions
   - Follow existing test patterns (e.g., `button.test.tsx`, `timer.test.tsx`)
9. Create test → commit → PR → merge

### Component Conventions
- `className?: string` prop merged via array join pattern
- `children?: React.ReactNode` for wrapper components
- Variants defined as string literal union types (e.g., `"primary" | "secondary"`)
- Variant class maps as `Record<VariantType, string>`
- Loading/disabled states: `disabled:opacity-50 disabled:cursor-not-allowed`
- Press effect: `active:scale-[0.98]`
- All components have a `displayName` when using `forwardRef`

## Creating a Page

1. Create directory `src/app/<route>/` with `page.tsx`
2. If interactive: `"use client"` directive
3. Layout provides: `Providers` (React Query), `BottomTabNav`, safe-area padding
4. Container: `max-w-lg mx-auto` (mobile-first, centered)
5. Use UI components via `import { Button, Card } from "@/components/ui"`
6. State: Zustand with `useAppStore` or local `useState`
7. Data fetching: React Query hooks with `apiFetch<T>()`
8. Test E2E in `e2e/` with Playwright

## Testing Conventions

### Unit Tests (Jest + Testing Library)
- `npm run test:unit` — runs all `**/__tests__/**`
- `npx jest --no-cache --verbose` — full output with names
- `screen.getByText()`, `.getByRole()`, `.getByTestId()` for queries
- `container.firstChild` for root element assertions
- Fake timers: `jest.useFakeTimers()` + `jest.advanceTimersByTime()`
- Multiple renders per test: use separate `unmount()` + `render()` (rerender does not re-init useState)
- CSS class selection: `toHaveClass()` for simple classes, `container.querySelectorAll()` with `Array.from().find()` for escaped Tailwind classes

### E2E Tests (Playwright)
- `npm run test:e2e` — runs all `e2e/**`
- Three viewports: mobile (iPhone 14), tablet (768×1024), desktop
- Test against localhost:3000 (auto-started by webServer config)

## State Management

```ts
const { user, activeBaby, babies, setUser, setActiveBaby, setBabies } = useAppStore()
```

- Persisted to localStorage under key `nalagrow-store`
- BabyProfile: `{ id, name, dob, sex, photo_url? }`

## API Client

```ts
import { apiFetch, ApiError } from "@/lib/api-client"
const data = await apiFetch<ResponseType>("/path", { method: "POST", body })
```

- Base URL from `NEXT_PUBLIC_API_URL` or defaults to `/api/v1`
- Throws `ApiError` with `status`, `message`, `traceId`

## Coding Workflow
1. Do one task each time.
2. Test after each task. Proceed to the next task if all test passes and being told to proceed.
3. When tests fail, fix and test again until it passes. 
4. Document changes in the same task.
5. Create a PR after completing the task.
7. When you think the task is done, ask me to review the changes.

## Frontend Rules
1. If you are using agent-spec-ops harness when developing the UI, make sure the design is pixel-perfect as the design in the runs/xx-xxx/design-assets directory you are currently working on.
2. Make sure the fonts, typography, color codes, sizings, spacing, shadows and etc are all following the design assets.
3. Make sure all the CSS and Tailwind rules worked and applied.
4. Make sure all the Tailwind classes you use exist, and its CSS is following the design assets
5. Make sure all the icons exists
6. Make sure the design system provide all the components from design assets 
7. Please do visual tests after making UI changes
8. Don't cheat the test scripts

## Git Workflow

1. Branch from `main`: `git checkout -b <short-description>`
2. Commit: `git add . && git commit -m "scope: description"`
3. Push: `git push origin <branch>`
4. PR with sections: Summary, Changes, Screenshots (if UI), Testing, Related Issues
5. Merge squash to main
6. Never push directly to `main`

<!-- agent-spec-ops:managed:start -->
## Agent Spec Ops Context

This project is managed by the `agent-spec-ops` harness. Treat this
managed block as the compact recovery packet for new sessions, role
handoffs, and context compaction.

### Current Delivery

- Delivery: NL-001
- Title: NalaGrow
- State: implementation_in_progress
- Last updated: 2026-07-04T23:01:35.738Z
- Harness path from this repo: `../my-harnesses/agent-spec-ops`
- Workflow state: `../my-harnesses/agent-spec-ops/runs/NL-001/workflow-state.json`
- Run directory: `../my-harnesses/agent-spec-ops/runs/NL-001/`

### Required Session Start

Run this before acting, after compaction, after interruption, and after any
state change made outside the current shell:

```bash
cd ../my-harnesses/agent-spec-ops
node scripts/read-context.js runs/NL-001/workflow-state.json --role orchestrator
node scripts/read-instructions.js runs/NL-001/workflow-state.json --role orchestrator
node scripts/validate-state.js runs/NL-001/workflow-state.json
```

If a transition script reports stale context, rerun the two commands above.

### Non-Negotiable Workflow

- Do not treat a user prompt as direct coding work while this run is active.
- If the user requests rework, stop implementation and route back to `task_breakdown`.
- Do not keep task, gate, credential, or design knowledge only in chat.
- Do not edit `workflow-state.json` directly.
- Do not use generic state-field mutation for status, task, gate, or lease updates.
- Use `record-event.js` only for evidence, decisions, blockers, and corrections.
- Use `transition.js` for top-level state transitions.
- Use `transition-task.js` for task status transitions.
- Use Linear as the task system of record when `LINEAR_API_KEY` is configured.
- Before implementation, every task must have a Linear issue ID.
- Dev tasks require test evidence, pushed branch, MR URL, passed MR status comment, and merged MR evidence before `verified`.
- After test failure, return to dev. After three dev/test loops, stop and ask the user to intervene.
- Orchestrator may not edit project files or run dev/test directly during implementation.
- Task transitions require a matching recorded subagent lease from `record-agent-spawn.js`.
- Test results require `testing` status and a matching test-agent lease.
- `submit-task.js` refuses unrelated dirty files instead of staging the whole worktree.
- Do not create a recurring spawn watcher unless a human explicitly asks for unattended background orchestration.

### Agent Dispatch

When `agent_dispatch.spawn_requests[]` contains planned requests:

- Use the available multi-agent spawn tool with the exact request prompt, then record the real returned/visible runtime id with `record-agent-spawn.js`.
- Never invent, synthesize, or reuse subagent/session ids for leases.

Useful commands:

```bash
cd ../my-harnesses/agent-spec-ops
node scripts/read-context.js runs/NL-001/workflow-state.json --role orchestrator
node scripts/plan-agent-dispatch.js runs/NL-001/workflow-state.json --enable-auto
node scripts/record-agent-spawn.js runs/NL-001/workflow-state.json <SPAWN_ID> <AGENT_ID>
```

### Linear Task Creation

Create task breakdown entries through the harness flow, then sync to Linear:

```bash
cd ../my-harnesses/agent-spec-ops
node scripts/sync-linear-task.js runs/NL-001/workflow-state.json --create
node scripts/validate-state.js runs/NL-001/workflow-state.json
```

If task graph state is missing, stop and return to `task_breakdown` before attempting Linear sync.

### Design Assets

- Status: ready_for_review
- Harness path: `runs/NL-001/design-assets/`
- Path from this repo: `../my-harnesses/agent-spec-ops/runs/NL-001/design-assets`
- Source URL: https://stitch.withgoogle.com/projects/13883788626783334810
- Evidence: Designs available via Stitch companion app (app-companion-430619.appspot.com). JSON-RPC export returns the companion viewer which renders screens dynamically. For implementation, reference the companion URL for interactive design preview.

### Approved Write Scope

| Task | Role | Status | Allowed repos | Allowed paths |
| --- | --- | --- | --- | --- |
| FE-001 | frontend_dev | verified | nala-grow | frontend/, frontend/** |
| FE-002 | frontend_dev | verified | nala-grow | frontend/, frontend/** |
| FE-003 | frontend_dev | verified | nala-grow | frontend/, frontend/** |
| FE-004 | frontend_dev | verified | nala-grow | frontend/, frontend/** |
| FE-005 | frontend_dev | planned | nala-grow | frontend/, frontend/** |
| FE-006 | frontend_dev | planned | nala-grow | frontend/, frontend/** |
| FE-007 | frontend_dev | planned | nala-grow | frontend/, frontend/** |
| FE-008 | frontend_dev | planned | nala-grow | frontend/, frontend/** |
| FE-009 | frontend_dev | planned | nala-grow | frontend/, frontend/** |
| BE-001 | backend_dev | planned | nala-grow | backend/, backend/** |
| BE-002 | backend_dev | planned | nala-grow | backend/, backend/** |
| BE-003 | backend_dev | planned | nala-grow | backend/, backend/** |
| BE-004 | backend_dev | planned | nala-grow | backend/, backend/** |
| BE-005 | backend_dev | planned | nala-grow | backend/, backend/** |
| BE-006 | backend_dev | planned | nala-grow | backend/, backend/** |
| BE-007 | backend_dev | planned | nala-grow | backend/, backend/** |
| BE-008 | backend_dev | planned | nala-grow | backend/, backend/** |
| IN-001 | orchestrator | planned | nala-grow | ./ |
| FE-010 | frontend_dev | verified | nala-grow | frontend/, frontend/** |
| QT-001 | frontend_test | verified | nala-grow | frontend/ |
| QT-002 | frontend_test | verified | nala-grow | frontend/ |
| QT-003 | frontend_test | verified | nala-grow | frontend/ |
| QT-004 | frontend_test | verified | nala-grow | frontend/ |
| QT-005 | frontend_test | verified | nala-grow | frontend/ |
| QT-006 | frontend_test | verified | nala-grow | frontend/ |
| QT-007 | frontend_test | verified | nala-grow | frontend/ |
| QT-008 | frontend_test | verified | nala-grow | frontend/ |
| QT-009 | frontend_test | verified | nala-grow | frontend/ |
| QT-010 | frontend_test | verified | nala-grow | frontend/ |
| QT-011 | frontend_test | verified | nala-grow | frontend/ |
| QT-012 | frontend_test | verified | nala-grow | frontend/ |
| QT-013 | frontend_test | verified | nala-grow | frontend/ |
| QT-014 | frontend_test | verified | nala-grow | frontend/ |
| QT-015 | frontend_test | verified | nala-grow | frontend/ |
| QT-016 | frontend_test | verified | nala-grow | frontend/ |
| QT-017 | frontend_test | verified | nala-grow | frontend/ |
| QT-018 | frontend_test | planned | nala-grow | frontend/ |
| QT-019 | frontend_test | verified | nala-grow | frontend/ |
| QT-020 | frontend_test | planned | nala-grow | frontend/ |
| QT-021 | frontend_test | planned | nala-grow | frontend/ |
| QT-022 | frontend_test | planned | nala-grow | frontend/ |
| QT-023 | frontend_test | verified | nala-grow | frontend/ |
| QT-024 | frontend_test | planned | nala-grow | frontend/ |
| QT-025 | frontend_test | verified | nala-grow | frontend/ |
| FE-011 | frontend_dev | verified | nala-grow, frontend | frontend/, frontend/** |
| FE-012 | frontend_dev | verified | nala-grow, frontend | frontend/, frontend/** |

Before writing project files, verify scope:

```bash
cd ../my-harnesses/agent-spec-ops
node scripts/check-write-scope.js runs/NL-001/workflow-state.json <TARGET_PATH> orchestrator
```

Tests must be recorded by the matching test role after the task enters `testing`:

```bash
cd ../my-harnesses/agent-spec-ops
node scripts/record-test-results.js runs/NL-001/workflow-state.json --task <TASK_ID> --status passed --role <TEST_ROLE> --command "<COMMAND>" --output "..." --mr-comment-url "<URL>" --mr-comment-evidence "posted passed status" --merged --merge-commit "<SHA>" --merge-evidence "MR merged"
```

### Current Tasks

| ID | Role | Status | Linear | Title |
| --- | --- | --- | --- | --- |
| FE-001 | frontend_dev | verified | 6ea895b2-4ae1-45a7-b429-2d68b4bdeab8 | Frontend scaffold — Next.js 14 + Tailwind + PWA |
| FE-002 | frontend_dev | verified | ade26bbc-060c-4d59-b99f-f613be9e6af6 | Auth screens — login, signup, password reset |
| FE-003 | frontend_dev | verified | 1cc8205f-c5e7-46e4-b10f-7e09c0d0a0dd | Baby profile management |
| FE-004 | frontend_dev | verified | d357b485-07ba-4f61-ac14-c02b1457020e | Dashboard with summary cards and quick log |
| FE-005 | frontend_dev | planned | a44fedc1-ca41-465b-8c23-33a7ddc9c837 | Growth tracking — measurements and WHO charts |
| FE-006 | frontend_dev | planned | 7f517771-aabe-46e5-b259-99c69695e341 | Feeding log — breast, bottle, solids with timers |
| FE-007 | frontend_dev | planned | 7e2f5942-b120-4bde-877a-eb7559fde17c | Sleep tracking with timer and timeline |
| FE-008 | frontend_dev | planned | 8f895fd1-ec5f-42ef-8c03-3f0ff376c06c | Milestones timeline |
| FE-009 | frontend_dev | planned | fb60e50a-badb-4732-b975-d6c1862b3f4a | Export — PDF growth report and CSV data |
| BE-001 | backend_dev | planned | ea1b3638-8d6b-4535-bbbb-37062fbf2802 | Backend scaffold — FastAPI + PostgreSQL + Alembic |
| BE-002 | backend_dev | planned | 90bc8b69-d805-4e88-abe8-1a5e1b05a2be | Auth API — signup, login, OAuth, password reset |
| BE-003 | backend_dev | planned | d788a562-cabc-4588-a628-3dcdd5b1b5a9 | Baby profiles API |
| BE-004 | backend_dev | planned | 2bfcb7df-fb4f-439a-a509-7fc6286896ec | Growth measurements and WHO percentile API |
| BE-005 | backend_dev | planned | 458e6fb2-c4a5-4449-bd47-b1f1d75c3206 | Feeding log API |
| BE-006 | backend_dev | planned | f6fe7732-142a-46d5-9d36-8211d54320c0 | Sleep log API |
| BE-007 | backend_dev | planned | 83c8eae0-180c-43ea-803b-567be2674720 | Milestones API |
| BE-008 | backend_dev | planned | 44635de0-31d6-4a0c-b6a8-3d25690095cf | Export API — PDF and CSV generation |
| IN-001 | orchestrator | planned | bd2ac05a-e438-4727-8ec7-3425676d8083 | Docker compose and deployment configuration |
| FE-010 | frontend_dev | verified | 7e954e62-f708-4457-a160-1fbd1b948b2a | Design component library — translate Stitch into composable React components |
| QT-001 | frontend_test | verified | 709391db-2885-47c8-8744-81e39a1788d1 | Install & configure Jest + React Testing Library |
| QT-002 | frontend_test | verified | 516cfc19-c191-424a-bfd3-351a68546bd1 | Install & configure Playwright |
| QT-003 | frontend_test | verified | c73409ea-b915-480d-86c5-662e15cf3f83 | Add test:unit and test:e2e npm scripts |
| QT-004 | frontend_test | verified | ccd73b95-0e1d-4096-95db-30a914b12ea2 | Configure GitHub Actions for automated test runs |
| QT-005 | frontend_test | verified | f2cee8da-cea6-406c-b217-179e75bdcfc5 | Button unit tests |
| QT-006 | frontend_test | verified | efba2b01-b299-45c3-af75-783b1df9a441 | Input unit tests |
| QT-007 | frontend_test | verified | 67629d1e-bd85-4721-88e9-1be6ac53f815 | Card unit tests |
| QT-008 | frontend_test | verified | 3989cbd5-455b-46d3-8edb-de0a8f7d9741 | Chip unit tests |
| QT-009 | frontend_test | verified | 70ccbdf4-8d9a-4b11-b7aa-e4a4573e404f | Avatar unit tests |
| QT-010 | frontend_test | verified | aa329f19-e502-4376-9bdf-ac59e5d423df | SegmentedControl unit tests |
| QT-011 | frontend_test | verified | 38b1c6f9-54d2-4555-a946-c4ef1de3da35 | Timer unit tests |
| QT-012 | frontend_test | verified | 1e3d7f9c-78d2-42af-8f5c-d61f2b70cbda | ProgressBar unit tests |
| QT-013 | frontend_test | verified | 43fb867a-d37c-4129-84f6-39e8eca6c9ac | FAB unit tests |
| QT-014 | frontend_test | verified | c36941b2-3bb0-45d1-b53b-203fea38e184 | SuccessOverlay unit tests |
| QT-015 | frontend_test | verified | 355cf0de-2802-45e7-9f6b-44f4b30c841d | StatCard unit tests |
| QT-016 | frontend_test | verified | 387b620d-3145-4064-b508-09be9be5625d | Timeline unit tests |
| QT-017 | frontend_test | verified | 336cb618-90e2-4583-97f9-d733d64e4ffe | Spinner unit tests |
| QT-018 | frontend_test | planned | 87f4f5f0-a3f3-4dd2-9d23-5aedff704eda | Home page E2E smoke test |
| QT-019 | frontend_test | verified | 38763cb2-66dc-481e-a9d5-edc0b8f9cf59 | Design System page E2E smoke test |
| QT-020 | frontend_test | planned | c4e98170-f7bd-4b83-8ed4-153a217140aa | Hydration mismatch test |
| QT-021 | frontend_test | planned | 0fdd2750-2b1e-4140-b02a-c3adb2c7f5c4 | Responsive layout test |
| QT-022 | frontend_test | planned | 0ec02959-5e37-44cc-93ea-c29e7bf207d8 | Bottom tab navigation rendering test |
| QT-023 | frontend_test | verified | 393fc71f-5b87-495f-a326-47642f6b2f13 | Visual regression infrastructure |
| QT-024 | frontend_test | planned | d450c542-fe27-4b2e-a843-2cfb2c5a24f2 | Home page visual baseline |
| QT-025 | frontend_test | verified | 3772873c-e82c-41e4-bf8f-bb178b40feaa | Design System page visual baseline |
| FE-011 | frontend_dev | verified | 052eb0a8-5187-4cfd-88d0-0b517218c5b2 | Remove auth barriers for no-backend development |
| FE-012 | frontend_dev | verified | 433faf3c-f32c-4acc-ae73-c6acb8e0790b | Fix login page left side background per Stitch design |

### Durable Knowledge

- process_rule: FE-004 Dashboard: Created dashboard page with hero greeting, horizontal quick-action pills, bento summary cards, activity feed, daily insight card, and mobile FAB. Matches all three Stitch dashboard design variants.
- process_rule: FE-010 rework: Fixed design-tokens.ts letterSpacing for headline-lg (-0.02em), headline-lg-mobile (-0.01em), label-md (0.05em).
- process_rule: FE-002 rework: Replaced Google OAuth img tag with inline SVG (4 color paths: #4285F4, #34A853, #FBBC05, #EA4335) per Stitch login design.
- event knowledge_recorded: Knowledge recorded: FE-010 rework: Fixed design-tokens.ts letterSpacing for headline-lg (-0.02em), headline-lg-mobile (-0.01em), label-md (0.05em).
- event knowledge_recorded: Knowledge recorded: FE-002 rework: Replaced Google OAuth img tag with inline SVG (4 color paths: #4285F4, #34A853, #FBBC05, #EA4335) per Stitch login design.
- event task_complete: All 3 rework tasks FE-010, FE-002, FE-004 verified
- event artifact_generated: Generated project AGENTS.md for NL-001
- event artifact_generated: Generated project AGENTS.md for NL-001

Record durable project learning with:

```bash
cd ../my-harnesses/agent-spec-ops
node scripts/record-knowledge.js runs/NL-001/workflow-state.json --kind process_rule --status candidate --statement "..." --rationale "..."
```

### Keep This File Fresh

After planning changes, task sync, design fetches, major implementation work,
or final review updates, regenerate this managed block:

```bash
cd ../my-harnesses/agent-spec-ops
node scripts/generate-project-agents.js runs/NL-001/workflow-state.json --project-repo ../../nala-grow --role orchestrator
```

Generated by agent-spec-ops at 2026-07-04T23:02:09.257Z.
<!-- agent-spec-ops:managed:end -->


# NalaGrow — Agent Instructions

Baby growth tracker for parents.

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
      ui/             # Reusable design system components (14 total)
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
5. Icons use Material Symbols: `<span className="material-symbols-outlined">{iconName}</span>`
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

## Frontend Workflow
1. If you are using agent-spec-ops harness when developing the UI, make sure the design is pixel-perfect as the design in the runs/xx-xxx/design-assets directory you are currently working on.
2. Make sure the fonts, typography, colors, sizings, spacing, shadows and etc are all following the design system.
3. Make sure all the CSS and Tailwind rules worked and applied.
4. Please do visual tests after making UI changes
5. Don't cheat the test scripts

## Git Workflow

1. Branch from `main`: `git checkout -b <short-description>`
2. Commit: `git add . && git commit -m "scope: description"`
3. Push: `git push origin <branch>`
4. PR with sections: Summary, Changes, Screenshots (if UI), Testing, Related Issues
5. Merge squash to main
6. Never push directly to `main`

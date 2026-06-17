---
phase: 12-dashboard-rendering-layout-switcher
plan: 2
subsystem: dashboard-ui
tags: [dashboard, react, dexie, chips, shortcuts, aria, tdd, pwa]
dependency_graph:
  requires:
    - 12-01 (DEFAULT_SHORTCUT_CONFIG, activeLayoutRepository, useActiveLayoutName)
    - src/services/configRepository.ts (configRepository, useShortcutConfig)
    - src/config/shortcutConfig.ts (resolveShortcutIcon, Layout, Shortcut types)
    - src/components/ui/cn.ts (cn helper)
  provides:
    - src/index.css (.no-scrollbar utility)
    - src/components/dashboard/LayoutChips.tsx (LayoutChips component)
    - src/components/dashboard/ShortcutRow.tsx (ShortcutRow component)
    - src/pages/DashboardPage.tsx (seeding effect + chips + rows wired to reactive config)
  affects:
    - 13-* (ShortcutRow onClick is the Phase 13 capture seam)
    - 15-* (LayoutChips "+ New" disabled button is the Phase 15 authoring entry point)
tech_stack:
  added: []
  patterns:
    - One-shot useEffect + configRepository.get() (not the hook) for idempotent first-run seeding
    - aria-pressed on plain buttons (not role=tablist) for mobile-first chip switcher
    - useLiveQuery reactive reads with undefined guard (config !== undefined) to avoid loading flash
    - resolveShortcutIcon allow-list pattern for safe dynamic icon resolution
    - .no-scrollbar CSS utility (two lines) for WebKit + standard scrollbar hiding
key_files:
  created:
    - src/components/dashboard/LayoutChips.tsx
    - src/components/dashboard/ShortcutRow.tsx
  modified:
    - src/index.css
    - src/pages/DashboardPage.tsx
    - src/pages/DashboardPage.test.tsx
decisions:
  - "Shortcut row accessible name is composite (name + dslTemplate text); tests use /^Name/ regex rather than exact string — avoids forced aria-label, keeps visual and semantic content aligned"
  - "config !== undefined guard renders shortcut section as null during loading — no layout shift, keeps existing nav always visible below"
  - "ShortcutRow onClick is an inert no-op with // TODO Phase 13 comment — no parseDSL/ReviewPage import added in this plan"
  - "LayoutChips '+ New' button is disabled with // TODO Phase 15 comment — renders but does nothing"
  - "All config-derived strings rendered as React text nodes (never dangerouslySetInnerHTML) per T-12-03 mitigation"
metrics:
  duration: ~4min
  completed: 2026-06-17
  tasks_completed: 2
  files_modified: 5
---

# Phase 12 Plan 2: Dashboard UI — Chips + Rows Summary

**One-liner:** Variant B dashboard with horizontally-scrollable aria-pressed layout chips, full-width Heroicons shortcut rows, and one-shot first-run seeding — all wired to reactive Dexie config with fallback-to-first-layout logic.

## What Was Built

### Task 1: .no-scrollbar + LayoutChips + ShortcutRow (presentational layer)

**`src/index.css`** — appended `.no-scrollbar` utility after `@theme` block:
- `.no-scrollbar::-webkit-scrollbar { display: none; }` (Chrome/Safari/WebKit)
- `.no-scrollbar { scrollbar-width: none; }` (Firefox/standard)

**`src/components/dashboard/LayoutChips.tsx`** — exports `LayoutChips`:
- Props: `{ layouts: Layout[]; activeLayoutName: string | undefined; onSelect: (name: string) => void }`
- Scrollable container `overflow-x-auto no-scrollbar` with `aria-label="Layout switcher"`
- One `<button type="button" aria-pressed={...}>` per layout with `cn()` active/inactive styling
- Trailing disabled `+ New` button with `border-dashed` (TODO Phase 15 comment)
- No `role="tablist"`; no `dangerouslySetInnerHTML`

**`src/components/dashboard/ShortcutRow.tsx`** — exports `ShortcutRow`:
- Props: `{ shortcut: Shortcut; onClick: () => void }`
- Full-width `<button type="button">` with `min-h-[64px]`, muted border variant
- Icon resolved via `resolveShortcutIcon(shortcut.icon)` (allow-list, BoltIcon fallback)
- Two-line body: `shortcut.name` (semibold) + `shortcut.dslTemplate` (font-mono, dim)
- No `dangerouslySetInnerHTML`

### Task 2: DashboardPage wired (TDD RED → GREEN)

**`src/pages/DashboardPage.tsx`** — extended with:
- `useEffect` one-shot seeding: `configRepository.get()` check + conditional `put(DEFAULT_SHORTCUT_CONFIG)` with `cancelled` cleanup flag
- Reactive state: `useShortcutConfig()` + `useActiveLayoutName()` + `layouts.find(l => l.name === persistedLayoutName) ?? layouts[0]` fallback
- `handleLayoutSelect(name)` async handler calling `activeLayoutRepository.put(name)`
- Guard: `{config !== undefined && (<LayoutChips ...> + shortcut rows)}` — null during loading
- Existing Quick Capture / domain tiles / View All Entries links preserved unchanged

**`src/pages/DashboardPage.test.tsx`** — 13 tests (all new):
- Seeding: fresh install seeds DayToDay chip; existing config not overwritten on remount
- Chips: active chip has `aria-pressed="true"`; `+ New` chip is disabled
- Switch: clicking Travel chip shows Taxi shortcut + persists via `activeLayoutRepository`
- Rows: Coffee and Groceries buttons render (regex `/^Coffee/` matches composite accessible name)
- Nav regression: Media/Trips/Expenditures tiles present; 5 links total; /capture, /d/media, /entries hrefs correct

## Verification

- `pnpm vitest run src/pages/DashboardPage.test.tsx` — 13/13 passing
- `pnpm vitest run` — 331/331 passing (32 test files)
- `pnpm tsc -b` — clean
- `git diff --stat src/services/db.ts` — no changes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Shortcut row accessible name is composite (name + dslTemplate)**
- **Found during:** Task 2 RED→GREEN — tests using `getByRole('button', { name: 'Coffee' })` failed because the button's accessible name is "Coffee expense 5:coffee" (includes dslTemplate text)
- **Fix:** Updated 3 test assertions to use regex prefix matching (`/^Coffee/`, `/^Groceries/`, `/^Taxi/`) which match buttons whose accessible name starts with the shortcut name. The ShortcutRow component design is unchanged — composite text content is the correct and accessible behavior.
- **Files modified:** `src/pages/DashboardPage.test.tsx`
- **Commit:** included in 08ac01c

**2. [Rule 1 - Bug] Unused `act` import caused TS6133 error**
- **Found during:** Task 2 after GREEN — `pnpm tsc -b` reported `act` declared but never read
- **Fix:** Removed `act` from the `@testing-library/react` import; `userEvent.setup()` wraps async actions internally so `act()` is not needed directly
- **Files modified:** `src/pages/DashboardPage.test.tsx`
- **Commit:** included in 08ac01c

## Known Stubs

- **ShortcutRow onClick** (`src/pages/DashboardPage.tsx`) — inert no-op `() => { /* TODO Phase 13: capture seam */ }`. Intentional Phase 13 seam; will be wired to parseDSL/capture flow in Phase 13.
- **LayoutChips "+ New" button** (`src/components/dashboard/LayoutChips.tsx`) — `disabled` placeholder. Intentional Phase 15 seam; authoring tool entry point deferred to Phase 15.

These stubs do not prevent the plan's goal: users can see and switch layouts, shortcuts are visible, and the seeding works. They are boundary stubs for future phases.

## Threat Flags

None. All config-derived strings rendered as React text nodes (T-12-03 mitigated). Icons resolved via `resolveShortcutIcon` allow-list (T-12-04 mitigated). ShortcutRow onClick is inert (T-12-05 mitigated). No `parseDSL`, `buildReviewDraft`, or `ReviewPage` imported.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 488b0e3 | feat(12-02): add .no-scrollbar CSS utility + LayoutChips + ShortcutRow components |
| 2 (RED+GREEN) | 08ac01c | feat(12-02): wire DashboardPage — seeding, chips, shortcut rows + tests (DASH-01/02/03) |

## Self-Check: PASSED

- [x] `src/index.css` contains 2 `.no-scrollbar` rules
- [x] `src/components/dashboard/LayoutChips.tsx` exports `LayoutChips`
- [x] `src/components/dashboard/ShortcutRow.tsx` exports `ShortcutRow`
- [x] `src/pages/DashboardPage.tsx` contains seeding effect (`DEFAULT_SHORTCUT_CONFIG`, `cancelled`)
- [x] `src/pages/DashboardPage.tsx` contains `layouts.find` and `?? layouts[0]` fallback
- [x] `src/pages/DashboardPage.tsx` contains `activeLayoutRepository.put`
- [x] `src/pages/DashboardPage.tsx` does NOT import `parseDSL`, `buildReviewDraft`, or `ReviewPage`
- [x] 331 tests passing (32 files); 13 DashboardPage tests all pass
- [x] `pnpm tsc -b` clean
- [x] `db.ts` unchanged
- [x] Commits 488b0e3 and 08ac01c present in git log

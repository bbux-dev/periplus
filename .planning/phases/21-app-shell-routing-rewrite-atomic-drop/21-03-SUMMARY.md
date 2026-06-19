---
phase: 21-app-shell-routing-rewrite-atomic-drop
plan: "03"
subsystem: ui-shell
tags: [routing, app-shell, activeMode, trip-only, refactor]
dependency_graph:
  requires: [21-02]
  provides: [21-04]
  affects: [src/App.tsx, src/components/layout/AppShell.tsx, src/services/activeMode.ts]
tech_stack:
  added: []
  patterns: [trip-only-router, declarative-nav, catch-all-404]
key_files:
  created: []
  modified:
    - src/services/activeMode.ts
    - src/services/activeMode.test.tsx
    - src/components/layout/AppShell.tsx
    - src/components/layout/AppShell.test.tsx
    - src/App.tsx
    - src/App.test.tsx
decisions:
  - "AppShell hamburger contains exactly Home / Previous Trips / Settings — no domain-tree or mode-switcher"
  - "App bar center shows activeMode.label only when activeMode.mode === 'trip'"
  - "App.tsx imports only TripHomePage, CreateTripPage, SettingsPage, PlaceholderPage — zero dead imports"
  - "Phase 22-24 route targets are PlaceholderPage stubs with descriptive titles"
  - "AppShell.test.tsx fully rewritten to match new trip-only nav (Rule 1 auto-fix)"
metrics:
  duration: "4 min"
  completed: "2026-06-19"
  tasks: 2
  files_modified: 6
---

# Phase 21 Plan 03: AppShell + App Router Trip-Only Rewrite Summary

**One-liner:** Trip-only AppShell (hamburger=Home/Previous Trips/Settings, app bar shows trip name) and App.tsx router with TripHomePage/CreateTripPage/SettingsPage + PlaceholderPage catch-all for 404 and Phase 22-24 stubs.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove listModes/ShortcutConfig from activeMode.ts; rewrite AppShell to trip-only nav | af61417 | activeMode.ts, activeMode.test.tsx, AppShell.tsx |
| 2 | Rewrite App.tsx to trip-only routes; replace App.test.tsx | b2e51c3 | App.tsx, App.test.tsx, AppShell.test.tsx |

## What Was Built

### activeMode.ts
- Removed `import type { ShortcutConfig }` (line 3)
- Removed `listModes(config: ShortcutConfig): string[]` function (lines 92-95)
- All other exports (useActiveMode, activateMode, defaultInstanceLabel, activeModeRepository, ActiveMode interface) kept intact

### activeMode.test.tsx
- Removed `listModes` from import list
- Removed `import type { ShortcutConfig }` import
- Removed `makeConfig()` helper (only used by listModes tests)
- Deleted `describe('listModes', ...)` block (2 tests)
- 15 remaining tests all green

### AppShell.tsx (rewrite)
- Dropped imports: NAVIGATION, Input, useShortcutConfig, activateMode, defaultInstanceLabel, listModes, ChevronDownIcon
- Kept imports: useState, useEffect, useRef, useLocation, useNavigate, Link, HomeIcon, Bars3Icon, cn, useActiveMode
- Dropped state: expanded, modeSubmenuOpen, pendingMode, pendingLabel
- Dropped handlers: resetModeMenu, selectPendingMode, confirmPendingMode, toggleDomain
- Kept: Escape + outside-click effects verbatim; sticky header; left home button; right hamburger
- CENTER: `activeMode?.mode === 'trip'` conditional shows trip label (was unconditional `activeMode.mode · activeMode.label`)
- DROPDOWN: exactly 3 Link elements — Home (/), Previous Trips (/trips), Settings (/settings)
- Removed: Active Mode submenu, domain-tree navigation (NAVIGATION map)

### App.tsx (rewrite)
- Imports: Routes, Route, AppShell, PlaceholderPage, SettingsPage, TripHomePage, CreateTripPage
- Zero imports of deleted pages
- Routes: `/` → TripHomePage, `/create-trip` → CreateTripPage, `/settings` → SettingsPage
- PlaceholderPage stubs: /expense, /activity, /activity/:type, /trips, /trips/:tripId
- Catch-all: `path="*"` → `<PlaceholderPage title="Page Not Found" />` (T-21-04 mitigation)

### App.test.tsx (replacement)
- Trip home route: loading state + redirect to /create-trip when no active trip
- Create trip route: heading renders
- Settings route: heading + Export JSON button
- Placeholder routes: /expense, /activity, /trips
- Catch-all 404: unknown paths render "Page Not Found" heading + Go back button
- 11 tests, all green

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rewrite AppShell.test.tsx to match new trip-only nav**
- **Found during:** Task 2, full suite run
- **Issue:** `src/components/layout/AppShell.test.tsx` (not in the plan's files_modified list) still tested the removed Active Mode submenu, Dashboard/Entries/Manage Shortcuts links, domain-tree expansion, and `mode · label` center display. 14 tests failed immediately after the AppShell rewrite.
- **Fix:** Rewrote AppShell.test.tsx: home button tests, hamburger toggle, trip-only menu contents (Home/Previous Trips/Settings), close behaviors (link click / Escape / outside click), app bar trip name display (mode==='trip' shows label; non-trip mode does not).
- **Files modified:** src/components/layout/AppShell.test.tsx
- **Commit:** b2e51c3

## Verification

- `npx tsc -b` — clean (no output)
- `npx vitest run` — 622 tests passed, 48 test files, 0 failures
- `grep -nE "listModes|ShortcutConfig" src/services/activeMode.ts` — CLEAN
- `grep -nE "listModes" src/services/activeMode.test.tsx` — CLEAN
- `grep -nE "NAVIGATION|useShortcutConfig|listModes|LayoutChips" src/components/layout/AppShell.tsx` — CLEAN
- `grep -n 'path="\*"' src/App.tsx` — line 29 (catch-all present)
- `grep -n "activeMode?.mode === 'trip'" src/components/layout/AppShell.tsx` — line 66

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| src/pages/TripHomePage.tsx | Shows "Trip home — coming in Phase 22." | Intentional stub; full home (totals, recent entries, CTAs) is Phase 22 |
| src/App.tsx | /expense, /activity, /activity/:type, /trips, /trips/:tripId → PlaceholderPage | Intentional; target pages built in Phases 22-24 |

## Threat Flags

No new network endpoints or trust-boundary surface introduced. T-21-04 (unknown paths → PlaceholderPage 404) is fully mitigated by `path="*"` catch-all and asserted by App.test.tsx unknown-path tests.

## Self-Check: PASSED

- af61417 exists in git log
- b2e51c3 exists in git log
- src/components/layout/AppShell.tsx exists and contains `useActiveMode`
- src/App.tsx exists and contains `path="*"`
- src/App.test.tsx exists and contains `TripHomePage`
- Full suite: 622 passed / 0 failed

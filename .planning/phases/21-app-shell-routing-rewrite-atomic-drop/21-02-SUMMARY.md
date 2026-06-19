---
phase: 21-app-shell-routing-rewrite-atomic-drop
plan: "02"
subsystem: pages
tags: [trip-flow, routing, export, dexie, react-router]
dependency_graph:
  requires: [21-01]
  provides: [CreateTripPage, TripHomePage, SettingsPage]
  affects: [21-03-PLAN.md]
tech_stack:
  added: []
  patterns:
    - useLiveQuery settled-signal (db.settings.count default=false) for loading-vs-no-trip guard
    - Declarative <Navigate> instead of imperative navigate() during render
    - MemoryRouter probe-route pattern for navigation assertions in RTL
key_files:
  created:
    - src/pages/CreateTripPage.tsx
    - src/pages/CreateTripPage.test.tsx
    - src/pages/TripHomePage.tsx
    - src/pages/TripHomePage.test.tsx
  modified:
    - src/pages/SettingsPage.tsx
    - src/pages/SettingsPage.test.tsx
decisions:
  - "TripHomePage uses declarative <Navigate to='/create-trip' replace /> (not imperative navigate) — avoids React 'cannot update during render' warning in tests"
  - "dbReady settled signal: useLiveQuery(() => db.settings.count().then(() => true), [], false) — cheapest read on same DB instance as useActiveMode, distinguishes loading from no-trip"
  - "SettingsPage heading changed from 'Shortcuts Config' to 'Settings' (old heading was tied to removed shortcut subsystem)"
metrics:
  duration: "~2 min"
  completed: "2026-06-19"
  tasks: 3
  files: 6
---

# Phase 21 Plan 02: CreateTripPage + TripHomePage stub + export-only SettingsPage Summary

**One-liner:** CreateTripPage (name → createAndActivateTrip → navigate), TripHomePage stub (dbReady settled-signal loading guard + declarative Navigate redirect), SettingsPage reduced to exportEntries JSON download only.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | CreateTripPage + test | 2f70489 | CreateTripPage.tsx, CreateTripPage.test.tsx |
| 2 | TripHomePage stub + test | 09e9abb | TripHomePage.tsx, TripHomePage.test.tsx |
| 3 | SettingsPage export-only + test rewrite | e7454e5 | SettingsPage.tsx, SettingsPage.test.tsx |

## Verification

- `npx tsc -b`: clean (no output)
- `npx vitest run`: 48 files, 635 tests, all green

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Minor adjustment:** SettingsPage h1 changed from "Shortcuts Config" to "Settings" — the old heading was semantically tied to the removed shortcut/config subsystem. The new heading is accurate for an export-only page. This does not violate any plan requirement.

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| src/pages/TripHomePage.tsx | "Trip home — coming in Phase 22." placeholder line | Full Trip Home (expense total, recent entries, CTAs) is Phase 22 scope — intentional per plan |

## Threat Surface Scan

No new network endpoints, auth paths, or unplanned trust boundaries introduced.

- T-21-02 (trip name input → Dexie): mitigated — name rendered as React-escaped text (no dangerouslySetInnerHTML).
- T-21-03 (JSON export → file download): mitigated — user-initiated, local download of own entries.

## Self-Check: PASSED

- CreateTripPage.tsx: FOUND
- TripHomePage.tsx: FOUND
- SettingsPage.tsx: FOUND
- 21-02-SUMMARY.md: FOUND
- Commit 2f70489 (Task 1): FOUND
- Commit 09e9abb (Task 2): FOUND
- Commit e7454e5 (Task 3): FOUND

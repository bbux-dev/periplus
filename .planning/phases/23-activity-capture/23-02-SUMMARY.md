---
phase: 23-activity-capture
plan: "02"
subsystem: activity-capture
tags: [page, routing, navigation, activity]
dependency_graph:
  requires: ["23-01"]
  provides: ["ActivityTypePage at /activity route"]
  affects: ["src/App.tsx", "src/pages/ActivityTypePage.tsx"]
tech_stack:
  added: []
  patterns: ["constant-driven button grid", "useBackOrHome back control", "MemoryRouter RTL test with route probe"]
key_files:
  created:
    - src/pages/ActivityTypePage.tsx
    - src/pages/ActivityTypePage.test.tsx
  modified:
    - src/App.tsx
decisions:
  - "ActivityTypePage maps ACTIVITY_TYPES (from 23-01) directly — no inline label literals; single source of truth enforced"
  - "/activity route replaced PlaceholderPage stub; /activity/:type placeholder left intact for 23-03"
metrics:
  duration: "72s"
  completed: "2026-06-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
  tests_added: 2
  suite_before: 309
  suite_after: 311
---

# Phase 23 Plan 02: ActivityTypePage + Route Wiring Summary

**One-liner:** `ActivityTypePage` driven by `ACTIVITY_TYPES` const renders 5 tap-target buttons at `/activity`, each navigating to `/activity/<slug>` via `type.toLowerCase()`.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | ActivityTypePage component + test | a030bca | src/pages/ActivityTypePage.tsx, src/pages/ActivityTypePage.test.tsx |
| 2 | Wire /activity route in App.tsx | 0cccf06 | src/App.tsx |

## What Was Built

**`src/pages/ActivityTypePage.tsx`** — A mobile-first page that imports `ACTIVITY_TYPES` from
`config/activityTypes.ts` and maps it to a `grid-cols-2` grid of large tap targets (`h-20 rounded-xl`).
Each button's `onClick` calls `navigate('/activity/' + type.toLowerCase())`. Back control provided via
`useBackOrHome('/')` + `ChevronLeftIcon` (mirrors `CreateTripPage` pattern).

**`src/pages/ActivityTypePage.test.tsx`** — Two tests using `MemoryRouter`:
1. Renders all 5 buttons (Hike, Show, Restaurant, Cafe, Other) found by role+name
2. Hike button click navigates to `/activity/hike` (proven via route probe element)
Follows established Dexie reset (`db.delete/open` in `beforeEach`) and `vi.useRealTimers` in `afterEach`.

**`src/App.tsx`** — Import added for `ActivityTypePage`; `/activity` route element replaced from
`<PlaceholderPage title="Log Activity" />` to `<ActivityTypePage />`. All other routes (`/activity/:type`,
`/expense`, `/trips`, `/trips/:tripId`, `*`) left intact.

## Verification

- `npx vitest run src/pages/ActivityTypePage.test.tsx`: 2/2 passed
- `npx tsc -b`: clean (both after Task 1 and Task 2)
- `npx vitest run` (full suite): 311/311 passed (+2 from this plan; was 309)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

`/activity/:type` route in `App.tsx` still points to `<PlaceholderPage title="Activity Form" />`.
This is intentional — Plan 23-03 replaces it with `ActivityFormPage`. Not a functional stub for this
plan's goal (ACT-01: the type picker page is fully wired and functional).

## Threat Flags

None. No new network endpoints, auth paths, or trust-boundary changes introduced. The URL slug
(`type.toLowerCase()`) originates from a button driven by the `ACTIVITY_TYPES` const — no user
input flows into the navigation call.

## Self-Check: PASSED

- src/pages/ActivityTypePage.tsx: FOUND
- src/pages/ActivityTypePage.test.tsx: FOUND
- src/App.tsx: FOUND (ActivityTypePage import + route confirmed)
- Commit a030bca: FOUND
- Commit 0cccf06: FOUND

---
phase: 23-activity-capture
plan: "03"
subsystem: activity-capture
tags: [activity-form, routing, tdd, trips]
dependency_graph:
  requires: [23-01, 23-02]
  provides: [ActivityFormPage, /activity/:type route]
  affects: [src/App.tsx, src/pages/ActivityFormPage.tsx]
tech_stack:
  added: []
  patterns:
    - settled-signal useLiveQuery guard (mirrors TripHomePage)
    - savingRef double-submit guard (mirrors ExpenseSheet)
    - draftToEntry stamped save path with domain literal 'trips'
    - todayLocalMidnightEpoch for local-date occurredAt
    - noValidate form + custom validate() for validation control
key_files:
  created:
    - src/pages/ActivityFormPage.tsx
    - src/pages/ActivityFormPage.test.tsx
  modified:
    - src/App.tsx
decisions:
  - "noValidate on form element required — required attribute on FormField inputs causes jsdom native validation to suppress onSubmit, preventing custom validate() from running"
  - "All hooks declared before guard early-returns to maintain stable hook order (useLiveQuery, useState, useRef, useNavigate, useBackOrHome)"
  - "result.mode passed directly to draftToEntry — metadata.tripId auto-stamped, never set by hand"
  - "locationValue state name avoids shadowing global window.location"
metrics:
  duration: "6min"
  completed: "2026-06-19"
  tasks_completed: 2
  files_changed: 3
---

# Phase 23 Plan 03: ActivityFormPage + Route Wiring Summary

**One-liner:** ActivityFormPage at `/activity/:type` with settled-signal guard, savingRef double-submit protection, and stamped `draftToEntry(draft,'activity','trips',activeMode)` save path.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 (RED) | ActivityFormPage tests | 7c14489 | src/pages/ActivityFormPage.test.tsx |
| 1 (GREEN) | ActivityFormPage component | cd0a0d7 | src/pages/ActivityFormPage.tsx |
| 2 | Wire /activity/:type route | 4e97240 | src/App.tsx |

## What Was Built

### `ActivityFormPage` (`src/pages/ActivityFormPage.tsx`, 226 lines)

Mobile-first form page at `/activity/:type` that:

- Reads `:type` via `useParams` and recovers the canonical label via `ACTIVITY_TYPES.find(t => t.toLowerCase() === type) ?? 'Other'`
- Guards using the settled-signal `useLiveQuery` pattern (mirrors TripHomePage lines 18-67): `{ ready: false, mode: undefined }` default suppresses flash; redirects to `/create-trip` when ready and no active trip
- Renders Name (required), Location (optional), StarRating (optional), Notes (optional); for `other` slug shows an additional required Type field
- Validates with `validate()` — sets `errors.name` / `errors.activityType`; FormField's `error` prop renders `<p role="alert">`
- Uses `noValidate` on the `<form>` element to disable native HTML validation (prevents jsdom from suppressing `onSubmit` when `required` inputs are empty)
- Saves via `draftToEntry(draft, 'activity', 'trips', activeMode)` → `entriesRepository.create` → `navigate('/')`
- `occurredAt = todayLocalMidnightEpoch()` (never `toISOString`/UTC)
- `metadata.activityType` = canonical label for preset slugs, user free-text for `other`; `metadata.tripId` auto-stamped by `draftToEntry`

### `ActivityFormPage.test.tsx` (7 tests, all pass)

| Test | Behavior |
|------|----------|
| stamped save | type=activity, domain=trips, title=Name, metadata.activityType=Hike, metadata.tripId=trip.id, occurredAt=local midnight |
| 23:30-local date | occurredAt is today's local midnight even at 23:30 local clock |
| shows Type field only for other | Type input present for /activity/other, absent for /activity/hike |
| blocks save Other + Type empty | role=alert shown, no DB write |
| saves Other free-text activityType | metadata.activityType = 'Cycling' (user text, not 'Other') |
| blocks save Name empty | role=alert shown, no DB write |
| redirects no active trip | Navigate to /create-trip when Dexie settled + no trip |

### `App.tsx` update

Replaced `<PlaceholderPage title="Activity Form" />` with `<ActivityFormPage />` at `path="/activity/:type"`. `/activity` (ActivityTypePage) and all other routes left intact.

## Verification

```
npx tsc -b          → clean (no errors)
npx vite build      → 386 kB chunk, 9 precache entries, built in 1.52s
npx vitest run      → 318 tests passed (29 files, +7 new)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added `noValidate` to form to prevent native HTML validation interception**

- **Found during:** Task 1 GREEN phase — two tests failed ("blocks save when Other + Type is empty" and "blocks save when Name is empty")
- **Issue:** FormField components with `required` prop render native `<input required>`. In jsdom, clicking a submit button on a form with empty required inputs suppresses the `submit` event via constraint validation, preventing our custom `validate()` from running. The `role="alert"` error elements were never rendered.
- **Fix:** Added `noValidate` to the `<form>` element. This disables native browser validation and lets `validate()` run in all cases.
- **Files modified:** src/pages/ActivityFormPage.tsx
- **Commit:** cd0a0d7

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. User free-text fields (Name, Location, Notes, Type) flow into Dexie via `draftToEntry` — values are React-escaped on render (no `dangerouslySetInnerHTML`). Slug resolution via `ACTIVITY_TYPES.find` falls back safely to `'Other'`. All mitigations from the plan's threat register applied:

| Threat | Status |
|--------|--------|
| T-23-05 required-field bypass | Mitigated: `validate()` + `noValidate` form |
| T-23-06 unstamped entry no trip | Mitigated: settled-signal guard → Navigate to /create-trip |
| T-23-07 forged :type slug | Mitigated: ACTIVITY_TYPES.find ?? 'Other' + isOther forces required Type |
| T-23-08 free-text disclosure | Accepted: React-escaped, local single-user store |

## Self-Check: PASSED

- [x] src/pages/ActivityFormPage.tsx exists (226 lines, > 80 min_lines)
- [x] src/pages/ActivityFormPage.test.tsx exists (7 tests)
- [x] src/App.tsx updated (ActivityFormPage import + route)
- [x] Commits 7c14489, cd0a0d7, 4e97240 exist in git log
- [x] 318 tests pass, tsc clean, vite build succeeds

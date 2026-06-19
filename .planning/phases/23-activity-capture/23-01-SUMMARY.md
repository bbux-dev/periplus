---
phase: 23-activity-capture
plan: 01
subsystem: ui
tags: [heroicons, react, tailwind, vitest, accessibility, aria]

requires: []
provides:
  - "ACTIVITY_TYPES as-const tuple + ActivityType union (src/config/activityTypes.ts)"
  - "StarRating controlled component — 5 accessible <button> stars with aria-label, aria-pressed, ArrowRight/Left, tap-clear"
affects:
  - "23-02 ActivityTypePage — imports ACTIVITY_TYPES for the type picker grid"
  - "23-03 ActivityFormPage — imports both ACTIVITY_TYPES and StarRating for the form"

tech-stack:
  added: []
  patterns:
    - "as-const config constant + derived union type (mirrors expenseCategories.ts)"
    - "Accessible star rating via <button> elements (not div/span) for reliable iOS tap"
    - "aria-pressed on each star button; role=group/aria-label on container"
    - "Controlled clear pattern: tap selected star emits onChange(0)"
    - "Arrow key navigation with preventDefault to suppress page scroll"

key-files:
  created:
    - src/config/activityTypes.ts
    - src/components/ui/StarRating.tsx
    - src/components/ui/StarRating.test.tsx
  modified: []

key-decisions:
  - "StarRating uses <button type=button> per star (not div/span) — iOS tap fires reliably on native interactive elements only"
  - "Tap currently-selected star emits onChange(0) to clear; ArrowRight/Left clamp at 5/0 via Math.min/Math.max"
  - "role=group aria-label=Rating on container; aria-hidden=true on icon elements — accessible name lives on the button only"

patterns-established:
  - "StarRating controlled pattern: value=0 means unset; onChange(0) clears"
  - "h-11 w-11 (44px) minimum tap targets for star buttons per WCAG 2.5.5"

requirements-completed: [ACT-04]

duration: 2min
completed: 2026-06-19
---

# Phase 23 Plan 01: ACTIVITY_TYPES constant + StarRating component

**Import-light `ACTIVITY_TYPES` as-const config and accessible 5-star `<button>`-based rating control with ArrowKey navigation, aria-pressed, and tap-to-clear behavior**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-19T16:40:43Z
- **Completed:** 2026-06-19T16:41:43Z
- **Tasks:** 2 (Task 1 auto, Task 2 TDD red/green)
- **Files modified:** 3 created

## Accomplishments

- `ACTIVITY_TYPES = ['Hike','Show','Restaurant','Cafe','Other'] as const` + `ActivityType` union exported from `src/config/activityTypes.ts` — mirrors `expenseCategories.ts` shape exactly
- `StarRating` controlled component: 5 `<button type="button">` stars; filled `StarIcon` (24/solid) when `n <= value`, outline otherwise; `aria-label="N star(s)"`, `aria-pressed`, ArrowRight/Left navigation with `preventDefault`, tap-same-star = `onChange(0)` to clear; 44x44 px tap targets
- 6 tests covering render, tap-set, tap-clear, ArrowRight, ArrowLeft, aria-pressed — all green; full 309-test suite still green; `npx tsc -b` clean

## Task Commits

1. **Task 1: ACTIVITY_TYPES constant** - `ee5aa5e` (feat)
2. **Task 2: StarRating tests (RED)** - `963e512` (test)
3. **Task 2: StarRating implementation (GREEN)** - `838ae68` (feat)

## Files Created/Modified

- `src/config/activityTypes.ts` - ACTIVITY_TYPES as-const tuple + ActivityType union; no React imports
- `src/components/ui/StarRating.tsx` - Accessible 5-star controlled component using Heroicons solid/outline
- `src/components/ui/StarRating.test.tsx` - 6 tests: render, tap-set, tap-clear, ArrowRight, ArrowLeft, aria-pressed

## Decisions Made

- `<button type="button">` elements (not `<div>`/`<span>`) — iOS fires tap events reliably on native interactive elements only
- `role="group" aria-label="Rating"` on container; `aria-hidden="true"` on `StarIcon`/`StarIconOutline` — accessible name is on the button wrapper
- Tap the currently-selected star emits `onChange(0)` (clear); ArrowRight clamps at 5, ArrowLeft clamps at 0

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `ACTIVITY_TYPES` and `StarRating` are complete leaf dependencies
- Plan 23-02 (ActivityTypePage) can import `ACTIVITY_TYPES` directly
- Plan 23-03 (ActivityFormPage) can import both `ACTIVITY_TYPES` and `StarRating` directly
- No blockers

---
*Phase: 23-activity-capture*
*Completed: 2026-06-19*

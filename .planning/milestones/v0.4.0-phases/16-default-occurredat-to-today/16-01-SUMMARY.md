---
phase: 16-default-occurredat-to-today
plan: 01
subsystem: capture
tags: [react, dexie, date-handling, tdd, vitest]

# Dependency graph
requires:
  - phase: 13-quick-capture
    provides: captureService draftToEntry + buildReviewDraft, useShortcutCapture decision tree, ReviewPage form
provides:
  - Pure date-default helpers (todayLocalDate, todayLocalMidnightEpoch, typeHasDateField, withDefaultOccurredAt) in captureService
  - ReviewPage pre-fills today's local date for date-bearing types (default, not lock)
  - One-tap direct-save and sheet-save paths default occurredAt to today's local-midnight epoch
affects: [capture, review, shortcuts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Date defaulting lives in TWO independent call sites (ReviewPage form-state init + useShortcutCapture), never centralized in draftToEntry"
    - "Local-midnight epoch via Date.parse(`${d}T00:00:00`), local date string via toLocaleDateString('en-CA') — never UTC"
    - "Timezone-robust tests: vi.useFakeTimers({ toFake: ['Date'] }) + vi.setSystemTime, expected epoch computed from the same local convention"

key-files:
  created: []
  modified:
    - src/services/captureService.ts
    - src/services/captureService.test.ts
    - src/pages/ReviewPage.tsx
    - src/pages/ReviewPage.test.tsx
    - src/hooks/useShortcutCapture.ts
    - src/hooks/useShortcutCapture.test.ts

key-decisions:
  - "draftToEntry left neutral — defaulting there would override a user who deliberately cleared the date on ReviewPage.handleSave (violating default-not-lock)"
  - "withDefaultOccurredAt treats NaN occurredAt as absent (Number.isNaN guard), mirroring draftToEntry's omission rule"
  - "Tests use the date= named-param alias (parser lowercases keys, so occurredAt= is rejected as unknown field)"

patterns-established:
  - "Pure helper gated by typeHasDateField so date-less types never get an invented date"
  - "confirm:true shortcut branch is intentionally NOT defaulted in the hook — ReviewPage defaults it, avoiding double-apply"

requirements-completed: [DATE-01]

# Metrics
duration: ~20min
completed: 2026-06-18
---

# Phase 16 Plan 01: Default occurredAt to Today Summary

**occurredAt now defaults to today's local date on both capture paths (ReviewPage form + one-tap direct/sheet save) for date-bearing types — a visible, clearable default, with the local-midnight convention preserved and draftToEntry kept neutral.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-06-18T19:36:00Z
- **Completed:** 2026-06-18T19:41:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Four pure, unit-tested date-default helpers added to captureService (`todayLocalDate`, `todayLocalMidnightEpoch`, `typeHasDateField`, `withDefaultOccurredAt`)
- ReviewPage pre-fills today's local date when the draft carries no occurredAt and the type has a date field; explicit dates preserved; user can still clear and save with no date
- One-tap direct-save and HoleSheet save default occurredAt to today's local-midnight epoch; confirm:true (navigate-to-ReviewPage) branch left untouched to avoid double-apply
- Full suite grew from 512 to 528 passing tests (16 new), tsc and vite build clean

## Task Commits

Each task was committed atomically (TDD: failing test included in the same task commit as the implementation):

1. **Task 1: Date-default helpers in captureService** - `ffb5e47` (feat)
2. **Task 2: ReviewPage defaults the date field to today** - `08e5b76` (feat)
3. **Task 3: One-tap capture paths default the date** - `8c471ac` (feat)

**Plan metadata:** this commit (docs: summary)

## Files Created/Modified
- `src/services/captureService.ts` - Added 4 pure date-default helpers; draftToEntry untouched
- `src/services/captureService.test.ts` - Unit tests for the helpers (fake timers, no hardcoded epochs)
- `src/pages/ReviewPage.tsx` - occurredAt form-state init defaults to todayLocalDate() for date-bearing types
- `src/pages/ReviewPage.test.tsx` - Pre-fill, explicit-date-preserved, and clear-then-save RTL tests
- `src/hooks/useShortcutCapture.ts` - Direct-save + sheet-save wrap buildReviewDraft with withDefaultOccurredAt
- `src/hooks/useShortcutCapture.test.ts` - Direct-save/sheet-save default, explicit-date-kept, confirm:true-unchanged tests

## Decisions Made
- Kept `draftToEntry` neutral (no defaulting) — it is shared with `ReviewPage.handleSave`, where defaulting would clobber a deliberately-cleared date.
- `withDefaultOccurredAt` treats a NaN `occurredAt` as absent, consistent with draftToEntry's `!Number.isNaN` omission rule.
- Tests assert against `Date.parse('YYYY-MM-DDT00:00:00')` computed from the faked system time rather than hardcoded epochs, so they pass in any timezone.

## Deviations from Plan

None - plan executed exactly as written.

The plan's Task 3 example referenced a date-carrying template; during RED the DSL parser was found to lowercase named-param keys, rejecting `occurredAt=` as an unknown field. The test was written using the documented `date=` alias (which the parser maps to `occurredAt`). This was a test-authoring choice within the planned task, not a deviation to production code.

## Issues Encountered
- DSL named-param keys are lowercased by the parser, so `occurredAt=2024-01-15` parses as an unknown field. Resolved by using the `date=` alias in the test fixture (parser maps `date`/`when` → `occurredAt`).
- Combining `vi.useFakeTimers()` with Dexie (which uses timers for its promise scheduler) hangs awaited writes. Resolved by faking only `Date` (`toFake: ['Date']`) so the write path and RTL polling timers keep working while "today" stays deterministic.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DATE-01 delivered: date defaults to today on both capture paths for date-bearing types, remains editable/clearable, local-midnight convention preserved, date-less types unaffected.
- No blockers.

---
*Phase: 16-default-occurredat-to-today*
*Completed: 2026-06-18*

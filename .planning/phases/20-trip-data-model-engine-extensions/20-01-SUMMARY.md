---
phase: 20-trip-data-model-engine-extensions
plan: "01"
subsystem: engine
tags: [entry-type, active-mode, capture-service, dexie, tdd]
dependency_graph:
  requires: []
  provides:
    - EntryType union with 'trip' and 'activity'
    - ActiveMode.tripId optional field
    - activateMode 3rd-param tripId (backward-compatible)
    - draftToEntry STAMP-02 tripId stamping
  affects:
    - src/services/db.ts
    - src/config/entryFields.ts
    - src/services/activeMode.ts
    - src/services/captureService.ts
tech_stack:
  added: []
  patterns:
    - Conditional spread for optional fields (tripId ? { tripId } : {})
    - TDD RED/GREEN cycle for additive engine changes
    - Record<EntryType, ...> exhaustiveness enforced by TypeScript
key_files:
  created: []
  modified:
    - src/services/db.ts
    - src/config/entryFields.ts
    - src/config/entryFields.test.ts
    - src/services/dsl/suggest.test.ts
    - src/services/activeMode.ts
    - src/services/activeMode.test.tsx
    - src/services/captureService.ts
    - src/services/captureService.test.ts
decisions:
  - No Dexie version bump: 'trip' and 'activity' are TypeScript-only union members; type field is unindexed
  - activateMode 3rd param is optional so all existing two-arg callers are unaffected
  - tripId spread inside existing activeMode?.mode guard — inherits undefined/null/empty-mode protection
  - suggest.test.ts count made self-updating via Object.keys(POSITIONAL_SCHEMA).length
metrics:
  duration: "~5 min"
  completed: "2026-06-19T14:14:51Z"
  tasks_completed: 2
  files_modified: 8
---

# Phase 20 Plan 01: Trip Data Model Engine Extensions Summary

**One-liner:** EntryType union extended with 'trip'/'activity'; ActiveMode gains optional tripId; draftToEntry stamps metadata.tripId via conditional spread inside existing mode guard.

## What Was Built

Three additive engine changes to support the v0.5.0 Trips MVP without a Dexie schema version bump:

1. **ENG-01 (Task 1):** `EntryType` union in `db.ts` extended with `'trip'` (trip record) and `'activity'` (hike/show/restaurant/cafe/other). Both `ENTRY_FIELDS` and `POSITIONAL_SCHEMA` in `entryFields.ts` updated exhaustively. POSITIONAL_SCHEMA grows from 7 to 9 keys; `suggest.test.ts` updated to use `Object.keys(POSITIONAL_SCHEMA).length` (self-updating count).

2. **ENG-02 (Task 2 GREEN):** `ActiveMode` interface gains `tripId?: string`. `activateMode()` accepts an optional 3rd `tripId` parameter using conditional spread (`...(tripId ? { tripId } : {})`). All existing two-arg callers compile and behave identically.

3. **ENG-03 (Task 2 GREEN):** `draftToEntry` in `captureService.ts` stamps `metadata.tripId` via `...(activeMode.tripId ? { tripId: activeMode.tripId } : {})` inside the existing `activeMode?.mode` guard. Non-trip entries (no tripId on activeMode) are completely unaffected.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend EntryType union + entryFields exhaustiveness (ENG-01) | d835799 | db.ts, entryFields.ts, entryFields.test.ts, suggest.test.ts |
| 2 (RED) | Failing tests for tripId on ActiveMode and draftToEntry | e18d6d6 | activeMode.test.tsx, captureService.test.ts |
| 2 (GREEN) | ActiveMode.tripId + activateMode 3rd param + STAMP-02 | 2059d27 | activeMode.ts, captureService.ts |

## Verification Results

- `npx tsc -b`: clean (0 errors)
- `npx vitest run`: 601 tests passed (45 test files), 0 failures
- Dexie version bump: none (`grep -c "version(3)" src/services/db.ts` returns 0)
- `extractMetadataFromUrl.ts`: untouched (ReviewDraft import deferred to Phase 21)
- No bare `vi.useFakeTimers()` introduced by this task in activeMode.test.tsx or captureService.test.ts

## Deviations from Plan

None — plan executed exactly as written. All changes were purely additive; no existing behavior was modified.

## TDD Gate Compliance

Task 2 followed RED/GREEN/REFACTOR:
- RED commit `e18d6d6`: failing tests for tripId (2 failures confirmed before implementation)
- GREEN commit `2059d27`: implementation passes all 85 tests in the two affected files
- REFACTOR: not needed (implementation was already minimal and idiomatic)

## Known Stubs

None. All field descriptors map to real core/metadata fields. No hardcoded empty values or placeholder text.

## Threat Flags

No new security-relevant surface introduced. All changes are TypeScript type extensions and conditional object spreads. The `tripId` field is a UUID value in local IndexedDB only (T-20-02: accepted per plan threat model).

## Self-Check: PASSED

- src/services/db.ts: FOUND (contains `| 'trip'` and `| 'activity'`)
- src/config/entryFields.ts: FOUND (trip and activity in both ENTRY_FIELDS and POSITIONAL_SCHEMA)
- src/services/activeMode.ts: FOUND (contains `tripId?: string`)
- src/services/captureService.ts: FOUND (contains `activeMode.tripId`)
- Commits d835799, e18d6d6, 2059d27: all present in git log

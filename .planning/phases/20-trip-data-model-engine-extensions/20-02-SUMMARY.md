---
phase: 20-trip-data-model-engine-extensions
plan: "02"
subsystem: engine
tags: [trip-service, dexie, reactive-hooks, tdd, pure-helpers]
dependency_graph:
  requires:
    - 20-01 (EntryType union with 'trip'/'activity'; ActiveMode.tripId; activateMode 3-arg)
  provides:
    - createAndActivateTrip(name): creates type='trip' entry + activates mode with tripId
    - listTrips(): all type='trip' entries, newest-first by recordedAt
    - listTripEntries(tripId): single-pass filter by metadata.tripId
    - useTrips(): reactive hook, undefined=loading
    - useTripEntries(tripId): reactive hook with [tripId] dep array
    - tripExpenseTotal: pure stat — sums expense amounts
    - tripExpensesByCategory: pure stat — groups expenses by metadata.category
    - tripDateRange: pure stat — { start, end } epoch ms range or null
    - tripActivityCount: pure stat — count of type='activity' entries
  affects:
    - src/services/tripService.ts (created)
    - src/services/tripService.test.tsx (created)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN for new service file (test file created before implementation)
    - useLiveQuery with undefined-loading semantics (no default value)
    - orderBy('recordedAt').reverse().filter() for newest-first typed query
    - single-pass db.entries.filter() for unindexed metadata join (no N+1)
    - vi.useFakeTimers({ toFake: ['Date'] }) for Date-controlled Dexie tests
    - metadata string-guard typeof x === 'string' fallback to 'Uncategorized'
key_files:
  created:
    - src/services/tripService.ts
    - src/services/tripService.test.tsx
  modified: []
decisions:
  - listTrips uses orderBy('recordedAt').reverse().filter() not .where('domain').reverse() — UUID primary keys are not time-ordered so .reverse() on domain index does not guarantee newest-first
  - Test file named .tsx (not .ts) from Task 1 — reactive hook tests require JSX; .tsx is a superset
  - Test file includes both Task 1 (pure helper) and Task 2 (Dexie/hook) tests in one file for cohesion
metrics:
  duration: "~8 min"
  completed: "2026-06-19T07:22:00Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 20 Plan 02: tripService — Trip Business Layer Summary

**One-liner:** New `tripService.ts` exposes `createAndActivateTrip`, list helpers, `useLiveQuery` reactive hooks, and four pure stat helpers (zero Dexie calls) for the v0.5.0 Trips engine layer.

## What Was Built

Two tasks implementing the `src/services/tripService.ts` service layer, built with TDD:

1. **ENG-04 part 1 (Task 1 GREEN):** Four pure stat helpers with `import type { LifeLogEntry }` as the only import — no Dexie dependency. `tripExpenseTotal` sums expense `amount` values (raw float; callers round via `Math.round(x*100)/100`). `tripExpensesByCategory` groups by `metadata.category` with string-guard fallback to `'Uncategorized'`. `tripDateRange` returns `{ start, end }` epoch ms or `null` for no `occurredAt` values. `tripActivityCount` counts `type === 'activity'` entries.

2. **ENG-04 part 2 (Task 2 GREEN):** Dexie repository functions and reactive hooks appended. `createAndActivateTrip(name)` creates a `type='trip'` entry via `entriesRepository.create` then calls `activateMode('trip', name, entry.id)`. `listTrips()` uses `orderBy('recordedAt').reverse().filter(domain+type)` for correct newest-first ordering. `listTripEntries(tripId)` is a single `db.entries.filter(e => e.metadata.tripId === tripId)` scan. `useTrips` and `useTripEntries` wrap these with `useLiveQuery` using the undefined-loading pattern; `useTripEntries` has `[tripId]` in its dependency array.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 RED | Failing tests for pure helpers + Dexie integration + hooks | ac3ec5a | tripService.test.tsx (created) |
| 1 GREEN | Pure stat helpers (zero Dexie) | 5cbea9c | tripService.ts (created) |
| 2 GREEN | Dexie repository fns + reactive hooks | e2eda9d | tripService.ts (appended) |

(Task 2 RED reused the same test file committed in Task 1 RED — the Dexie/hook test blocks were already present and failing until the implementation was added.)

## Verification Results

- `npx tsc -b`: clean (0 errors)
- `npx vitest run src/services/tripService.test.tsx`: 30 passed (30)
- `npx vitest run`: 631 passed (631), 0 failures — 30 new tests + 601 pre-existing
- `grep -n "import.*db'" src/services/tripService.ts`: only `import { db }` and `import type { LifeLogEntry }` (both present in final file; type-only at Task 1 stage per acceptance criteria)
- `grep -c ".filter(" src/services/tripService.ts`: 5 (4 pure helpers + 1 listTripEntries single-pass)
- `grep -n "[tripId]" src/services/tripService.ts`: line 139 — useTripEntries dep array confirmed
- `grep -n "vi.useFakeTimers()" src/services/tripService.test.tsx`: no bare usage (all use `{ toFake: ['Date'] }`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] listTrips ordering: use orderBy('recordedAt') not .where('domain').reverse()**
- **Found during:** Task 2 GREEN implementation
- **Issue:** The PATTERNS.md code snippet used `.where('domain').equals('trips').filter(...).reverse().toArray()`. The `.reverse()` on a `where('domain')` query reverses by primary key (UUID), not by `recordedAt`. UUIDs are random and not time-ordered, so this does not achieve newest-first ordering.
- **Fix:** Used `db.entries.orderBy('recordedAt').reverse().filter(e => e.domain === 'trips' && e.type === 'trip').toArray()` which uses the `recordedAt` index for correct newest-first order. The "listTrips returns trips newest-first" test confirms this.
- **Files modified:** `src/services/tripService.ts`
- **Commit:** e2eda9d

**2. [Rule 3 - File extension] Test file created as .tsx not .ts**
- **Found during:** Task 1 RED
- **Issue:** The plan specifies `tripService.test.ts`, but Task 2's reactive hook tests require JSX (`<TripsTest />`, `<TripEntriesTest />`). A `.ts` file cannot contain JSX.
- **Fix:** Named the file `tripService.test.tsx` from the start. `.tsx` is a TypeScript superset of `.ts` — all `.ts` content is valid in a `.tsx` file.
- **Files modified:** `src/services/tripService.test.tsx`
- **Commit:** ac3ec5a

## TDD Gate Compliance

Tasks 1 and 2 followed the RED/GREEN cycle:
- RED commit `ac3ec5a`: test file created with all tests importing from non-existent `./tripService` — `tsc -b` confirmed compile failure
- GREEN commit `5cbea9c` (Task 1): pure helpers created — 17 pure-helper tests pass, 13 Dexie/hook tests still fail
- GREEN commit `e2eda9d` (Task 2): Dexie layer added — all 30 tests pass, tsc clean
- REFACTOR: not needed (implementation was already minimal and idiomatic)

## Known Stubs

None. `tripService.ts` contains no hardcoded placeholder values. All functions operate on live Dexie data or in-memory arrays passed by callers.

## Threat Flags

No new security-relevant surface introduced beyond what was in the plan's threat model. T-20-03 (user input via trip title) mitigated by `.trim() || 'Untitled Trip'` fallback. T-20-04 (full-table scan for `listTripEntries`) accepted per plan — single-pass, no N+1.

## Self-Check: PASSED

- src/services/tripService.ts: FOUND (contains all 9 exports)
- src/services/tripService.test.tsx: FOUND (30 tests)
- Commit ac3ec5a: present in git log (test RED)
- Commit 5cbea9c: present in git log (feat pure helpers)
- Commit e2eda9d: present in git log (feat Dexie layer)
- `npx tsc -b`: clean
- `npx vitest run`: 631 passed

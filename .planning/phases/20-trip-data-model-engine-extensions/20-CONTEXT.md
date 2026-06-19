# Phase 20: Trip Data Model + Engine Extensions - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss) + milestone research

<domain>
## Phase Boundary

Extend the preserved Life Log engine so it understands trips and activities, WITHOUT a Dexie
schema version bump. This is the foundation phase — every later v0.5.0 UI phase depends on these
additive engine changes. No UI work in this phase.

Delivers (ENG-01..04):
- `EntryType` union in `db.ts` gains `'trip'` and `'activity'` (TypeScript-only; `type` is not a
  Dexie index, so no migration).
- `ActiveMode` gains an optional `tripId?: string`; `activateMode()` accepts an optional `tripId`
  parameter. All existing two-arg callers stay working.
- `draftToEntry` stamps `metadata.tripId` (alongside the existing `metadata.mode` / `modeLabel`)
  when the active mode carries a `tripId`. Entries without an active `tripId` are unaffected.
- New `tripService.ts`: `createAndActivateTrip(name)`, `listTrips()`, `listTripEntries(tripId)`,
  plus PURE stat helpers `tripExpenseTotal`, `tripExpensesByCategory`, `tripDateRange`,
  `tripActivityCount` (no Dexie calls — unit-testable on in-memory arrays), and reactive hooks
  (`useTrips`, `useTripEntries`) following the existing `useLiveQuery` patterns.
- All existing 592+ tests remain green; new unit tests for the pure helpers + stamping.

</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Trip data model (from research ARCHITECTURE.md — Option C)
- A trip is a `LifeLogEntry` of `type='trip'`, `domain='trips'`, `title=<trip name>` — gives the trip
  a stable UUID primary key, survives zero-entry trips, distinguishes duplicate names, and is exported
  by the existing `exportEntries`.
- `createAndActivateTrip(name)` does two things atomically: (1) `entriesRepository.create({type:'trip',
  domain:'trips', title:name, ...})`; (2) `activateMode('trip', name, entry.id)` so the active mode
  persists `{ mode:'trip', label:name, tripId:entry.id }` in the `settings` store.
- Expense/activity entries are tied to a trip by `metadata.tripId` (the UUID), NOT by the mutable name
  label. Grouping/queries key on `tripId`.

### Engine extension constraints
- NO Dexie schema version bump (the `type` field is not indexed). Changes are TypeScript + runtime only.
- `activateMode()` signature change must be backward-compatible: `tripId` is an optional 3rd param;
  every existing caller (two-arg) must keep compiling and behaving identically.
- `draftToEntry` only stamps `tripId` when present on the active mode — preserve all existing stamping
  behavior for non-trip entries.
- If `ReviewDraft` (or any type) must move out of a to-be-deleted file, that move is a LATER phase
  (Phase 21). Phase 20 is purely additive — do not delete files here.

### Pure helpers
- Stat helpers operate on in-memory `LifeLogEntry[]` and contain ZERO Dexie calls so they unit-test
  without IndexedDB. Reactive hooks wrap them over `useLiveQuery`.
- Money: helpers that sum amounts must be float-safe at the boundary the UI renders (the UI formats);
  the helper may return a raw number, but document that callers round via `Math.round(x*100)/100`.

### Claude's Discretion
File/function organization within `tripService.ts`, exact helper signatures, and test structure are at
Claude's discretion, following existing conventions in `activeMode.ts` and `entriesRepository.ts`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone research (authoritative for this phase)
- `.planning/research/ARCHITECTURE.md` — trip data-model decision (Option C), engine extension scope,
  new/modified/dropped inventory, build order.
- `.planning/research/PITFALLS.md` — `EntryType` union ordering, `activateMode` backward-compat,
  fake-timers `toFake:['Date']`, float money, local-date defaults.
- `.planning/research/SUMMARY.md` — consolidated overview.

### Code to read / extend
- `src/services/db.ts` — `EntryType` / `EntryDomain` unions + Dexie schema (source of truth).
- `src/services/activeMode.ts` — `ActiveMode` type, `activateMode`, `useActiveMode` (mirror its
  Dexie-`settings` pattern; extend with `tripId`).
- `src/services/captureService.ts` — `draftToEntry` (single stamped save path); `todayLocalDate()` /
  `todayLocalMidnightEpoch()` (reuse for date defaults in later phases).
- `src/services/entriesRepository.ts` — `create`/`update`/`delete`, reactive reads, distinct-values.

</canonical_refs>

<specifics>
## Specific Ideas

- `tripService` is NEW (`src/services/tripService.ts` + `tripService.test.ts`).
- Test fake timers MUST use `vi.useFakeTimers({ toFake: ['Date'] })` (project MEMORY: full fake timers
  stall awaited Dexie writes).
- Verify `tsc -b` clean and the full existing suite green after the union change (compile errors at
  entry-type usage sites are the first thing to catch).

</specifics>

<deferred>
## Deferred Ideas

- Dropping the 13 old pages + dead subsystems → Phase 21 (this phase is purely additive).
- All UI (CreateTrip, Home, Expense, Activity, Previous Trips, Report) → Phases 21–24.

</deferred>

---

*Phase: 20-trip-data-model-engine-extensions*
*Context gathered: 2026-06-19 (skip_discuss + milestone research)*

---
phase: 02-data-layer-pwa-shell
plan: "02"
subsystem: database
tags: [dexie, indexeddb, repository-pattern, useLiveQuery, dexie-react-hooks, tdd, rtl, fake-indexeddb]

# Dependency graph
requires:
  - 01-02 (Dexie db.ts version(1) counter store — version(2) upgrade builds on it)
  - 01-03 (Counter RTL test pattern: act() + findByText for useLiveQuery async re-renders)
provides:
  - LifeLogEntry interface + EntryDomain + EntryType types in src/services/db.ts
  - Dexie version(2) additive schema: entries (&id, recordedAt, domain) + settings (key) stores
  - entriesRepository: create/get/list/listUnsynced/update/delete in src/services/entriesRepository.ts
  - useEntries() reactive hook using useLiveQuery in src/services/entriesRepository.ts
  - 22 unit + RTL tests (db.test.ts x9, entriesRepository.test.tsx x13) all green
affects:
  - Phase 3 (navigation/screens will import useEntries for entry list)
  - Phase 4 (URL capture will call entriesRepository.create)
  - Phase 5 (manual entry will call entriesRepository.create)
  - Phase 6 (list/detail/export will use entriesRepository.list + listUnsynced)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dexie additive upgrade: version(2).stores({ entries, settings }) without touching version(1); omitted stores preserved automatically"
    - "LifeLogEntry co-located in db.ts (Open Question 2 decision): keeps all Dexie entity types together"
    - "entriesRepository singleton object pattern: module-level const with async methods; components import repository not db directly"
    - "listUnsynced uses .filter(e => e.syncedAt == null) full scan — IndexedDB cannot index null; correct at local scale"
    - "useEntries returns undefined on first render (useLiveQuery async open); callers distinguish undefined (loading) from [] (empty)"
    - "Test file renamed to .tsx when JSX RTL components added (Rule 2 auto-fix)"
    - "TDD: RED commit (test file with import-not-found or runtime failure) → GREEN commit (implementation) per task"

key-files:
  created:
    - src/services/entriesRepository.ts
    - src/services/entriesRepository.test.tsx
  modified:
    - src/services/db.ts
    - src/services/db.test.ts

key-decisions:
  - "LifeLogEntry.syncedAt is number | null (not boolean): more semantically rich; records WHEN synced; null enables future-sync seam (DATA-04)"
  - "No default value in useEntries() useLiveQuery: undefined = loading, [] = empty; callers must guard — avoids hiding loading state from skeleton UI"
  - "listUnsynced uses == null (loose equality) not === null: catches both null and undefined for defensive correctness"
  - "entriesRepository.test.ts renamed to .tsx when RTL component added — JSX requires .tsx extension with esbuild/Vitest"

patterns-established:
  - "Repository pattern: components import entriesRepository/useEntries, never db directly"
  - "UUID primary key: crypto.randomUUID() for sync-safe string IDs (T-02-DATA-03 mitigated)"
  - "Additive Dexie version blocks: never edit prior version(N).stores(); only add version(N+1)"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, DATA-05]

# Metrics
duration: 6min
completed: "2026-06-15"
---

# Phase 2 Plan 02: Dexie v2 Schema + LifeLogEntry + entriesRepository Summary

**LifeLogEntry domain model + Dexie v2 additive schema (entries + settings stores) + entriesRepository CRUD with listUnsynced sync seam + useEntries reactive hook; all 54 project tests green**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-06-15T19:20:53Z
- **Completed:** 2026-06-15T19:26:18Z
- **Tasks:** 3 (all TDD: RED + GREEN commits each)
- **Files modified:** 4

## Accomplishments

- Dexie version(2) additive upgrade: `entries` (`&id, recordedAt, domain`) and `settings` (`key`) stores added; version(1) counter store preserved untouched — all 3 original counter tests still pass
- `LifeLogEntry` interface (DATA-01 exact field list) + `EntryDomain` + `EntryType` co-located in `db.ts`; `tsc -b` exits 0
- `entriesRepository` with full CRUD (`create`, `get`, `list`, `listUnsynced`, `update`, `delete`) + `useEntries()` hook; SC1 (round-trip), SC2a (reactive re-render), SC3 (unsynced seam) all proven by tests
- 22 new tests across 2 test files; 54 total project tests green; `tsc -b && vite build` exit 0

## Task Commits

Each task was committed atomically (RED then GREEN per TDD cycle):

1. **Task 1 RED: v2 schema tests** - `9ac65fa` (test)
2. **Task 1 GREEN: LifeLogEntry + version(2)** - `f8f9ea0` (feat)
3. **Task 2 RED: entriesRepository CRUD tests** - `7fdb664` (test)
4. **Task 2 GREEN: entriesRepository CRUD** - `c825a1a` (feat)
5. **Task 3 RED: useEntries RTL test** - `a0dd228` (test)
6. **Task 3 GREEN: useEntries hook** - `ce89c13` (feat)

## Files Created/Modified

- `src/services/db.ts` — Extended: `EntryDomain`, `EntryType`, `LifeLogEntry` exports; `entries!` + `settings!` table declarations; `version(2).stores({ entries: '&id, recordedAt, domain', settings: 'key' })`
- `src/services/db.test.ts` — Extended: v2 schema tests (entries add/get, settings put/get, index queryability, counter survival after upgrade) — 9 tests total
- `src/services/entriesRepository.ts` — Created: CRUD singleton + `useEntries()` useLiveQuery hook
- `src/services/entriesRepository.test.tsx` — Created (renamed from .ts for JSX): 13 tests covering SC1, list ordering, update, delete, SC3 boundary, SC2a RTL re-render

## Decisions Made

- **LifeLogEntry co-located in `db.ts`** per RESEARCH Open Question 2 resolution: keeps all data-layer types together; refactor to `src/types/` deferred to Phase 3 if needed.
- **`syncedAt: number | null`** (not `synced: boolean`): semantically richer (records WHEN synced, not just WHETHER); filter scan acceptable at local scale; unindexable null is correct behavior per Dexie docs.
- **`useEntries()` returns `undefined` while loading** (no `[]` default): callers must handle loading state explicitly; prevents hiding Dexie open latency behind an empty array.
- **`listUnsynced` uses `== null`** (loose equality): catches both `null` and `undefined` defensively.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Renamed test file from `.ts` to `.tsx`**
- **Found during:** Task 3 RED phase
- **Issue:** `entriesRepository.test.ts` used `.ts` extension; when JSX was added for the RTL test component, esbuild failed with `Expected ";" but found "…"` — esbuild requires `.tsx` extension to parse JSX syntax
- **Fix:** `git mv src/services/entriesRepository.test.ts src/services/entriesRepository.test.tsx`; also replaced non-ASCII ellipsis `…` with ASCII `...` in JSX text
- **Files modified:** `src/services/entriesRepository.test.tsx` (rename + fix)
- **Verification:** All 13 tests pass after rename
- **Committed in:** `a0dd228` (Task 3 RED commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical: file extension required for JSX)
**Impact on plan:** Necessary rename; plan mentions `.ts` but JSX requires `.tsx`. No scope creep.

## Issues Encountered

None beyond the `.tsx` rename documented above.

## Manual Verification Required (SC2b)

**SC2b (cross-refresh persistence):** `fake-indexeddb` is in-memory and cannot prove real IndexedDB persistence across page refreshes. Manual step:

```
npm run dev
```
1. Open browser, create an entry via the app
2. Hard-refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Verify entry still appears — proves IndexedDB write survived the refresh

This is the phase gate manual check. Document result in the Phase 2 phase-gate verification.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Data layer is complete. Phase 3 (Navigation & Screens) can import `useEntries` and `entriesRepository` immediately.
- Phase 4 (URL Capture) calls `entriesRepository.create(...)` to persist entries.
- `listUnsynced()` seam is in place for the future sync layer (Phase SYNC-01, out of current scope).
- No blockers or concerns.

## Threat Surface Review

| Threat ID | Status | Notes |
|-----------|--------|-------|
| T-02-DATA-01 (Tampering — LifeLogEntry input) | Accepted | Fields TypeScript-typed at repo boundary; no XSS sink in Phase 2 (no dangerouslySetInnerHTML) |
| T-02-DATA-02 (Info Disclosure — IndexedDB) | Accepted | Same-origin local store, single-user prototype; no PII boundary |
| T-02-DATA-03 (Spoofing — entry id collision) | Mitigated | `crypto.randomUUID()` in `entriesRepository.create()` — 122-bit random, globally unique |

No new threat surfaces introduced beyond the plan's threat model.

---
*Phase: 02-data-layer-pwa-shell*
*Completed: 2026-06-15*

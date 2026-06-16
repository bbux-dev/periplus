---
phase: 06-entry-list-detail-export
plan: "04"
subsystem: pages
tags: [entry-list, filter, export, dashboard, vitest, rtl, fake-indexeddb, tdd]

# Dependency graph
requires:
  - phase: 06-entry-list-detail-export
    plan: "03"
    provides: buildExportJson + triggerDownload from exportEntries.ts
  - phase: 06-entry-list-detail-export
    provides: useEntries() from entriesRepository.ts
  - phase: 06-entry-list-detail-export
    provides: NAVIGATION + getDomainConfig from navigation.ts
provides:
  - EntryListPage: reactive filtered list with domain-scoped type labels + export
  - DashboardPage: /entries link tile (View All Entries)
affects:
  - 06-05-EntryDetailPage (each list row links to /entries/:id)
  - 06-06-AppWiring (EntryListPage must be swapped into App.tsx /entries route)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useState FilterKey for local filter state; derive filtered array in render (no useMemo at local scale)
    - FILTER_OPTIONS derived from NAVIGATION array (single source of truth for domain order/labels)
    - Domain-scoped type label lookup via getDomainConfig(domain)?.types.find() — no flatMap
    - Capture narrowed const (allEntries = entries) after undefined guard to preserve type in closures
    - vi.mock async factory to keep real buildExportJson and mock only triggerDownload in RTL tests

key-files:
  created:
    - src/pages/EntryListPage.tsx
    - src/pages/EntryListPage.test.tsx
  modified:
    - src/pages/DashboardPage.tsx
    - src/pages/DashboardPage.test.tsx

key-decisions:
  - "FILTER_OPTIONS derived from NAVIGATION at module level — ensures domain order and labels stay in sync automatically"
  - "allEntries = entries captured after undefined guard to satisfy TypeScript control-flow narrowing in function declaration closure (TS2345 fix)"
  - "vi.mock async factory with importOriginal keeps the real buildExportJson so the JSON arg to triggerDownload contains real entry data for assertion"
  - "QueueListIcon from @heroicons/react/24/outline used for the View All Entries tile (confirmed available in installed heroicons 2.x)"

requirements-completed: [VIEW-01, VIEW-02, VIEW-04, EXP-01]

# Metrics
duration: ~3min
completed: 2026-06-16
---

# Phase 06 Plan 04: EntryListPage + Dashboard Link Summary

**Reactive filterable entry list with domain-scoped type labels, export button, and Dashboard /entries link delivering VIEW-01/02/04 and EXP-01 trigger**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-16T00:08:36Z
- **Completed:** 2026-06-16T00:11:44Z
- **Tasks:** 2 (Task 1 TDD: 2 commits RED+GREEN; Task 2: 1 commit; 1 fix commit)
- **Files modified:** 4

## Accomplishments

- `EntryListPage.tsx`: 120-line React page with `useEntries()` reactive hook, loading gate, `useState<FilterKey>` filter, FILTER_OPTIONS derived from NAVIGATION, domain-scoped `getTypeLabel`, `EntryRow` (Link to /entries/:id, title, typeLabel, date with data-testid, amount-when-present), empty state, and Export JSON button
- 9 RTL+fake-indexeddb tests across VIEW-01/02/04 and EXP-01: row fields render, amount gate, row links, filter narrows and All restores, empty state, persistence proxy, export calls triggerDownload with JSON containing titles
- `DashboardPage.tsx` updated with `QueueListIcon` + `Link to="/entries"` tile labelled "View All Entries"; test updated from 3→4 link count assertion plus href check
- All 205 tests pass; `tsc -b` + `vite build` green

## Task Commits

1. **Task 1 RED: failing EntryListPage tests** — `13f59ec`
2. **Task 1 GREEN: EntryListPage implementation** — `cc6507d`
3. **Task 2: DashboardPage /entries link + test** — `86cf5e2`
4. **Fix: TS2345 in handleExport closure** — `faf471a`

## Files Created/Modified

- `src/pages/EntryListPage.tsx` — `EntryListPage` + `EntryRow` + `getTypeLabel` + `FILTER_OPTIONS`
- `src/pages/EntryListPage.test.tsx` — 9 tests covering VIEW-01/02/04 + EXP-01
- `src/pages/DashboardPage.tsx` — added QueueListIcon import + View All Entries Link to /entries
- `src/pages/DashboardPage.test.tsx` — updated link count (3→4) + added /entries href assertion

## Decisions Made

- FILTER_OPTIONS derived from NAVIGATION at module level to keep domain order/labels in sync with the navigation config automatically
- `allEntries = entries` captured after the `undefined` guard so the `handleExport` function declaration closure sees `LifeLogEntry[]` not the union — TypeScript TS2345 fix
- `vi.mock` async factory (`importOriginal`) used in tests to keep the real `buildExportJson` and only mock `triggerDownload` — allows asserting that the JSON arg actually contains entry titles
- QueueListIcon confirmed present in the installed heroicons 2.x package before committing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript TS2345 error in handleExport closure**
- **Found during:** Task 1 GREEN (tsc -b check after Vite build)
- **Issue:** TypeScript TS2345: `entries` typed as `LifeLogEntry[] | undefined` inside the `handleExport` function declaration, even though control-flow narrowing had excluded `undefined` before the function was defined. TypeScript does not propagate outer-scope narrowing into function declarations used as closures.
- **Fix:** After the `if (entries === undefined) return` guard, captured `const allEntries = entries` (TypeScript infers `LifeLogEntry[]`). Used `allEntries` in `handleExport` and `filtered` computation. No behavior change.
- **Files modified:** `src/pages/EntryListPage.tsx`
- **Commit:** `faf471a`

## Known Stubs

None — all data flows from `useEntries()` / IndexedDB. No hardcoded placeholders.

## Threat Flags

No new threat surface beyond the plan's threat model:
- All entry fields render as JSX text nodes (React-escaped); no `dangerouslySetInnerHTML`
- Row links target `/entries/${id}` internal routes only
- Export operates on local data with no network egress

---

## Self-Check

Files exist:
- `src/pages/EntryListPage.tsx` — confirmed (created in GREEN commit)
- `src/pages/EntryListPage.test.tsx` — confirmed (created in RED commit)
- `src/pages/DashboardPage.tsx` — confirmed (modified in Task 2 commit)
- `src/pages/DashboardPage.test.tsx` — confirmed (modified in Task 2 commit)

Commits exist:
- `13f59ec` — test(06-04): RED phase tests
- `cc6507d` — feat(06-04): EntryListPage implementation
- `86cf5e2` — feat(06-04): DashboardPage /entries link
- `faf471a` — fix(06-04): TS2345 closure fix

Full test suite: 205 tests / 24 files — all pass
Build: `tsc -b` + `vite build` — exit 0

## Self-Check: PASSED

---
*Phase: 06-entry-list-detail-export*
*Completed: 2026-06-16*

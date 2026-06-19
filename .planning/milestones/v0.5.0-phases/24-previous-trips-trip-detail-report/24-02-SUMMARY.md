---
phase: 24-previous-trips-trip-detail-report
plan: "02"
subsystem: pages/components
tags: [expense-report, trip-detail, expandable-rows, float-safe, uuid-isolation, tdd]
dependency_graph:
  requires: [24-01]
  provides: [TripDetailPage, ExpenseReport]
  affects: [App.tsx, /trips/:tripId route]
tech_stack:
  added: []
  patterns: [TDD-RED-GREEN, useTripEntries+useParams, expandable category accordion, formatUSD all monetary values]
key_files:
  created:
    - src/components/ExpenseReport.tsx
    - src/components/ExpenseReport.test.tsx
    - src/pages/TripDetailPage.tsx
    - src/pages/TripDetailPage.test.tsx
  modified:
    - src/App.tsx
decisions:
  - "ExpenseReport derives category map and grand total internally from entries; callers pass raw LifeLogEntry[]"
  - "Timeline row amounts appear in both ExpenseReport and Timeline sections; tests use getAllByText to tolerate duplicates"
  - "No edit/delete controls in TripDetailPage — deferred to 24-03; timeline rows have stable e.id keys for 24-03 to attach buttons"
metrics:
  duration: "4 min"
  completed: "2026-06-19"
  tasks: 2
  files: 5
---

# Phase 24 Plan 02: ExpenseReport + TripDetailPage Summary

**One-liner:** Category-grouped, expandable, float-safe expense report component + TripDetailPage at /trips/:tripId loading entries by UUID with chronological timeline.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ExpenseReport component + tests | 1c6bc74 | src/components/ExpenseReport.tsx, src/components/ExpenseReport.test.tsx |
| 2 | TripDetailPage + tests + App.tsx route | 2e8ad28 | src/pages/TripDetailPage.tsx, src/pages/TripDetailPage.test.tsx, src/App.tsx |

## What Was Built

**ExpenseReport** (`src/components/ExpenseReport.tsx`):
- Accepts `entries: LifeLogEntry[]`; derives `tripExpensesByCategory` (Map) and `tripExpenseTotal` internally
- Categories rendered in `EXPENSE_CATEGORIES` canonical order (Hotel → Rental Car → Flight → … → Other); empty categories skipped
- Uncategorized bucket shown when map has that key (non-string/missing `metadata.category`)
- Each category row is a `<button type="button" aria-expanded>` with `useState<Set<string>>` expand toggle
- When expanded: shows individual expense entries with merchant (`metadata.merchant`) or fallback `e.title`, plus `formatUSD(e.amount ?? 0)`
- Grand total footer: `formatUSD(grandTotal)` — no raw float to DOM (Pitfall 4 mitigated)
- 10 tests: subtotals, canonical order, Uncategorized, expand toggle, aria-expanded, float-safe $15.30 for 10.10+5.20

**TripDetailPage** (`src/pages/TripDetailPage.tsx`):
- Reads `:tripId` via `useParams<{ tripId: string }>()` and loads `useTripEntries(tripId ?? '')`
- UUID-based isolation: two 'Paris' trips resolve independently (tripId in dep array per Pitfall 5)
- Loading skeleton while `entries === undefined` (Dexie opening)
- Renders `<ExpenseReport entries={entries} />` for category-grouped report
- Chronological timeline of ALL entries sorted ascending by `occurredAt ?? recordedAt`
- Expenses in timeline: category label + `formatUSD(amount)`; activities: title + rating (if present)
- Read-only timeline rows with stable `e.id` keys — 24-03 will attach Edit/Delete buttons
- 6 tests: loading, $15.30 float-safe grand total, timeline expense+activity, sort order, UUID isolation, buildEntryUpdate metadata-preserve

**App.tsx**: replaced `<PlaceholderPage title="Trip Detail" />` at `/trips/:tripId` with `<TripDetailPage />`.

## Verification

- `npx tsc -b`: clean
- `npx vitest run`: 346 tests passed (was 330; +16 new)
- `npx vite build`: success (391.79 kB bundle)

## Deviations from Plan

### Test adjustments (Rule 1 - Bug)

**1. getAllByText for amounts appearing in both ExpenseReport and Timeline**
- **Found during:** Task 1 test (Uncategorized $7.00 appeared twice: subtotal + grand total), Task 2 tests ($10.10, $5.20, $4.00, "Food" each appeared in both ExpenseReport section and Timeline section)
- **Fix:** Changed `getByText` / `findByText` to `getAllByText` / `findAllByText` where the same text is rendered in multiple sections; kept `getByText` for `$15.30` (grand total only, unique value)
- **Files modified:** src/components/ExpenseReport.test.tsx, src/pages/TripDetailPage.test.tsx
- **Commits:** 1c6bc74, 2e8ad28

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-24-04 (Spoofing) | Entries scoped to exact `metadata.tripId` UUID match via `useTripEntries`; covered by duplicate-name isolation test |
| T-24-05 (Tampering) | All monetary values through `formatUSD` (Math.round(x*100)/100); grand total === sum of subtotals asserted in tests |

## Known Stubs

None. All data flows from real Dexie entries via `useTripEntries`; no placeholders or mock data in production code.

## Self-Check: PASSED

- [x] `src/components/ExpenseReport.tsx` exists
- [x] `src/components/ExpenseReport.test.tsx` exists
- [x] `src/pages/TripDetailPage.tsx` exists
- [x] `src/pages/TripDetailPage.test.tsx` exists
- [x] `src/App.tsx` modified (TripDetailPage import + route)
- [x] Commit 1c6bc74 exists
- [x] Commit 2e8ad28 exists
- [x] 346 tests green, tsc clean, vite build succeeds

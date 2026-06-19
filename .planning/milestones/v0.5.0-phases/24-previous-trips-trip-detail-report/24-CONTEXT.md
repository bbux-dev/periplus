# Phase 24: Previous Trips + Trip Detail + Category-Grouped Expense Report - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning
**Mode:** Auto-generated (skip_discuss) + milestone research + engine mapping

<domain>
## Phase Boundary

The read/report side: list all trips, drill into one, see a category-grouped expense report + a
chronological timeline, and edit/delete any entry inline. This is the final v0.5.0 phase.

Delivers (PREV-01..04, RPT-01..06):
- `PreviousTripsPage` at `/trips`: all trips newest-first; each row = name, date range, total
  expenses (currency), activity count; ALL stats from a SINGLE `db.entries.toArray()` pass (no
  per-trip filter loop). Row → `/trips/:tripId` (by UUID).
- `TripDetailPage` at `/trips/:tripId`: category-grouped expense report (per-category subtotals +
  grand total, expandable to individual expenses), a chronological timeline of all trip entries
  (expenses + activities), and inline Edit/Delete on each entry. Values update reactively after
  edit/delete.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Single-pass trip summaries (PREV-04 — performance pitfall)
- The trips list MUST derive every trip's stats from ONE `db.entries.toArray()` read, grouping by
  `metadata.tripId` in memory — NOT a `listTripEntries(tripId)` call per trip (that's N+1).
- Add a PURE helper (e.g. `summarizeTrips(allEntries): TripSummary[]`) in `tripService.ts` (or the
  page) that: filters trip records (`type==='trip'`), groups non-trip entries by `metadata.tripId`,
  and for each trip computes total (`tripExpenseTotal`), date range (`tripDateRange`), and activity
  count (`tripActivityCount`) over its grouped slice. Reuse the existing Phase-20 pure helpers on the
  grouped arrays. Sort newest-first by the trip record's `recordedAt`.

### Drill-in by UUID (not name) — PREV-02 / duplicate-name safety
- Navigate to `/trips/<trip.id>` (the trip record's UUID). `TripDetailPage` reads `:tripId` and
  loads that trip's entries via `useTripEntries(tripId)` (already filters by `metadata.tripId`).
  Two trips with the same name resolve independently.

### Category-grouped report (RPT-01..03) — float-safe money
- Use `tripExpensesByCategory(entries)` (returns `Map<string,number>`) for subtotals and
  `tripExpenseTotal` for the grand total. EVERY monetary value is rounded `Math.round(x*100)/100`
  and rendered via `formatUSD` (which already guards NaN + rounds). Order categories by the shared
  `EXPENSE_CATEGORIES` order (skip empty categories, or show all — implementer's discretion; prefer
  showing only non-empty).
- Category rows show or expand to show their individual expense entries (vendor/merchant + amount).
  Expandable rows are fine (accordion); or list entries directly under each category.

### Timeline (RPT-04)
- A chronological list of ALL the trip's entries (expenses AND activities), sorted by `occurredAt`
  (fall back to `recordedAt`). Render expenses with category + amount; activities with their
  name/activityType + rating. Keep it simple.

### Inline edit/delete (RPT-05, RPT-06) — reactive
- Edit: open an edit form backed by `entriesRepository.update(id, changes)`. REUSE the existing,
  still-present field machinery in `entryFields.ts`:
  - `ENTRY_FIELDS[entry.type]` — the field descriptors for the entry's type.
  - `formValuesFromEntry(fields, entry)` — seeds the form's `Record<fieldKey,string>` from the entry
    (local-date `occurredAt` round-trip already handled).
  - `buildEntryUpdate(fields, entry, formValues, extraMetadata)` — produces the `Partial<Omit<LifeLogEntry,'id'>>`
    `changes` object. This is the AUTHORITATIVE merge-preserving updater used by the old edit path:
    metadata is MERGED (unknown keys + `mode`/`modeLabel`/`tripId` survive untouched unless edited),
    and `recordedAt`/`syncedAt`/`domain`/`type` are NEVER written. Pass its result straight to
    `entriesRepository.update(entry.id, changes)`.
  Do NOT hand-roll the merge — `buildEntryUpdate` already does it correctly (this is the function the
  v0.4.0 EEDIT path used).
- Delete: a confirmation prompt (confirm dialog or a two-step confirm button) BEFORE
  `entriesRepository.delete(id)`. No accidental deletes.
- All views (`PreviousTripsPage` totals, `TripDetailPage` report + timeline) read via `useLiveQuery`
  so they update reactively after edit/delete — no manual refresh.
- Scope: entry-level edit/delete ONLY. There is NO "Delete Trip" (locked product decision —
  avoids orphaned entries).

### Dates
- Any new date handling reuses `todayLocalDate()` / local formatting; date-range display formats the
  entries' `occurredAt`. Never `toISOString()` for the local-date default.

### Claude's Discretion
Report layout (accordion vs flat), timeline row format, the edit-form presentation (modal vs inline
panel vs a small route), and date-range formatting are at Claude's discretion (mobile-first).
</decisions>

<canonical_refs>
## Canonical References

- `.planning/research/PITFALLS.md` — N+1 single-pass scan; float money; identical trip names;
  metadata merge-preserve on edit.
- `.planning/research/ARCHITECTURE.md` — trip summaries + report derivation.
- `src/services/tripService.ts` — `tripExpenseTotal`, `tripExpensesByCategory` (Map),
  `tripDateRange`, `tripActivityCount` (pure helpers to reuse), `useTrips`, `useTripEntries`,
  `listTripEntries`. Add `summarizeTrips` here.
- `src/services/entriesRepository.ts` — `update(id, changes)`, `delete(id)`.
- `src/config/entryFields.ts` — `ENTRY_FIELDS`, `formValuesFromEntry` (seed the edit form),
  `buildEntryUpdate` (merge-preserving `changes` for `entriesRepository.update`).
- `src/config/money.ts` — `formatUSD`. `src/config/expenseCategories.ts` — `EXPENSE_CATEGORIES`
  (report ordering).
- `src/pages/TripHomePage.tsx` — reactive `useLiveQuery` + entry-row rendering analog.
- `src/components/ui/{Button,FormField,Input}` — reuse for the edit form + confirm.
- `src/App.tsx` — placeholder routes `/trips` and `/trips/:tripId` to replace.
- `src/services/db.ts` — `db.entries` for the single `toArray()` pass.
</canonical_refs>

<specifics>
## Specific Ideas

- `summarizeTrips` is the single-pass core; the PreviousTripsPage just renders its output. Unit-test
  it: two trips (one with entries, one empty), assert per-trip total/date-range/activity-count and
  newest-first order, and that it does NOT call `listTripEntries`.
- Report: group by `metadata.category`; uncategorized/legacy expenses (no category) fall under
  'Other' or a clearly-labeled bucket. Grand total === sum of subtotals (assert in a test).
- Edit merge-preserve: write a test that edits an expense's amount and asserts `metadata.tripId`
  (and `mode`/`modeLabel`) survive the update.
- Delete: confirm-gated; after delete, assert the entry is gone and the total/subtotals recompute.
- All Dexie tests use `vi.useFakeTimers({ toFake: ['Date'] })`.
</specifics>

<deferred>
## Deferred Ideas
- "Delete Trip" / cascade delete, explicit "End Trip", per-day grouping, charts, CSV/PDF export →
  deferred (future milestone).
</deferred>

---

*Phase: 24-previous-trips-trip-detail-report*
*Context gathered: 2026-06-19 (skip_discuss + research + engine mapping)*

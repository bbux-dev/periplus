# Phase 22: Trip Home + Expense Capture - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning
**Mode:** Auto-generated (skip_discuss) + milestone research + engine mapping

<domain>
## Phase Boundary

Build the steady-state trip dashboard and the fast expense-logging flow. This is the product's
defining UX ("expense → amount → category → save"). Activity capture is Phase 23; Previous
Trips/report is Phase 24.

Delivers (TRIP-01, TRIP-03, HOME-01..05, EXP-01..06):
- Full `TripHomePage` (replaces the Phase-21 stub): active trip name prominent; currency-formatted
  running expense total; last 10 entries for the active trip (most recent first); primary
  `Expense` + `Activity` CTA buttons; top-level nav reachable via the shell.
- Expense sheet/modal (clone the `HoleSheet` bottom-sheet pattern): Amount (`inputMode="decimal"`,
  required), 8-button Category grid (required), Vendor (optional), Notes (optional); fast path
  Expense → amount → category → save.
- `formatUSD` currency utility.
- Verify `CreateTripPage` end-to-end (create → activate → land on Home showing the new trip).
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Expense categories (exact, ordered)
Hotel, Rental Car, Flight, Taxi/Uber, Food, Gas, Parking, Other. Render as large tap-target buttons
(NOT a dropdown). Define once as a shared constant so Phase 24's report can reuse it.

### Expense save — reuse the single stamped path
- Build a `ReviewDraft` for the expense then call
  `draftToEntry(draft, 'expense', 'trips', activeMode)` and `entriesRepository.create(...)`.
- `domain` MUST be `'trips'` (NEVER `'expenditures'` — do NOT use `defaultDomainForType`, which
  returns `'expenditures'`). `type` is `'expense'`.
- `metadata.tripId` is stamped AUTOMATICALLY by `draftToEntry` from the active mode — do not set it
  by hand. (Active mode is the trip; its `tripId` is the active trip's UUID.)
- Field → metadata mapping (matches `ENTRY_FIELDS.expense`): amount → `amount`; category →
  `metadata.category`; Vendor → `metadata.merchant`; Notes → `core.description` (or the existing
  expense description field). Use `buildReviewDraft(ENTRY_FIELDS.expense, formValues)` if convenient,
  or construct the draft directly — either is fine as long as the mapping holds.

### Dates — local, not UTC (known past bug)
- `occurredAt` defaults to today's LOCAL midnight epoch via `todayLocalMidnightEpoch()` /
  `todayLocalDate()` from `captureService.ts`. NEVER `new Date().toISOString()`.

### Money — float-safe
- The running total uses `tripService.tripExpenseTotal(entries)` and is rounded at display via
  `formatUSD` (which wraps `Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})` and rounds
  `Math.round(x*100)/100` before formatting). No integer-cents migration.

### Validation
- Save is blocked (with a visible validation message, no write) when Amount is empty/NaN/≤0 OR no
  Category is selected. Vendor and Notes are optional.

### Expense sheet UX (clone HoleSheet)
- Reuse the proven `HoleSheet` modal pattern: `role="dialog" aria-modal="true"`, fixed bottom sheet,
  Escape + backdrop-click dismiss, focus management, body scroll lock. Amount field auto-focuses.
  Build a NEW `ExpenseSheet` component (do not overload HoleSheet, which is shortcut-specific).
- After a successful save, close the sheet and surface the existing `SavedToast` (undo via
  `entriesRepository.delete` of the just-created id). Undo is nice-to-have; if it complicates, at
  minimum show a confirmation toast.

### Activity CTA
- The `Activity` button navigates to `/activity` (the Activity flow is built in Phase 23; the route
  is currently a PlaceholderPage). Wire the navigation now; the destination fills in Phase 23.

### Claude's Discretion
Exact sheet layout, total/recent-entries styling, whether to use `buildReviewDraft` vs a direct draft,
and the recent-entries row format are at Claude's discretion (mobile-first, minimal).
</decisions>

<canonical_refs>
## Canonical References

- `.planning/research/STACK.md` — ExpenseSheet = HoleSheet clone; `formatUSD` via Intl.NumberFormat; zero new deps.
- `.planning/research/PITFALLS.md` — domain='trips' not 'expenditures'; UTC date off-by-one; float money; modal a11y.
- `src/components/dashboard/HoleSheet.tsx` — bottom-sheet modal pattern to clone.
- `src/components/dashboard/SavedToast.tsx` — `SavedToast({ onUndo })` post-save toast.
- `src/services/captureService.ts` — `draftToEntry(draft,type,domain,activeMode?)`,
  `todayLocalDate()`, `todayLocalMidnightEpoch()`. (NOTE: a doc-comment there still references the
  deleted `ReviewPage.tsx`; it is stale — ignore/clean it, the expense path does not use ReviewPage.)
- `src/config/entryFields.ts` — `ENTRY_FIELDS.expense` (amount/category/merchant/...), `buildReviewDraft`.
- `src/services/tripService.ts` — `useActiveMode`/active trip, `useTripEntries(tripId)`,
  `tripExpenseTotal`. `src/services/entriesRepository.ts` — `create`/`delete`.
- `src/pages/TripHomePage.tsx` — the Phase-21 stub to expand; `src/pages/CreateTripPage.tsx`.
- `src/components/ui/{Button,FormField,Input}` — reuse for the sheet fields.
</canonical_refs>

<specifics>
## Specific Ideas

- Single source of truth for the 8 categories (e.g. `EXPENSE_CATEGORIES` constant) — Phase 24's
  grouped report imports the same list/order.
- Recent entries: `useTripEntries(activeTripId)`, sorted most-recent-first, sliced to 10; render
  expenses with category + formatted amount, activities with their name/type.
- Total: `formatUSD(tripExpenseTotal(tripEntries))`.
- All new Dexie tests use `vi.useFakeTimers({ toFake: ['Date'] })`. Test the local-date default and
  the `domain='trips'`/`tripId` stamping explicitly (these are the high-risk correctness points).
</specifics>

<deferred>
## Deferred Ideas
- Activity Type page + Activity form + star rating → Phase 23.
- Previous Trips list + Trip Detail + category-grouped expense report → Phase 24.
</deferred>

---

*Phase: 22-trip-home-expense-capture*
*Context gathered: 2026-06-19 (skip_discuss + research + engine mapping)*

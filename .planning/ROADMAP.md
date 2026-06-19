# Roadmap: Life Log

## Milestones

- ✅ **v0.1.0 — Tracer Bullet → working local life-log** — Phases 1–6 (shipped 2026-06-16)
- ✅ **v0.2.0 — Quick-Capture DSL** — Phases 7–10 (shipped 2026-06-16)
- ✅ **v0.3.0 — Dashboard Shortcut Layouts** — Phases 11–15 (shipped 2026-06-17)
- ✅ **v0.4.0 — "Active Mode" De-Clunk + Editable Entries** — Phases 16–19 (shipped 2026-06-19)
- [ ] **v0.5.0 — Trips MVP UI Refactor** — Phases 20–24 (in progress)

## Phases

### v0.5.0 — Trips MVP UI Refactor (Phases 20–24)

Aggressively rewrite the UI to expose ONLY a minimal trip logger — create/activate a trip, log
expenses and activities tied to the active trip, view prior trips, and see per-trip expense reports
grouped by category — while preserving the headless engine (Dexie storage, `entriesRepository`,
active-mode/context stamping, `draftToEntry`). Design north-star: `seeds/fewest-buttons-slickest.md`.

- [ ] **Phase 20: Trip Data Model + Engine Extensions** — extend `EntryType` with `'trip'`/`'activity'`;
  add optional `tripId` to `ActiveMode` + `activateMode()`; stamp `metadata.tripId` in `draftToEntry`;
  create `tripService.ts` with create-and-activate, list helpers, and pure stat functions (date range,
  expense total, expenses-by-category, activity count); all existing 592+ tests stay green.
  Reqs: ENG-01..04.
- [ ] **Phase 21: App Shell + Routing Rewrite + Atomic Drop** — delete all 13 old page files and
  their test files atomically (suite stays green after the deletion commit); rewrite `App.tsx` to
  trip-only routes; rewrite `AppShell` nav (Home / Previous Trips / Settings + active trip name in
  app bar); strip `SettingsPage` to export-only; add `CreateTripPage` empty-state screen +
  `TripHomePage` stub with loading-vs-no-trip guard; drop dead DSL/shortcut/layout subsystem files.
  Reqs: UI-01..05, TRIP-02, TRIP-04.
- [ ] **Phase 22: Trip Home + Expense Capture** — full `TripHomePage` (active trip name, formatted
  running total, recent entries, Expense + Activity CTAs); `ExpensePage` sheet (Amount required,
  8-category tap grid required, Vendor optional, Notes optional); `formatUSD` util; `todayLocalDate()`
  date default; `domain='trips'`; trip creation + activation wired end-to-end.
  Reqs: TRIP-01, TRIP-03, HOME-01..05, EXP-01..06.
- [ ] **Phase 23: Activity Capture** — `ActivityTypePage` (Hike/Show/Restaurant/Cafe/Other tap
  targets); `ActivityFormPage` (Name required, Location, Rating, Notes; Other adds required free-text
  Type); accessible `StarRating` component (5 Heroicon `<button>` elements, `role="radio"` pattern).
  Reqs: ACT-01..06.
- [ ] **Phase 24: Previous Trips + Trip Detail + Expense Report** — `PreviousTripsPage` (all trips
  newest-first, single-pass stats: date range + expense total + activity count); `TripDetailPage`
  (category-grouped expense report with subtotals + grand total; chronological timeline of all
  entries; inline edit/delete via `entriesRepository.update/delete`); float-safe
  `Math.round(x*100)/100` + `formatUSD` throughout.
  Reqs: PREV-01..04, RPT-01..06.

## Phase Details

### Phase 20: Trip Data Model + Engine Extensions
**Goal**: The engine understands trips and activities; `EntryType` includes `'trip'` and `'activity'`; `ActiveMode` carries an optional `tripId`; `draftToEntry` stamps `metadata.tripId` when a trip is active; `tripService` provides create-and-activate, list, and pure stat helpers; all existing 592+ tests remain green.
**Depends on**: Phase 19 (active mode engine)
**Requirements**: ENG-01, ENG-02, ENG-03, ENG-04
**Success Criteria** (what must be TRUE):
  1. `EntryType` union in `db.ts` includes `'trip'` and `'activity'`; `tsc -b` compiles clean with no type errors on all entry-type usage sites
  2. `activateMode('trip', 'Oregon Road Trip', tripId)` persists `{ mode, label, tripId }` in the settings store; `useActiveMode()` returns the `tripId` on the next render; all existing callers passing two args remain unbroken
  3. An entry saved via `draftToEntry(draft, 'expense', 'trips', activeMode)` when `activeMode.tripId` is set has `metadata.tripId === activeMode.tripId`; entries saved without a `tripId` are unaffected
  4. `tripService.createAndActivateTrip('Paris')` creates a `type='trip'` entry in `db.entries` and immediately activates the mode with that entry's UUID as `tripId`
  5. Pure stat helpers (`tripExpenseTotal`, `tripExpensesByCategory`, `tripDateRange`, `tripActivityCount`) return correct values from in-memory entry arrays with no Dexie calls; all existing 592+ tests remain green
**Plans**: 2 plans
Plans:
- [x] 20-01-PLAN.md — Extend EntryType (trip/activity) + entryFields exhaustiveness; ActiveMode.tripId + activateMode 3rd param; draftToEntry tripId stamp
- [x] 20-02-PLAN.md — tripService.ts: create-and-activate, list helpers, reactive hooks, and pure stat helpers + tests
**Key pitfalls**: Update `EntryType` in `db.ts` FIRST before any code that passes `'trip'` or `'activity'` as a type arg (`tsc -b` fails otherwise); `tripId` param on `activateMode` is optional — all existing callers unbroken; new tests with `vi.useFakeTimers` MUST use `{ toFake: ['Date'] }` not full fake timers (Dexie IndexedDB hang); `entryFields.ts` ENTRY_FIELDS and POSITIONAL_SCHEMA must include entries for `trip` and `activity` or TypeScript enforces exhaustiveness

### Phase 21: App Shell + Routing Rewrite + Atomic Drop
**Goal**: All 13 old page files and their test files are deleted atomically so the test suite stays green immediately after the deletion commit; `App.tsx` exposes only trip-flow routes; `AppShell` shows Home / Previous Trips / Settings with the active trip name in the app bar; `SettingsPage` is export-only; `CreateTripPage` and a `TripHomePage` stub with a correct loading-vs-no-trip guard exist at `/`.
**Depends on**: Phase 20
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, TRIP-02, TRIP-04
**Success Criteria** (what must be TRUE):
  1. All 13 old page `.tsx` files and their paired `.test.tsx` files are deleted in the same commit; `npx vitest run` is green immediately after with no `Cannot find module` errors; `App.test.tsx` is replaced with new trip-router coverage tests
  2. Navigating to `/` when Dexie has resolved with no active trip shows the "Create a Trip" name-input screen; during Dexie load a neutral loading skeleton is shown — not the Create Trip screen — so there is no flash of empty state on an active-trip cold load
  3. `AppShell` has no remaining imports of `NAVIGATION`, `useShortcutConfig`, `listModes`, or `LayoutChips`; the hamburger menu contains exactly Home, Previous Trips, and Settings links; the app bar shows the active trip name when a trip is active
  4. `SettingsPage` shows only a JSON export button; no shortcut-config, layout-authoring, or DSL UI is visible; export still produces a valid JSON file
  5. Navigating to an unknown path (e.g., `/foo`) shows the `PlaceholderPage` 404 catch-all without crashing; the active trip persists across a page reload (the `activeMode` settings key survives a browser refresh)
**Plans**: 4 plans
Plans:
- [x] 21-01-PLAN.md — Move ReviewDraft into captureService.ts + repoint importers (compile-safety decouple)
- [x] 21-02-PLAN.md — New CreateTripPage + TripHomePage stub (loading guard) + export-only SettingsPage
- [ ] 21-03-PLAN.md — Trip-only AppShell + router rewrite + remove listModes from activeMode
- [ ] 21-04-PLAN.md — Atomic deletion of 11 pages + dead subsystem; final tsc/vitest green gate
**Key pitfalls**: Delete implementation + test file pairs atomically — never leave a dead import across a commit boundary (suite turns fully red); `useActiveMode() === undefined` means loading OR no-trip — MUST distinguish with a loading skeleton before showing empty state; complete AppShell rewrite in one pass — no partial edits leaving dangling `NAVIGATION`/shortcut references; `ReviewDraft` type must be moved out of `extractMetadataFromUrl.ts` into `captureService.ts` before `extractMetadataFromUrl.ts` is deleted
**UI hint**: yes

### Phase 22: Trip Home + Expense Capture
**Goal**: User can see the active trip dashboard and log expenses against it; creating a new trip and navigating to its home works end-to-end; expense entries save with `domain='trips'`, `metadata.tripId`, and a local-date `occurredAt` default.
**Depends on**: Phase 21
**Requirements**: TRIP-01, TRIP-03, HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, EXP-01, EXP-02, EXP-03, EXP-04, EXP-05, EXP-06
**Success Criteria** (what must be TRUE):
  1. `TripHomePage` shows the active trip name prominently, a currency-formatted running expense total (e.g., `$42.50`), the last 10 entries for the active trip most recent first, and primary Expense + Activity CTA buttons
  2. `CreateTripPage` lets the user enter a trip name; on Save, `tripService.createAndActivateTrip()` is called, then navigation goes to `/`; the new trip appears immediately as active on Trip Home
  3. Tapping "Expense" opens a sheet/modal with Amount (`inputMode="decimal"` text input, required), an 8-button Category grid (Hotel, Rental Car, Flight, Taxi/Uber, Food, Gas, Parking, Other — large tap targets, required), Vendor (optional text), and Notes (optional text); saving with either Amount or Category empty shows a validation error and does not save
  4. A saved expense has `domain: 'trips'` (never `'expenditures'`), `metadata.tripId` matching the active trip's UUID, and `occurredAt` set to today's local midnight epoch via `todayLocalDate()` from `captureService` — not a UTC ISO string
  5. Top-level navigation links (Home, Previous Trips, Settings) are visible in the app shell and navigate correctly from Trip Home
**Plans**: TBD
**Key pitfalls**: Expense `domain` MUST be the hardcoded string `'trips'` — never call `defaultDomainForType('expense')` which returns `'expenditures'`; date default MUST use `todayLocalDate()` / `withDefaultOccurredAt()` from `captureService` to avoid UTC off-by-one; all displayed money values use `formatUSD` / `toFixed(2)` / `Math.round(x*100)/100`; expense modal needs `aria-modal="true"` + `role="dialog"` + focus trap; test fake timers use `{ toFake: ['Date'] }`
**UI hint**: yes

### Phase 23: Activity Capture
**Goal**: User can log activities (Hike / Show / Restaurant / Cafe / Other) tied to the active trip; Other requires a free-text type; Rating uses an accessible 1–5 star control; saved activity entries are stamped with `activityType` and `tripId`.
**Depends on**: Phase 22
**Requirements**: ACT-01, ACT-02, ACT-03, ACT-04, ACT-05, ACT-06
**Success Criteria** (what must be TRUE):
  1. Tapping "Activity" on Trip Home navigates to `ActivityTypePage` showing Hike, Show, Restaurant, Cafe, and Other as large, clearly labeled tap targets
  2. Tapping Hike/Show/Restaurant/Cafe navigates to `ActivityFormPage` pre-seeded with the chosen type; the form has Name (required), Location (optional), Rating (optional), Notes (optional); saving without Name shows a validation error
  3. Tapping Other navigates to the same form with an additional required "Type" free-text field; saving without both Name and Type shows validation errors for each missing field
  4. The star rating control renders 5 stars; tapping star N sets the rating to N; tapping the already-selected star clears it; each star is a `<button>` element with `aria-label` (e.g., `"3 stars"`); keyboard left/right arrows move the selection
  5. A saved activity entry has `type: 'activity'`, `domain: 'trips'`, `metadata.activityType` set to the chosen type, `metadata.tripId` matching the active trip's UUID, and `occurredAt` defaulting to today's local date via `todayLocalDate()`
**Plans**: TBD
**Key pitfalls**: `StarRating` MUST use `<button>` elements (not `<div>` or `<span>`) to capture iOS tap events without `cursor: pointer` workarounds; `occurredAt` default uses `todayLocalDate()` not `new Date().toISOString().substring(0,10)` (UTC off-by-one); fake timers in tests use `{ toFake: ['Date'] }`; `activityType` stored in `metadata.activityType`, not a new top-level DB field; "Other" type stored as the user-entered free-text string, not the literal string `"other"`
**UI hint**: yes

### Phase 24: Previous Trips + Trip Detail + Category-Grouped Expense Report
**Goal**: User can view all trips newest-first with single-pass stats, drill into a trip to see a category-grouped expense report (float-safe subtotals + grand total), a chronological timeline of all entries, and inline edit/delete for any entry.
**Depends on**: Phase 23
**Requirements**: PREV-01, PREV-02, PREV-03, PREV-04, RPT-01, RPT-02, RPT-03, RPT-04, RPT-05, RPT-06
**Success Criteria** (what must be TRUE):
  1. `PreviousTripsPage` lists all trips newest first; each row shows trip name, date range (e.g., "Jun 19 – Jun 22" or "—" if no child entries), currency-formatted total expenses, and activity count; all stats are derived from a single `db.entries.toArray()` pass with no per-trip filter loop
  2. Tapping a trip row navigates to `TripDetailPage` identified by the trip's UUID (not by name string), so two trips named identically resolve independently
  3. `TripDetailPage` shows expenses grouped by category with per-category subtotals and a grand total; all monetary values are float-safe (e.g., `$15.30` not `$15.2999...`) using `Math.round(x*100)/100` + `formatUSD`; category rows show or expand to show their individual expense entries
  4. A timeline section on `TripDetailPage` shows all trip entries (both expenses and activities) sorted chronologically
  5. Tapping Edit on a timeline entry opens an edit form backed by `entriesRepository.update`; tapping Delete shows a confirmation prompt before calling `entriesRepository.delete`; the trip total, category subtotals, and timeline update reactively after each edit or delete
**Plans**: TBD
**Key pitfalls**: Trip grouping MUST use `metadata.tripId` (UUID) not `metadata.modeLabel` (string) — name-based grouping merges identically-named trips; Previous Trips page MUST use single-pass `db.entries.toArray()` grouping, never a per-trip Dexie filter in a loop (N+1 scan); `Math.round(x*100)/100` + `formatUSD` on all summed amounts before display; `useLiveQuery` dependency array must include `tripId` when querying trip-specific entries; no "Delete Trip" UI in v0.5.0 — entry-level delete only (avoids cascade complexity)
**UI hint**: yes

<details>
<summary>✅ v0.4.0 — "Active Mode" De-Clunk + Editable Entries (Phases 16–19) — SHIPPED 2026-06-19</summary>

Cut steady-state nav noise (dashboard shows only the active mode) and make saved entries
first-class (editable, deletable, mode-stamped). Designs: `notes/active-mode-navigation-design.md`,
`notes/editable-saved-entries-design.md`. North star: `seeds/fewest-buttons-slickest.md`.

- [x] **Phase 16: Default occurredAt to Today** — default the date field to today (local) on the
  ReviewPage form and the one-tap direct/sheet save path, for date-bearing types; default not lock.
  Reqs: DATE-01. (+16 tests)
- [x] **Phase 17: Editable & Deletable Saved Entries** — `/entries/:id/edit` form reusing
  `ENTRY_FIELDS` + `buildReviewDraft` over the existing `entriesRepository.update`/`.delete`: edit
  metadata (merge-preserving unknown keys), fix core fields, confirm-delete; `recordedAt` immutable.
  Reqs: EEDIT-01..03. (+31 tests)
- [x] **Phase 18: Active Mode Model + Instance Stamping** — active mode + free-text instance label
  persisted in Dexie `settings` (`services/activeMode.ts`, mirroring `activeLayoutRepository`); stamp
  `metadata.mode`/`modeLabel` via the single `draftToEntry` path. Reqs: MODE-01, MODE-02, STAMP-01. (+26 tests)
- [x] **Phase 19: Active Mode Navigation + Dashboard De-Clunk** — hamburger "Active Mode" item
  (mode list → activate → label prompt), app bar `mode · label`, dashboard renders only the active
  mode's buttons (on-dashboard switcher removed). Reqs: MODE-03, MODE-04, DASH-04. (+7 net tests)

Full phase details archived in [`milestones/v0.4.0-ROADMAP.md`](milestones/v0.4.0-ROADMAP.md).
Audit: [`milestones/v0.4.0-MILESTONE-AUDIT.md`](milestones/v0.4.0-MILESTONE-AUDIT.md).

</details>

<details>
<summary>✅ v0.3.0 — Dashboard Shortcut Layouts (Phases 11–15) — SHIPPED 2026-06-17</summary>

Customizable one-tap shortcut buttons on the Dashboard, grouped into switchable layouts, built on
the v0.2.0 Quick-Capture DSL (a shortcut is a saved DSL template with empty-slot "holes"). Design:
`notes/dashboard-shortcut-layouts-design.md`; UI: sketch `001-dashboard-shortcut-layouts` (Variant B).

- [x] **Phase 11: Config Model, Schema & Storage** — CFG types, versioned JSON Schema spec,
  hand-rolled validator + migration seam, Dexie `settings` reactive repository. Reqs: CFG-01..03. (1 plan)
- [x] **Phase 12: Dashboard Rendering & Layout Switcher** — Variant B chips+rows, scrollable layout
  switcher (persisted), seeded defaults. Reqs: DASH-01..03. (2 plans)
- [x] **Phase 13: Tap-to-Capture Flow** — fill-the-hole keypad sheet w/ live DSL preview, per-shortcut
  one-tap save + undo or ReviewPage route; `{}` named-hole token; shared `draftToEntry`. Reqs: CAP-01..04. (3 plans)
- [x] **Phase 14: Import / Export Config** — export config JSON envelope; import parse→migrate→validate→put
  (wholesale reject) from `/settings`. Reqs: PORT-01..02. (2 plans)
- [x] **Phase 15: Authoring Tool** — create/edit/delete + reorder shortcuts & layouts, icon picker,
  parseDSL-gated template, "Save current as shortcut" from the omnibar. Reqs: EDIT-01..04. (3 plans)

Full phase details archived in [`milestones/v0.3.0-ROADMAP.md`](milestones/v0.3.0-ROADMAP.md).

</details>

<details>
<summary>✅ v0.2.0 — Quick-Capture DSL (Phases 7–10) — SHIPPED 2026-06-16</summary>

A one-line, URL-esque shorthand (`[type] slot1:slot2 ?k=v,k=v`) that parses live into the
existing Review screen. Design: `notes/quick-capture-dsl-design.md`; de-risked by spike `001-dsl-parser`.

- [x] **Phase 7: DSL Parser** — type-agnostic parser with per-type positional schemas. Reqs: DSL-01..04.
- [x] **Phase 8: Distinct-Values Lookup** — `listDistinctValues` + `useDistinctValues`. Reqs: DATA-01.
- [x] **Phase 9: Quick-Capture Omnibar** — omnibar UI, live preview, suggestions; pre-fills Review. Reqs: OMNI-01..04.
- [x] **Phase 10: Docs & Examples** — README DSL section + worked example per type. Reqs: DOCS-01.

</details>

<details>
<summary>✅ v0.1.0 (Phases 1–6) — SHIPPED 2026-06-16</summary>

- [x] Phase 1: Foundation & App Shell — completed 2026-06-15
- [x] Phase 2: Data Layer & PWA Shell — completed 2026-06-15
- [x] Phase 3: Navigation & Dashboard — completed 2026-06-15
- [x] Phase 4: URL-First Capture — completed 2026-06-15
- [x] Phase 5: Manual Entry — completed 2026-06-15
- [x] Phase 6: Entry List, Detail & Export — completed 2026-06-16

Full details: [`milestones/v0.1.0-ROADMAP.md`](milestones/v0.1.0-ROADMAP.md).

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–6. (v0.1.0) | v0.1.0 | 22/22 | Complete | 2026-06-16 |
| 7–10. (v0.2.0) | v0.2.0 | 4/4 | Complete | 2026-06-16 |
| 11–15. (v0.3.0) | v0.3.0 | 11/11 | Complete | 2026-06-17 |
| 16. Default occurredAt to Today | v0.4.0 | 1/1 | Complete | 2026-06-18 |
| 17. Editable & Deletable Saved Entries | v0.4.0 | 1/1 | Complete | 2026-06-18 |
| 18. Active Mode Model + Instance Stamping | v0.4.0 | 1/1 | Complete | 2026-06-18 |
| 19. Active Mode Navigation + Dashboard De-Clunk | v0.4.0 | 1/1 | Complete | 2026-06-18 |
| 20. Trip Data Model + Engine Extensions | v0.5.0 | 2/2 | Complete    | 2026-06-19 |
| 21. App Shell + Routing Rewrite + Atomic Drop | v0.5.0 | 2/4 | In Progress|  |
| 22. Trip Home + Expense Capture | v0.5.0 | 0/1 | Not started | - |
| 23. Activity Capture | v0.5.0 | 0/1 | Not started | - |
| 24. Previous Trips + Trip Detail + Expense Report | v0.5.0 | 0/1 | Not started | - |

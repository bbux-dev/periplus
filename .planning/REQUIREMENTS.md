# Requirements — Life Log v0.5.0 (Trips MVP UI Refactor)

**Milestone goal:** Aggressively rewrite the UI to expose ONLY a minimal, mobile-first trip logger —
create/activate a trip, log expenses and activities tied to the active trip, view prior trips, and
see per-trip expense reports grouped by category — while preserving the headless engine (Dexie
storage, `entriesRepository`, active-mode/context stamping, `draftToEntry`).

**Framing:** UI **rewrite**, not a feature hide. All 13 existing screens/routes are dropped; the
engine and low-level `components/ui/*` primitives are reused. A trip is a `LifeLogEntry` of
`type='trip'` (stable UUID) that is set as the active mode (`activateMode('trip', name, tripId)`);
expense/activity entries are stamped with `metadata.tripId` via the existing `draftToEntry` path.

**Locked product decisions (from research + user):**
- Expense categories (8): **Hotel, Rental Car, Flight, Taxi/Uber, Food, Gas, Parking, Other**.
- Trip end is **implicit** — creating/activating a new trip closes the previous one; no "End Trip" UI.
- Trip Detail offers **entry-level edit/delete only** — no "Delete Trip" (avoids orphaned entries).
- Zero new runtime dependencies.

---

## v0.5.0 Requirements

### Engine Extensions (ENG)

<!-- Minimal additive changes to the preserved engine — no Dexie schema version bump. -->

- [x] **ENG-01**: `EntryType` union includes `trip` and `activity` (TypeScript only; `type` is unindexed)
- [x] **ENG-02**: `ActiveMode` carries an optional `tripId`, and `activateMode()` accepts it
- [x] **ENG-03**: `draftToEntry` stamps `metadata.tripId` (and existing `mode`/`modeLabel`) when a trip is active
- [x] **ENG-04**: `tripService` provides create-and-activate, list-trips, list-trip-entries, and pure stat helpers (date range, expense total, expenses-by-category, activity count)

### Trip Context (TRIP)

- [x] **TRIP-01**: User can create a trip by name; it is written as a `type='trip'` entry and becomes the active trip
- [x] **TRIP-02**: When no active trip exists, the app shows a "Create a Trip" empty/first-run screen (name input + Save)
- [x] **TRIP-03**: On save, the new trip is activated and the user is navigated to that trip's Home screen
- [x] **TRIP-04**: The active trip persists across reloads (reuses the `activeMode` settings persistence)

### Trip Home (HOME)

- [x] **HOME-01**: Home screen shows the active trip name prominently (e.g. "Trip: Oregon Road Trip")
- [x] **HOME-02**: Home shows primary `Expense` and `Activity` action buttons
- [x] **HOME-03**: Home shows the active trip's running expense total (currency-formatted)
- [x] **HOME-04**: Home shows recent entries for the active trip (most recent first)
- [x] **HOME-05**: Top-level navigation exists for Home / Previous Trips / Settings (Export)

### Expense Capture (EXP)

- [x] **EXP-01**: Tapping `Expense` opens a small mobile-first modal/sheet
- [x] **EXP-02**: Expense requires an Amount (numeric input)
- [x] **EXP-03**: Expense requires a Category chosen from the 8 fixed categories (large tap targets, not a dropdown)
- [x] **EXP-04**: Expense accepts an optional Vendor and optional Notes
- [x] **EXP-05**: Expense date defaults to today (local date; no UTC off-by-one) and the trip defaults to the active trip
- [x] **EXP-06**: Saving creates an `expense` entry (`domain='trips'`) stamped with the active `tripId`; fast path is Expense → amount → category → save

### Activity Capture (ACT)

- [x] **ACT-01**: Tapping `Activity` navigates to an Activity Type screen with buttons: Hike, Show, Restaurant, Cafe, Other
- [x] **ACT-02**: Choosing Hike/Show/Restaurant/Cafe opens a form with Name (required), Location (optional), Rating (optional), Notes (optional)
- [x] **ACT-03**: Choosing Other opens the same form plus a required free-text Type field
- [x] **ACT-04**: Rating is entered with a clickable, accessible 1–5 star control (tap to set/clear)
- [x] **ACT-05**: Activity date defaults to today (local) and the trip defaults to the active trip
- [x] **ACT-06**: Saving creates an `activity` entry stamped with `activityType` and the active `tripId`

### Previous Trips (PREV)

- [x] **PREV-01**: A Previous Trips screen lists all trips, newest first
- [x] **PREV-02**: Each trip row shows trip name, date range (if available), total expenses, and activity count
- [x] **PREV-03**: Tapping a trip drills into its Trip Detail screen
- [x] **PREV-04**: Trip list stats are derived in a single pass over entries (no per-trip N+1 scans)

### Trip Detail & Expense Report (RPT)

- [x] **RPT-01**: Trip Detail shows the trip total expense (currency-formatted, float-safe)
- [x] **RPT-02**: Trip Detail shows expenses grouped by category with per-category subtotals
- [x] **RPT-03**: Category rows show their individual expenses (under each category or expandable rows)
- [x] **RPT-04**: Trip Detail shows a timeline/list of the trip's expenses and activities
- [x] **RPT-05**: User can edit an existing entry from Trip Detail (reuses `entriesRepository.update`)
- [x] **RPT-06**: User can delete an existing entry from Trip Detail with confirmation (reuses `entriesRepository.delete`)

### UI Rewrite (UI)

- [x] **UI-01**: All 13 non-trip screens/routes are removed (Dashboard, Domain, CaptureUrl, Review, ManualEntry, EntryList/Detail/Edit, QuickCapture, ManageShortcuts, ShortcutForm, Placeholder), along with the dead DSL/shortcut/layout UI subsystem; their test files are deleted atomically so the suite stays green
- [x] **UI-02**: `AppShell` is rewritten to the trip-only top-level navigation (no domain tiles / shortcut config)
- [x] **UI-03**: Settings is reduced to JSON export (reuses `exportEntries`); no shortcut/layout authoring UI
- [x] **UI-04**: The router exposes only trip-flow routes; unknown paths still resolve gracefully
- [x] **UI-05**: Reused low-level primitives (`Button`, `FormField`, `Input`, `cn`, `HoleSheet`, `SavedToast`) and the engine are not duplicated — new screens compose them

---

## Future Requirements (deferred to v0.5.x / later)

- [ ] Explicit "End Trip" / archive action (current model ends a trip implicitly on new-trip activation)
- [ ] "Delete Trip" with cascade delete of its entries
- [ ] Per-day expense grouping, per-trip budgets, charts/visualizations
- [ ] Multi-currency, receipt OCR, CSV/PDF export, photo attachments
- [ ] Filter/search within a trip's timeline

---

## Out of Scope (explicit exclusions)

<!-- Carried from PROJECT.md Out of Scope + milestone-specific anti-features from research. -->

- Media / books / podcasts / general life-event logging UI — removed in this rewrite
- Generic Groups system, arbitrary custom group/layout editor, shortcut/DSL capture UI — removed
- NLP / LLM / URL-extraction capture — not part of the trip logger
- Multi-currency, receipt scanning, budget limits, expense charts, split expenses, mileage tracking
- User accounts / backend / sync — prototype is single-user, local-only (sync seam stays dormant)
- Changing money storage to integer cents (would require a Dexie migration) — format floats at display time instead

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENG-01 | Phase 20 | Complete |
| ENG-02 | Phase 20 | Complete |
| ENG-03 | Phase 20 | Complete |
| ENG-04 | Phase 20 | Complete |
| TRIP-02 | Phase 21 | Complete |
| TRIP-04 | Phase 21 | Complete |
| UI-01 | Phase 21 | Complete |
| UI-02 | Phase 21 | Complete |
| UI-03 | Phase 21 | Complete |
| UI-04 | Phase 21 | Complete |
| UI-05 | Phase 21 | Complete |
| TRIP-01 | Phase 22 | Complete |
| TRIP-03 | Phase 22 | Complete |
| HOME-01 | Phase 22 | Complete |
| HOME-02 | Phase 22 | Complete |
| HOME-03 | Phase 22 | Complete |
| HOME-04 | Phase 22 | Complete |
| HOME-05 | Phase 22 | Complete |
| EXP-01 | Phase 22 | Complete |
| EXP-02 | Phase 22 | Complete |
| EXP-03 | Phase 22 | Complete |
| EXP-04 | Phase 22 | Complete |
| EXP-05 | Phase 22 | Complete |
| EXP-06 | Phase 22 | Complete |
| ACT-01 | Phase 23 | Complete |
| ACT-02 | Phase 23 | Complete |
| ACT-03 | Phase 23 | Complete |
| ACT-04 | Phase 23 | Complete |
| ACT-05 | Phase 23 | Complete |
| ACT-06 | Phase 23 | Complete |
| PREV-01 | Phase 24 | Complete |
| PREV-02 | Phase 24 | Complete |
| PREV-03 | Phase 24 | Complete |
| PREV-04 | Phase 24 | Complete |
| RPT-01 | Phase 24 | Complete |
| RPT-02 | Phase 24 | Complete |
| RPT-03 | Phase 24 | Complete |
| RPT-04 | Phase 24 | Complete |
| RPT-05 | Phase 24 | Complete |
| RPT-06 | Phase 24 | Complete |

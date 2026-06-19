# Milestones

## v0.5.0 Trips MVP UI Refactor (Shipped: 2026-06-19)

**Phases completed:** 5 phases (20–24), 15 plans · 40/40 requirements · milestone audit passed
**Quality at ship:** 363 tests green, `tsc -b` + `vite build` clean, zero new runtime dependencies.
Net: +13.7k/−9.6k LOC across ~140 files (51 dead files removed). Cross-phase integration verified clean.

**Delivered:** The UI was aggressively rewritten to a single-purpose, mobile-first **trip logger** over
the *preserved* headless engine. All 13 prior screens + the DSL/shortcut/layout subsystem were dropped;
low-level ui primitives + the Dexie/`entriesRepository`/`activeMode`/`draftToEntry` engine were reused.

**Key accomplishments:**

- **Engine extended additively (no Dexie bump):** `EntryType` += `trip`/`activity`; `ActiveMode.tripId`
  + backward-compatible `activateMode`; `draftToEntry` stamps `metadata.tripId`; new `tripService`
  (create-and-activate, list, single-pass `summarizeTrips`, pure stat helpers, reactive hooks).
- **A trip IS the active mode:** `createAndActivateTrip` writes a `type:'trip'` entry (stable UUID) and
  activates it; every expense/activity is stamped with `metadata.tripId` via the single capture path —
  write key == read key across capture, list, and report.
- **Atomic UI rewrite:** 11 non-trip pages + the DSL/shortcut/layout subsystem deleted in one commit
  (51 files) with the suite staying green; trip-only router + reworked `AppShell`; export-only Settings.
- **Fast expense + activity capture:** `ExpenseSheet` (amount → 8-category grid → save, `domain:'trips'`,
  local-date) and Activity flow (type page → form + accessible 1–5 `StarRating`, Other free-text type).
- **Read/report side:** `PreviousTripsPage` (single-pass, no N+1) → `TripDetailPage` drill-in by UUID →
  category-grouped float-safe `ExpenseReport` + chronological timeline + merge-preserving inline
  edit/delete (reactive).
- Built autonomously via the GSD pipeline (research → context → pattern-map → plan → plan-check →
  TDD execute → verify → code-review+fix per phase); each phase's review caught real bugs
  (StarRating keyboard race, ExpenseSheet `parseFloat` truncation, TripHomePage loading-vs-no-trip race).

**Known deferred at close:** Phase 24 verification `human_needed` for 3 browser-only visual checks
(row layout, accordion UX, edit-modal animation) — logic verified 10/10, user accepted. Pre-existing
v0.4.0 quick-task tracking artifact (`260618-…-nav-menu`) still `missing` (feature shipped; no undone work).

---

## v0.4.0 Active Mode De-Clunk + Editable Entries (Shipped: 2026-06-19)

**Phases completed:** 4 phases, 4 plans, 11 tasks

**Key accomplishments:**

- occurredAt now defaults to today's local date on both capture paths (ReviewPage form + one-tap direct/sheet save) for date-bearing types — a visible, clearable default, with the local-midnight convention preserved and draftToEntry kept neutral.
- Saved entries are now editable through a pre-populated reusable form (same ENTRY_FIELDS config as capture) that merge-persists core + metadata edits via the existing `entriesRepository.update`, and deletable behind an inline two-step confirm via `entriesRepository.delete` — with `recordedAt` immutable throughout.
- Active-mode data/service layer persisted in Dexie settings with a reactive useActiveMode() hook, plus conditional mode/modeLabel provenance stamping threaded through draftToEntry into all three capture save paths.
- v0.4.0 de-clunk: mode switching moved into the hamburger menu (with an inline label prompt), the app bar now shows `mode · label`, and the dashboard renders ONLY the active mode's buttons — the on-dashboard LayoutChips switcher is gone.

---

## v0.3.0 Dashboard Shortcut Layouts (Shipped: 2026-06-17)

**Phases completed:** 5 phases, 11 plans, 11 tasks

**Key accomplishments:**

- **Config model (Phase 11):** `ShortcutConfig`/`Layout`/`Shortcut` types + a 21-icon static
  Heroicons allow-list + a draft-07 JSON Schema spec artifact + a hand-rolled structural
  validator (whole-or-reject) with a versioned `migrateConfig` seam, persisted in the dormant
  v0.1.0 Dexie `settings` store via a reactive repository — zero new deps, `db.ts` untouched.

- **Dashboard rendering (Phase 12):** Variant-B chips+rows dashboard — scrollable layout-chip
  switcher (persisted active layout) + tappable shortcut rows with Heroicons — and one-shot
  first-run seeding of sensible default layouts (DayToDay / Travel / WorkTrip).

- **Tap-to-capture (Phase 13):** a shortcut is a saved DSL template; tapping routes to one-tap
  direct save (+ "Saved · Undo" toast), a fill-the-hole keypad sheet with a live DSL preview, or
  the existing ReviewPage — per-shortcut `confirm`. Reuses the whole v0.2.0 parseDSL →
  buildReviewDraft pipeline via an extracted shared `draftToEntry`; `{}` named-hole token.

- **Import / export (Phase 14):** export the config as a versioned JSON envelope and import it
  back (parse → migrate → validate → put, wholesale reject) from a new `/settings` page —
  portable config sharing without accounts.

- **Authoring tool (Phase 15):** in-app create/edit/delete + reorder of shortcuts and layouts
  (pure immutable helpers, always re-validated before write), an allow-list icon picker, a
  parseDSL-gated template field, plus "Save current as shortcut" from the omnibar.

**Quality at ship:** 500 tests passing (up from 277); `tsc -b` clean; zero new runtime
dependencies across the milestone. Built autonomously (research → plan → check → execute →
code-review+fix → verify per phase). The milestone audit caught and fixed a real cross-phase
blocker (export/import envelope mismatch) plus an active-layout rename-persistence bug.

**Known deferred items at close:** device/browser visual checks for phases 12–15, plus two minor
tech-debt items (capture create-failure error UI; shortcut-delete confirmation) — see STATE.md
Deferred Items.

---

## v0.2.0 Quick-Capture DSL (Shipped: 2026-06-16)

**Phases completed:** 4 phases (7–10), 10 requirements (DSL-01..04, OMNI-01..04, DATA-01, DOCS-01)

**Key accomplishments:**

- Quick-Capture DSL: a one-line `[type] slot1:slot2 ?k=v,k=v` shorthand parsed live into the
  existing Review screen. Parser ported to TS from the VALIDATED spike `001-dsl-parser`; per-type
  `POSITIONAL_SCHEMA` declared beside `ENTRY_FIELDS`; output is the flat formValues
  `buildReviewDraft` already consumes (zero new persistence). Three statuses (ok/ambiguous/error)
  ensure nothing saves from a guess.

- Type-agnostic parser with exact-only type resolution (partials → suggestion menu), quote-aware
  tokenizing (colons/commas/spaces inside `"…"`), and domain-context type inference. 26 tests.

- `entriesRepository.listDistinctValues` + `useDistinctValues` hook: frequency-ranked distinct
  category/merchant/tags values with case-insensitive prefix filter, backing value suggestions.

- Quick-Capture omnibar (`/capture`, dashboard tile): live parse preview, type-token suggestions
  (resolving the `p`=place/podcast and `e`=event/expense single-letter collisions), and
  history-backed value suggestions. Pre-fills ReviewPage; never direct-saves.

- README with full DSL reference + a worked example per entry type (all drawn from the validated
  parser suite).

**Quality at ship:** 277 tests passing (up from 221); `tsc -b` + `vite build` + PWA generation
clean; all new code lint-clean. Built autonomously in one session. Known pre-existing tech debt
(carried from v0.1.0, not addressed): 4 eslint errors in `cn.test.tsx`, `main.tsx`,
`exportEntries.test.ts`, `extractMetadataFromUrl.ts`.

---

## v0.1.0 Tracer Bullet — App Shell + DB-Backed Counter (Shipped: 2026-06-16)

**Phases completed:** 6 phases, 22 plans, 36 tasks

**Key accomplishments:**

- Vite 7.3.5 + React 19 + TypeScript 5.9.3 app scaffold with Tailwind v4 CSS-first config, 7-dir placeholder layout, and Vitest + fake-indexeddb green test harness at repo root
- 1. [Rule 1 - Bug] Used cn.test.tsx instead of cn.test.ts
- BrowserRouter routing wired to a mobile-first "Life Log" WelcomePage hosting a useLiveQuery-driven Dexie counter with heroicon +/- buttons — closes the UI → Dexie → IndexedDB → live-read loop
- Four pure-TypeScript shared primitive modules (RequestState<T> union, assertNever, appBrand, publicEnv) with 21 co-located Vitest tests all green — SETUP-04 complete.
- LifeLogEntry domain model + Dexie v2 additive schema (entries + settings stores) + entriesRepository CRUD with listUnsynced sync seam + useEntries reactive hook; all 54 project tests green
- vite-plugin-pwa@1.3.0 wired with generateSW strategy: manifest.webmanifest + sw.js + workbox precache emitted on build, PWARegistrar registered in app, icons generated by reproducible Node script
- One-liner:
- One-liner:
- One-liner:
- Accessible Input and FormField form primitives (React 19 ref-as-prop, Tailwind v4 cn tokens, RTL-tested htmlFor/id + aria-invalid/aria-describedby) backing the Phase 4 capture/review forms.
- One-liner:
- URL Capture screen (React Router location.state draft transport, primary Import + secondary Enter Manually, RTL-tested with inline probe routes covering CAPT-01/02/06).
- One-liner:
- One-liner:
- ENTRY_FIELDS typed config for all 7 EntryTypes with buildReviewDraft mapper, ReviewDraft interface, and ReviewPage extended to persist amount/occurredAt/description/tags from richer draft
- ManualEntryPage form renderer over ENTRY_FIELDS[type] with buildReviewDraft→ReviewPage→Save flow, proven by RTL + fake-indexeddb integration tests for Book, Trip Expense, and Expenditure Expense
- isSafeUrl(raw: string): boolean extracted from ReviewPage into src/services/urlUtils.ts with 6 unit tests; ReviewPage imports from shared module; T-06-01 javascript: XSS gate centralized
- Reactive tri-state useEntry(id) hook added to entriesRepository.ts via useLiveQuery with .then(e => e ?? null) transform
- Deterministic `buildExportJson(entries, exportedAt)` pure function and jsdom-mocked `triggerDownload(json, filename)` shim delivering EXP-01 JSON export
- Reactive filterable entry list with domain-scoped type labels, export button, and Dashboard /entries link delivering VIEW-01/02/04 and EXP-01 trigger
- EntryDetailPage with tri-state useEntry guard, sourceUrl XSS mitigation via isSafeUrl, metadata JSON preview in a React-escaped `<pre>`, and RTL tests covering all render branches (VIEW-03)
- `/entries` and `/entries/:id` routes swapped from PlaceholderPage stubs to real EntryListPage and EntryDetailPage, completing the Phase 6 milestone with all 217 tests green and production build clean

---

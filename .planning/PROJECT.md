# Life Log

## What This Is

Life Log is a mobile-first, installable PWA for fast, structured personal life-logging while on the go (especially while traveling). Users capture media consumption, trips, and expenditures as typed entries in a single append-only-ish event log stored locally on the device. It is a personal prototype, not a public product — no accounts, no backend, no sync. As of v0.1.0 the full local prototype is working end-to-end: URL-first capture, manual entry, browse/filter/detail, and JSON export, all offline.

## Core Value

A user can capture a structured life event on their phone in seconds — URL-first — and have it persist locally and offline as a typed entry that other apps could later read.

## Current State: v0.1.0 SHIPPED (2026-06-16)

**What shipped:** The tracer milestone grew into a complete working local life-log. All 6 phases (1–6) shipped and were verified. The throwaway tracer counter was removed in Phase 4 once real capture landed, as planned.

- Vite 7 + React 19 + TS 5.9 app at repo root, Tailwind v4 CSS-first, template directory layout
- `LifeLogEntry` Dexie/IndexedDB data layer + `entriesRepository` with reactive `useLiveQuery` reads + a future-sync seam (`syncedAt`/`listUnsynced`)
- Installable, offline-capable PWA (manifest + service worker via `vite-plugin-pwa`)
- Home dashboard → domain → entry-type navigation across all screens, with a 404 catch-all
- URL-first capture (offline URL-string heuristics) → Review → Save (the default path)
- Manual entry as the secondary path (`Enter Manually`) with type-appropriate fields
- Entry list (filterable), entry detail (with metadata JSON preview + safe-URL gating), and full JSON export

**Quality at ship:** 221 tests passing; `tsc -b` + `vite build` clean; milestone audit passed (35/35 requirements, 4/4 E2E flows). ~4,900 LOC across 28 source files + 25 test files.

**Next milestone:** v0.2.0 — Quick-Capture DSL (in progress).

## Earlier Milestone: v0.2.0 Quick-Capture DSL — ✅ SHIPPED 2026-06-16

**Outcome:** All 4 phases (7–10) shipped; 10/10 requirements met; 277 tests green, build +
PWA clean. The DSL omnibar (`/capture`) parses a one-line shorthand live into the existing
Review screen with type-token + history-backed value suggestions — no new save path, no
silent mis-saves. Parser was ported directly from the VALIDATED spike `001-dsl-parser`.
Full details in `.planning/MILESTONES.md`.

## Current State: v0.5.0 SHIPPED (2026-06-19) — next milestone open

**What shipped:** Life Log is now a single-purpose, mobile-first **trip logger**. The UI was
aggressively rewritten over the *preserved* headless engine: create/activate a trip → home dashboard
→ fast expense + activity capture → previous trips → category-grouped expense report with inline
edit/delete. All 13 prior screens + the DSL/shortcut/layout subsystem were dropped (51 files removed
atomically); ui primitives + the Dexie/`entriesRepository`/`activeMode`/`draftToEntry` engine were
reused. 40/40 requirements satisfied, milestone audit passed, integration clean. 363 tests green,
`tsc -b` + `vite build` clean, zero new runtime dependencies. Run `/gsd:new-milestone` to scope next.

## Previous Milestone: v0.5.0 Trips MVP UI Refactor — ✅ SHIPPED 2026-06-19

**Goal:** Aggressively rewrite the UI to expose ONLY a minimal trip logger — create/activate a trip,
log expenses and activities tied to the active trip, view prior trips, and see per-trip expense
reports grouped by category — while preserving the headless engine (typed entries, Dexie storage,
active-mode/context stamping, `draftToEntry`).

**Core insight:** A "trip" IS the existing **active mode** specialized — `createAndActivateTrip` writes
a `type:'trip'` entry (stable UUID) and activates it; every expense/activity is stamped with
`metadata.tripId` via the single `draftToEntry` capture path, so the write key equals the read key
across capture, list, and report. The engine needed only additive changes (no Dexie version bump);
the milestone was 90% UI deletion + rebuild over an unchanged data layer.

**Framing:** This is a UI **rewrite**, not a feature hide. All 13 existing screens/routes
(Dashboard, Domain, CaptureUrl, Review, ManualEntry, EntryList/Detail/Edit, QuickCapture, Settings,
ManageShortcuts, ShortcutForm, Placeholder) are dropped. Low-level building blocks are **reused** to
realize the new vision: `components/ui/*` (Button, FormField, Input, cn), `AppShell` (reworked
shell/nav), `HoleSheet` (keypad amount pattern), `SavedToast`, and the full engine —
`services/activeMode` (trip = active context), `entriesRepository` (CRUD + reactive +
distinct-values), `captureService`/`draftToEntry` (single stamped save path), `db`, `exportEntries`.

**Target features:**
- **Trip as active context** — a Trip reuses the `activeMode` service (trip name = active-mode
  instance label); create a trip → it becomes active → entries stamp with the trip identity.
- **Empty / first-run** — no active trip → "Create a Trip" screen (name + Save → activate → home).
- **Trip Home** — active trip shown prominently; primary `Expense` + `Activity` buttons; recent
  entries for the active trip; trip expense total; top-level nav (Home / Previous Trips / Settings).
- **Expense flow** — small modal: Amount (required), Category (required; Hotel, Rental Car, Flight,
  Taxi/Uber, Food, Gas, Other), Vendor (optional), Notes (optional); date defaults today, trip
  defaults active; fast path Expense → amount → category → save.
- **Activity flow** — Activity type page (Hike / Show / Restaurant / Cafe / Other) → form with Name
  (required), Location (optional), Rating (clickable 1–5 stars, optional), Notes (optional); Other
  adds a required free-text Type field. Date defaults today, trip defaults active.
- **Previous Trips + Trip Detail** — list all trips newest first (name, date range, total expenses,
  activity count); drill in → expense report grouped by category with subtotals + total, timeline of
  expenses + activities, edit/delete entries.

**Key context:** Reuse over rebuild — the engine is preserved; only the UI layer is rewritten. A
"trip" is the existing **active mode** concept specialized to one mode (trip) with the trip name as
the free-text instance label, so expense/activity entries are stamped via the existing
`draftToEntry` path (`metadata.mode = "trip"`, `metadata.modeLabel = <trip name>`). Logical entry
types: `trip`, `expense`, `activity`. No generic Groups system; no shortcut/layout customization UI;
no media/books/podcasts/general logging. Mobile-first, minimal clicks/typing — "fast trip
cash-register/logbook." Designs/north-star: `seeds/fewest-buttons-slickest.md`.

## Previous Milestone: v0.4.0 "Active Mode" De-Clunk + Editable Entries — ✅ SHIPPED 2026-06-19

**Outcome:** All 4 phases (16–19) shipped; 10/10 requirements satisfied; 592 tests green, `tsc -b` +
`vite build` clean, zero new runtime dependencies. The dashboard now shows ONLY the active mode's
buttons (the on-dashboard switcher is gone); mode switching moved to a hamburger "Active Mode" item
with an instance-label prompt; the app bar shows `mode · label`; every capture is stamped with
`metadata.mode`/`modeLabel` via the single `draftToEntry` path; saved entries are editable (a
reusable `/entries/:id/edit` form that merge-preserves unknown metadata, incl. the mode stamp) and
deletable (confirm-gated); and `occurredAt` defaults to today on capture. Milestone audit passed
(10/10 requirements, 4/4 cross-phase flows). Built autonomously via the GSD pipeline (CONTEXT → plan
→ gsd-executor TDD → verification per phase).

**Goal:** Cut steady-state navigation noise to the bone — the dashboard shows only the *active
mode*'s buttons — and make saved entries first-class: editable, deletable, and provenance-stamped
with the mode they were captured under.

**Core insight:** Navigation feels clunky not because layouts are missing (they exist) but because
everything that *isn't* the active mode is ever-present noise. A user stays in one mode (e.g.
Travel) for days; the fix is to **remove** the other modes and the switcher from steady state, not
add more controls. A "Mode" is the existing **Layout** reframed as a durable template; activating
one starts a labeled **instance** (`mode="Travel", label="Oregon-Jun-2026"`) that persists and
stamps every entry captured under it. Switching is rare and lives in the hamburger menu.

**Target features:**
- **Default `occurredAt` to today** — quick win; one fewer field on the common capture path (the
  date is a default, not a lock).
- **Editable & deletable saved entries** — wire `EntryDetailPage` to an edit form (reusing
  `ENTRY_FIELDS` + `buildReviewDraft`) over the existing `entriesRepository.update`/`.delete`: edit
  metadata, fix core fields (amount/date/title/location), delete with confirm; `recordedAt` stays
  immutable.
- **Active Mode model + instance stamping** — modes are independent named button lists (the v0.3.0
  layouts); activating one starts a free-text-labeled instance persisted in Dexie `settings`; every
  capture is stamped with `metadata.mode` / `metadata.modeLabel` in the single `draftToEntry` path.
- **Active Mode navigation + dashboard de-clunk** — switch via a hamburger-menu "Active Mode" item
  with a label prompt; the app bar shows `mode · label`; the dashboard renders **only** the active
  mode's buttons (the on-dashboard switcher is removed).

**Key context:** North-star constraint (`seeds/fewest-buttons-slickest.md`): every nav/dashboard/
capture decision is measured against "does this remove buttons/interactions, or add them?" — prefer
removing, defaulting, inferring, or pushing into the DSL. The "Mode" concept layers over the
existing `Layout` data structure (no risky wholesale rename required); instance labels and active-
mode selection reuse the established `activeLayoutRepository` Dexie-`settings` persistence pattern.
`entriesRepository.update`/`.delete` already exist and are unused — this milestone finally wires
them. Designs: `notes/active-mode-navigation-design.md`, `notes/editable-saved-entries-design.md`.

## Earlier Milestone: v0.3.0 Dashboard Shortcut Layouts — ✅ SHIPPED 2026-06-17

**Outcome:** All 5 phases (11–15) shipped; 16/16 requirements satisfied; 500 tests green, `tsc -b`
clean, zero new runtime dependencies. The Dashboard now renders customizable one-tap shortcut
layouts (chips + rows) backed by a JSON-Schema-validated config in the Dexie `settings` store, with
tap-to-capture (one-tap save + undo / fill-the-hole keypad sheet / ReviewPage), portable
import/export, and a full in-app authoring tool. The milestone audit caught and fixed a real
cross-phase blocker (export/import envelope mismatch).

**Goal:** Customizable one-tap shortcut buttons on the Dashboard, grouped into switchable
**layouts** (DayToDay / Travel / WorkTrip), built on top of the v0.2.0 Quick-Capture DSL —
collapsing recurring captures to a tap (+ at most one field).

**Core insight:** A shortcut is a saved DSL template with empty-slot "holes." Tap a shortcut →
fill the hole(s) (or nothing) → the filled string is valid DSL → `parseDSL` →
`buildReviewDraft` → save. Almost no new capture logic — it reuses the entire v0.2.0 pipeline.
Designed in `.planning/notes/dashboard-shortcut-layouts-design.md`; UI sketched in
`sketches/001-dashboard-shortcut-layouts` (winner: Variant B, chips + rows).

**Target features:**
- Config model (layouts → shortcuts, each a DSL template + `confirm` flag) stored as a single
  versioned JSON object in the dormant Dexie `settings` store, validated by a JSON Schema
- Dashboard rendering of layouts/shortcuts with a layout switcher (chips + rows) and sensible
  seeded defaults
- Tap-to-capture: fill-the-hole micro-prompt (mobile keypad amount sheet w/ live DSL preview);
  per-shortcut `confirm` — one-tap direct save (+ undo toast) or route through ReviewPage
- Import / export of the config as JSON (mirror the entries-export pattern; validate imports)
- Authoring tool: create/edit/reorder shortcuts + layouts, assign icon (`@heroicons/react`) +
  `confirm` flag; plus "Save current as shortcut" from the omnibar

**Key context:** Single-user is preserved — "personal/shareable" is delivered via portable
import/export, NOT accounts. JSON Schema (not Zod — user dislikes Zod DX) is the source of
truth and doubles as docs for the shareable format. One-tap direct save intentionally bows
out of the v0.2.0 "always Review" invariant for trusted shortcuts, paired with undo
(`entriesRepository.delete` already exists). Icons are Heroicons, not emoji.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ App scaffold (Vite 7 + React 19 + TS 5.9, Tailwind v4, template layout) — v0.1.0
- ✓ Mobile-first "Life Log" welcome/dashboard at the default route — v0.1.0
- ✓ Dexie/IndexedDB store with reactive `useLiveQuery` reads — v0.1.0
- ✓ Installable, offline-capable PWA (app shell loads offline) — v0.1.0
- ✓ `LifeLogEntry` record type + `entriesRepository` (CRUD + reactive) — v0.1.0
- ✓ Home dashboard → domain → entry-type navigation across all screens — v0.1.0
- ✓ URL-first capture (offline heuristics) → review → save, the default path — v0.1.0
- ✓ Manual entry behind a visible `Enter Manually` secondary button — v0.1.0
- ✓ Entry list (filterable) + detail + JSON export of all entries — v0.1.0
- ✓ Quick-Capture DSL: one-line `[type] slot1:slot2 ?k=v,k=v` shorthand → entry fields (DSL-01..04) — v0.2.0
- ✓ Quick-capture omnibar with live preview + type/value suggestions, pre-filling Review (OMNI-01..04) — v0.2.0
- ✓ `entriesRepository` distinct-values lookup for value suggestions (DATA-01) — v0.2.0
- ✓ DSL docs with worked examples per type (DOCS-01) — v0.2.0
- ✓ Shortcut-layouts config model + versioned JSON Schema + Dexie `settings` storage (CFG-01..03) — v0.3.0
- ✓ Dashboard layout switcher + shortcut rendering with seeded defaults (DASH-01..03) — v0.3.0
- ✓ Tap-to-capture: fill-the-hole keypad + per-shortcut one-tap save w/ undo or ReviewPage (CAP-01..04) — v0.3.0
- ✓ Import / export of the shortcut config as validated JSON (PORT-01..02) — v0.3.0
- ✓ Authoring tool for shortcuts + layouts + "Save current as shortcut" from the omnibar (EDIT-01..04) — v0.3.0
- ✓ `occurredAt` defaults to today on capture paths with a date field (DATE-01) — v0.4.0
- ✓ Edit a saved entry's metadata from the detail view (EEDIT-01) — v0.4.0
- ✓ Fix a saved entry's core fields; `recordedAt` immutable (EEDIT-02) — v0.4.0
- ✓ Delete a saved entry with confirmation (EEDIT-03) — v0.4.0
- ✓ Modes as independent named button lists (existing layouts become modes) (MODE-01) — v0.4.0
- ✓ Activate a mode → labeled instance, persisted across reloads (MODE-02) — v0.4.0
- ✓ Switch the active mode from a hamburger-menu "Active Mode" item (MODE-03) — v0.4.0
- ✓ App bar shows the active mode · instance label (MODE-04) — v0.4.0
- ✓ Dashboard renders only the active mode's buttons; switcher removed (DASH-04) — v0.4.0
- ✓ Every capture stamped with `metadata.mode` / `modeLabel` via `draftToEntry` (STAMP-01) — v0.4.0
- ✓ Engine understands trips/activities: `EntryType` += trip/activity, `ActiveMode.tripId`, `draftToEntry` stamps tripId, `tripService` (ENG-01..04) — v0.5.0
- ✓ Trip-only UI rewrite: 13 screens + DSL/shortcut subsystem dropped atomically; trip nav; export-only Settings (UI-01..05) — v0.5.0
- ✓ Create + activate a trip; empty-state Create-a-Trip; active trip persists (TRIP-01..04) — v0.5.0
- ✓ Trip Home: active trip + Expense/Activity CTAs + recent entries + running total (HOME-01..05) — v0.5.0
- ✓ Expense capture: amount + 8-category grid + vendor/notes → stamped save, `domain:'trips'`, local-date (EXP-01..06) — v0.5.0
- ✓ Activity capture: type page → form + accessible 1–5 star rating; Other free-text type (ACT-01..06) — v0.5.0
- ✓ Previous Trips (single-pass) + Trip Detail: category-grouped float-safe report + timeline + inline edit/delete (PREV-01..04, RPT-01..06) — v0.5.0

### Active

<!-- v0.5.0 shipped; next milestone scope is open — run /gsd:new-milestone. -->

(None — v0.5.0 shipped; next milestone not yet scoped. Candidate directions in Deferred below.)

### Deferred (candidate directions for future milestones)

<!-- v0.5.0 trip-logger deferrals (locked product decisions for the MVP). -->

- [ ] Explicit "End Trip" / archive action (v0.5.0 ends a trip implicitly on new-trip activation)
- [ ] "Delete Trip" with cascade delete of its entries (v0.5.0 is entry-level delete only)
- [ ] Per-day expense grouping, per-trip budgets, charts/visualizations on the report
- [ ] Multi-currency, receipt OCR, CSV/PDF export, photo attachments; in-trip filter/search
- [ ] Edit-form input-type polish & remove orphaned `useTrips`/`listTrips` + stale doc-comments (minor v0.5.0 tech debt; edit-form input types already fixed at close)
<!-- Seams already exist in code for the first two below. -->

- [ ] Filter / group entries by mode instance ("everything I logged during the Oregon trip") — the
  STAMP-01 provenance shipped in v0.4.0 enables this; the filtered view is the natural next milestone
- [ ] Backend sync layer (consume the existing `syncedAt` / `listUnsynced` seam)
- [ ] JSON import of *entries* (round-trips the existing export)
- [ ] Richer per-type capture heuristics + short-link (`maps.app.goo.gl`) resolution
- ✓ Edit / delete of *entries* from Entry Detail — SHIPPED v0.4.0 (EEDIT-01..03)

### Out of Scope

<!-- Explicit boundaries from spec.md Non-Goals. Includes reasoning to prevent re-adding. -->

- User accounts / login / auth — prototype is single-user, local-only
- Backend, server, or sync engine — local IndexedDB only (code is structured so a future sync layer *could* read unsynced entries)
- Receipt OCR — out of prototype scope
- Real third-party API integrations — extraction is URL/domain heuristics only
- Perfect metadata scraping — "flow over fidelity"; Review screen lets user fix weak metadata
- Multi-user support — single-user prototype
- Public sharing — personal log, not published
- Payments — no transactions, only expense *records*
- Complex analytics — out of prototype scope
- Native Android app — PWA only
- Push notifications — out of prototype scope
- i18n / multi-locale — single-locale (skip `i18n.ts` and `locales/`)
- Monorepo / workspace contracts package — single Vite app at repo root

## Context

- Two authoritative SPEC sources were ingested: `spec.md` (product / UX / data-model) and `docs/architecture-template.md` (code structure). They are non-contradictory; the architecture template explicitly defers to `spec.md` on product scope.
- Code structure mirrors the React side of `patrimonium/apps/web`, with required deviations: no `auth/`, no `authFetch`, no API contracts; `services/` are local Dexie repositories rather than HTTP clients; `useLiveQuery` instead of TanStack Query; single-locale; no monorepo.
- The three user-facing categories (Media, Trips, Expenditures) all collapse into one stored type, `LifeLogEntry`, distinguished by `domain` + `type`. The `db.ts` taxonomy (`EntryDomain`/`EntryType`) is the single source of truth consumed by `navigation.ts` and `entryFields.ts`.
- Prototype priority: capture flow and local persistence over polish.
- **As of v0.1.0:** the prototype is fully built and verified locally — ~4,900 LOC across 28 source + 25 test files, 221 tests, PWA build clean. Development used the GSD autonomous pipeline (research → plan → check → execute → code-review+fix → verify per phase); each phase's code review surfaced and fixed real bugs (stale-closure race, double-click duplicate save, UTC-midnight date off-by-one, `javascript:` URL XSS gate). Known tech debt: scaffolded-but-unused SETUP-04 primitives and the future-sync seam methods (intentional).

## Constraints

- **Tech stack (LOCKED)**: React 19 + React DOM 19, TypeScript 5.9 (project references), Vite 7, Tailwind CSS v4 (`@tailwindcss/vite`), `react-router-dom` v7, `vite-plugin-pwa` (Workbox), Dexie + `dexie-react-hooks`, Vitest — Pinned by `architecture-template.md` SPEC; consistent with `spec.md` implementation preference.
- **No backend / no auth (LOCKED)**: All data is local IndexedDB; `services/` are Dexie repositories — Mandated by `spec.md`.
- **Directory layout (LOCKED)**: `src/{pages, components, components/ui, services, state/common, config, pwa, assets}`, single Vite app at repo root — Mandated by `architecture-template.md`.
- **Mobile-first PWA**: Phone-sized screens first; app shell + previously visited routes load offline — Core product requirement.
- **Data model (LOCKED)**: Single stored record type `LifeLogEntry` with the exact shape in REQUIREMENTS.md — Mandated by `spec.md`; future apps read this log.
- **UX rule**: URL-first is the default capture path; manual entry must NOT be default (requires `Enter Manually`) — Explicit `spec.md` acceptance criterion.

## Key Decisions

<!-- LOCKED decisions sourced from architecture-template.md SPEC + spec.md. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React 19 + TS 5.9 + Vite 7 single app (no monorepo) | Matches architecture-template SPEC; prototype simplicity | ✓ LOCKED — shipped v0.1.0 |
| Tailwind CSS v4 via `@tailwindcss/vite` | Pinned by template; theme tokens via CSS custom properties | ✓ LOCKED — shipped v0.1.0 |
| `vite-plugin-pwa` (Workbox), `createPwaOptions()` factory | Testable PWA config; NetworkFirst shell, `autoUpdate` | ✓ LOCKED — shipped v0.1.0 |
| Dexie + `useLiveQuery` (not TanStack Query) | Local IndexedDB repos; reactive reads without a server | ✓ LOCKED — shipped v0.1.0 |
| `services/` are local Dexie repositories, not HTTP clients | spec.md mandates no backend; drop `authFetch` / contracts | ✓ LOCKED — shipped v0.1.0 |
| Single `LifeLogEntry` record type; `entries` + `settings` stores | All categories are typed entries in one event log | ✓ LOCKED — shipped v0.1.0 |
| URL-first capture default; manual behind `Enter Manually` | Explicit spec.md UX rule + acceptance criterion | ✓ LOCKED — shipped v0.1.0 |
| Structure for a future sync layer (unsynced-entries query stub) | No sync now, but keep the seam open | ✓ LOCKED — shipped v0.1.0 |
| "Mode" is the existing `Layout` reframed (no wholesale rename) | Avoid risky churn; modes derive from `config.layouts` via `listModes` | ✓ Good — shipped v0.4.0 |
| Active mode is the dashboard's source of truth (not `activeLayoutName`) | One steady-state selector; switcher removed for the de-clunk | ✓ Good — shipped v0.4.0 |
| Capture stamp via an optional `activeMode` arg on `draftToEntry` | Single capture path stamps all save routes; no stamp when inactive | ✓ Good — shipped v0.4.0 |
| Entry edits merge metadata (preserve unknown keys) | Mode/modeLabel + DSL/URL keys survive edits and stay correctable | ✓ Good — shipped v0.4.0 |
| A trip IS the active mode (type:'trip' entry + activateMode + tripId stamp) | Reuse the engine; no new store; tripId is the stable join key (survives duplicate names/zero-entry trips) | ✓ Good — shipped v0.5.0 |
| Aggressive UI rewrite (drop 13 screens atomically) over preserved engine | Engine was sound; clunkiness was UI surface area — remove it, don't add config | ✓ Good — shipped v0.5.0 |
| Money stays a JS number; round + formatUSD at display (no integer-cents migration) | Avoids a Dexie migration; float artifacts fixed at the display boundary | ✓ Good — shipped v0.5.0 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-19 — after completing milestone v0.5.0 (Trips MVP UI Refactor shipped; UI rewritten to a trip-only logger over the preserved engine)*

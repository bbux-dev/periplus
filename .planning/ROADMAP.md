# Roadmap: Life Log

## Milestones

- ✅ **v0.1.0 — Tracer Bullet → working local life-log** — Phases 1–6 (shipped 2026-06-16)
- ✅ **v0.2.0 — Quick-Capture DSL** — Phases 7–10 (shipped 2026-06-16)
- ✅ **v0.3.0 — Dashboard Shortcut Layouts** — Phases 11–15 (shipped 2026-06-17)
- 🔄 **v0.4.0 — "Active Mode" De-Clunk + Editable Entries** — Phases 16–19 (in progress)

## Phases

### 🔄 v0.4.0 — "Active Mode" De-Clunk + Editable Entries (Phases 16–19)

Cut steady-state nav noise (dashboard shows only the active mode) and make saved entries
first-class (editable, deletable, mode-stamped). Designs: `notes/active-mode-navigation-design.md`,
`notes/editable-saved-entries-design.md`. North star: `seeds/fewest-buttons-slickest.md`.

- [x] **Phase 16: Default occurredAt to Today** — quick win: default the date field to today
  (local) on both the ReviewPage form and the one-tap direct-save path, for types that have an
  `occurredAt` field; default not lock. Reqs: DATE-01. (completed 2026-06-18; +16 tests)
- [x] **Phase 17: Editable & Deletable Saved Entries** — wire `EntryDetailPage` to an edit form
  reusing `ENTRY_FIELDS` + `buildReviewDraft` over the existing `entriesRepository.update`/`.delete`:
  edit metadata, fix core fields, delete with confirm; `recordedAt` immutable. Reqs: EEDIT-01..03.
  (completed 2026-06-18; +31 tests; new `/entries/:id/edit` route)
- [ ] **Phase 18: Active Mode Model + Instance Stamping** — model the active mode + free-text
  instance label persisted in Dexie `settings` (mirroring `activeLayoutRepository`); stamp every
  capture with `metadata.mode` / `modeLabel` in the single `draftToEntry` path. No nav UI yet.
  Reqs: MODE-01, MODE-02, STAMP-01.
- [ ] **Phase 19: Active Mode Navigation + Dashboard De-Clunk** — hamburger-menu "Active Mode"
  item (mode list → activate → label prompt), app bar shows `mode · label`, dashboard renders only
  the active mode's buttons (remove the on-dashboard switcher). Reqs: MODE-03, MODE-04, DASH-04.

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

## Phase Details

### Phase 16: Default occurredAt to Today
**Goal**: When a user captures an entry whose type has an `occurredAt` date field, the date field is pre-filled with today's local date on both capture paths — removing a needless interaction on the common path — while remaining fully editable and clearable.
**Depends on**: Nothing (independent quick win)
**Requirements**: DATE-01
**Success Criteria** (what must be TRUE):
  1. Opening the ReviewPage to capture a type that has an `occurredAt` field shows today's local date pre-filled in the date input (formatted `YYYY-MM-DD` via `toLocaleDateString('en-CA')`), not a blank field.
  2. The pre-filled date is a default, not a lock: the user can change it to another date or clear it, and the chosen/empty value is what saves.
  3. The one-tap direct-save path (no ReviewPage) writes today's local-midnight epoch to `occurredAt` when the type has a date field and the DSL template supplied none; the existing local-midnight convention (`Date.parse(\`${d}T00:00:00\`)`, not UTC) is preserved so there is no off-by-one.
  4. Entry types that have no `occurredAt` field are unaffected — no date is invented for them.
**Plans**: TBD (planned at plan-phase)

### Phase 17: Editable & Deletable Saved Entries
**Goal**: A saved entry is no longer read-only — from the entry detail view a user can edit its metadata, correct its core fields, and delete it, all persisted through the existing `entriesRepository` methods, with the edit form driven by the same field config as capture.
**Depends on**: Nothing (independent of mode work; DATE-01 desirable but not required)
**Requirements**: EEDIT-01, EEDIT-02, EEDIT-03
**Success Criteria** (what must be TRUE):
  1. From `EntryDetailPage` the user can enter an edit mode (inline or a dedicated edit route) that renders the same field set used for capture (`ENTRY_FIELDS[type]` + `buildReviewDraft`), pre-populated from the saved entry.
  2. Editing metadata (tags, mode/`modeLabel`, merchant, category, description/notes) and saving persists via `entriesRepository.update` and the detail view reflects the new values.
  3. Editing core fields (amount, `occurredAt` date, title, location) persists correctly; `recordedAt` is never presented as editable and is unchanged after an edit.
  4. The user can delete the entry behind a confirmation step (`entriesRepository.delete`) and is returned to the entry list, where the entry no longer appears.
**Plans**: TBD (planned at plan-phase)

### Phase 18: Active Mode Model + Instance Stamping
**Goal**: The app has a persisted notion of an "active mode" and a free-text "instance label", and every entry captured while a mode is active is stamped with that provenance — all of this working at the data/service layer before any navigation UI is built.
**Depends on**: Nothing (foundational for Phase 19; STAMP benefits Phase 17's mode-metadata edit but does not block it)
**Requirements**: MODE-01, MODE-02, STAMP-01
**Success Criteria** (what must be TRUE):
  1. Modes are the existing layouts reframed as durable, independent named templates; the model exposes the available modes and supports selecting one as active (overlap between modes is allowed — independent lists, not a shared pool).
  2. Activating a mode records an active mode + a free-text instance label with a sensible default (e.g. `<Mode>-<Mon>-<Year>`), persisted in the Dexie `settings` store via a repository + reactive hook mirroring `activeLayoutRepository`; the selection survives a reload.
  3. `captureService.draftToEntry` (or its single call path) writes `metadata.mode` and `metadata.modeLabel` for every capture made while a mode is active, so both one-tap save and ReviewPage inherit the stamp.
  4. When no mode is active, captures are not stamped — no empty-string or placeholder `mode`/`modeLabel` keys are written to metadata.
**Plans**: TBD (planned at plan-phase)

### Phase 19: Active Mode Navigation + Dashboard De-Clunk
**Goal**: Switching modes moves entirely into the hamburger menu, the app bar shows the current mode and instance, and the dashboard sheds every steady-state control that isn't the active mode's buttons — delivering the core "de-clunk".
**Depends on**: Phase 18 (consumes the active-mode model + persistence)
**Requirements**: MODE-03, MODE-04, DASH-04
**Success Criteria** (what must be TRUE):
  1. The hamburger menu has an "Active Mode" item that opens a list of modes; tapping one activates it and prompts to confirm/edit the instance label (pre-filled with the sensible default).
  2. The app bar reflects the current state as `mode · label` (e.g. `Travel · Oregon-Jun-2026`) and updates immediately when the mode or label changes.
  3. The dashboard renders only the active mode's buttons using the existing `ShortcutRow` rendering; the on-dashboard layout/mode switcher (v0.3.0 chips) is gone from steady state.
  4. With no other modes or switcher on the dashboard, the active mode's buttons still capture correctly and inherit the Phase 18 mode stamp, and the net on-screen control count is lower than before (north-star check).
**Plans**: TBD (planned at plan-phase)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–6. (v0.1.0) | v0.1.0 | 22/22 | Complete | 2026-06-16 |
| 7–10. (v0.2.0) | v0.2.0 | 4/4 | Complete | 2026-06-16 |
| 11–15. (v0.3.0) | v0.3.0 | 11/11 | Complete | 2026-06-17 |
| 16. Default occurredAt to Today | v0.4.0 | 1/1 | Complete | 2026-06-18 |
| 17. Editable & Deletable Saved Entries | v0.4.0 | 1/1 | Complete | 2026-06-18 |
| 18. Active Mode Model + Instance Stamping | v0.4.0 | 0/? | Not Started | — |
| 19. Active Mode Navigation + Dashboard De-Clunk | v0.4.0 | 0/? | Not Started | — |

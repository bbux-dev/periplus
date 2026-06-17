# Roadmap: Life Log

## Milestones

- ✅ **v0.1.0 — Tracer Bullet → working local life-log** — Phases 1–6 (shipped 2026-06-16)
- ✅ **v0.2.0 — Quick-Capture DSL** — Phases 7–10 (shipped 2026-06-16)
- 🔄 **v0.3.0 — Dashboard Shortcut Layouts** — Phases 11–15 (in progress)

## Phases

<details>
<summary>✅ v0.2.0 — Quick-Capture DSL (Phases 7–10) — SHIPPED 2026-06-16</summary>

A one-line, URL-esque shorthand (`[type] slot1:slot2 ?k=v,k=v`) that parses live into the
existing Review screen. Design: `notes/quick-capture-dsl-design.md`; de-risked by spike
`001-dsl-parser`.

- [x] **Phase 7: DSL Parser** — type-agnostic parser (TS) with per-type positional schemas
  beside `ENTRY_FIELDS`, emitting the flat formValues `buildReviewDraft` consumes; statuses
  `ok`/`ambiguous`/`error`. Reqs: DSL-01..04. (26 parser tests)
- [x] **Phase 8: Distinct-Values Lookup** — `entriesRepository.listDistinctValues` +
  `useDistinctValues` hook (frequency-ranked, case-insensitive prefix). Reqs: DATA-01. (5 tests)
- [x] **Phase 9: Quick-Capture Omnibar** — omnibar UI with live preview, type-token
  suggestions (resolving p/e collisions), history-backed value suggestions; pre-fills
  ReviewPage (never direct-save); reachable from the dashboard `/capture`. Reqs: OMNI-01..04.
  (suggest.ts 31 tests + page RTL tests)
- [x] **Phase 10: Docs & Examples** — README DSL section with grammar + worked example per
  type (drawn from the validated parser suite). Reqs: DOCS-01.

Quality at ship: 277 tests passing; `tsc -b` + `vite build` + PWA generation clean; new code
lint-clean. Built autonomously (parser ported from the VALIDATED spike).

</details>



<details>
<summary>✅ v0.1.0 (Phases 1–6) — SHIPPED 2026-06-16</summary>

- [x] Phase 1: Foundation & App Shell (3/3 plans) — completed 2026-06-15
- [x] Phase 2: Data Layer & PWA Shell (3/3 plans) — completed 2026-06-15
- [x] Phase 3: Navigation & Dashboard (3/3 plans) — completed 2026-06-15
- [x] Phase 4: URL-First Capture (5/5 plans) — completed 2026-06-15
- [x] Phase 5: Manual Entry (2/2 plans) — completed 2026-06-15
- [x] Phase 6: Entry List, Detail & Export (6/6 plans) — completed 2026-06-16

Full phase details, success criteria, and requirements archived in
[`milestones/v0.1.0-ROADMAP.md`](milestones/v0.1.0-ROADMAP.md).
Audit: [`milestones/v0.1.0-MILESTONE-AUDIT.md`](milestones/v0.1.0-MILESTONE-AUDIT.md).

</details>

### 🔄 v0.3.0 — Dashboard Shortcut Layouts (Phases 11–15)

- [x] **Phase 11: Config Model, Schema & Storage** — CFG types, versioned JSON Schema, Dexie `settings` reactive read/write, validator. Foundational; no UI. Reqs: CFG-01..03. (completed 2026-06-17)
- [x] **Phase 12: Dashboard Rendering & Layout Switcher** — Variant B chips+rows dashboard with Heroicons, scrollable layout switcher, persisted selection, seeded defaults. Reqs: DASH-01..03. (completed 2026-06-17)
- [ ] **Phase 13: Tap-to-Capture Flow** — fill-the-hole micro-prompt (mobile keypad + live DSL preview), per-shortcut one-tap save + undo toast or ReviewPage route. Reqs: CAP-01..04.
- [ ] **Phase 14: Import / Export Config** — export config as JSON, import with JSON Schema validation + version migration, reject invalid with clear message. Reqs: PORT-01..02.
- [ ] **Phase 15: Authoring Tool** — create/edit/delete shortcuts and layouts, reorder shortcuts, "Save current as shortcut" from the omnibar, parseDSL validation before save. Reqs: EDIT-01..04.

## Phase Details

### Phase 11: Config Model, Schema & Storage
**Goal**: The shortcut config types are defined, backed by a versioned JSON Schema, and can be persisted to and read reactively from the Dexie `settings` store.
**Depends on**: Nothing (foundational; no UI)
**Requirements**: CFG-01, CFG-02, CFG-03
**Success Criteria** (what must be TRUE):
  1. A `ShortcutConfig` TypeScript type (and sub-types `Layout`, `Shortcut`) matches the JSON Schema shape exactly.
  2. A well-formed config validates successfully; a structurally invalid config is rejected with a human-readable error message before any storage write.
  3. Writing a config to the Dexie `settings` store and reading it back reactively returns the same config without data loss.
  4. A config exported by an older app version loads successfully in a newer one via the defined forward-compat migration path (version field present and migration logic exercised in tests).
**Plans**: 1 plan
  - [x] 11-01-PLAN.md — config types + Heroicons allow-list, JSON Schema spec, hand-rolled validator + migration seam, Dexie settings repository + reactive useShortcutConfig hook

### Phase 12: Dashboard Rendering & Layout Switcher
**Goal**: The Dashboard renders the active layout's shortcuts as tappable rows with Heroicons icons, provides a horizontally-scrollable layout chip switcher with persisted selection, and seeds sensible defaults on a fresh install.
**Depends on**: Phase 11
**Requirements**: DASH-01, DASH-02, DASH-03
**Success Criteria** (what must be TRUE):
  1. The Dashboard shows the active layout's shortcuts as full-width tappable rows, each displaying its name and assigned Heroicons icon.
  2. Tapping a layout chip switches the active layout and the shortcut rows update to reflect that layout's shortcuts.
  3. The active layout selection persists across page reloads.
  4. A fresh install (no prior config in Dexie `settings`) shows sensible default layouts (e.g. DayToDay / Travel / WorkTrip) with shortcuts without any user setup.
**Plans**: 2 plans
  - [x] 12-01-PLAN.md — DEFAULT_SHORTCUT_CONFIG seed constant + active-layout persistence (activeLayoutRepository + useActiveLayoutName) [wave 1, data]
  - [x] 12-02-PLAN.md — .no-scrollbar + LayoutChips/ShortcutRow + DashboardPage seeding/chips/rows wiring [wave 2, UI]
**UI hint**: yes

### Phase 13: Tap-to-Capture Flow
**Goal**: Tapping a shortcut triggers the correct capture path — immediate entry or fill-the-hole prompt — using the v0.2.0 parseDSL pipeline, with per-shortcut one-tap direct save + undo or ReviewPage routing.
**Depends on**: Phases 11–12
**Requirements**: CAP-01, CAP-02, CAP-03, CAP-04
**Success Criteria** (what must be TRUE):
  1. Tapping a zero-hole shortcut with `confirm:false` saves the entry immediately via parseDSL → buildReviewDraft → entriesRepository.create with no prompt shown.
  2. Tapping a shortcut with `confirm:true` routes through the existing ReviewPage regardless of whether holes are present.
  3. Tapping a shortcut with one or more holes opens a fill-the-hole sheet; a mobile numeric keypad and quick-amount presets update a live DSL preview of the resulting line before capture.
  4. After a direct save (`confirm:false`), a "Saved · Undo" toast appears; tapping Undo calls `entriesRepository.delete` and confirms the entry is gone.
  5. A named-hole placeholder in a `dslTemplate` causes the fill-the-hole prompt to ask for that specific named field, not only empty positional slots.
**Plans**: 3 plans
  - [ ] 13-01-PLAN.md — captureService (draftToEntry, detectHoles, {} token, applyFills/buildDSLPreview) + ReviewPage refactor to draftToEntry [wave 1, logic]
  - [ ] 13-02-PLAN.md — HoleSheet (keypad/presets/live preview) + SavedToast components [wave 2, UI]
  - [ ] 13-03-PLAN.md — useShortcutCapture orchestrator hook + DashboardPage wire-in + integration tests [wave 3, wiring]
**UI hint**: yes

### Phase 14: Import / Export Config
**Goal**: Users can export the full shortcut config as a JSON file and import a JSON config file that is validated against the JSON Schema before being applied.
**Depends on**: Phase 11
**Requirements**: PORT-01, PORT-02
**Success Criteria** (what must be TRUE):
  1. Tapping "Export Config" triggers a download of a JSON file whose contents match the current shortcut config.
  2. Importing a valid config JSON file replaces the current config and the Dashboard reflects the new layouts and shortcuts immediately.
  3. Importing an invalid or structurally malformed file is rejected before any change is applied, with a clear human-readable error message.
  4. A config exported from an older app version imports successfully via the version migration path defined in Phase 11.
**Plans**: TBD

### Phase 15: Authoring Tool
**Goal**: Users can create, edit, delete, and reorder shortcuts and layouts in-app, and save any DSL line from the omnibar directly as a new shortcut template.
**Depends on**: Phases 11–13
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04
**Success Criteria** (what must be TRUE):
  1. The user can create a new shortcut (name, icon, dslTemplate, confirm flag) within a layout and it appears on the Dashboard immediately.
  2. The user can edit an existing shortcut's fields and delete it; changes persist across reloads.
  3. The user can create, rename, or delete a layout; the layout switcher chip row reflects the change immediately.
  4. The user can reorder shortcuts within a layout; the new order persists across reloads.
  5. From the omnibar, tapping "Save current as shortcut" (via the "+ New" chip entry point) pre-fills the authoring form with the current DSL line; a `dslTemplate` that fails `parseDSL` cannot be saved.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & App Shell | v0.1.0 | 3/3 | Complete | 2026-06-15 |
| 2. Data Layer & PWA Shell | v0.1.0 | 3/3 | Complete | 2026-06-15 |
| 3. Navigation & Dashboard | v0.1.0 | 3/3 | Complete | 2026-06-15 |
| 4. URL-First Capture | v0.1.0 | 5/5 | Complete | 2026-06-15 |
| 5. Manual Entry | v0.1.0 | 2/2 | Complete | 2026-06-15 |
| 6. Entry List, Detail & Export | v0.1.0 | 6/6 | Complete | 2026-06-16 |
| 7. DSL Parser | v0.2.0 | 1/1 | Complete | 2026-06-16 |
| 8. Distinct-Values Lookup | v0.2.0 | 1/1 | Complete | 2026-06-16 |
| 9. Quick-Capture Omnibar | v0.2.0 | 1/1 | Complete | 2026-06-16 |
| 10. Docs & Examples | v0.2.0 | 1/1 | Complete | 2026-06-16 |
| 11. Config Model, Schema & Storage | v0.3.0 | 1/1 | Complete   | 2026-06-17 |
| 12. Dashboard Rendering & Layout Switcher | v0.3.0 | 2/2 | Complete   | 2026-06-17 |
| 13. Tap-to-Capture Flow | v0.3.0 | 0/3 | Not started | - |
| 14. Import / Export Config | v0.3.0 | 0/? | Not started | - |
| 15. Authoring Tool | v0.3.0 | 0/? | Not started | - |

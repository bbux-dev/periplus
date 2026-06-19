# Roadmap: Life Log

## Milestones

- ✅ **v0.1.0 — Tracer Bullet → working local life-log** — Phases 1–6 (shipped 2026-06-16)
- ✅ **v0.2.0 — Quick-Capture DSL** — Phases 7–10 (shipped 2026-06-16)
- ✅ **v0.3.0 — Dashboard Shortcut Layouts** — Phases 11–15 (shipped 2026-06-17)
- ✅ **v0.4.0 — "Active Mode" De-Clunk + Editable Entries** — Phases 16–19 (shipped 2026-06-19)

## Phases

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

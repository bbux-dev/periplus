# Roadmap: Life Log

## Milestones

- ✅ **v0.1.0 — Tracer Bullet → working local life-log** — Phases 1–6 (shipped 2026-06-16)
- ✅ **v0.2.0 — Quick-Capture DSL** — Phases 7–10 (shipped 2026-06-16)
- ✅ **v0.3.0 — Dashboard Shortcut Layouts** — Phases 11–15 (shipped 2026-06-17)

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

Quality at ship: 500 tests passing; `tsc -b` clean; zero new runtime dependencies. Milestone audit
caught + fixed a real cross-phase blocker (export/import envelope mismatch) and a rename-persistence bug.
Full phase details + success criteria archived in
[`milestones/v0.3.0-ROADMAP.md`](milestones/v0.3.0-ROADMAP.md).
Audit: [`milestones/v0.3.0-MILESTONE-AUDIT.md`](milestones/v0.3.0-MILESTONE-AUDIT.md).

</details>

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
| 13. Tap-to-Capture Flow | v0.3.0 | 3/3 | Complete   | 2026-06-17 |
| 14. Import / Export Config | v0.3.0 | 2/2 | Complete   | 2026-06-17 |
| 15. Authoring Tool | v0.3.0 | 3/3 | Complete   | 2026-06-17 |

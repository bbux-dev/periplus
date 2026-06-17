# Roadmap: Life Log

## Milestones

- ✅ **v0.1.0 — Tracer Bullet → working local life-log** — Phases 1–6 (shipped 2026-06-16)
- 🚧 **v0.2.0 — Quick-Capture DSL** — Phases 7–10 (in progress)

## Phases

### 🚧 v0.2.0 — Quick-Capture DSL (Phases 7–10)

A one-line, URL-esque shorthand (`[type] slot1:slot2 ?k=v,k=v`) that parses live into the
existing Review screen. Design: `notes/quick-capture-dsl-design.md`; de-risked by spike
`001-dsl-parser`.

- [ ] **Phase 7: DSL Parser** — type-agnostic parser (TS) with per-type positional schemas
  beside `ENTRY_FIELDS`, emitting the flat formValues `buildReviewDraft` consumes; statuses
  `ok`/`ambiguous`/`error`. Reqs: DSL-01..04.
  - Success: all 7 types parse; quoted free text + escapes work; partial/single-letter types
    return `ambiguous`; malformed input returns `error`; type inferred from domain context.
- [ ] **Phase 8: Distinct-Values Lookup** — `entriesRepository` distinct-values helper
  (frequency-ranked, prefix filter) + reactive hook. Reqs: DATA-01.
  - Success: returns frequency-desc distinct values for category/merchant/tags; prefix filter
    is case-insensitive; covers the tags array.
- [ ] **Phase 9: Quick-Capture Omnibar** — omnibar UI with live preview, type-token
  suggestions (resolving p/e collisions), history-backed value suggestions; pre-fills
  ReviewPage (never direct-save); reachable from the dashboard. Reqs: OMNI-01..04.
  - Success: typing a DSL shows live parsed fields; suggestions appear; Confirm lands on the
    pre-filled Review screen; ambiguous/error states block confirm with a clear message.
- [ ] **Phase 10: Docs & Examples** — README DSL section with grammar + worked examples per
  type. Reqs: DOCS-01.
  - Success: README documents the grammar and a worked example for each of the 7 types.



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

### 📋 v0.2.0+ (Planned)

The original roadmap split URL capture, manual entry, navigation, and view/export
into a later v0.2.0+ band. In execution these all shipped inside v0.1.0 (the tracer
milestone grew into a complete working local life-log). Next milestone scope is
open — start it with `/gsd:new-milestone`. Candidate directions surfaced during v0.1.0:

- Backend sync (the `syncedAt` / `listUnsynced` seam already exists, unused)
- Edit / delete from Entry Detail (`entriesRepository.update`/`.delete` exist, unused)
- JSON import (round-trips the existing export)
- Richer per-type capture heuristics and short-link resolution

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & App Shell | v0.1.0 | 3/3 | Complete | 2026-06-15 |
| 2. Data Layer & PWA Shell | v0.1.0 | 3/3 | Complete | 2026-06-15 |
| 3. Navigation & Dashboard | v0.1.0 | 3/3 | Complete | 2026-06-15 |
| 4. URL-First Capture | v0.1.0 | 5/5 | Complete | 2026-06-15 |
| 5. Manual Entry | v0.1.0 | 2/2 | Complete | 2026-06-15 |
| 6. Entry List, Detail & Export | v0.1.0 | 6/6 | Complete | 2026-06-16 |

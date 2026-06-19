# Life Log — Retrospective

> Living retrospective across milestones. Newest milestone first.

## Milestone: v0.1.0 — Tracer Bullet → working local life-log

**Shipped:** 2026-06-16
**Phases:** 6 | **Plans:** 22 | **Tasks:** 36 | **Commits:** ~167

### What Was Built

A complete local-first, offline-capable Life Log PWA, built bottom-up by dependency:
- **P1 Foundation** — Vite 7 + React 19 + TS 5.9 scaffold, Tailwind v4 CSS-first, template directory layout, Vitest + fake-indexeddb harness, throwaway tracer counter proving the UI → Dexie → IndexedDB → live-read loop.
- **P2 Data Layer & PWA** — `LifeLogEntry` model + additive Dexie v2 schema, `entriesRepository` (CRUD + reactive `useEntries` + `listUnsynced` sync seam), installable PWA via `vite-plugin-pwa`.
- **P3 Navigation** — taxonomy-derived `navigation.ts`, Dashboard + Domain pages, full route table, `navigate(-1)` back with PWA-safe fallback, 404 catch-all.
- **P4 URL-First Capture** — `Input`/`FormField` primitives, pure offline `extractMetadataFromUrl` (16+ fixtures across google_maps/imdb/book/podcast), CaptureUrlPage (default) → ReviewPage → Save; tracer counter removed here.
- **P5 Manual Entry** — `ENTRY_FIELDS` per-type config + `buildReviewDraft`, ManualEntryPage reusing the single ReviewPage→Save path.
- **P6 List/Detail/Export** — reactive filterable EntryListPage, EntryDetailPage (metadata JSON + safe-URL gating), `useEntry` hook, `buildExportJson` + `triggerDownload`.

### What Worked

- **Research → plan → plan-check before execution.** Every phase researched exact versions/patterns first (e.g. create-vite@7 vs the latest=v8 trap, Tailwind v4 CSS-first, Dexie additive `version(2)`, the Google Maps `+`→`%20` decode pitfall). Plans rarely needed rework.
- **Testing as the validation gate.** Each phase shipped only when `tsc -b` + `vite build` + the full Vitest suite were green. The suite grew monotonically (14 → 221) and caught regressions across the shared ReviewPage when Phases 5/6 extended it.
- **TDD executors + single-source-of-truth seams.** The `db.ts` taxonomy fed both `navigation.ts` and `entryFields.ts`; one `entriesRepository.create` and one `ReviewPage` served both capture and manual flows — so integration "just wired" at audit time (4/4 E2E flows green with zero fixes).
- **Per-phase code review + auto-fix.** Reviews surfaced *real* bugs that tests had missed: a stale-closure counter race, a double-click duplicate-save, a UTC-midnight date off-by-one, and a `javascript:` URL XSS vector (gated via a shared `isSafeUrl`). Catching these per-phase kept them from compounding.

### What Was Inefficient

- **Checkbox bookkeeping drift.** Two requirements (SHELL-01, CAPT-03) were verified but left unchecked in REQUIREMENTS.md; the milestone audit had to reconcile them. Executors should tick the traceability box when a requirement is proven.
- **Accomplishment extraction noise.** The auto-generated MILESTONES.md accomplishment list pulled in stray "One-liner:" fragments and a deviation note from SUMMARY files — SUMMARY one-liner formatting could be tightened.
- **Milestone/roadmap labeling mismatch.** The roadmap text framed v0.1.0 as Phase 1 only with Phases 2–6 as "v0.2.0+", but the milestone tracker treated all 6 as v0.1.0 and they shipped together. Worth aligning the roadmap band labels with the actual milestone definition up front.

### Patterns Established

- **Schema-driven forms via a per-type field config** (`ENTRY_FIELDS` + `buildReviewDraft`) feeding one shared Review→Save path.
- **Pure-core + thin-shim for side effects** (`buildExportJson(entries, exportedAt)` pure with injected timestamp; `triggerDownload` mocked in jsdom). Keeps the risky logic deterministic and fully testable.
- **Tri-state reactive hooks** (`useEntry`: `undefined`=loading / `null`=not-found / entry=found) for clean detail-page guards.
- **Shared security util** (`urlUtils.isSafeUrl`) gating any stored URL before it becomes an `href`.
- **Manual-only boundary documented per phase** (true browser refresh, real SW offline, real file download, phone viewport) with automated proxies — so an autonomous run isn't blocked on un-automatable checks.

### Key Lessons

- Offline-first reframes "extraction" as URL-string parsing, not fetching — decided in research, kept the whole capture feature deterministic and testable.
- Additive schema migrations (`version(2)` without redeclaring v1) let the data model grow without data loss; an explicit "counter store survives upgrade" test guarded it.
- A shared component touched by multiple phases (ReviewPage) is best evolved by *extending* a structurally-compatible draft type (`ExtractedDraft` → `ReviewDraft`) so prior-phase tests pass unchanged.

### Cost Observations

- Model mix: planning on Opus; research / execution / review / verification / fix on Sonnet.
- Workflow: per phase — 1 researcher + 1 planner + 1 plan-checker + N executors (1 per plan) + 1 reviewer + 1 fixer + 1 verifier; milestone close added an integration checker.
- Notable: worktrees were disabled (linear bootstrap chains; `node_modules` persistence) — sequential executors on the main tree avoided per-plan reinstall churn.

## Milestone: v0.3.0 — Dashboard Shortcut Layouts

**Shipped:** 2026-06-17
**Phases:** 5 (11–15) | **Plans:** 11

### What Was Built
Customizable one-tap shortcut buttons on the Dashboard, grouped into switchable layouts, built
entirely on top of the v0.2.0 Quick-Capture DSL — a shortcut is a saved DSL template whose empty
slots are "holes." Config model + JSON Schema + Dexie `settings` storage (Phase 11); chips+rows
dashboard + layout switcher + seeded defaults (Phase 12); tap-to-capture with one-tap save+undo /
fill-the-hole keypad sheet / ReviewPage routing (Phase 13); portable import/export (Phase 14);
full in-app authoring tool (Phase 15). 500 tests at ship; zero new runtime dependencies.

### What Worked
- **Building on a settled design paid off.** The explore (`dashboard-shortcut-layouts-design`),
  the winning sketch (Variant B), and the JSON-schema todo meant the milestone scope and most
  decisions were pre-resolved — research per phase mostly confirmed and sharpened rather than
  discovered. The "shortcut = DSL template with holes" insight collapsed Phase 13 into reuse of
  the existing parseDSL → buildReviewDraft → save pipeline (one extracted `draftToEntry`).
- **Reuse over new surface.** Zero new runtime dependencies across the whole milestone; the
  dormant v0.1.0 `settings` store was activated by data writes only (no Dexie schema bump); the
  entries-export pattern was reused verbatim for config export.
- **Per-phase code review caught real bugs early** (HoleSheet lone-`.` amount accepted as NaN;
  unhandled Dexie rejections; renameLayout same-name throw; cross-layout move).

### What Was Inefficient
- **Unit tests in isolation missed a cross-phase integration bug.** Export and import were each
  unit-tested green, but their composition was broken (envelope vs raw config) — only the
  milestone integration checker caught it. Lesson: add a round-trip/composition test whenever two
  pure functions are designed to feed each other (now added).
- A few phases produced `human_needed` verifications purely for device/browser visual feel; the
  logic was fully covered, so these were deferred as non-blocking.

### Patterns Established
- **Config write path:** read-fresh (`configRepository.get()`, not the hook value) → pure mutation
  helper → `validateShortcutConfig` (defense-in-depth) → `configRepository.put`; reactivity via
  `useLiveQuery`. Used identically across phases 12–15.
- **Hole detection** via `POSITIONAL_SCHEMA` comparison (never warning-string matching); `{}` as
  the named-hole token, stripped before `buildReviewDraft`.
- **Allow-list pattern** for icons (`SHORTCUT_ICON_MAP` + `resolveShortcutIcon` fallback) instead
  of dynamic component lookup.

### Key Lessons
- Compose-the-pure-functions integration tests are worth their weight — independent unit greenness
  is not round-trip correctness.
- A pre-milestone explore + sketch dramatically reduces per-phase research cost and rework.

### Cost Observations
- Model mix: planning on Opus; research / execution / review / fix / verification on Sonnet.
- Workflow per phase: 1 researcher (skipped on the mechanical Phase 14) + pattern-mapper + planner
  + plan-checker + N sequential executors (1 per plan) + reviewer + fixer + verifier; milestone
  close added an integration checker.
- Notable: worktrees disabled — sequential executors on the main tree (linear dependency chains;
  `node_modules` persistence).

## Milestone: v0.4.0 — "Active Mode" De-Clunk + Editable Entries

**Shipped:** 2026-06-19
**Phases:** 4 (16–19) | **Plans:** 4 | **Tests at ship:** 592 (+80 net) | **Audit:** passed (10/10, 4/4 flows)

### What Was Built
Date defaults to today on capture (P16); saved entries are editable + deletable via a reusable
`/entries/:id/edit` form that merge-preserves unknown metadata (P17); an active-mode model persisted
in Dexie `settings` with capture provenance stamping threaded through the single `draftToEntry` path
(P18); and the core de-clunk — mode switching moved to the hamburger menu, app bar shows `mode ·
label`, dashboard renders only the active mode's buttons (P19).

### What Worked
- **Reframing over rewriting.** Treating "Mode" as the existing `Layout` (no rename) and reusing the
  `activeLayoutRepository` persistence pattern, `ENTRY_FIELDS` + `buildReviewDraft`, and the single
  `draftToEntry` site meant each phase was small, additive, and low-risk.
- **Phase ordering paid off.** Building the active-mode model + stamping (P18) before the nav UI (P19),
  and metadata-merge editing (P17) before the mode stamp existed, made the 18↔17 and 18→19 links fall
  out cleanly — the stamp is editable because P17 already preserved unknown metadata keys.
- **Pre-written, touchpoint-grounded plans.** Authoring each PLAN.md from a full read of the actual
  touchpoints (then handing to gsd-executor) kept executors on rails — TDD green first try, zero
  production deviations across all 4 phases.

### What Was Inefficient
- A recurring test-harness gotcha (full fake timers hang awaited Dexie writes) had to be re-discovered;
  the fix (`toFake: ['Date']`) is now documented in each phase's context. Worth a standing test note.

### Patterns Established
- `services/activeMode.ts` mirrors `activeLayoutRepository` as the canonical "settings-backed reactive
  singleton" pattern. Optional trailing args on shared constructors (`draftToEntry(..., activeMode?)`)
  for cross-cutting concerns without disturbing existing callers.

### Key Lessons
- When a milestone is "de-clunk", the win is **removal** — measure each change against the north-star
  seed (fewer controls), not feature count. The dashboard shipped with strictly fewer steady-state controls.

### Cost Observations
- Discuss skipped (`workflow.skip_discuss=true`), UI phase/review off — fully autonomous run.
- Per phase: 1 pre-written plan + 1 gsd-executor (TDD, atomic commits) + main-thread verification;
  no researcher/pattern-mapper/checker overhead (phases were well-understood reframings).

## Cross-Milestone Trends

| Milestone | Phases | Plans | Tests at ship | Audit | Notes |
|-----------|--------|-------|---------------|-------|-------|
| v0.1.0 | 6 | 22 | 221 | passed (35/35) | Full local life-log shipped from a tracer bullet |
| v0.2.0 | 4 | 4 | 277 | passed (10/10) | Quick-Capture DSL omnibar; parser ported from validated spike |
| v0.3.0 | 5 | 11 | 500 | passed (16/16) | Shortcut layouts on the DSL; audit caught a real cross-phase blocker |
| v0.4.0 | 4 | 4 | 592 | passed (10/10) | Active-mode de-clunk + editable entries; reframed Layout→Mode, zero new deps |

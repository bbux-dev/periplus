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

## Cross-Milestone Trends

| Milestone | Phases | Plans | Tests at ship | Audit | Notes |
|-----------|--------|-------|---------------|-------|-------|
| v0.1.0 | 6 | 22 | 221 | passed (35/35) | Full local life-log shipped from a tracer bullet |

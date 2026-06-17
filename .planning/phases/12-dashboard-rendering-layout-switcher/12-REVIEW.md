---
phase: 12-dashboard-rendering-layout-switcher
reviewed: 2026-06-17
depth: deep
files_reviewed: 10
findings:
  blocker: 0
  warning: 2
  info: 2
  total: 4
status: findings
fixed:
  - WR-01 (seeding effect rewritten as async IIFE with try/catch — get() + put() rejections now handled, not silently dropped)
  - WR-02 (handleLayoutSelect made sync with .catch on activeLayoutRepository.put — chip-select rejection logged, not unhandled)
deferred:
  - IN-01 (shortcut React key uniqueness — defaults are unique; enforce in validator when Phase 15 authoring lands)
  - IN-02 (test rename cosmetic — "on remount" → "on initial mount")
---

# Phase 12: Code Review Report

**Status:** findings (0 Blockers, 0 High; 2 Warnings, 2 Info). Both warnings fixed.

## Summary

Well-structured chips+rows dashboard with first-run seeding and persisted active-layout state.
Scope boundary clean (no Phase 13/14/15 logic leaked), security holds (all config strings
rendered as React text; icons via `resolveShortcutIcon` allow-list only; no
`dangerouslySetInnerHTML`/`eval`/dynamic import), `db.ts` untouched. Reactive data flow
(`useLiveQuery` → derivation → render) sound; loading guard (`config !== undefined`) prevents
layout shift and protects `activeLayout?.shortcuts.map()`.

## Warnings (both FIXED)

### WR-01 — Seeding `put()` was fire-and-forget (`src/pages/DashboardPage.tsx`)
The inner `configRepository.put()` promise wasn't returned and the chain had no `.catch()`, so a
Dexie write/open failure on fresh install became an unhandled rejection and a permanently blank
dashboard with no feedback. Fixed: rewritten as an async IIFE that awaits both `get()` and
`put()` inside a `try/catch` (still guarded by the `cancelled` flag for StrictMode).

### WR-02 — Chip-select async promise dropped (`DashboardPage.tsx` + `LayoutChips.tsx`)
`handleLayoutSelect` was `async` but passed to a `void`-typed `onSelect`, so a rejecting
`activeLayoutRepository.put` was unhandled and the selection failed silently. Fixed: handler is
now synchronous and attaches `.catch()` with a console error; `LayoutChips` prop type unchanged.

## Info (deferred)

- **IN-01** Shortcut React keys use `s.name`; `Shortcut` has no uniqueness constraint. Defaults
  are unique today. When Phase 15 authoring allows user-created shortcuts, enforce per-layout
  name uniqueness in `validateShortcutConfig` (or switch to index keys).
- **IN-02** `DashboardPage.test.tsx` test named "...on remount" actually tests initial mount;
  cosmetic rename suggested.

## Scope & Security Verification — PASS

- No `parseDSL`/`buildReviewDraft`/`ReviewPage`/`innerHTML`/`eval` in new files.
- Shortcut row `onClick` is an inert `// TODO Phase 13` no-op; `+ New` chip is `disabled` (Phase 15 seam).
- `db.ts` diff across Phase 12 commits: zero changes.
- All config strings rendered as React text; icons via `resolveShortcutIcon` allow-list (BoltIcon fallback).

## Concurrency analysis — PASS

- StrictMode double-invoke: `cancelled` flag prevents post-cleanup write; second mount sees the
  completed write or re-seeds idempotently.
- Two-tab open: both may `put` identical default data; Dexie `put` is an idempotent upsert — deterministic.
- Unmount mid-seed: handled correctly (skip-on-cancel, or in-flight put completes and reactive read updates).

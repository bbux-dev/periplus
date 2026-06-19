---
phase: 21-app-shell-routing-rewrite-atomic-drop
plan: "04"
subsystem: pages/services/dsl
tags: [deletion, cleanup, refactor, trip-only]
dependency_graph:
  requires: [21-03]
  provides: [UI-01, TRIP-04]
  affects: [src/pages, src/services, src/config, src/hooks, src/components/dashboard, src/schemas, src/services/dsl]
tech_stack:
  added: []
  patterns: [atomic-git-rm deletion, impl+test paired removal]
key_files:
  created: []
  modified: []
  deleted:
    - src/pages/CaptureUrlPage.tsx + CaptureUrlPage.test.tsx
    - src/pages/DashboardPage.tsx + DashboardPage.test.tsx
    - src/pages/DomainPage.tsx + DomainPage.test.tsx
    - src/pages/EntryDetailPage.tsx + EntryDetailPage.test.tsx
    - src/pages/EntryEditPage.tsx + EntryEditPage.test.tsx
    - src/pages/EntryListPage.tsx + EntryListPage.test.tsx
    - src/pages/ManageShortcutsPage.tsx + ManageShortcutsPage.test.tsx
    - src/pages/ManualEntryPage.tsx + ManualEntryPage.test.tsx + ManualEntryPage.integration.test.tsx
    - src/pages/QuickCapturePage.tsx + QuickCapturePage.test.tsx
    - src/pages/ReviewPage.tsx + ReviewPage.test.tsx
    - src/pages/ShortcutFormPage.tsx + ShortcutFormPage.test.tsx
    - src/services/dsl/parser.ts + parser.test.ts
    - src/services/dsl/suggest.ts + suggest.test.ts
    - src/config/navigation.ts + navigation.test.ts
    - src/config/shortcutConfig.ts + shortcutConfig.test.ts
    - src/services/configRepository.ts + configRepository.test.tsx
    - src/services/configPort.ts + configPort.test.ts
    - src/services/configValidator.ts + configValidator.test.ts
    - src/services/shortcutMutations.ts + shortcutMutations.test.ts
    - src/services/templateValidator.ts + templateValidator.test.ts
    - src/services/extractMetadataFromUrl.ts + extractMetadataFromUrl.test.ts
    - src/components/dashboard/IconPicker.tsx
    - src/components/dashboard/LayoutChips.tsx
    - src/components/dashboard/ShortcutRow.tsx
    - src/hooks/useShortcutCapture.ts + useShortcutCapture.test.ts
    - src/schemas/shortcut-config.v1.schema.json
    - src/services/urlUtils.ts + urlUtils.test.ts
decisions:
  - "urlUtils.ts dropped — only importers were EntryDetailPage + ReviewPage (both DROP-list)"
  - "useBackOrHome.ts KEPT — still imported by PlaceholderPage, CreateTripPage, SettingsPage"
  - "distinctValues.test.ts KEPT — tests entriesRepository.listDistinctValues (kept service); no distinctValues.ts exists"
  - "HoleSheet + SavedToast KEPT — reused in Phases 22-24"
  - "51 files changed in one atomic commit (8704 deletions) — no intermediate broken state"
metrics:
  duration: "~5min"
  completed: 2026-06-19
  tasks_completed: 2
  files_deleted: 51
---

# Phase 21 Plan 04: Atomic Drop of Non-Trip Pages + Dead Subsystem — Summary

**One-liner:** Atomically deleted 51 files (11 non-trip pages + full DSL/shortcut/layout/config subsystem + tests) in one commit; tsc clean; vitest drops from 622 to 286 tests (expected); vite build succeeds.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Atomic deletion of all DROP-list files | 4b4c595 | 51 files deleted (8704 deletions) |
| 2 | Final verify gate — full suite green + reload persistence | (no commit — verification only) | verified |

## Verification Results

### tsc -b
Clean — zero errors, zero `Cannot find module` messages. Output was empty (exit 0).

### npx vitest run
- **Before deletion:** 622 tests, 48 test files
- **After deletion:** 286 tests, 24 test files
- **Delta:** -336 tests, -24 test files (expected and correct — all deleted tests belonged to DROP-list modules)
- **Status:** GREEN — zero failed tests, zero failed files, zero `Cannot find module` errors

### AppShell dead-import grep
`grep -rnE "NAVIGATION|useShortcutConfig|listModes|LayoutChips" src/components/layout/AppShell.tsx`
Returned no matches (exit code 1). AppShell contains no dead imports.

### npx vite build
Succeeded: 388 modules transformed, bundle produced cleanly with no broken imports.

### Pages directory after deletion
Only KEEP files remain: `CreateTripPage.tsx/test`, `PlaceholderPage.tsx/test`, `SettingsPage.tsx/test`, `TripHomePage.tsx/test`.

## TRIP-04 Reload Persistence (UI-01 + TRIP-04)

The active trip survives a reload because it is stored in the `activeMode` Dexie `settings` key — persisted to IndexedDB, not in-memory state. The passing `activeMode.test.tsx` suite proves this directly:

- `activeModeRepository: get` confirms a fresh `db.open()` returns `undefined` when nothing was stored.
- `activeModeRepository: put and get round-trip` writes an active mode then reads it back via `activeModeRepository.get()`, confirming IndexedDB durability.
- `activateMode` tests (lines 73–113) confirm that both label and `tripId` are persisted and recoverable via `activeModeRepository.get()` after `activateMode()` writes them.
- `useActiveMode` reactive test (line 132) confirms the hook re-renders from the Dexie settings key after a `put()`.

These tests collectively prove that `useActiveMode()` re-reads the persisted trip from the `settings` key on any fresh `db.open()` (page load), satisfying TRIP-04.

## Deviations from Plan

None — plan executed exactly as written.

The conditional-drop pre-checks confirmed:
- `urlUtils.ts`: importers were EntryDetailPage + ReviewPage only (both DROP) → dropped as planned.
- `useBackOrHome.ts`: KEPT — imported by PlaceholderPage, CreateTripPage, SettingsPage (all KEPT).
- `distinctValues.test.ts`: KEPT — no `distinctValues.ts` exists; test file exercises `entriesRepository.listDistinctValues`.
- `HoleSheet` / `SavedToast`: KEPT — no coupling to deleted modules.

## Self-Check: PASSED

- Deletion commit exists: `git log --oneline | grep 4b4c595` — FOUND
- Pages directory contains exactly 8 files (4 pages + 4 tests) — CONFIRMED
- `src/services/dsl/` — absent (removed) — CONFIRMED
- `useBackOrHome.ts` KEPT — CONFIRMED
- `distinctValues.test.ts` KEPT — CONFIRMED
- `npx tsc -b` clean — CONFIRMED
- `npx vitest run` 286 passing, 0 failing — CONFIRMED
- `npx vite build` success (388 modules) — CONFIRMED

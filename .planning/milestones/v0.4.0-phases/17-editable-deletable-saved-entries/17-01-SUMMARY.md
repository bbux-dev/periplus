---
phase: 17-editable-deletable-saved-entries
plan: 01
subsystem: ui
tags: [react, react-router, dexie, forms, crud]

# Dependency graph
requires:
  - phase: 05-manual-entry
    provides: ENTRY_FIELDS config, FormField, buildReviewDraft mapper, ManualEntryPage form pattern
  - phase: 06-entry-list-detail
    provides: EntryDetailPage tri-state useEntry shell, entriesRepository (update/delete/get)
provides:
  - Inverse field mapper (formValuesFromEntry) + change-builder (buildEntryUpdate) in entryFields
  - EntryEditPage at /entries/:id/edit — pre-populated reusable edit form persisting via update
  - Edit + confirm-gated Delete affordances on EntryDetailPage
affects: [phase-18-modes, entry-detail, manual-entry]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inverse mapper symmetric to buildReviewDraft: entry -> form string values, round-trips through the same DSL/field config (single source of truth)"
    - "Metadata MERGE-on-save: copy existing bag, set/delete known keys, set/delete extra keys; unknown stamps (mode/modeLabel, URL/DSL capture) survive"
    - "Edit form split into tri-state loader + inner form that lazy-inits state from the resolved entry"
    - "Inline two-step delete confirm via useState (no window.confirm) — testable"

key-files:
  created:
    - src/pages/EntryEditPage.tsx
    - src/pages/EntryEditPage.test.tsx
  modified:
    - src/config/entryFields.ts
    - src/config/entryFields.test.ts
    - src/pages/EntryDetailPage.tsx
    - src/pages/EntryDetailPage.test.tsx
    - src/App.tsx

key-decisions:
  - "Persisted edits through the existing entriesRepository.update(id, changes); cleared core fields collapse to undefined (Dexie update drops them) — no new persistence primitive needed"
  - "recordedAt/syncedAt/domain/type are never rendered nor written; occurredAt is editable"
  - "Metadata keys not covered by the type's ENTRY_FIELDS render in an 'Other metadata' section so arbitrary stamps stay editable"

patterns-established:
  - "formValuesFromEntry / buildEntryUpdate: reusable, pure, unit-tested inverse + change-builder"
  - "Edit-route loader/form split mirroring EntryDetailPage tri-state"

requirements-completed: [EEDIT-01, EEDIT-02, EEDIT-03]

# Metrics
duration: 6min
completed: 2026-06-19
---

# Phase 17 Plan 01: Editable & Deletable Saved Entries Summary

**Saved entries are now editable through a pre-populated reusable form (same ENTRY_FIELDS config as capture) that merge-persists core + metadata edits via the existing `entriesRepository.update`, and deletable behind an inline two-step confirm via `entriesRepository.delete` — with `recordedAt` immutable throughout.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-06-19T02:47:30Z
- **Completed:** 2026-06-19T02:53:00Z
- **Tasks:** 3 completed
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- Added `formValuesFromEntry` (inverse mapper) and `buildEntryUpdate` (merge-aware change-builder) to `entryFields.ts`, fully unit-tested for round-trip, metadata merge/clear, and immutability.
- Built `EntryEditPage` at `/entries/:id/edit`: tri-state loader + pre-populated form reusing `ENTRY_FIELDS[type]` + `FormField`, an "Other metadata" section for uncovered keys, required-field validation, Save→update→detail and Cancel→detail.
- Added Edit (→ edit route) and confirm-gated Delete (→ `entriesRepository.delete` → `/entries`) affordances to `EntryDetailPage`.

## Task Commits

Each task was committed atomically (TDD: failing test + implementation in one Conventional Commit per task):

1. **Task 1: Inverse mapper + change-builder in entryFields.ts** - `a0da942` (feat)
2. **Task 2: EntryEditPage + /entries/:id/edit route** - `4b7af1c` (feat)
3. **Task 3: Edit + Delete affordances on EntryDetailPage** - `706f296` (feat)

**Plan metadata:** _(this docs commit)_

## Files Created/Modified
- `src/config/entryFields.ts` - Added `formValuesFromEntry` + `buildEntryUpdate` named exports (imports `LifeLogEntry`).
- `src/config/entryFields.test.ts` - Added 17 tests for the inverse mapper + change-builder.
- `src/pages/EntryEditPage.tsx` - New edit route page (tri-state loader + inner form).
- `src/pages/EntryEditPage.test.tsx` - New: 10 RTL tests (pre-population, save persists core/metadata/extra, clear, recordedAt immutable, required validation, cancel).
- `src/pages/EntryDetailPage.tsx` - Added Edit button + inline two-step Delete confirm.
- `src/pages/EntryDetailPage.test.tsx` - Added 4 RTL tests for Edit/Delete; existing 13 stay green.
- `src/App.tsx` - Registered `/entries/:id/edit` route after `/entries/:id`.

## Decisions Made
- Reused `entriesRepository.update`/`delete` exactly as specified; no new persistence primitive was needed — Dexie `update` drops a property set to `undefined`, which cleanly handles core-field clearing, and a copied-and-mutated metadata bag handles merge/clear semantics. No clearing-semantics data bug was found, so `entriesRepository` was NOT touched.
- Metadata is merged onto a copy of the existing bag; known fields set/delete by parsed presence, extra keys set/delete by trimmed truthiness — preserving unknown stamps.

## Deviations from Plan

None - plan executed exactly as written. `entriesRepository` was not modified (no clearing-semantics data bug surfaced).

## Issues Encountered
None.

## Verification

- `pnpm exec vitest run` (full suite): **559 passed (44 files)** — up from the 528-test baseline (+31 new tests), no regressions.
- `pnpm exec tsc -b`: clean (exit 0).
- `pnpm exec vite build`: success (built in 1.33s; PWA precache generated).

## Success Criteria
- **EEDIT-01:** metadata incl. arbitrary/extra keys editable from the detail experience, persisted via update — met.
- **EEDIT-02:** core fields (amount, occurredAt, title, location) editable; recordedAt immutable — met.
- **EEDIT-03:** delete behind a confirm via entriesRepository.delete, returning to the entry list — met.

## Self-Check: PASSED
- src/pages/EntryEditPage.tsx — FOUND
- src/config/entryFields.ts (formValuesFromEntry/buildEntryUpdate) — FOUND
- Commits a0da942, 4b7af1c, 706f296 — FOUND

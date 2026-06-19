---
phase: 24-previous-trips-trip-detail-report
plan: "03"
subsystem: trips-ui
tags: [edit, delete, modal, reactive, tdd]
dependency_graph:
  requires: ["24-02"]
  provides: ["EditEntryModal", "TripDetailPage-edit-delete"]
  affects: ["src/components/EditEntryModal.tsx", "src/pages/TripDetailPage.tsx"]
tech_stack:
  added: []
  patterns:
    - "Modal shell: fixed backdrop + role=dialog + aria-modal + Escape key"
    - "savingRef double-submit guard (WR-02)"
    - "buildEntryUpdate(fields, entry, formValues, {}) — merge-preserving metadata update"
    - "window.confirm gate before entriesRepository.delete"
key_files:
  created:
    - src/components/EditEntryModal.tsx
    - src/components/EditEntryModal.test.tsx
  modified:
    - src/pages/TripDetailPage.tsx
    - src/pages/TripDetailPage.test.tsx
decisions:
  - "buildEntryUpdate(fields, entry, formValues, {}) is the authoritative merge-preserving updater — metadata.tripId/mode/modeLabel survive an amount edit without any hand-rolled merge"
  - "TimelineRow sub-component updated with onEdit/onDelete callback props from parent; parent holds editingEntry state and handleDelete confirm gate"
  - "Test amounts use findAllByText (not findByText) because each amount appears in ExpenseReport subtotal, grand total, AND timeline row detail"
metrics:
  duration: "252s (~4 min)"
  completed: "2026-06-19"
  tasks: 2
  files: 4
requirements: [RPT-05, RPT-06]
---

# Phase 24 Plan 03: EditEntryModal + TripDetailPage Edit/Delete Summary

**One-liner:** EditEntryModal with merge-preserving save via buildEntryUpdate and confirm-gated delete, wired into TripDetailPage timeline rows with reactive recompute via useLiveQuery.

## What Was Built

### Task 1: EditEntryModal (TDD)

`src/components/EditEntryModal.tsx` — a bottom-sheet modal for editing any timeline entry:

- Accepts `{ entry: LifeLogEntry; onClose: () => void }` — no isOpen prop, parent controls mounting
- Computes `fields = ENTRY_FIELDS[entry.type]` and seeds form state via `formValuesFromEntry(fields, entry)` — full inverse-mapper round-trip including local-date `occurredAt`
- One `FormField` per descriptor with `id="edit-<key>"`, label, value, onChange, placeholder
- `handleSave` guarded by `savingRef` (WR-02 double-submit guard) calls `buildEntryUpdate(fields, entry, formValues, {})` then `entriesRepository.update(entry.id, changes)` — extraMetadata is `{}` so only known-field keys change; metadata.tripId/mode/modeLabel survive untouched (T-24-07 mitigated)
- `handleDelete` calls `window.confirm('Delete this entry? This cannot be undone.')` and returns early if false; otherwise `entriesRepository.delete(entry.id)` (T-24-08 mitigated)
- Modal shell mirrors ExpenseSheet: fixed backdrop (aria-hidden, dismisses on click), `role="dialog"` `aria-modal="true"` container with Escape key handler and `tabIndex={-1}`

### Task 2: TripDetailPage Edit/Delete wiring (TDD)

`src/pages/TripDetailPage.tsx` updated:

- Added `useState<LifeLogEntry | null>(null)` for `editingEntry`
- `handleDelete(id)` with `window.confirm` gate then `entriesRepository.delete(id)` — no manual refresh needed (useTripEntries is reactive via useLiveQuery)
- `TimelineRow` sub-component extended with `onEdit: () => void` and `onDelete: () => void` callback props; each row renders Edit + Delete buttons (Button size="sm" variant="secondary")
- `<EditEntryModal entry={editingEntry} onClose={() => setEditingEntry(null)} />` mounted when editingEntry is non-null; modal closes itself after save or delete, triggering useLiveQuery re-render
- No Delete Trip control added anywhere (locked product decision — avoids orphaned-entry cascade)

## Test Results

- `npx vitest run`: **353 tests, 353 passed** (7 new tests added: 5 in EditEntryModal.test.tsx, 2 in TripDetailPage.test.tsx)
- `npx tsc -b`: clean
- `npx vite build`: succeeds (400 kB bundle)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test used `findByText` where multiple elements match**
- **Found during:** Task 2 GREEN verification
- **Issue:** The delete reactive-recompute test used `screen.findByText('$5.00')` but `$5.00` appears in three places simultaneously — ExpenseReport Food subtotal, grand total row, and timeline row detail. RTL `findByText` fails when multiple matches exist.
- **Fix:** Changed to `screen.findAllByText('$5.00')` with `.not.toHaveLength(0)`, consistent with the pattern used in the existing Task 2 tests (line 69-71 of TripDetailPage.test.tsx).
- **Files modified:** `src/pages/TripDetailPage.test.tsx`
- **Commit:** 9bfcf3a (same commit as GREEN implementation)

## Known Stubs

None. All data paths are fully wired:
- Edit form seeds from real entry via formValuesFromEntry
- Save calls entriesRepository.update with buildEntryUpdate output
- Delete calls entriesRepository.delete after confirm
- TripDetailPage re-renders reactively via useLiveQuery after each mutation

## Threat Flags

No new security surface beyond what was planned. Both planned mitigations implemented:
- T-24-07 (metadata tampering on edit): buildEntryUpdate merge path confirmed by test asserting metadata.tripId/mode/modeLabel survive an amount change
- T-24-08 (accidental delete): window.confirm gate confirmed by "confirm=false does NOT delete" test

## Self-Check: PASSED

Files created/exist:
- src/components/EditEntryModal.tsx — FOUND
- src/components/EditEntryModal.test.tsx — FOUND
- src/pages/TripDetailPage.tsx — modified, FOUND
- src/pages/TripDetailPage.test.tsx — modified, FOUND

Commits exist:
- a60cdfa — test(24-03): add failing tests for EditEntryModal
- ae4e55d — feat(24-03): implement EditEntryModal with merge-preserving save and confirm-gated delete
- 47ffa81 — test(24-03): add failing edit/delete reactive-recompute tests for TripDetailPage
- 9bfcf3a — feat(24-03): wire Edit/Delete into TripDetailPage timeline with reactive recompute

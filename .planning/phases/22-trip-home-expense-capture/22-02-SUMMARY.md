---
phase: 22-trip-home-expense-capture
plan: "02"
subsystem: dashboard/expense
tags: [component, modal, expense, trips, a11y, tdd]
dependency_graph:
  requires:
    - "22-01"  # EXPENSE_CATEGORIES constant + formatUSD
    - captureService  # draftToEntry, todayLocalMidnightEpoch, ReviewDraft
    - entriesRepository  # create
    - activeMode  # ActiveMode interface
  provides:
    - ExpenseSheet  # named export, fast expense-logging bottom sheet
  affects:
    - TripHomePage  # Phase 22-03 will import ExpenseSheet
tech_stack:
  added: []
  patterns:
    - HoleSheet clone (backdrop + dialog panel + focus + scroll-lock + action buttons)
    - Validation: inline re-check in handleSave, error shown via role=alert
    - Fake timer pattern: vi.useFakeTimers({ toFake: ['Date'] }) (Dexie-safe)
key_files:
  created:
    - src/components/dashboard/ExpenseSheet.tsx
    - src/components/dashboard/ExpenseSheet.test.tsx
  modified: []
decisions:
  - "Save button disabled={saving} only — not !canSave — so handleSave always fires and shows role=alert when fields invalid (aligns test contract with UX)"
  - "EXPENSE_CATEGORIES imported from config/expenseCategories (not re-exported from ExpenseSheet) — single source of truth for Phase 24 report"
  - "domain literal 'trips' hardcoded; tripId auto-stamped by draftToEntry; occurredAt via todayLocalMidnightEpoch()"
metrics:
  duration: ~10min
  completed: "2026-06-19"
  tasks: 2
  files: 2
---

# Phase 22 Plan 02: ExpenseSheet Component Summary

**One-liner:** Bottom-sheet expense modal with Amount/Category/Vendor/Notes fields, draftToEntry('expense','trips') save path, and 5 tests covering domain stamping, local-date occurredAt, validation gates, and dismiss.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build ExpenseSheet component | 7306ef4 | src/components/dashboard/ExpenseSheet.tsx |
| 2 | ExpenseSheet tests | 949f6a9 | src/components/dashboard/ExpenseSheet.test.tsx (+ ExpenseSheet.tsx fix) |

## What Was Built

**ExpenseSheet.tsx** (268 lines) — Named export `ExpenseSheet` component:
- Props: `{ isOpen, activeMode, onSave, onCancel }`
- Cloned HoleSheet shell: backdrop (aria-hidden, onClick=onCancel), dialog panel (role=dialog, aria-modal, aria-label="Log expense"), focus-management useEffect, fields-reset-on-open useEffect, body scroll-lock useEffect
- Amount field: `id="expense-amount"`, `inputMode="decimal"`, `autoFocus`, bound to state
- 8-button Category grid: maps `EXPENSE_CATEGORIES` with `aria-pressed` toggle
- Optional Vendor (`id="expense-vendor"`) and Notes (`id="expense-notes"`) inputs
- Validation error: `{error && <p role="alert">...}`
- Escape-to-dismiss: `onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}` on dialog panel
- `handleSave`: re-validates → builds `ReviewDraft` → `draftToEntry(draft,'expense','trips',activeMode)` → `entriesRepository.create()` → calls `onSave(saved)`

**ExpenseSheet.test.tsx** (97 lines) — 5 tests:
1. Stamps `domain='trips'`, `metadata.tripId`, `metadata.category`, `amount`, LOCAL-midnight `occurredAt` (23:30 local catches UTC off-by-one)
2. Shows `role="alert"` and blocks save when amount missing
3. Blocks save when no category selected
4. Calls onCancel when backdrop clicked
5. Calls onCancel on Escape keyDown

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Save button disabled logic contradicted validation test**
- **Found during:** Task 2 (first test run)
- **Issue:** PATTERNS.md specified `disabled={!canSave || saving}` on the Save button. When amount is empty and category is selected, `canSave` is false, so the button is disabled. A disabled button does not fire onClick in userEvent, so `handleSave` is never called, `setError` is never called, and `role="alert"` never renders. The test "does not call onSave when amount is missing" failed because it asserts `screen.getByRole('alert')` is present after clicking Save.
- **Fix:** Changed `disabled={!canSave || saving}` to `disabled={saving}`. The `canSave` flag is still computed and used for styling the amount input border; `handleSave`'s inline re-validation always runs and calls `setError('Amount and category are required.')` for any invalid input.
- **Files modified:** `src/components/dashboard/ExpenseSheet.tsx`
- **Commit:** 949f6a9

## Verification

- `npx tsc -b`: clean
- `npx vitest run`: 296 passed (291 pre-existing + 5 new)
- Grep gates all pass:
  - `draftToEntry(draft, 'expense', 'trips', activeMode)` present
  - `defaultDomainForType` count = 0
  - `todayLocalMidnightEpoch` count >= 1
  - `toISOString` count = 0
  - `metadata.tripId` / `tripId:` count = 0 (auto-stamped, never hand-set)
  - `EXPENSE_CATEGORIES` count >= 1
  - `role="dialog"`, `aria-modal`, `role="alert"`, `inputMode="decimal"` all present
  - `Escape` count >= 1
  - `toFake: ['Date']` in test count >= 1
  - Domain assertion `domain).toBe('trips')` present
  - `2026-06-19T00:00:00` (local midnight assertion) present
  - `tripId` assertion count >= 1

## Known Stubs

None — all fields wired, save path complete.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced beyond what the threat model covers.

## Self-Check: PASSED

- `/home/bbux/git/life-log/src/components/dashboard/ExpenseSheet.tsx`: EXISTS
- `/home/bbux/git/life-log/src/components/dashboard/ExpenseSheet.test.tsx`: EXISTS
- Commit 7306ef4: EXISTS
- Commit 949f6a9: EXISTS

---
phase: 13-tap-to-capture-flow
plan: "02"
subsystem: dashboard-ui-components
tags: [capture, ui, holesheet, toast, tdd, net-new, presentational]
dependency_graph:
  requires: [captureService, buildDSLPreview, applyFills, HoleMap]
  provides: [HoleSheet, SavedToast]
  affects: [DashboardPage, 13-03-wire-in]
tech_stack:
  added: []
  patterns: [bottom-sheet-dialog, numeric-keypad-grid, presentational-component, named-exports-only, var-color-tokens]
key_files:
  created:
    - src/components/dashboard/HoleSheet.tsx
    - src/components/dashboard/HoleSheet.test.tsx
    - src/components/dashboard/SavedToast.tsx
    - src/components/dashboard/SavedToast.test.tsx
decisions:
  - "HoleSheet does not destructure domain prop: accepted as part of interface contract but unused in rendering (will be forwarded by parent hook in 13-03)"
  - "domain typed as string (not EntryDomain) in HoleSheet to avoid unused-import overhead — EntryType is the only db.ts type needed for buildDSLPreview"
  - "Overlay aria-hidden=true click tested with fireEvent.click (not userEvent) since userEvent v14 handles aria-hidden elements correctly but fireEvent is more explicit for non-interactive elements"
  - "SavedToast owns NO timer: timer/state lives in DashboardPage (wired in 13-03) per RESEARCH §5 pattern"
  - "Keypad decimal guard: single decimal point enforced in handleKeypad handler (no repeat '.' appended)"
metrics:
  duration: "~8 min"
  completed: "2026-06-17T16:55:25Z"
  tasks_completed: 2
  files_changed: 4
---

# Phase 13 Plan 02: HoleSheet + SavedToast UI Components Summary

Net-new presentational components for the tap-to-capture flow: `HoleSheet` (fill-the-hole bottom sheet with amount keypad, presets, text inputs for non-amount holes, and a live DSL preview) and `SavedToast` (role=status "Saved · Undo" toast backed by an `onUndo` prop). Both are prop-driven and import nothing from router or IndexedDB.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 RED | HoleSheet failing tests | a40f152 | src/components/dashboard/HoleSheet.test.tsx |
| 1 GREEN | HoleSheet implementation | 1ce8599 | src/components/dashboard/HoleSheet.tsx |
| 2 RED | SavedToast failing tests | a6d9a71 | src/components/dashboard/SavedToast.test.tsx |
| 2 GREEN | SavedToast implementation | 3ee5e8a | src/components/dashboard/SavedToast.tsx |

## What Was Built

### `src/components/dashboard/HoleSheet.tsx`

Bottom-sheet dialog component accepting `HoleSheetProps`:
- `role="dialog" aria-modal="true" aria-label="Fill in required fields"` — WCAG-compliant modal
- Fixed overlay (`bg-black/40 z-40 aria-hidden`) + bottom-anchored panel (`rounded-t-2xl z-50`)
- `useEffect + ref.focus()` on `isOpen` — focus management on open
- **Amount holes** (key === 'amount'):
  - Big right-aligned amount display
  - Quick-preset buttons `$5 / $10 / $20 / $50` — set fills.amount directly
  - 3×4 keypad grid: keys `1-9`, `.`, `0`, `⌫`; aria-label="Backspace" for `⌫`; single-decimal guard
- **Non-amount holes**: labelled `<input type="text">` with `htmlFor` association
- **Hole ordering**: `orderedHoles = [...holeMap.positional.map(…), ...holeMap.named.map(…)]`
- **Live DSL preview**: `buildDSLPreview(type, applyFills(baseValues, fills))` — same call path as save (no divergence, Pitfall 6 prevention)
- **Save gate**: `disabled` until `orderedHoles.every(h => fills[h.key]?.trim() !== '')`
- All buttons `type="button"`; all colors via `var(--color-*)` tokens; named export only

### `src/components/dashboard/HoleSheet.test.tsx`

12 RTL tests covering all behavior bullets:
- dialog semantics (role, aria-modal, aria-label)
- keypad buttons 1-9, decimal, 0, Backspace
- preset buttons $5/$10/$20/$50
- live preview updates: keypad tap `1→2` yields `"expense 12:food"`; `$20` preset yields `"expense 20:food"`
- Save gate: disabled empty, enabled when filled
- `onSave(fills)` callback with correct value
- `onCancel` from Cancel button and overlay click
- labelled text input for named hole
- multi-hole ordering: positional keypad + named textbox in same sheet

### `src/components/dashboard/SavedToast.tsx`

Purely presentational toast: no timer, no entry state.
- `role="status" aria-live="polite"` — screen-reader announces save without interruption
- Fixed `bottom-6 left-1/2 -translate-x-1/2 z-50`
- `bg-[var(--color-foreground)] text-[var(--color-background)]` — intentional inversion for contrast
- `<span>Saved</span>` + `<button type="button" onClick={onUndo}>Undo</button>`
- Undo button: `underline hover:opacity-80 active:opacity-60 transition-opacity`
- Named export only; zero runtime deps added

### `src/components/dashboard/SavedToast.test.tsx`

5 RTL tests:
- role=status present, aria-live=polite set
- "Saved" text rendered
- Undo button rendered
- `userEvent.click(Undo)` calls `onUndo` exactly once
- component stays mounted without explicit dismissal (confirms no self-timer)

## Deviations from Plan

None — plan executed exactly as written. Both components match RESEARCH §4/§5 spec, all acceptance criteria met on first attempt.

## Verification Results

```
pnpm exec vitest run src/components/dashboard/HoleSheet.test.tsx src/components/dashboard/SavedToast.test.tsx
  Test Files: 2 passed
  Tests:      17 passed (12 HoleSheet + 5 SavedToast)

pnpm exec tsc -b → clean

HoleSheet:
  grep -c 'role="dialog"' HoleSheet.tsx → 1
  grep -c 'aria-modal' HoleSheet.tsx → 1
  grep -c "buildDSLPreview" HoleSheet.tsx → 2 (import + call)
  grep -c "export default" HoleSheet.tsx → 0
  grep -nE "#[0-9a-fA-F]{3,6}|rgb\(" HoleSheet.tsx → (empty)

SavedToast:
  grep -c 'role="status"' SavedToast.tsx → 1
  grep -c "export default" SavedToast.tsx → 0
  grep -nE "#[0-9a-fA-F]{3,6}|rgb\(" SavedToast.tsx → (empty)
```

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns. Both components are purely presentational:
- HoleSheet fills are plain React-controlled strings rendered as text (T-13-02: no eval, no injection surface)
- SavedToast renders only "Saved" + Undo text (T-13-05: no entry data, no PII)
- No new trust boundaries introduced

## Known Stubs

None. Both components are fully implemented per spec. HoleSheet receives `baseValues` and `holeMap` from the parent — those are wired in plan 13-03.

## Self-Check: PASSED

- [x] src/components/dashboard/HoleSheet.tsx exists (222 lines, named export, no default)
- [x] src/components/dashboard/HoleSheet.test.tsx exists (152 lines, 12 tests, all green)
- [x] src/components/dashboard/SavedToast.tsx exists (40 lines, named export, no default)
- [x] src/components/dashboard/SavedToast.test.tsx exists (51 lines, 5 tests, all green)
- [x] Commits: a40f152 (RED HoleSheet), 1ce8599 (GREEN HoleSheet), a6d9a71 (RED SavedToast), 3ee5e8a (GREEN SavedToast)
- [x] Both components: no router/IndexedDB runtime imports; var(--color-*) tokens only
- [x] 17 tests pass; tsc clean

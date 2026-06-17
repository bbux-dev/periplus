---
phase: 13-tap-to-capture-flow
plan: "03"
subsystem: capture-orchestration
tags: [capture, hook, tdd, dashboard, fake-timers, indexeddb]
dependency_graph:
  requires: [captureService, HoleSheet, SavedToast, entriesRepository, parseDSL, ENTRY_FIELDS]
  provides: [useShortcutCapture, DashboardPage-wired]
  affects: [DashboardPage]
tech_stack:
  added: []
  patterns: [useCallback-fire-and-forget, timerRef-stale-closure-prevention, act-async-microtask-drain, toFake-targeted-fake-timers]
key_files:
  created:
    - src/hooks/useShortcutCapture.ts
    - src/hooks/useShortcutCapture.test.ts
  modified:
    - src/pages/DashboardPage.tsx
    - src/pages/DashboardPage.test.tsx
decisions:
  - "vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }) — fakes only the 4 s dismiss timer; leaves setImmediate (Dexie) and MessageChannel (React scheduler) real; avoids Dexie+fake-timer hang and RTL waitFor polling breakage"
  - "Fake-timer tests mock entriesRepository.create via vi.spyOn + mockResolvedValue — Promise.resolve is a microtask (not Dexie timer path) so handleTap chain completes while timers are frozen"
  - "Integration dismiss test: act(async){ element.click(); await Promise.resolve() x3 } — fires click synchronously inside act, drains microtask queue so fire-and-forget handleTap chain completes, then act force-flushes React pending state updates"
  - "timerRef (useRef) holds the dismiss setTimeout ID — avoids stale closure in handleUndo callback that would capture the old toastEntryId"
  - "PITFALL 5: confirm checked BEFORE holes in decision tree — confirm:true shortcuts bypass detectHoles entirely and navigate to /review"
metrics:
  duration: "~40 min"
  completed: "2026-06-17T10:28:00Z"
  tasks_completed: 2
  files_changed: 4
---

# Phase 13 Plan 03: useShortcutCapture Hook + DashboardPage Wiring Summary

`useShortcutCapture` decision-tree hook (confirm → navigate; no holes → direct save + toast; holes → HoleSheet; undo → delete) wired into DashboardPage with full CAP-01/02/03/04 integration test coverage.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 RED | useShortcutCapture failing tests | (in 5c47363) | src/hooks/useShortcutCapture.test.ts |
| 1 GREEN | useShortcutCapture implementation | 5c47363 | src/hooks/useShortcutCapture.ts |
| 2 | DashboardPage wiring + integration tests | ecb2206 | src/pages/DashboardPage.tsx, src/pages/DashboardPage.test.tsx, src/hooks/useShortcutCapture.test.ts |

## What Was Built

### `src/hooks/useShortcutCapture.ts`

Decision-tree orchestrator hook (`useShortcutCapture`) with state: `toastEntryId`, `sheetState`. Handlers: `handleTap`, `handleUndo`, `handleSheetSave`, `handleSheetCancel`.

Decision tree (PITFALL 5: confirm before holes):
1. `parseDSL` → status !== 'ok' || !type → silent no-op
2. `shortcut.confirm` → `buildReviewDraft` → `navigate(/d/{domain}/{type}/review, { state: { draft } })`
3. `detectHoles` → `!hasHoles` → `draftToEntry` → `entriesRepository.create` → `showToast(id)`
4. `detectHoles` → `hasHoles` → `setSheetState`

Toast lifecycle: `showToast` calls `setToastEntryId(id)` + `setTimeout(fn, 4000)` stored in `timerRef` (useRef, not useState). `handleUndo` calls `clearTimeout(timerRef.current)` then `entriesRepository.delete(id)`. `useEffect` cleanup clears timer on unmount.

### `src/hooks/useShortcutCapture.test.ts`

8 unit tests (all green):
- bad template → silent no-op
- `confirm:true` → navigate to /review, no IndexedDB write
- zero-hole save → entry persisted, toastEntryId set, sheetState null
- holed shortcut → sheetState open with correct holeMap, no save
- `handleSheetSave` → merges fills, saves, clears sheet, shows toast
- `handleUndo` → deletes entry, clears toast
- `{}` named-hole → sheetState.holeMap.named contains 'merchant'
- 4 s auto-dismiss → `vi.advanceTimersByTime(4000)` → toastEntryId null

### `src/pages/DashboardPage.tsx`

Added `useShortcutCapture` call after `handleLayoutSelect`. Replaced `onClick={() => { /* TODO Phase 13 */ }}` on `ShortcutRow` with `onClick={() => handleTap(s)}`. Appended before closing div:
- `{toastEntryId && <SavedToast onUndo={handleUndo} />}`
- `{sheetState && <HoleSheet isOpen type=... onSave=handleSheetSave onCancel=handleSheetCancel />}`

### `src/pages/DashboardPage.test.tsx`

6 integration tests in `describe('Phase 13 capture flow')` (all green, 19/19 total):
- CAP-01: zero-hole → entry in IndexedDB, SavedToast visible
- CAP-02: hole → HoleSheet opens, no save; fill and submit → entry saved
- CAP-03 confirm: `confirm:true` → navigate called, no entry in IndexedDB
- CAP-03 undo: toast Undo button → entry deleted, toast gone
- CAP-03 dismiss: 4 s auto-dismiss (see deviation below)
- CAP-04: `{}` named-hole → HoleSheet dialog open; after save, `metadata.merchant !== '{}'`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dexie + vi.useFakeTimers() incompatibility in timer tests**
- **Found during:** Task 1 (hook timer test) and Task 2 (DashboardPage dismiss test)
- **Issue:** `vi.useFakeTimers()` (full) also freezes `setImmediate`, which Dexie uses internally for its promise scheduler. Any `await entriesRepository.create()` call inside fake timers hangs indefinitely.
- **Fix part A:** Changed `vi.useFakeTimers()` to `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })` — targets only the dismiss timer; leaves `setImmediate`, `setInterval`, and `MessageChannel` real.
- **Fix part B:** Mocked `entriesRepository.create` via `vi.spyOn(...).mockResolvedValue(...)` in both timer test contexts. `mockResolvedValue` wraps in `Promise.resolve()` (microtask, not Dexie timer path), so `handleTap` resolves inside frozen timers.
- **Files modified:** src/hooks/useShortcutCapture.test.ts, src/pages/DashboardPage.test.tsx
- **Commit:** ecb2206

**2. [Rule 1 - Bug] findByRole hang in dismiss integration test**
- **Found during:** Task 2 (DashboardPage dismiss test)
- **Issue:** `await screen.findByRole('status')` after `await user.click(...)` hung indefinitely. Root cause: `handleTap` is fire-and-forget from the onClick handler; React's state update (`setToastEntryId`) is scheduled via MessageChannel (macrotask). `waitFor`'s overall-timeout `setTimeout` is fake (never fires to reject), and the polling `setInterval` ran every 50 ms (real) but the DOM never updated because something in the `user.click` + `advanceTimers` path prevented React from flushing.
- **Fix:** Replaced `user.click(btn)` + `findByRole('status')` with `await act(async () => { element.click(); await Promise.resolve() × 3 })`. Firing click synchronously inside `act` + draining the microtask queue three ticks lets the mock `create` resolve, `handleTap` continue, and `setToastEntryId` be called — all before `act` force-flushes React's pending work. After `act`, the toast is visible synchronously.
- **Files modified:** src/pages/DashboardPage.test.tsx
- **Commit:** ecb2206

## Verification Results

```
pnpm exec vitest run src/hooks/useShortcutCapture.test.ts
  Test Files: 1 passed
  Tests: 8 passed

pnpm exec vitest run src/pages/DashboardPage.test.tsx
  Test Files: 1 passed
  Tests: 19 passed

pnpm exec vitest run
  Test Files: 36 passed
  Tests: 407 passed

pnpm exec tsc -b → clean (no output)
```

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns. `useShortcutCapture` calls `entriesRepository.create` and `entriesRepository.delete` — both already existed in the threat model. No new trust boundaries introduced.

## Known Stubs

None. DashboardPage is fully wired: `handleTap` saves entries to IndexedDB, `SavedToast` renders with `onUndo`, `HoleSheet` prompts for missing fields. All integration tests exercise real IndexedDB via fake-indexeddb.

## Self-Check: PASSED

- [x] src/hooks/useShortcutCapture.ts exists (163 lines, named export, no default)
- [x] src/hooks/useShortcutCapture.test.ts exists (225 lines, 8 tests, all green)
- [x] src/pages/DashboardPage.tsx wired (imports useShortcutCapture, HoleSheet, SavedToast)
- [x] src/pages/DashboardPage.test.tsx exists (Phase 13 suite: 6 tests, 19 total, all green)
- [x] Commits: 5c47363 (hook impl), ecb2206 (wiring + tests)
- [x] Full suite: 407/407 green; tsc clean

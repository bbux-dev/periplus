---
phase: 18-active-mode-model-instance-stamping
plan: 01
subsystem: capture
tags: [dexie, dexie-react-hooks, react, indexeddb, capture, metadata]

# Dependency graph
requires:
  - phase: 12-dashboard-shortcut-config
    provides: ShortcutConfig/Layout model + configRepository.activeLayoutRepository pattern
  - phase: 13-shortcut-capture
    provides: draftToEntry single entry-construction site + useShortcutCapture decision tree
  - phase: 16-default-occurred-at
    provides: withDefaultOccurredAt wrapping on the one-tap save paths
provides:
  - ActiveMode type + activeModeRepository (Dexie settings key 'activeMode')
  - useActiveMode() reactive hook (undefined-loading semantics)
  - defaultInstanceLabel(), activateMode(), listModes(config) helpers
  - draftToEntry optional activeMode arg that conditionally stamps metadata.mode/modeLabel
  - all three capture save paths (one-tap, sheet, ReviewPage) stamp mode provenance
affects: [phase-19-active-mode-navigation-ui, mode-switching, capture, reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Active-mode persistence mirrors activeLayoutRepository exactly (settings key, no schema bump, undefined-loading useLiveQuery)"
    - "Conditional metadata stamping in the single draftToEntry construction site (no empty/placeholder keys)"

key-files:
  created:
    - src/services/activeMode.ts
    - src/services/activeMode.test.tsx
  modified:
    - src/services/captureService.ts
    - src/services/captureService.test.ts
    - src/pages/ReviewPage.tsx
    - src/pages/ReviewPage.test.tsx
    - src/hooks/useShortcutCapture.ts
    - src/hooks/useShortcutCapture.test.ts

key-decisions:
  - "Mode is a user-facing concept layered over existing ShortcutConfig layouts — NO Layout→Mode rename; listModes(config) = config.layouts.map(l => l.name)"
  - "draftToEntry stamps mode/modeLabel ONLY when activeMode?.mode is a non-empty string, merging over draft.metadata; writes neither key otherwise (STAMP-01)"
  - "activeMode is a trailing optional 4th arg to draftToEntry; the Phase 16 withDefaultOccurredAt wrap is preserved unchanged"
  - "useActiveMode() mirrors useActiveLayoutName (no default value in useLiveQuery; undefined = loading or none active)"

patterns-established:
  - "Settings-key persistence (no schema version bump) for new reactive single-value state"
  - "Live-query test flush via useCallback-reference change (handleTap/handleSheetSave deps include activeMode)"

requirements-completed: [MODE-01, MODE-02, STAMP-01]

# Metrics
duration: ~20min
completed: 2026-06-18
---

# Phase 18 Plan 01: Active Mode Model + Instance Stamping Summary

**Active-mode data/service layer persisted in Dexie settings with a reactive useActiveMode() hook, plus conditional mode/modeLabel provenance stamping threaded through draftToEntry into all three capture save paths.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-06-18T19:58:00Z
- **Completed:** 2026-06-18T20:03:00Z
- **Tasks:** 3
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments
- New `src/services/activeMode.ts`: `ActiveMode` type, `activeModeRepository` (settings key `activeMode`), reactive `useActiveMode()` hook, `defaultInstanceLabel()`, `activateMode()`, `listModes()` — mirroring the `activeLayoutRepository` pattern exactly (no schema bump, undefined-loading semantics).
- `draftToEntry` gains a trailing optional `activeMode?: ActiveMode | null` that stamps `metadata.mode` + `metadata.modeLabel` ONLY when the mode is a non-empty string, merging over prior `draft.metadata` (STAMP-01 — no empty/placeholder keys).
- `useActiveMode()` wired into `ReviewPage.handleSave` and both `useShortcutCapture` one-tap branches (direct-save + `handleSheetSave`), with `activeMode` added to the relevant `useCallback` deps. The `confirm:true` branch is untouched (it routes to ReviewPage, which stamps on its own save).

## Task Commits

Each task was committed atomically (TDD: test written first, verified RED, then GREEN):

1. **Task 1: activeMode.ts — repository, hook, helpers** - `a59010d` (feat)
2. **Task 2: draftToEntry stamps the active mode** - `dbe73e0` (feat)
3. **Task 3: capture sites pass the active mode** - `41e09f0` (feat)

**Plan metadata:** _(this commit)_ (docs: summary)

## Files Created/Modified
- `src/services/activeMode.ts` - ActiveMode type, activeModeRepository, useActiveMode hook, defaultInstanceLabel/activateMode/listModes helpers (created)
- `src/services/activeMode.test.tsx` - 15 unit tests: repository round-trip, undefined-when-empty, default-label format, activateMode label rules, listModes, reactive hook (created)
- `src/services/captureService.ts` - draftToEntry gains optional activeMode arg + conditional mode/modeLabel stamping
- `src/services/captureService.test.ts` - 6 new stamping tests (stamp-when-active, merge-preserves-prior, no-stamp for undefined/null/empty-mode)
- `src/pages/ReviewPage.tsx` - reads useActiveMode(), passes it as 4th draftToEntry arg in handleSave
- `src/pages/ReviewPage.test.tsx` - 2 new tests: stamped-when-active (preserves prior metadata), not-stamped-when-inactive
- `src/hooks/useShortcutCapture.ts` - reads useActiveMode(), threads it into direct-save + handleSheetSave; activeMode added to both useCallback deps
- `src/hooks/useShortcutCapture.test.ts` - 3 new tests: direct-save stamp, sheet-save stamp, no-stamp-when-inactive

## Decisions Made
- "Mode" stays a user-facing label over the existing layouts — no Layout→Mode rename anywhere. `listModes(config)` simply maps layout names.
- Stamping lives in the single `draftToEntry` construction site so all save paths inherit it consistently and the no-active-mode case writes neither key.
- Mirrored `activeLayoutRepository` / `useActiveLayoutName` exactly for the new persistence (settings key, no schema bump, no default value in `useLiveQuery`).

## Deviations from Plan

None - plan executed exactly as written. All three tasks followed strict TDD (failing test first, then implementation) with one atomic `feat(18-01)` commit each.

## Issues Encountered
- **useLiveQuery async timing in hook tests:** The two `useShortcutCapture` stamping tests initially failed because `useActiveMode()` (a `useLiveQuery`) returns `undefined` on first render and resolves asynchronously — the tap fired before the active mode loaded. Resolved within the test files (not the source) by waiting for the live query to settle: since `handleTap`/`handleSheetSave` are `useCallback`s with `activeMode` in their deps, their references change once the mode loads, so the tests `waitFor` that reference change before tapping. This is a test-harness timing concern; production behavior (dashboard renders, live query resolves, then user taps) is correct. The `Dexie + fake-Date` caveat from the plan was respected where applicable (existing DATE-01 tests fake only `Date`).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The active-mode model, persistence, reactive hook, and capture-path stamping are complete and fully unit-tested — ready for Phase 19 (active-mode navigation/switching UI) to consume `useActiveMode()`, `activateMode()`, and `listModes()`.
- No blockers. No navigation UI was built in this plan (deferred to Phase 19, per the objective).

## Verification
- `pnpm exec vitest run` — **585 passed (45 files)**, no failures (559 baseline + 26 new tests; no regression).
- `pnpm exec tsc -b` — clean (exit 0).
- `pnpm exec vite build` — clean (exit 0); built in 1.33s, PWA precache generated.

## Self-Check: PASSED
- `src/services/activeMode.ts` — FOUND
- `src/services/activeMode.test.tsx` — FOUND
- Commits `a59010d`, `dbe73e0`, `41e09f0` — FOUND

---
*Phase: 18-active-mode-model-instance-stamping*
*Completed: 2026-06-18*

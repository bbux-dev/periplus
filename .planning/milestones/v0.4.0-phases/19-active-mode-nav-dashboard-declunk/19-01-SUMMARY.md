---
phase: 19-active-mode-nav-dashboard-declunk
plan: 01
subsystem: ui
tags: [react, dexie, active-mode, navigation, dashboard, de-clunk]

# Dependency graph
requires:
  - phase: 18-active-mode-model
    provides: activeMode service (useActiveMode, activateMode, defaultInstanceLabel, listModes, activeModeRepository)
  - phase: 13-shortcut-capture
    provides: dashboard capture orchestrator (handleTap/HoleSheet/SavedToast)
provides:
  - Hamburger "Active Mode" switcher with inline label prompt (no window.prompt/confirm)
  - App bar mode · label display via useActiveMode()
  - De-clunked dashboard that renders ONLY the active mode's buttons (LayoutChips switcher removed)
  - Idempotent first-run default-mode activation on the dashboard
affects: [active-mode, dashboard, navigation, settings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Active mode drives dashboard layout: layouts.find(l => l.name === useActiveMode()?.mode) ?? layouts[0]"
    - "Inline menu-driven mode switch (pending mode + label input + Confirm/Cancel) instead of modal/prompt"
    - "Idempotent first-run activation: only activate when activeModeRepository.get() is undefined"

key-files:
  created: []
  modified:
    - src/components/layout/AppShell.tsx
    - src/components/layout/AppShell.test.tsx
    - src/pages/DashboardPage.tsx
    - src/pages/DashboardPage.test.tsx

key-decisions:
  - "Mode switching lives ONLY in the hamburger menu; the dashboard has no switcher in steady state"
  - "LayoutChips component is retained (still used by ManageShortcutsPage); only its dashboard usage was removed"
  - "First-run activation is idempotent and never overwrites an existing active-mode selection"

patterns-established:
  - "App-bar three-column (left/center/right) layout keeps the home button + mode·label + hamburger balanced with truncation"
  - "Active Mode submenu: mode list -> pending selection -> pre-filled label input -> Confirm (activateMode + close) / Cancel (discard)"

requirements-completed: [MODE-03, MODE-04, DASH-04]

# Metrics
duration: ~12min
completed: 2026-06-18
---

# Phase 19 Plan 01: Active-Mode Nav + Dashboard De-clunk Summary

**v0.4.0 de-clunk: mode switching moved into the hamburger menu (with an inline label prompt), the app bar now shows `mode · label`, and the dashboard renders ONLY the active mode's buttons — the on-dashboard LayoutChips switcher is gone.**

## North-star note

The dashboard's steady-state on-screen control count is now LOWER than before: the entire
LayoutChips switcher row (one button per mode + the "+ New" chip) has been removed from the
dashboard. Switching the active mode is still fully reachable — it now lives behind the
hamburger "Active Mode" item, keeping the capture surface focused on the active mode's buttons.

## Performance

- **Duration:** ~12 min
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments
- Added an "Active Mode" item to the AppShell hamburger menu: lists modes (`listModes`), and on
  selection shows an inline label input pre-filled with `defaultInstanceLabel(mode)` plus
  Confirm/Cancel. Confirm calls `activateMode(mode, label)` and closes the menu. No
  `window.prompt`/`window.confirm`.
- App bar now displays `{mode} · {label}` (truncated) via `useActiveMode()`, between the home
  button and the hamburger.
- Dashboard de-clunk: rendered layout is derived from the active MODE
  (`layouts.find(l => l.name === useActiveMode()?.mode) ?? layouts[0]`); the `<LayoutChips>`
  switcher and `handleLayoutSelect` were removed from the dashboard only.
- Idempotent first-run mode activation: the one-shot mount effect activates the first layout as
  the default mode only when no active mode is persisted; it never overwrites an existing selection.
- Preserved all existing AppShell behavior (home button, nav links, nav tree, Escape/outside-close)
  and the dashboard capture orchestrator (handleTap/HoleSheet/SavedToast).

## Task Commits

Each task was committed atomically (TDD: failing test written first, then implementation, squashed
into one Conventional Commit per task per the execution brief):

1. **Task 1: AppShell — Active Mode menu + label prompt + app-bar display** - `c24087d` (feat)
2. **Task 2: DashboardPage de-clunk — only the active mode's buttons** - `1300799` (feat)

## Files Created/Modified
- `src/components/layout/AppShell.tsx` - Active Mode menu section + inline label prompt; three-column
  app bar with `mode · label` display; pending-mode state reset on menu close.
- `src/components/layout/AppShell.test.tsx` - Added RTL coverage: app-bar display, Active Mode control,
  mode list, pre-filled label, Confirm persists + updates bar, Cancel no-op. Existing tests kept green.
- `src/pages/DashboardPage.tsx` - Active-mode-driven layout derivation; removed LayoutChips import +
  render + handleLayoutSelect + useNavigate; idempotent first-run `activateMode`.
- `src/pages/DashboardPage.test.tsx` - Removed obsolete chip-switcher tests (aria-pressed chip,
  "+ New" chip, click-to-switch-persists) and replaced with de-clunk assertions (no switcher chips,
  only active mode's shortcuts render, changing active mode changes rows, first-run persists a default
  mode, idempotent no-overwrite). Updated Phase 13 capture-flow seeding gates from the removed chip to
  the shortcut buttons.

## Verification

- `pnpm exec vitest run` — **45 files, 592 tests, all passing.**
  - **Net test delta: +7** vs. before this plan. AppShell gained 7 new tests (12 → 19).
    DashboardPage stayed at 20 tests: the 4 obsolete chip-switcher tests were intentionally
    replaced by 4 de-clunk/active-mode tests (plus one reworded shortcut-render test), so its
    count is unchanged.
- `pnpm exec tsc -b` — clean (exit 0).
- `pnpm exec vite build` — clean (exit 0); PWA precache generated.
- Acceptance greps:
  - `grep -c activateMode src/components/layout/AppShell.tsx` = 2 (>= 1) ✓
  - `grep -c useActiveMode src/components/layout/AppShell.tsx` = 2 (>= 1) ✓
  - `grep -c LayoutChips src/pages/DashboardPage.tsx` = 0 ✓
  - `grep -c useActiveMode src/pages/DashboardPage.tsx` = 2 (>= 1) ✓
  - `grep -rl LayoutChips src` still includes `ManageShortcutsPage.tsx` ✓ (component retained)
  - No hardcoded colors introduced in AppShell ✓

## Decisions Made
- Kept `LayoutChips.tsx` intact — only removed its dashboard usage — because `ManageShortcutsPage`
  still depends on it.
- Used an inline pending-mode + label-input pattern in the menu rather than any modal/prompt, per the
  design constraints.
- Removed `useNavigate` from DashboardPage (its only use was the LayoutChips `onManage` handler).

## Deviations from Plan

None - plan executed exactly as written. The Phase 13 capture-flow tests' seeding gates were updated
from the now-removed chip (`button "Test"`) to the seeded shortcut buttons; this is a mechanical
consequence of removing the switcher, not a behavior change, and all those tests remain green.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The active-mode model (Phase 18) is now fully surfaced in the UI: switch in the menu, see it in the
  app bar, and the dashboard reflects it. Future phases can build on `useActiveMode()` for
  mode-scoped views without re-introducing an on-dashboard switcher.

---
*Phase: 19-active-mode-nav-dashboard-declunk*
*Completed: 2026-06-18*

---
phase: 14-import-export-config
plan: 02
subsystem: ui
tags: [settings-page, import-export, file-input, dexie, react, heroicons, routing, tdd]

# Dependency graph
requires:
  - phase: 14-01
    provides: buildConfigExportJson, importConfig, triggerDownload (re-export), ImportResult
  - phase: 11-config-model-schema-storage
    provides: useShortcutConfig, configRepository
  - phase: 06-entry-list-detail-export
    provides: EntryListPage export-trigger pattern (analogued)
affects: [DashboardPage (link added), App.tsx (route added)]

provides:
  - SettingsPage (Export JSON + Import JSON UI at /settings)
  - /settings route in App.tsx
  - Dashboard cog link to /settings

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hidden file-input pattern: sr-only <input type=file> triggered by a visible button via useRef.current?.click()"
    - "Async file-handler pattern: async onChange handler calling importConfig, storing ImportResult in useState"
    - "Import result display: success p + role=alert error p, both via React-escaped text nodes (no dangerouslySetInnerHTML)"
    - "configPort mock for UI tests: vi.mock('../services/configPort', keepReal + stub triggerDownload)"

key-files:
  created:
    - src/pages/SettingsPage.tsx
    - src/pages/SettingsPage.test.tsx
  modified:
    - src/App.tsx
    - src/pages/DashboardPage.tsx
    - src/pages/DashboardPage.test.tsx

key-decisions:
  - "Mock configPort (not exportEntries) in SettingsPage.test — SettingsPage imports from configPort, mocking at the direct import source is more explicit and avoids re-export chain uncertainty"
  - "Import file format is raw ShortcutConfig (not ConfigExportEnvelope) — importConfig passes the parsed file directly to migrateConfig, which validates ShortcutConfig structure; tests use makeConfigFile(rawShortcutConfig) accordingly"
  - "DashboardPage.test link count updated 5→6 — adding the Shortcuts Config link is the expected behavioral change; test name updated to document the full set"
  - "No activeLayoutName reset on import — Phase 12 layout derivation (find by name ?? layouts[0]) handles stale persisted name harmlessly"

# Metrics
duration: 10min
completed: 2026-06-17
---

# Phase 14 Plan 02: SettingsPage UI Summary

**SettingsPage at /settings with Export JSON (triggerDownload) + hidden-file-input Import JSON (importConfig → visible success/error) + Dashboard Cog6ToothIcon link wired reactively via useShortcutConfig.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-17
- **Completed:** 2026-06-17
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- `SettingsPage.tsx`: page shell with back button (useBackOrHome), Export JSON button (triggerDownload + buildConfigExportJson), hidden sr-only file input triggered by visible "Import JSON" button, async handleFileChange (importConfig → setImportStatus), success `<p>` and role="alert" error `<p>` — all colors via `var(--color-*)` tokens
- `SettingsPage.test.tsx`: 4 RTL tests passing — renders controls, export trigger (triggerDownload call count + filename + JSON content), valid import success message + Dexie persist, invalid import role="alert" + config unchanged
- `App.tsx`: `<Route path="/settings">` added before catch-all `*`
- `DashboardPage.tsx`: `Cog6ToothIcon` added, `<Link to="/settings">` mirroring existing View-All-Entries Link block style exactly
- `DashboardPage.test.tsx`: link count test updated 5→6; all 19 existing tests still green

## Task Commits

1. **Task 1: SettingsPage with export + file-import UI** - `336a0bd` (feat)
2. **Task 2: Register /settings route + Dashboard cog link** - `68f1aff` (feat)

## Files Created/Modified

- `src/pages/SettingsPage.tsx` — Export + Import UI; 91 lines
- `src/pages/SettingsPage.test.tsx` — 4 RTL tests covering all four behaviors
- `src/App.tsx` — `/settings` route added (1 import + 1 `<Route>`)
- `src/pages/DashboardPage.tsx` — Cog6ToothIcon import + `/settings` Link
- `src/pages/DashboardPage.test.tsx` — link count 5→6

## Decisions Made

- Mocked `'../services/configPort'` (not `'../services/exportEntries'`) in the SettingsPage test — SettingsPage imports from configPort; mocking at the direct consumer's import source is unambiguous
- Import test uses raw `ShortcutConfig` file content (not `ConfigExportEnvelope`) — `importConfig` passes parsed JSON directly to `migrateConfig`, which validates the ShortcutConfig structure with `version` + `layouts` at the top level
- DashboardPage test link-count test updated as a Rule 1 fix (expected behavioral change from adding a link, not a pre-existing bug)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DashboardPage.test.tsx link count assertion updated**
- **Found during:** Task 2
- **Issue:** Adding the Shortcuts Config link increased the Dashboard link count from 5 to 6; the existing test `'renders Quick Capture + 3 domain links + View All Entries (5 total)'` would have failed
- **Fix:** Updated test name and `toHaveLength(5)` → `toHaveLength(6)`
- **Files modified:** `src/pages/DashboardPage.test.tsx`
- **Commit:** `68f1aff`

## Known Stubs

None — SettingsPage is fully wired to `buildConfigExportJson`, `importConfig`, and `useShortcutConfig`. No placeholder data or TODO comments.

## Threat Flags

None — SettingsPage implements T-14-05 (raw File passed to importConfig, no UI-side parsing), T-14-06 (error reason is structural, no user-data echo), T-14-07 (role="alert" via React-escaped text node, no dangerouslySetInnerHTML), and T-14-SC (no new dependencies) as required.

## Verification Results

- `pnpm vitest run src/pages/SettingsPage.test.tsx` — 4/4 tests passed
- `pnpm vitest run src/pages/DashboardPage.test.tsx` — 19/19 tests passed
- `pnpm vitest run src/pages src/components` — 133/133 tests passed
- `pnpm vitest run` (full suite) — 425/425 tests passed
- `pnpm tsc -b` — clean, no errors

## Self-Check: PASSED

- `src/pages/SettingsPage.tsx` — FOUND
- `src/pages/SettingsPage.test.tsx` — FOUND
- Commits `336a0bd` and `68f1aff` — FOUND in git log
- `/settings` route in App.tsx — 1 match (`grep -c`)
- `to="/settings"` in DashboardPage.tsx — 1 match (`grep -c`)
- No hardcoded hex colors in SettingsPage — confirmed (all `var(--color-*)` tokens)

---
*Phase: 14-import-export-config*
*Completed: 2026-06-17*

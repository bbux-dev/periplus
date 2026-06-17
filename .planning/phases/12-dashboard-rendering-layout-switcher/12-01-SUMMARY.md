---
phase: 12-dashboard-rendering-layout-switcher
plan: 1
subsystem: config-data-layer
tags: [config, dexie, hooks, tdd, default-data, persistence]
dependency_graph:
  requires:
    - 11-01 (ShortcutConfig types, SHORTCUT_ICON_MAP, configRepository, db.settings)
    - src/services/dsl/parser.ts (parseDSL, used in tests only)
    - src/services/configValidator.ts (validateShortcutConfig, used in tests only)
  provides:
    - DEFAULT_SHORTCUT_CONFIG (src/config/shortcutConfig.ts)
    - activeLayoutRepository (src/services/configRepository.ts)
    - useActiveLayoutName (src/services/configRepository.ts)
  affects:
    - 12-02 (UI plan that consumes all three exports)
    - 13-* (seeded shortcuts are tap targets for Phase 13 capture flow)
tech_stack:
  added: []
  patterns:
    - Phase 11 configRepository/useLiveQuery pattern mirrored for activeLayoutRepository/useActiveLayoutName
    - TDD RED/GREEN: failing imports → passing tests after constant/exports added
key_files:
  created: []
  modified:
    - src/config/shortcutConfig.ts
    - src/config/shortcutConfig.test.ts
    - src/services/configRepository.ts
    - src/services/configRepository.test.tsx
decisions:
  - "DEFAULT_SHORTCUT_CONFIG is plain inert data — parseDSL is not called at module load; validity asserted in tests only (consistent with T-12-01 accept disposition)"
  - "ACTIVE_LAYOUT_KEY = 'activeLayoutName' stored in db.settings as a separate key from 'shortcutConfig' — no schema version bump, no db.ts modification"
  - "useActiveLayoutName has NO default (mirrors useShortcutConfig); undefined = Dexie opening or no selection saved; callers fall back to layouts[0]"
  - "DSL templates with quoted tags (?tags=\"work\") confirmed parseable: unquote() strips surrounding quotes, no comma-splitting inside quotes"
metrics:
  duration: ~8min
  completed: 2026-06-17
  tasks_completed: 2
  files_modified: 4
---

# Phase 12 Plan 1: DEFAULT_SHORTCUT_CONFIG + Active Layout Persistence Summary

**One-liner:** Seed constant with 3 layouts/10 shortcuts (all DSL-valid, all icons in allow-list) plus reactive activeLayoutRepository and useActiveLayoutName hook, both backed by the existing Dexie settings key/value store.

## What Was Built

### Task 1: DEFAULT_SHORTCUT_CONFIG (DASH-03)

Added `export const DEFAULT_SHORTCUT_CONFIG: ShortcutConfig` to `src/config/shortcutConfig.ts` after `resolveShortcutIcon`, preceded by section divider. Contains:

- **DayToDay** (HomeIcon): Coffee (BoltIcon, `expense 5:coffee`), Groceries (ShoppingCartIcon, `expense :groceries`), Lunch (BanknotesIcon, `expense :food`), New Movie (FilmIcon, `movie :`)
- **Travel** (GlobeAltIcon): Trip Expense (BanknotesIcon, `expense :food`), Taxi (TruckIcon, `expense :transit`), Place Visited (MapPinIcon, `place :`)
- **WorkTrip** (BriefcaseIcon): Work Meal (BanknotesIcon, `expense :meals?tags="work"`), Work Taxi (TruckIcon, `expense :transit?tags="work"`), Client Dinner (BriefcaseIcon, `expense :dining?tags="work"`)

Three new describe blocks in `shortcutConfig.test.ts`:
1. `DEFAULT_SHORTCUT_CONFIG DSL validity / every default dslTemplate parses without error` — nested loop asserting `parseDSL(dslTemplate).status !== 'error'` with layout+shortcut+template named in the failure message
2. `DEFAULT_SHORTCUT_CONFIG DSL validity / every default icon key is present in SHORTCUT_ICON_MAP` — loop over layout.icon + shortcut.icon with `.toHaveProperty(key)`
3. `DEFAULT_SHORTCUT_CONFIG DSL validity / passes validateShortcutConfig (structural schema)` — `result.ok === true`

### Task 2: activeLayoutRepository + useActiveLayoutName (DASH-02)

Appended new section to `src/services/configRepository.ts`:
- `const ACTIVE_LAYOUT_KEY = 'activeLayoutName'`
- `export const activeLayoutRepository { get(): Promise<string | undefined>; put(name: string): Promise<void> }` — reads/writes `db.settings` under `ACTIVE_LAYOUT_KEY`, casts `row?.value as string | undefined`
- `export function useActiveLayoutName(): string | undefined` — `useLiveQuery(() => activeLayoutRepository.get(), [])`, NO default

Six new describe blocks / tests in `configRepository.test.tsx`:
- `activeLayoutRepository: get / returns undefined before any write`
- `activeLayoutRepository: put and get round-trip / stores a name and returns it`
- `activeLayoutRepository: put and get round-trip / put is an upsert — overwrites existing name`
- `useActiveLayoutName reactive hook / returns undefined before any write (renders the loading branch)`
- `useActiveLayoutName reactive hook / re-renders reactively after put() is called inside act()`
- `useActiveLayoutName reactive hook / re-renders with the correct name after a second put() (upsert)`

## Verification

- `pnpm vitest run src/config src/services` — 193 tests passing (15 test files)
- `pnpm tsc -b` — clean
- `git diff --stat src/services/db.ts` — no changes

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. This plan is a pure data layer; no UI rendering.

## Threat Flags

None. All writes use code constants or layout names selected from the stored config; no free-form user input in this plan. Consistent with T-12-01 and T-12-02 accept dispositions.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (GREEN) | 52727bc | feat(12-01): add DEFAULT_SHORTCUT_CONFIG seed constant with DSL + icon + schema validity tests (DASH-03) |
| 2 (GREEN) | 9495346 | feat(12-01): add activeLayoutRepository + useActiveLayoutName with round-trip and reactive tests (DASH-02) |

## Self-Check: PASSED

- [x] `src/config/shortcutConfig.ts` exists and exports `DEFAULT_SHORTCUT_CONFIG`
- [x] `src/services/configRepository.ts` exports `activeLayoutRepository` and `useActiveLayoutName`
- [x] 193 tests passing including all 9 new tests
- [x] `pnpm tsc -b` clean
- [x] `db.ts` unchanged
- [x] Commits 52727bc and 9495346 present in git log

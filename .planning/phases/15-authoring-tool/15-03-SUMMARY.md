---
phase: 15-authoring-tool
plan: "03"
subsystem: pages/ui/components
tags: [tdd, authoring-tool, icon-picker, shortcut-form, edit-01, edit-03, edit-04]
dependency_graph:
  requires:
    - src/services/templateValidator.ts
    - src/services/shortcutMutations.ts
    - src/services/configRepository.ts
    - src/services/configValidator.ts
    - src/config/shortcutConfig.ts
    - src/components/dashboard/LayoutChips.tsx
    - src/pages/ManageShortcutsPage.tsx
    - src/App.tsx
  provides:
    - IconPicker (allow-list grid over SHORTCUT_ICON_MAP)
    - ShortcutFormPage (create/edit with live EDIT-04 validation)
    - /manage/shortcut route
    - EDIT-03 omnibar "Save as Shortcut" entry point
    - EDIT-03 "+ New" chip activated on Dashboard
  affects:
    - src/App.tsx (new route)
    - src/pages/QuickCapturePage.tsx (new button)
    - src/components/dashboard/LayoutChips.tsx (onManage? prop)
    - src/pages/DashboardPage.tsx (useNavigate + onManage)
tech_stack:
  added: []
  patterns:
    - tdd-red-green
    - location-state-prefill (Pitfall-4 null-guard)
    - fresh-read-validate-put write path
    - inline-computed-validation (templateResult not in useState)
    - optional-prop-conditional-render (onManage?)
    - allow-list-grid (IconPicker SHORTCUT_ICON_MAP)
key_files:
  created:
    - src/components/dashboard/IconPicker.tsx
    - src/pages/ShortcutFormPage.tsx
    - src/pages/ShortcutFormPage.test.tsx
  modified:
    - src/App.tsx
    - src/pages/QuickCapturePage.tsx
    - src/components/dashboard/LayoutChips.tsx
    - src/pages/DashboardPage.tsx
    - src/pages/DashboardPage.test.tsx
    - src/pages/QuickCapturePage.test.tsx
decisions:
  - "onManage prop made optional (onManage?: () => void) — ManageShortcutsPage not in Task 3 file list; hiding chip on manage page is correct UX (redundant with Add Shortcut button)"
  - "selectedLayout state initializes from prefill.layoutName ?? '' then derives effectiveSelectedLayout = selectedLayout || activeLayoutName || layouts[0]?.name — handles Dexie loading race and user-explicit-choice"
  - "userEvent.type '{}' escaped as '{{}}' — userEvent 14 treats { } as keyboard descriptor syntax"
  - "canSaveAsShortcut = parsed.type !== null && parsed.status !== 'error' — matches validateTemplate predicate; slightly broader than canConfirm (allows holes)"
metrics:
  duration: "~18min"
  completed: "2026-06-17"
  tasks: 3
  files: 10
requirements: [EDIT-01, EDIT-03, EDIT-04]
---

# Phase 15 Plan 03: ShortcutFormPage + EDIT-03 Entry Points Summary

**One-liner:** Accessible IconPicker grid, ShortcutFormPage with live EDIT-04 validateTemplate gate and prefill from omnibar/edit-state, plus activated Dashboard "+New" chip and QuickCapturePage "Save as Shortcut" button.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | IconPicker component (allow-list grid) | 7088541 | src/components/dashboard/IconPicker.tsx |
| 2 | ShortcutFormPage + /manage/shortcut route — RED→GREEN | 6d36875 (RED), faae77f (GREEN) | src/pages/ShortcutFormPage.tsx, src/pages/ShortcutFormPage.test.tsx, src/App.tsx |
| 3 | EDIT-03 entry points (omnibar + chip) — RED→GREEN | 6b693e9 (RED), d1d44e1 (GREEN) | src/pages/QuickCapturePage.tsx, src/components/dashboard/LayoutChips.tsx, src/pages/DashboardPage.tsx, src/pages/DashboardPage.test.tsx, src/pages/QuickCapturePage.test.tsx |

## What Was Built

### IconPicker.tsx

Accessible, dep-free grid over `Object.keys(SHORTCUT_ICON_MAP)` (21 keys).

- Props: `{ value: string | undefined; onChange: (key: string) => void }`
- Each button: `type="button"`, `aria-label={key.replace('Icon','')}`, `aria-pressed={value===key}`, `onClick={() => onChange(key)}`
- Selected: `bg-[var(--color-primary)] / text-[var(--color-primary-foreground)]` — mirrors LayoutChips selected style
- Unselected: `border-[var(--color-border)] hover:bg-[var(--color-muted)]`
- `focus-visible:outline-2 focus-visible:outline-offset-2` keyboard navigation
- Threat T-15-03 mitigated: icon selection constrained to SHORTCUT_ICON_MAP; `resolveShortcutIcon` fallback for unknown keys at render time

### ShortcutFormPage.tsx (183 lines)

Single-screen form for create/edit (EDIT-01) with live EDIT-04 validation.

**Prefill sources (priority order):**

| Source | Fields pre-filled | Title |
|--------|-------------------|-------|
| `state.shortcut` | name, icon, dslTemplate, confirm | "Edit Shortcut" |
| `state.dslTemplate` | dslTemplate only | "New Shortcut" (EDIT-03) |
| null (direct nav) | all empty | "New Shortcut" (Pitfall 4) |

**Key implementation details:**
- `const prefill = state ?? {}` — Pitfall 4 null-guard before any field access
- `const templateResult = validateTemplate(dslTemplate)` — computed inline each render (not state)
- `const canSave = name.trim()!=='' && dslTemplate.trim()!=='' && templateResult.valid`
- `effectiveSelectedLayout = selectedLayout || activeLayoutName || layouts[0]?.name` — handles Dexie loading race
- Error shown via `FormField error` prop (renders `<p role="alert">`) — no separate state for live errors
- `handleSave`: `await configRepository.get()` → `addShortcut`/`updateShortcut` → `validateShortcutConfig` → `put` → `navigate('/manage')`
- Loading gate: `if (config === undefined) return <p>Loading...</p>`

**Threat mitigations applied:**
- T-15-01: `validateTemplate` gates Save; `validateShortcutConfig` before every `put`
- T-15-03: icon via `IconPicker` (allow-list only)
- T-15-04: all config strings as React text nodes; no `dangerouslySetInnerHTML`
- T-15-05: `handleSave` reads FRESH via `configRepository.get()`, not hook closure

### ShortcutFormPage.test.tsx (8 tests, 206 lines)

RTL tests using fake-indexeddb + MemoryRouter with `/manage` probe:

| Test | Coverage |
|------|----------|
| null state → no crash | Pitfall 4 |
| EDIT-03: omnibar prefills dslTemplate | EDIT-03 |
| edit mode prefills name+dslTemplate, "Edit Shortcut" title | EDIT-01 edit |
| malformed template → alert + Save disabled | EDIT-04 |
| hole 'expense :food' → Save enabled | EDIT-04 |
| hole 'expense 5:food?merchant={}' → Save enabled | EDIT-04 |
| create → navigates to /manage; fresh get() shows shortcut | EDIT-01 create |
| icon click → icon key persisted on save | IconPicker |

### App.tsx

Added `import { ShortcutFormPage }` and `<Route path="/manage/shortcut" element={<ShortcutFormPage />} />` after `/manage`, before catch-all.

### QuickCapturePage.tsx (EDIT-03)

- `const canSaveAsShortcut = parsed.type !== null && parsed.status !== 'error'`
- `const handleSaveAsShortcut = () => navigate('/manage/shortcut', { state: { dslTemplate: text } })`
- `<Button variant="secondary" onClick={handleSaveAsShortcut} disabled={!canSaveAsShortcut}>Save as Shortcut</Button>` after "Review & Save"

### LayoutChips.tsx (EDIT-03)

- `onManage?: () => void` added as optional prop
- `+ New` chip: active button shown only when `onManage !== undefined` (hidden on ManageShortcutsPage where it's redundant)
- Removed `disabled` + `cursor-default`; changed color from `text-[var(--color-border)]` to `text-[var(--color-foreground)]`

### DashboardPage.tsx (EDIT-03)

- `import { Link, useNavigate }` (added useNavigate)
- `const navigate = useNavigate()` inside component
- `onManage={() => navigate('/manage')}` passed to LayoutChips

## TDD Gate Compliance

- Task 2: RED commit `6d36875` (import error — ShortcutFormPage.tsx absent) → GREEN `faae77f` (8 tests pass) ✓
- Task 3: RED commit `6b693e9` (6 tests failing — chip disabled, button absent) → GREEN `d1d44e1` (31 tests pass) ✓

## Verification

- `pnpm exec vitest run src/pages/ShortcutFormPage.test.tsx src/pages/DashboardPage.test.tsx src/pages/QuickCapturePage.test.tsx` — 39 tests passed
- `pnpm exec vitest run` — full suite: 497 tests, 42 files, all green
- `pnpm tsc -b` — clean, no type errors
- grep confirms `ShortcutFormPage.tsx` has no `dangerouslySetInnerHTML` in JSX (only in JSDoc comment)
- grep confirms `validateTemplate(` usage at line 84 of ShortcutFormPage.tsx
- App.tsx contains `path="/manage/shortcut"` at line 39

## Deviations from Plan

### Auto-adjusted: `onManage` made optional

**Found during:** Task 3 — LayoutChips `onManage` prop addition

**Issue:** Plan specifies `onManage: () => void` (required), but ManageShortcutsPage (from Plan 15-02) is not in Task 3's file list and calls `LayoutChips` without `onManage`. Making it required would cause a TypeScript error there.

**Fix:** Typed as `onManage?: () => void`. The `+ New` chip is hidden (not rendered) when `onManage` is `undefined` — the ManageShortcutsPage already has its own "Add Shortcut" button, so the hidden chip is correct UX.

**Files modified:** `src/components/dashboard/LayoutChips.tsx`

**Impact:** ManageShortcutsPage unchanged; DashboardPage behavior identical; `+New` chip does not appear on the ManageShortcutsPage (appropriate).

### Auto-adjusted: `userEvent.type` `{}` escape

**Found during:** Task 2 test for hole template `'expense 5:food?merchant={}'`

**Issue:** `userEvent.type` v14 treats `{` and `}` as keyboard descriptor syntax — typing `'expense 5:food?merchant={}'` throws "Expected key descriptor but found '}'".

**Fix:** Escaped as `'expense 5:food?merchant={{}}'` in the test — `{{` = literal `{`, `}}` = literal `}`.

**Files modified:** `src/pages/ShortcutFormPage.test.tsx`

## Known Stubs

None. All functionality is fully wired:
- ShortcutFormPage writes to IndexedDB via real configRepository
- LayoutChips onManage navigates to real route
- QuickCapturePage "Save as Shortcut" passes real DSL text as state

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced beyond what the threat model accounts for. All STRIDE threats registered in the plan (T-15-01, T-15-03, T-15-04, T-15-05) are mitigated in the implementation.

## Self-Check

Files created:
- src/components/dashboard/IconPicker.tsx: FOUND
- src/pages/ShortcutFormPage.tsx: FOUND
- src/pages/ShortcutFormPage.test.tsx: FOUND

Files modified:
- src/App.tsx contains path="/manage/shortcut": FOUND
- src/pages/QuickCapturePage.tsx: FOUND
- src/components/dashboard/LayoutChips.tsx: FOUND
- src/pages/DashboardPage.tsx: FOUND

Commits:
- 7088541 (IconPicker): FOUND
- 6d36875 (RED test): FOUND
- faae77f (GREEN form+route): FOUND
- 6b693e9 (RED entry points): FOUND
- d1d44e1 (GREEN entry points): FOUND

## Self-Check: PASSED

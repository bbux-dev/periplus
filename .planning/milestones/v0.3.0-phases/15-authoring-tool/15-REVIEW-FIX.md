---
phase: 15
fixed_at: 2026-06-17T12:44:50Z
review_path: .planning/phases/15-authoring-tool/15-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 7
skipped: 0
deferred: 1
status: all_fixed
---

# Phase 15: Code Review Fix Report

**Fixed at:** 2026-06-17T12:44:50Z
**Source review:** .planning/phases/15-authoring-tool/15-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (WR-01, WR-02, WR-03, WR-04, IN-01, IN-02, IN-03, IN-04)
- Fixed: 7 (WR-01, WR-02, WR-03, WR-04, IN-01, IN-02+IN-04 combined, IN-03 as deferred comment)
- Skipped: 0

## Fixed Issues

### WR-01: renameLayout throws "already exists" when oldName === newName

**Files modified:** `src/services/shortcutMutations.ts`, `src/services/shortcutMutations.test.ts`
**Commit:** 8feaa67
**Applied fix:** Added early return `if (oldName === newName) return { ...config }` before the
duplicate-name guard in `renameLayout`, mirroring the `updateShortcut` self-name guard. Added
unit test `renameLayout(config, 'DayToDay', 'DayToDay')` asserting result equals input config
without throwing.

### WR-02: edit-mode layout change throws "not found" in updateShortcut

**Files modified:** `src/pages/ShortcutFormPage.tsx`, `src/pages/ShortcutFormPage.test.tsx`
**Commit:** 3c500c7
**Applied fix:** Implemented Option A (cross-layout move). When `isEditing && prefill.layoutName &&
effectiveSelectedLayout !== prefill.layoutName`, the handler now calls
`deleteShortcut(current, prefill.layoutName, originalName)` then
`addShortcut(afterDelete, effectiveSelectedLayout, shortcut)`. Same-layout edits continue to use
`updateShortcut`. New creates continue to use `addShortcut`. Added `ShortcutConfig` type import
and `deleteShortcut` to the import list. Added RTL test that moves a shortcut from 'Alpha' to
'Beta', asserts Alpha has 0 shortcuts and Beta has 1 after save.

### IN-02 / IN-04: missing layout guard in canSave and no defense-in-depth after fresh read

**Files modified:** `src/pages/ShortcutFormPage.tsx`, `src/pages/ShortcutFormPage.test.tsx`
**Commit:** 3c500c7 (committed together with WR-02 — same file)
**Applied fix:** Added `effectiveSelectedLayout !== ''` to the `canSave` predicate. Added
defense-in-depth re-check immediately after the async `configRepository.get()` in `handleSave`
that bails early if `!validateTemplate(dslTemplate.trim()).valid || name.trim() === '' ||
effectiveSelectedLayout === ''`.

### WR-03: LayoutChips container div missing role="group"

**Files modified:** `src/components/dashboard/LayoutChips.tsx`
**Commit:** 816c670
**Applied fix:** Added `role="group"` to the container `<div aria-label="Layout switcher">`,
mirroring the pattern used in `IconPicker`.

### WR-04: IconPicker key.replace('Icon', '') not anchored to end

**Files modified:** `src/components/dashboard/IconPicker.tsx`
**Commit:** 06bd65e
**Applied fix:** Changed `key.replace('Icon', '')` to `key.replace(/Icon$/, '')` so the suffix
replacement only fires when "Icon" appears at the end of the key string.

### IN-01: misleading canSaveAsShortcut comment in QuickCapturePage

**Files modified:** `src/pages/QuickCapturePage.tsx`
**Commit:** 3883630
**Applied fix:** Replaced the inaccurate comment "Broader than canConfirm: allows status='ok' OR
'ambiguous' as long as type is resolved" with an accurate description: the condition requires
`type !== null && status !== 'error'`, which is type-resolved with no parse errors — and is
actually stricter than just `status !== 'error'` because it also requires type resolution.

### IN-03: shortcut delete has no confirmation prompt (deferred — comment added)

**Files modified:** `src/pages/ManageShortcutsPage.tsx`
**Commit:** 7a8b367
**Applied fix:** IN-03 is deferred per spec instructions. Added a code comment above
`handleDeleteShortcut` explaining that immediate deletion without a confirmation dialog is
intentional for v1, with a note that a UX confirmation dialog is deferred to a future iteration.

## Skipped Issues

None.

---

## Final Build Status

- `pnpm tsc -b`: clean (0 errors)
- `pnpm vitest run`: 499 tests passed across 42 test files

---

_Fixed: 2026-06-17T12:44:50Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

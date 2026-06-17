---
phase: 15-authoring-tool
reviewed: 2026-06-17
depth: deep
files_reviewed: 13
findings:
  critical: 0
  high: 0
  warning: 4
  info: 5
  total: 9
status: findings
fixed:
  - WR-01 (renameLayout self-name no-op guard — was throwing "already exists" on unchanged name)
  - WR-02 (edit-mode cross-layout move — delete-from-original + add-to-target instead of failing updateShortcut)
  - WR-03 (LayoutChips container role="group" so aria-label is announced)
  - WR-04 (IconPicker aria-label uses anchored /Icon$/ regex)
  - IN-01 (corrected misleading canSaveAsShortcut comment)
  - IN-02 + IN-04 (handleSave defense-in-depth re-check after fresh read; canSave guards empty layout)
  - IN-05 (added renameLayout same-name unit test)
deferred:
  - IN-03 (shortcut delete confirmation prompt — UX enhancement; immediate delete intentional for v1, comment added)
---

# Phase 15: Code Review Report

**Status:** findings (0 Critical, 0 High; 4 Warnings, 5 Info). All warnings + cheap info fixed; IN-03 deferred.

## Summary

Authoring tool (EDIT-01..04) is correct on its security-critical axes: no eval, no
`dangerouslySetInnerHTML`, IconPicker constrained to the `SHORTCUT_ICON_MAP` allow-list, every
write path follows read-fresh → pure helper → `validateShortcutConfig` → `put`, and routes are
registered before the catch-all. The EDIT-04 predicate (`status !== 'error' && type !== null`,
holes valid) is correctly implemented and applied at the save gate — no malformed template can be
persisted through the UI.

## Warnings (all FIXED)

### WR-01 — `renameLayout` threw on same-name (real bug)
The duplicate-name guard fired on the layout's own name, so saving a rename without changing it
showed a confusing "already exists" error. Fixed with an early `if (oldName === newName) return
{ ...config }` (mirrors `updateShortcut`'s self-name guard) + a unit test.

### WR-02 — Edit-mode layout selector couldn't move a shortcut between layouts (real gap)
Changing the layout `<select>` in edit mode made `updateShortcut` throw "not found". Fixed via
Option A (cross-layout move): delete from original layout + add to target. RTL test added.

### WR-03 — `LayoutChips` container had `aria-label` without a role
Fixed: added `role="group"` (consistent with IconPicker) so the label is announced.

### WR-04 — IconPicker `replace('Icon','')` not anchored
Fixed: `replace(/Icon$/, '')`.

## Info

- **IN-01 (FIXED)** Corrected the inaccurate "broader than canConfirm" comment in QuickCapturePage.
- **IN-02 + IN-04 (FIXED)** `handleSave` re-checks template/name/layout validity after the fresh
  `configRepository.get()`; `canSave` also guards `effectiveSelectedLayout !== ''`.
- **IN-03 (DEFERRED)** No confirmation prompt on shortcut delete — intentional for v1 (comment
  added); revisit if accidental deletes prove painful.
- **IN-05 (FIXED)** Added the `renameLayout(config,'X','X')` unit test that would have caught WR-01.

## Security Assessment — PASS

- Templates validated by `parseDSL` only (no eval/Function/dynamic import).
- Every config mutation runs `validateShortcutConfig` before `configRepository.put`; handlers
  read fresh to avoid stale-closure overwrites.
- IconPicker offers only `SHORTCUT_ICON_MAP` keys; config strings rendered as React text.
- Routes registered before the catch-all; `db.ts` untouched; no new dependencies.

---
phase: 15-authoring-tool
plan: "02"
subsystem: pages/ui
tags: [tdd, crud-page, layout-management, shortcut-reorder, edit-01, edit-02]
dependency_graph:
  requires:
    - src/services/shortcutMutations.ts
    - src/services/configRepository.ts
    - src/services/configValidator.ts
    - src/components/dashboard/LayoutChips.tsx
    - src/components/ui/Button.tsx
  provides:
    - ManageShortcutsPage (layout CRUD + shortcut delete/reorder)
    - /manage route
  affects:
    - src/App.tsx (route registration)
tech_stack:
  added: []
  patterns:
    - fresh-read-validate-put write path
    - local-state layout selector (no activeLayoutRepository.put)
    - tdd-red-green
    - LayoutChips reuse for manage-view tab switcher
    - conditional inline rename (renameTarget state)
key_files:
  created:
    - src/pages/ManageShortcutsPage.tsx
    - src/pages/ManageShortcutsPage.test.tsx
  modified:
    - src/App.tsx
decisions:
  - "selectedLayoutName initialized as undefined; effectiveSelectedName derived from config+persistedLayoutName for graceful fallback on rename/delete"
  - "renameLayout handler updates selectedLayoutName when effectiveSelectedName===oldName to avoid stale-selection drift"
  - "deleteLayout handler switches selection to layouts[0] of the post-delete config"
  - "LayoutChips used as-is (no onManage prop yet — that is Phase 15-03)"
  - "/manage/shortcut route NOT registered in this plan — owned by 15-03"
metrics:
  duration: "~12min"
  completed: "2026-06-17"
  tasks: 2
  files: 3
requirements: [EDIT-01, EDIT-02]
---

# Phase 15 Plan 02: ManageShortcutsPage Summary

**One-liner:** ManageShortcutsPage with layout CRUD (create/rename/delete) + shortcut delete/reorder via up/down buttons, all behind the fresh-read→validate→put write path, with 11 RTL tests green.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | ManageShortcutsPage (layout CRUD + shortcut delete/reorder) — RED→GREEN | 042918c | src/pages/ManageShortcutsPage.tsx, src/pages/ManageShortcutsPage.test.tsx |
| 2 | Register /manage route in App.tsx | 4011f65 | src/App.tsx |

## What Was Built

### ManageShortcutsPage.tsx (247 lines)

Single-screen management UI for layout CRUD + shortcut list operations.

**Page structure:**
- Standard page shell: back button (useBackOrHome('/')), h1 "Manage Shortcuts", loading gate (`if (config === undefined) return <p>Loading...</p>`), error alert (`role="alert"`)
- LayoutChips tab switcher: local `selectedLayoutName` state (undefined → falls back to persisted/first layout); does NOT write to `activeLayoutRepository`
- Shortcut list for the selected layout: icon preview (`resolveShortcutIcon`), name text node, ChevronUp/DownIcon move buttons (disabled at bounds, `aria-label="Move {name} up/down"`), PencilIcon edit (navigates to `/manage/shortcut` with state), TrashIcon delete; Add Shortcut button at bottom
- Layout management section: list each layout with inline rename (text input + Save/Cancel shown via `renameTarget` state) and delete button disabled when `layouts.length === 1`; New layout form (text input + Create button)

**Write path (every handler, T-15-02/05):**
```typescript
const current = await configRepository.get()  // fresh read — not hook value
if (!current) return
const next = <helper>(current, ...)            // pure helper — throws on error
const vr = validateShortcutConfig(next)       // defense-in-depth
if (!vr.ok) { setError(vr.reason); return }
await configRepository.put(vr.config)
```

**Threat mitigations applied:**
- T-15-02: validateShortcutConfig precedes every configRepository.put (5/5 handlers)
- T-15-04: all config strings rendered as React text nodes; no dangerouslySetInnerHTML
- T-15-05: handlers read FRESH via configRepository.get(), not the useShortcutConfig hook value

### ManageShortcutsPage.test.tsx (200 lines)

11 RTL tests with fake-indexeddb + MemoryRouter:

| Test | Coverage |
|------|----------|
| renders heading after config loads | page shell / loading gate |
| creates layout → chip appears | EDIT-02 create |
| renames layout → chip name changes | EDIT-02 rename |
| delete disabled when 1 layout | EDIT-02 delete guard |
| deletes layout → chip removed | EDIT-02 delete |
| moves shortcut up → persists | EDIT-02 reorder (configRepository.get assertion) |
| moves shortcut down → persists | EDIT-02 reorder |
| move-up disabled at index 0, move-down at last | EDIT-02 boundary |
| deletes shortcut → row removed | EDIT-01 delete |
| duplicate layout name → role="alert" | error path |
| Add Shortcut → navigates to /manage/shortcut | navigation |

### App.tsx

Added `import { ManageShortcutsPage } from './pages/ManageShortcutsPage'` and `<Route path="/manage" element={<ManageShortcutsPage />} />` with Phase 15 comment, inserted before the `path="*"` catch-all.

## TDD Gate Compliance

- Task 1: RED commit (import error — ManageShortcutsPage.tsx did not exist) → GREEN (11 tests pass) ✓

## Verification

- `pnpm exec vitest run src/pages/ManageShortcutsPage.test.tsx` — 11 tests passed
- `pnpm exec vitest run` — full suite: 484 tests, 41 files, all green
- `pnpm tsc -b` — clean, no type errors
- grep confirms `validateShortcutConfig` precedes every `configRepository.put` (5 handler pairs)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All layout CRUD and shortcut list operations are fully wired through shortcutMutations helpers and configRepository. The page is functionally complete for EDIT-01 and EDIT-02.

Note: the `/manage/shortcut` navigation target (ShortcutFormPage) does not yet exist — it is created in Plan 15-03. Until then, clicking Edit or Add Shortcut navigates to a 404/not-found route. This is expected and scoped to wave 3.

## Threat Flags

None. No new network endpoints, auth paths, or trust boundaries introduced. All user-facing string surfaces are React text nodes (no innerHTML). Config writes are gated by validateShortcutConfig.

## Self-Check: PASSED

- src/pages/ManageShortcutsPage.tsx: FOUND
- src/pages/ManageShortcutsPage.test.tsx: FOUND
- src/App.tsx contains `path="/manage"`: FOUND
- Commit 042918c: FOUND
- Commit 4011f65: FOUND

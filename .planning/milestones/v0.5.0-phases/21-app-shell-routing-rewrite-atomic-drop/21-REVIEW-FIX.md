---
phase: 21-app-shell-routing-rewrite-atomic-drop
fixed_at: 2026-06-19T08:33:00Z
review_path: .planning/phases/21-app-shell-routing-rewrite-atomic-drop/21-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 21: Code Review Fix Report

**Fixed at:** 2026-06-19
**Source review:** `.planning/phases/21-app-shell-routing-rewrite-atomic-drop/21-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (CR-01, WR-01 through WR-04, IN-01 through IN-03)
- Fixed: 8
- Skipped: 0

## Fixed Issues

### CR-01: TripHomePage loading guard race eliminated

**Files modified:** `src/pages/TripHomePage.tsx`, `src/pages/TripHomePage.test.tsx`
**Commit:** f8c1dc0
**Applied fix:** Replaced the two independent `useLiveQuery` subscriptions (`dbReady`
from `db.settings.count()` and `useActiveMode()`) with a single `useLiveQuery` call
whose async callback reads `activeModeRepository.get()` and returns `{ ready: true, mode }`.
The default `{ ready: false, mode: undefined }` fires synchronously so no flash occurs.
Guards now check `!result.ready` for the skeleton and `!result.mode || result.mode.mode !== 'trip'`
for the redirect. Removed unused `db` and `useActiveMode` imports. Updated test comment
to reflect `{ ready: false, mode: undefined }` default (all three test cases continue to pass
unchanged).

> **Note:** The objective brief instructed NOT to use the reviewer's simpler "drop dbReady"
> suggestion (which would make `undefined` the loading sentinel for both "loading" and "no
> mode" states, causing a no-trip user to loop forever in the skeleton). The single-query
> `{ ready, mode }` approach is used instead.

### WR-01 + IN-03: CreateTripPage double-submit protection + disabled state

**Files modified:** `src/pages/CreateTripPage.tsx`
**Commit:** f8c1dc0
**Applied fix:** Added `const [saving, setSaving] = useState(false)`. Handler guards against
re-entry (`if (!name.trim() || saving) return`), sets `saving(true)` before the async call,
and resets in a `finally` block. Button carries `disabled={saving || !name.trim()}` and
`aria-disabled` mirror, covering both the in-flight and empty-input cases. Button text
changes to 'Saving…' while in flight.

### WR-02: CreateTripPage form semantics

**Files modified:** `src/pages/CreateTripPage.tsx`
**Commit:** f8c1dc0
**Applied fix:** Wrapped the input and Save button in `<form onSubmit={(e) => { e.preventDefault(); void handleSave() }} className="flex flex-col gap-4">`. Button changed to `type="submit"` (click handler removed). Enter key now submits on all browsers.

### WR-03: AppShell focus restoration on Escape

**Files modified:** `src/components/layout/AppShell.tsx`
**Commit:** f8c1dc0
**Applied fix:** Added `const toggleRef = useRef<HTMLButtonElement>(null)` alongside existing
`wrapperRef`. Escape keydown handler now calls `toggleRef.current?.focus()` after `setOpen(false)`.
`ref={toggleRef}` added to the hamburger button.

### WR-04 + IN-02: AppShell aria-controls + aria-haspopup

**Files modified:** `src/components/layout/AppShell.tsx`
**Commit:** f8c1dc0
**Applied fix (Option B):** `aria-haspopup="true"` added unconditionally. `aria-controls` is
now applied conditionally via spread (`{...(open ? { 'aria-controls': 'app-nav-menu' } : {})}`),
so the attribute is only present when the `<nav id="app-nav-menu">` exists in the DOM.

### IN-01: activeMode.ts stale comment

**Files modified:** `src/services/activeMode.ts`
**Commit:** f8c1dc0
**Applied fix:** Removed the dangling `configRepository.ts` cross-reference from the block
comment at lines 8-10. Replaced with a self-sufficient description: "Pattern: undefined return
means 'Dexie is still opening OR no mode has been set'. Callers MUST handle undefined — do NOT
provide a default value to useLiveQuery here."

---

## Post-fix validation

| Check | Result |
|-------|--------|
| `npx tsc -b --noEmit` | clean (no errors) |
| `npx vite build` | success (388 modules, no warnings) |
| `npx vitest run` | 286/286 tests passed (24 test files) |

---

_Fixed: 2026-06-19_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

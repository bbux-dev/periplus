---
phase: 13-tap-to-capture-flow
fixed_at: 2026-06-17T10:50:00Z
review_path: .planning/phases/13-tap-to-capture-flow/13-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 7
skipped: 3
status: partial
---

# Phase 13: Code Review Fix Report

**Fixed at:** 2026-06-17
**Source review:** .planning/phases/13-tap-to-capture-flow/13-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 10
- Fixed: 7 (CR-01, WR-01, WR-02, WR-03, WR-04, IN-02, IN-03)
- Deferred: 3 (WR-05, IN-01, IN-04)

Final state: `pnpm tsc -b` clean, `pnpm vitest run` 412/412 passed.

---

## Fixed Issues

### CR-01: HoleSheet save gate accepts lone `.` as valid amount fill

**Files modified:** `src/components/dashboard/HoleSheet.tsx`, `src/components/dashboard/HoleSheet.test.tsx`
**Commit:** d61dd27
**Applied fix:** Replaced the `allFilled` one-liner with an `isValidFill` helper that requires
`!isNaN(parseFloat(v)) && isFinite(n)` for amount holes and non-empty trim for others.
Added two new tests: lone `.` keeps Save disabled; `.5` enables it and onSave fires with `{amount:'.5'}`.

---

### WR-01: detectHoles double-reports a key when positional field has HOLE_TOKEN value

**Files modified:** `src/services/captureService.ts`, `src/services/captureService.test.ts`
**Commit:** a631e51
**Applied fix:** After computing `positional` and `named`, added `namedDeduped = named.filter(k => !positional.includes(k))` and returned `namedDeduped` instead of `named`. Keys that appear in both (e.g. `expense :{}` → `category` in positional AND named) are kept only in positional.
Added test: `detectHoles('expense', {category:'{}'})` → `named=[]`, `positional` contains both `amount` and `category`, `category` appears exactly once.

---

### WR-02: buildDSLPreview does not escape `"` inside quoted named-param values

**Files modified:** `src/services/captureService.ts`, `src/services/captureService.test.ts`
**Commit:** 0b2b7db
**Applied fix:** In the `.map` inside `buildDSLPreview`, compute `escaped = v.replace(/\\/g,'\\\\').replace(/"/g,'\\"')` and use `escaped` (not `v`) inside the quoted branch. Unquoted values are left unchanged.
Added tests: `merchant='say "hello"'` emits `merchant="say \"hello\""` and backslash in quoted value is doubled.

---

### WR-03: HoleSheet.domain prop declared required but never used inside component

**Files modified:** `src/components/dashboard/HoleSheet.tsx`, `src/components/dashboard/HoleSheet.test.tsx`, `src/pages/DashboardPage.tsx`
**Commit:** e0ef187
**Applied fix:** Removed `domain: string` from `HoleSheetProps` interface, removed the JSDoc comment referring to it, removed `domain={sheetState.domain}` from the call site in `DashboardPage.tsx`, and removed `domain: 'expenditures' as const` from the `baseProps` fixture and two inline render calls in `HoleSheet.test.tsx`.

---

### WR-04: handleUndo dismisses toast before delete completes

**Files modified:** `src/hooks/useShortcutCapture.ts`
**Commit:** 1d5c4fd
**Applied fix:** Restructured `handleUndo` to: (1) guard `if (!id) return` (double-undo / undo-after-dismiss safety), (2) `await entriesRepository.delete(id)` inside try, (3) `setToastEntryId(null)` only on success. On catch, logs the error and intentionally keeps the toast visible so the user can retry.
**Status:** fixed: requires human verification (logic reordering — semantic change in async flow).

---

### IN-02: cleanValues called twice in confirm:false branch of handleTap

**Files modified:** `src/hooks/useShortcutCapture.ts`
**Commit:** 5afe283
**Applied fix:** Reordered the two lines so `const clean = cleanValues(parsed.values)` is computed before `detectHoles`. This eliminates the explicit redundant second call; `detectHoles` still calls `cleanValues` internally but that is unavoidable without an API change.

---

### IN-03: CAP-04 test missing `expect(entries[0].amount).toBe(5)` assertion

**Files modified:** `src/pages/DashboardPage.test.tsx`
**Commit:** ffc0e24
**Applied fix:** Added `expect(entries[0].amount).toBe(5)` before the `metadata.merchant` assertion in the CAP-04 integration test to catch regressions where `baseValues.amount` is silently dropped during the hole-fill save path.

---

## Deferred Issues

### WR-05: handleSheetSave create failure leaves HoleSheet open with no user-visible error

**File:** `src/hooks/useShortcutCapture.ts`
**Reason:** Deferred — needs a new `saveError` state exposed from the hook and a banner/toast in `HoleSheet`. Out of scope for this polish pass.
**Original issue:** If `entriesRepository.create` throws, the sheet stays open but the user sees no error — only a console log. Same pattern exists in the direct-save path.
**Mitigation applied:** Added `// WR-05 (deferred): ...` comments at both catch sites (commit 68fd31b) to document the gap.

---

### IN-01: HoleSheet.isOpen always true at call site — early return is dead code

**File:** `src/components/dashboard/HoleSheet.tsx`
**Reason:** Deferred as cosmetic — the `isOpen` guard pattern is harmless and removing it (along with the associated `useEffect`) would touch the component more broadly than the current fix scope allows.
**Original issue:** `DashboardPage` renders `HoleSheet` conditionally (`{sheetState && ...}`), so `isOpen` is always `true` when mounted; `if (!isOpen) return null` is unreachable.

---

### IN-04: CAP-03 dismiss test relies on fixed microtask yield count

**File:** `src/pages/DashboardPage.test.tsx`
**Reason:** Deferred — test still passes (4 yields work today). Switching to `waitFor` would be a test-refactor; the existing comment already documents the fragility.
**Original issue:** Three `await Promise.resolve()` yields hardcoded to drain the async chain — brittle if `handleTap` gains additional `await` points.

---

_Fixed: 2026-06-17_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

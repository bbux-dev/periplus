---
phase: 01-foundation-app-shell
fixed_at: 2026-06-15T11:39:00Z
review_path: .planning/phases/01-foundation-app-shell/01-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-06-15T11:39:00Z
**Source review:** .planning/phases/01-foundation-app-shell/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (Warnings only; Info findings excluded per scope)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Stale-value closure causes missed increments/decrements on rapid clicks

**Files modified:** `src/components/Counter.tsx`
**Commit:** 03cc4a8
**Applied fix:** Replaced direct `db.counter.put({ id: 1, value: value + 1 })` with a Dexie
read-modify-write transaction (`db.transaction('rw', db.counter, async () => { ... })`) for both
`increment` and `decrement`. The new value is derived from `db.counter.get(1)` inside the
transaction, so rapid clicks cannot clobber each other via a stale React render snapshot.

---

### WR-02: Unhandled promise rejections from fire-and-forget IndexedDB writes

**Files modified:** `src/components/Counter.tsx`
**Commit:** 27ae96c
**Applied fix:** Wrapped each transaction call with `void ...transaction(...).catch((err) => { console.error('Counter increment/decrement failed:', err) })`. This converts silent unhandled promise rejections into console-logged errors. Combined naturally with WR-01's transaction approach.

---

### WR-03: Button variant/size maps typed as `Record<string, string>` — TypeScript cannot catch invalid values

**Files modified:** `src/components/ui/Button.tsx`
**Commit:** f69b887
**Applied fix:** Removed the explicit `Record<string, string>` annotation from `variantClasses` and
`sizeClasses` and appended `as const`. `keyof typeof variantClasses` now resolves to
`'primary' | 'secondary' | 'ghost'` and `keyof typeof sizeClasses` to `'sm' | 'md' | 'lg' | 'icon'`,
making invalid values a compile-time error. No callers were affected (Counter uses `variant="ghost"`
and `size="icon"`, both valid keys). TypeScript confirmed clean with `tsc -b`.

---

### WR-04: `focus-visible:ring-2` without a ring color — focus indicator may be invisible

**Files modified:** `src/components/ui/Button.tsx`
**Commit:** de9f5c9
**Applied fix:** Added `focus-visible:ring-[var(--color-primary)]` alongside the existing
`focus-visible:ring-2` class. `--color-primary` is defined in `src/index.css` `@theme` block as
`hsl(222, 89%, 40%)`. The keyboard focus ring now uses the project's own design token, satisfying
WCAG 2.4.7.

---

## Final Verification

All three checks ran against `main` after fast-forward of all four commits:

| Check | Result |
|-------|--------|
| `tsc -b` | exit 0, no errors |
| `vite build` | exit 0, 378 modules, built in 1.31s |
| `vitest run` | 14/14 tests passed across 4 test files |

---

_Fixed: 2026-06-15T11:39:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

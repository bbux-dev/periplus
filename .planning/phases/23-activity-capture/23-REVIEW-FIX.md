---
phase: 23-activity-capture
fixed_at: 2026-06-19T13:22:00Z
review_path: .planning/phases/23-activity-capture/23-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 23: Code Review Fix Report

**Fixed at:** 2026-06-19T13:22:00Z
**Source review:** .planning/phases/23-activity-capture/23-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: StarRating keyboard navigation is anchored to the focused button, not the current value

**Files modified:** `src/components/ui/StarRating.tsx`, `src/components/ui/StarRating.test.tsx`
**Commit:** 9dd3dbd
**Applied fix:** Removed the `n` parameter from `handleKeyDown` and replaced `n ± 1` arithmetic
with `value ± 1`. Updated `onKeyDown` binding from the lambda `(e) => handleKeyDown(e, n)` to
the bare reference `handleKeyDown`. Updated keyboard nav tests to use value-based scenarios
(value=3 ArrowRight → 4, value=2 ArrowLeft → 1) and added two clamping boundary tests
(value=5 ArrowRight → 5, value=1 ArrowLeft → 0).

---

### WR-02: Rating `<label htmlFor="activity-rating">` points to a non-existent element ID

**Files modified:** `src/pages/ActivityFormPage.tsx`
**Commit:** 9dd3dbd
**Applied fix:** Replaced the `<div>/<label htmlFor="activity-rating">` wrapper with
`<fieldset className="flex flex-col gap-1 border-0 p-0 m-0">/<legend>` (option A from the
review). The orphan `htmlFor` reference is gone; the group relationship is now carried by
the fieldset/legend semantic.

---

### WR-03: `aria-pressed` only marks the exact selected star; cumulative fill is invisible to screen readers

**Files modified:** `src/components/ui/StarRating.tsx`
**Commit:** 9dd3dbd
**Applied fix:** Changed the static `aria-label="Rating"` on the group `<div>` to a dynamic
expression: `value > 0 ? \`Rating: ${value} of 5 stars\` : 'Rating: not set'`. Screen readers
now announce the current overall value from the group element, removing the ambiguity caused
by only the exact-match star having `aria-pressed="true"`.

---

### WR-04: `console.error` left in production save path

**Files modified:** `src/pages/ActivityFormPage.tsx`
**Commit:** 9dd3dbd
**Applied fix:** Wrapped the `console.error('ActivityFormPage save failed:', err)` call in
`if (import.meta.env.DEV)`. The `errors._form` user-facing message is still set unconditionally;
the log only fires in local development.

---

### IN-01: Unknown URL slug silently coerces to the "Other" form with no user feedback

**Files modified:** `src/pages/ActivityFormPage.tsx`
**Commit:** 9dd3dbd
**Applied fix:** Added a `import.meta.env.DEV`-gated `console.warn` immediately after
`canonicalType` is resolved:
`if (import.meta.env.DEV && type && canonicalType === 'Other' && type !== 'other') { console.warn(...) }`
This catches slug drift during development with no user-facing change and no production noise.

---

## Verification

- `npx tsc -b`: clean (no output)
- `npx vite build`: success (726 modules, built in 1.49s)
- `npx vitest run`: 320 tests passed across 29 test files (including 2 new boundary tests
  and 2 updated keyboard nav tests in StarRating.test.tsx)

---

_Fixed: 2026-06-19T13:22:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

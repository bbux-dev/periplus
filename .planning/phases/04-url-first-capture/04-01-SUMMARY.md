---
phase: 04-url-first-capture
plan: "01"
subsystem: ui
tags: [react, tailwind, accessibility, rtl, vitest, form-primitives]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Button.tsx + cn.ts pattern to mirror (var(--color-*) tokens, no forwardRef)

provides:
  - Input primitive: ref-as-prop, cn-styled, full InputHTMLAttributes forwarding
  - FormField primitive: label/input htmlFor-id link, aria-invalid, aria-describedby, role=alert, helpText

affects: [04-02, 04-03, 04-04, 04-05, 05-manual-entry]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "React 19 ref-as-prop (no forwardRef): ref typed as Ref<T> in interface, destructured directly"
    - "FormField aria pattern: htmlFor/id link, aria-invalid={!!error || undefined}, aria-describedby to error/help id"
    - "cn error override: cn(error && 'border-red-500 focus-visible:ring-red-500', className)"

key-files:
  created:
    - src/components/ui/Input.tsx
    - src/components/ui/Input.test.tsx
    - src/components/ui/FormField.tsx
    - src/components/ui/FormField.test.tsx
  modified: []

key-decisions:
  - "aria-invalid set to !!error || undefined — falsy case omits attribute entirely rather than rendering aria-invalid='false'"
  - "FormField error border applied via cn(error && 'border-red-500 ...) passed as className to Input — no wrapper div style"

patterns-established:
  - "Input.tsx: function component, InputHTMLAttributes<HTMLInputElement> + ref?: Ref<HTMLInputElement>, cn() for class merge, no forwardRef"
  - "FormField.tsx: wraps Input; label htmlFor matches Input id; error paragraph gets role=alert and id={id}-error; help paragraph gets id={id}-help"

requirements-completed: [SETUP-05]

# Metrics
duration: 4min
completed: 2026-06-15
---

# Phase 04 Plan 01: Input + FormField UI Primitives Summary

**Accessible Input and FormField form primitives (React 19 ref-as-prop, Tailwind v4 cn tokens, RTL-tested htmlFor/id + aria-invalid/aria-describedby) backing the Phase 4 capture/review forms.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-15T21:32:53Z
- **Completed:** 2026-06-15T21:36:XX Z
- **Tasks:** 2 (TDD: 4 commits — 2 RED + 2 GREEN)
- **Files modified:** 4 created

## Accomplishments

- `Input` primitive mirrors `Button.tsx` exactly: function component, `InputHTMLAttributes` spread, `cn()` with `var(--color-*)` tokens, `h-10`, focus-visible ring, disabled styles, `ref` as plain prop (React 19, no `forwardRef`).
- `FormField` composes `Input` with accessible `<label htmlFor={id}>`, `aria-invalid={!!error || undefined}`, `aria-describedby` pointing at the error or help paragraph ID, `role="alert"` on the error paragraph — `getByLabelText` works.
- 9 new RTL tests pass green (5 Input + 4 FormField); full suite grew from 106 to 115 with no regressions; `tsc -b` and `vite build` succeed clean.

## Task Commits

1. **Task 1 RED: Input.test.tsx** — `5310558` (test)
2. **Task 1 GREEN: Input.tsx** — `b4b28d7` (feat)
3. **Task 2 RED: FormField.test.tsx** — `d7919df` (test)
4. **Task 2 GREEN: FormField.tsx** — `c5683de` (feat)

## Files Created/Modified

- `src/components/ui/Input.tsx` — Input primitive; ref-as-prop, cn-merged Tailwind classes
- `src/components/ui/Input.test.tsx` — 5 RTL tests: renders textbox, value/onChange, placeholder, disabled, className merge
- `src/components/ui/FormField.tsx` — FormField primitive; label+Input composition, aria attrs, error/help paragraphs
- `src/components/ui/FormField.test.tsx` — 4 RTL tests: getByLabelText, prop forwarding, aria-invalid+role=alert, helpText aria-describedby

## Decisions Made

- `aria-invalid={!!error || undefined}` — omits the attribute entirely when no error (vs. `aria-invalid="false"` which some AT may interpret differently). Test asserts `not.toHaveAttribute('aria-invalid', 'true')` which passes when attribute is absent.
- Error border applied as `cn(error && 'border-red-500 focus-visible:ring-red-500', className)` passed as `className` to `Input` — keeps FormField logic minimal and leverages existing cn-merge.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `Input` and `FormField` are ready for consumption by `CaptureUrlPage` (04-02) and `ReviewPage` (04-03/04-04).
- SETUP-05 satisfied. No blockers.

---
*Phase: 04-url-first-capture*
*Completed: 2026-06-15*

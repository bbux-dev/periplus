---
phase: 01-foundation-app-shell
plan: "02"
subsystem: ui-primitives + data-layer
tags: [cn, tailwind-merge, clsx, button, dexie, indexeddb, vitest, tdd, fake-indexeddb]

# Dependency graph
requires:
  - 01-01 (Vite scaffold + Tailwind v4 @theme tokens + fake-indexeddb harness)
provides:
  - cn helper (clsx + tailwind-merge) at src/components/ui/cn.ts
  - Button primitive (variant/size Record lookup) at src/components/ui/Button.tsx
  - Dexie LifeLogDB v1 counter store at src/services/db.ts
  - Unit tests: cn.test.tsx (6 tests), db.test.ts (3 tests) — all green
affects:
  - 01-03 (Counter UI + WelcomePage import cn, Button, and db)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "cn = twMerge(clsx(inputs)): single function, imports ClassValue from clsx"
    - "Button: variantClasses + sizeClasses Record<string,string>, var(--color-*) theme tokens (Tailwind v4 form)"
    - "LifeLogDB extends Dexie; version(1).stores({ counter: 'id' }); plain key not ++id"
    - "db.counter.put({id:1, value:N}) upserts the fixed-key counter row"
    - "TDD cycle: test(RED) commit then feat(GREEN) commit per task"
    - "db.test.ts: beforeEach calls db.delete() + db.open() to reset fake-indexeddb state"

key-files:
  created:
    - src/components/ui/cn.ts
    - src/components/ui/Button.tsx
    - src/components/ui/cn.test.tsx
    - src/services/db.ts
    - src/services/db.test.ts
  modified: []

key-decisions:
  - "cn.test.tsx extension (not .ts): Button render tests use JSX — TypeScript only allows JSX in .tsx files; plan specified .ts which would cause a TS compile error. Auto-fixed to .tsx."
  - "Button.tsx uses var(--color-*) tokens directly (Tailwind v4 form), not hsl(var(...)) (v3 form)"
  - "LifeLogDB version(1) defines only counter store; entries/settings deferred to Phase 2 version(2)"

# Metrics
duration: 2min
completed: "2026-06-15"
---

# Phase 01 Plan 02: cn + Button + Dexie Counter Store Summary

**clsx+tailwind-merge cn helper, Button primitive with var(--color-*) variant tokens, and Dexie LifeLogDB counter store with plain-key id=1 upsert — all TDD-green against fake-indexeddb and @testing-library/react**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-15T18:22:11Z
- **Completed:** 2026-06-15T18:24:01Z
- **Tasks:** 2 (both TDD: RED + GREEN each)
- **Files created:** 5

## Accomplishments

- Created `src/components/ui/cn.ts`: exports `cn(...inputs: ClassValue[]): string` using `twMerge(clsx(inputs))`
- Created `src/components/ui/Button.tsx`: exports `Button` with `variantClasses` and `sizeClasses` Record lookups; references `var(--color-*)` Tailwind v4 theme tokens; spreads native button props via `{...props}`; merges className with `cn()`
- Created `src/components/ui/cn.test.tsx`: 6 tests — cn merge/falsy cases + Button variant/size/onClick/aria-label/defaults
- Created `src/services/db.ts`: exports `db = new LifeLogDB()` — Dexie subclass with `counter!: EntityTable<Counter,'id'>`, `version(1).stores({ counter: 'id' })`
- Created `src/services/db.test.ts`: 3 tests — create row, upsert overwrites, single-row invariant
- Full suite: `npx vitest run` → 9 tests passed (2 files); `tsc -b && vite build` → exit 0

## Task Commits

| Task | Type | Hash | Description |
|------|------|------|-------------|
| Task 1 RED | test | 77e7c6f | add failing tests for cn helper and Button primitive |
| Task 1 GREEN | feat | 733ffc2 | implement cn helper and Button primitive (SETUP-03) |
| Task 2 RED | test | 00324ff | add failing tests for Dexie counter store |
| Task 2 GREEN | feat | 753da01 | implement Dexie counter store (DEMO-01 data layer) |

## TDD Gate Compliance

| Task | RED commit | GREEN commit | Status |
|------|------------|--------------|--------|
| Task 1 (cn + Button) | 77e7c6f (test) | 733ffc2 (feat) | PASS |
| Task 2 (Dexie store) | 00324ff (test) | 753da01 (feat) | PASS |

Both tasks completed the full RED→GREEN cycle. No REFACTOR step required (code was already clean post-GREEN).

## Files Created/Modified

- `/home/bbux/git/life-log/src/components/ui/cn.ts` — `cn` class composer export
- `/home/bbux/git/life-log/src/components/ui/Button.tsx` — `Button` primitive export
- `/home/bbux/git/life-log/src/components/ui/cn.test.tsx` — 6 unit tests (cn + Button)
- `/home/bbux/git/life-log/src/services/db.ts` — `db` Dexie singleton export
- `/home/bbux/git/life-log/src/services/db.test.ts` — 3 unit tests (counter store)

## Decisions Made

- `cn.test.tsx` extension used (plan said `.ts`): JSX in test requires `.tsx`; `.ts` would cause TypeScript error. Auto-fixed per Rule 1.
- Button uses `var(--color-primary)` token form (Tailwind v4), not `hsl(var(--color-primary))` (v3 form).
- `version(1)` in LifeLogDB defines only `counter` store — `entries` and `settings` belong to Phase 2's `version(2)` block.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used cn.test.tsx instead of cn.test.ts**
- **Found during:** Task 1 RED phase (planning test file creation)
- **Issue:** Plan frontmatter listed `cn.test.ts` but the test body uses JSX (`<Button ... />`). TypeScript only permits JSX syntax in `.tsx` files; attempting to compile a `.ts` file with JSX produces: `TS17004: Cannot use JSX unless the '--jsx' flag is provided`. The build gate `npx tsc -b` would have failed.
- **Fix:** Created the test file as `cn.test.tsx` instead of `cn.test.ts`. All other plan requirements are met identically.
- **Files modified:** `src/components/ui/cn.test.tsx` (name only; content as planned)
- **Commit:** 77e7c6f (RED), 733ffc2 (GREEN)

## Known Stubs

None — all modules are fully implemented leaf units with no hardcoded placeholder values, TODO comments, or empty returns.

## Self-Check: PASSED

All 5 created files exist on disk. All 4 task commits (77e7c6f, 733ffc2, 00324ff, 753da01) found in git log. Full test suite green (9/9). Build gate clean (tsc -b exits 0, vite build exits 0).

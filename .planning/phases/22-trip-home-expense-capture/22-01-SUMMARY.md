---
phase: 22-trip-home-expense-capture
plan: "01"
subsystem: config
tags: [currency, formatting, constants, utility]
dependency_graph:
  requires: []
  provides:
    - "src/config/money.ts → formatUSD(n: number): string"
    - "src/config/expenseCategories.ts → EXPENSE_CATEGORIES as const, ExpenseCategory type"
  affects:
    - "Plan 22-02: ExpenseSheet imports EXPENSE_CATEGORIES"
    - "Plan 22-03: TripHomePage imports formatUSD"
    - "Phase 24: category-grouped report imports EXPENSE_CATEGORIES"
tech_stack:
  added: []
  patterns:
    - "Intl.NumberFormat('en-US', currency/USD) module-level singleton"
    - "Math.round(n*100)/100 pre-round IEEE-754 float guard"
    - "as const tuple for readonly typed union extraction"
key_files:
  created:
    - src/config/money.ts
    - src/config/money.test.ts
    - src/config/expenseCategories.ts
  modified: []
decisions:
  - "formatUSD pre-rounds via Math.round(n*100)/100 before Intl.NumberFormat — prevents sub-cent display artifacts from IEEE-754 float arithmetic (Pitfall 4)"
  - "EXPENSE_CATEGORIES lives in src/config (not co-located inside ExpenseSheet) so Phase 24 report can import it without pulling in a React component"
  - "No default exports — named exports only, consistent with src/config module style"
metrics:
  duration: "~2 min"
  completed: "2026-06-19"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 22 Plan 01: formatUSD + EXPENSE_CATEGORIES Summary

**One-liner:** Float-safe `formatUSD` via `Intl.NumberFormat` + `Math.round` guard, and `EXPENSE_CATEGORIES` 8-item const tuple as the single source of truth for expense category names and ordering.

## Tasks Completed

| # | Name | Type | Commit | Files |
|---|------|------|--------|-------|
| 1 | formatUSD currency formatter + float-safety tests | feat (TDD) | 28b398a | src/config/money.ts, src/config/money.test.ts |
| 2 | EXPENSE_CATEGORIES shared constant + type | feat | dc71e4f | src/config/expenseCategories.ts |

## Verification Results

- `npx vitest run src/config/money.test.ts` — 5/5 green (zero, basic, thousands separator, 10.10+5.20 float, 15.299...999 float)
- `npx vitest run` (full suite) — 291/291 passed across 25 test files
- `npx tsc -b` — clean (no errors)
- `money.ts` — 0 import statements; `Math.round` guard present; `export function formatUSD` present
- `expenseCategories.ts` — all 8 strings confirmed; `as const` present; `export type ExpenseCategory` present; 0 React/component imports

## Deviations from Plan

None — plan executed exactly as written.

## TDD Gate Compliance

- RED commit: `28b398a` (test file created first; failed with module-not-found error as expected)
- GREEN commit: `28b398a` (implementation + tests committed together after all 5 tests passed)
- REFACTOR: not needed — implementation is minimal and clean

## Known Stubs

None.

## Threat Flags

None. `formatUSD` crosses no network boundaries; `EXPENSE_CATEGORIES` is a pure compile-time constant.

## Self-Check: PASSED

- `src/config/money.ts` — FOUND
- `src/config/money.test.ts` — FOUND
- `src/config/expenseCategories.ts` — FOUND
- Task 1 commit 28b398a — FOUND
- Task 2 commit dc71e4f — FOUND

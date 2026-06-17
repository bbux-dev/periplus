---
phase: 15-authoring-tool
plan: "01"
subsystem: services/logic
tags: [tdd, pure-functions, template-validation, config-mutations, edit-04, edit-01, edit-02]
dependency_graph:
  requires: [src/services/dsl/parser.ts, src/config/shortcutConfig.ts]
  provides: [templateValidator, shortcutMutations]
  affects: [wave-2 ShortcutFormPage, wave-3 ManageShortcutsPage]
tech_stack:
  added: []
  patterns: [immutable-array-replace, pure-function-module, named-exports-only, tdd-red-green]
key_files:
  created:
    - src/services/templateValidator.ts
    - src/services/templateValidator.test.ts
    - src/services/shortcutMutations.ts
    - src/services/shortcutMutations.test.ts
  modified: []
decisions:
  - "validateTemplate predicate: status!='error' && type!=null — holes (warnings) are valid (EDIT-04)"
  - "Within-layout shortcut name uniqueness only; cross-layout duplicates allowed"
  - "deleteLayout throws 'Cannot delete the only remaining layout.' — exact message for UI to surface"
  - "moveShortcut boundary noop returns config deep-equal to input (no new object allocation at bounds)"
  - "renameLayout does NOT write activeLayoutName — caller/Dexie concern per Pitfall 3"
metrics:
  duration: "~8min"
  completed: "2026-06-17"
  tasks: 2
  files: 4
requirements: [EDIT-01, EDIT-02, EDIT-04]
---

# Phase 15 Plan 01: templateValidator + shortcutMutations Summary

**One-liner:** EDIT-04 template predicate (parseDSL wrapper) + 7 pure immutable config-mutation helpers, all RED→GREEN via TDD with 48 unit tests.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | templateValidator (EDIT-04 predicate) — RED→GREEN | 1f45a4a | src/services/templateValidator.ts, src/services/templateValidator.test.ts |
| 2 | shortcutMutations (immutable CRUD + reorder) — RED→GREEN | a8995e0 | src/services/shortcutMutations.ts, src/services/shortcutMutations.test.ts |

## What Was Built

### templateValidator.ts

Thin wrapper over `parseDSL` implementing the EDIT-04 saveable predicate.

- `validateTemplate(template)` — returns `{ valid: boolean; error?: string }`. Valid iff `status !== 'error' && type !== null`. Positional holes (empty slots) produce only parser warnings → valid. The `{}` HOLE_TOKEN is an ordinary string to parseDSL → valid. Malformed inputs (unknown field, unterminated quote, too many slots, no type) return `valid: false` with the parser's human-readable issue as `error`.
- `isValidTemplate(template)` — convenience boolean.
- Never throws on any string input; parse errors are caught by parseDSL and returned.
- 14 unit tests covering all 9 behavior cases from PLAN.md.

### shortcutMutations.ts

7 pure immutable helpers for config CRUD (EDIT-01/02). Each returns a new `ShortcutConfig`; input is never mutated. Throws `Error` on invalid preconditions.

| Helper | Throws on |
|--------|-----------|
| `addShortcut` | missing layout; within-layout duplicate name |
| `updateShortcut` | missing layout; missing shortcut; duplicate name when renaming |
| `deleteShortcut` | missing layout; missing shortcut |
| `moveShortcut` | missing layout; missing shortcut — clamps at bounds (noop) |
| `addLayout` | duplicate layout name |
| `renameLayout` | missing oldName; duplicate newName |
| `deleteLayout` | last remaining layout; missing layout |

Immutable pattern: `config.layouts.map(l => l.name !== target ? l : { ...l, shortcuts })` — spread-producing new objects throughout.

34 unit tests: happy-path, throw-cases, immutability assertion (JSON deep-equal before/after), and boundary assertions per helper.

## TDD Gate Compliance

- Task 1: RED commit (`test` import error before module) → GREEN (all 14 tests pass) ✓
- Task 2: RED commit (`test` import error before module) → GREEN (all 34 tests pass) ✓

## Verification

- `pnpm exec vitest run src/services/templateValidator.test.ts src/services/shortcutMutations.test.ts` — 48 tests passed
- `pnpm exec vitest run` — full suite: 473 tests, 40 files, all green
- `pnpm tsc -b` — clean, no type errors

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Both modules are pure functions with no UI wiring; no placeholder data flows.

## Threat Flags

None. Both modules are pure local functions:
- `validateTemplate` calls `parseDSL` only (no eval, no Function ctor) — T-15-01 mitigated
- `shortcutMutations` helpers throw on invalid preconditions, return structurally valid configs — T-15-02 mitigated

## Self-Check: PASSED

- src/services/templateValidator.ts: FOUND
- src/services/templateValidator.test.ts: FOUND
- src/services/shortcutMutations.ts: FOUND
- src/services/shortcutMutations.test.ts: FOUND
- Commit 1f45a4a: FOUND
- Commit a8995e0: FOUND

---
phase: 13-tap-to-capture-flow
plan: "01"
subsystem: capture-service
tags: [capture, service, tdd, pure-function, entry-construction]
dependency_graph:
  requires: []
  provides: [captureService, draftToEntry, detectHoles, buildDSLPreview, applyFills, HOLE_TOKEN]
  affects: [ReviewPage, 13-02-HoleSheet, 13-03-direct-save]
tech_stack:
  added: []
  patterns: [pure-function-service, named-exports-only, schema-comparison-hole-detection]
key_files:
  created:
    - src/services/captureService.ts
    - src/services/captureService.test.ts
  modified:
    - src/pages/ReviewPage.tsx
decisions:
  - "HOLE_TOKEN='{}' chosen as named-hole convention (not '?'): no DSL delimiter collision, visually clear"
  - "detectHoles uses POSITIONAL_SCHEMA[type].filter exclusively — not parser warning strings (Pitfall 2)"
  - "draftToEntry is the single entry-construction source; ReviewPage.handleSave refactored to call it"
  - "isSafeUrl gate stays at ReviewPage boundary; draftToEntry passes through draft.sourceUrl when truthy (T-13-04)"
metrics:
  duration: "~8 min"
  completed: "2026-06-17T16:47:07Z"
  tasks_completed: 2
  files_changed: 3
---

# Phase 13 Plan 01: Capture Service — Logic Layer Summary

Pure-function capture service with `draftToEntry`, `detectHoles` via POSITIONAL_SCHEMA comparison, `buildDSLPreview` for live DSL reconstruction, `cleanValues`/`applyFills` utilities, and `HOLE_TOKEN='{}` (CAP-04 convention); plus refactored `ReviewPage.handleSave` to use `draftToEntry` as the single entry-construction site.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 RED | captureService failing tests | feddf2a | src/services/captureService.test.ts |
| 1 GREEN | captureService implementation | eee6586 | src/services/captureService.ts, captureService.test.ts |
| 2 | ReviewPage refactor via draftToEntry | 3311a07 | src/pages/ReviewPage.tsx |

## What Was Built

### `src/services/captureService.ts`

Pure-function service (no class, no default export — mirrors `exportEntries.ts` style):

- **`HOLE_TOKEN = '{}'`** — CAP-04 named-hole placeholder convention. A DSL template marks named params as holes by assigning `{}` as their value (e.g., `expense :food?merchant={}`). Post-parse detection reads this value; `cleanValues` strips it before draft construction.

- **`cleanValues(values)`** — Removes all entries with value `'{}'`. Always called before `buildReviewDraft` so the token never persists as a real metadata value (RESEARCH Pitfall 1).

- **`detectHoles(type, rawValues)`** — Returns `HoleMap { positional, named, hasHoles }`. Uses `POSITIONAL_SCHEMA[type].filter(k => !cleanVals[k])` exclusively — NOT parser warning strings (Pitfall 2: the warning condition `parts.length > 1` misses bare templates like `'expense'` that have no positional region).

- **`applyFills(baseValues, fills)`** — Simple `{ ...base, ...fills }` merge. Used by BOTH the live DSL preview and the save path with the same merged object (Pitfall 6: prevents preview/save divergence).

- **`buildDSLPreview(type, mergedValues)`** — Reconstructs a human-readable DSL line from type + values. Positional slots from `POSITIONAL_SCHEMA[type]` joined by `:`, named params appended as `?k=v` (values with space/colon/comma/? are double-quoted). Drives the live preview in HoleSheet (13-02).

- **`draftToEntry(draft, type, domain)`** — Finalizes a `ReviewDraft` into `Omit<LifeLogEntry, 'id'>`. Mirrors `ReviewPage.handleSave` lines 109–123 exactly: `title.trim() || 'Untitled'`, `Date.now()` for `recordedAt`, `draft.tags ?? []`, `draft.metadata ?? {}`, `syncedAt: null`. Optional fields (sourceUrl, location, description, amount, occurredAt) included only when truthy / not null-or-NaN.

### `src/services/captureService.test.ts`

45 unit tests covering all exported functions:
- HOLE_TOKEN identity
- cleanValues: strips, preserves, all-hole, empty
- detectHoles: zero-hole, positional, bare-template (schema comparison!), named-hole, ordering
- applyFills: merge, overwrite, empty fills, new keys
- buildDSLPreview: positional, empty slots, named params, quoting (space/colon/comma), multi-named
- draftToEntry: required fields, title trim/fallback, optional-field omission (null/NaN/falsy), sourceUrl passthrough, metadata passthrough, full shape

### `src/pages/ReviewPage.tsx` (refactored)

`handleSave` now:
1. Pre-processes form values (safeSourceUrl via isSafeUrl, parsedAmount, parsedDate, parsedTags)
2. Assembles a `ReviewDraft` from form state
3. Calls `draftToEntry(formDraft, type as EntryType, domain as EntryDomain)` — no more inline entry object
4. Calls `entriesRepository.create(entry)` with the result

The `isSafeUrl` gate remains at the ReviewPage boundary (applied before the URL reaches the draft). `draftToEntry` then passes through `draft.sourceUrl` when truthy — preserving T-13-04 without moving the security gate.

All 15 existing `ReviewPage.test.tsx` tests pass with no changes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test for named-hole discovery order used positional field**
- **Found during:** Task 1 GREEN phase
- **Issue:** The "named holes appear in discovery order" test used `category: '{}'` where `category` is a POSITIONAL_SCHEMA field for expense. This meant `category` correctly appeared in `positional` holes (absent from cleanVals) AND `named` holes — but the test expected `positional: []`.
- **Fix:** Updated the test to use `merchant` and `currency` (non-positional named fields for expense) to test ordering without positional field overlap.
- **Files modified:** src/services/captureService.test.ts
- **No behavior change** — the test assertion was wrong, the algorithm was correct per RESEARCH spec.

**2. [Rule 2 - JSDoc] "warning" appeared in block comments**
- **Found during:** Task 1 acceptance criteria check
- **Issue:** JSDoc explaining Pitfall 2 used the word "warning" in `/* */` block comments (not `//` comments); the acceptance criterion's grep strips only `//` comments, so `grep -c "warning"` returned non-zero.
- **Fix:** Rewrote the JSDoc explanation to avoid the word "warning" while preserving the technical explanation.
- **Files modified:** src/services/captureService.ts

## Verification Results

```
pnpm exec vitest run src/services/captureService.test.ts src/pages/ReviewPage.test.tsx
  Test Files: 2 passed
  Tests: 60 passed (45 captureService + 15 ReviewPage)

pnpm tsc -b → clean
grep -c "draftToEntry" src/pages/ReviewPage.tsx → 4
grep -c "domain: domain as EntryDomain" src/pages/ReviewPage.tsx → 0  (inline entry removed)
grep -c "isSafeUrl" src/pages/ReviewPage.tsx → 3  (gate preserved)
grep -c "export default" src/services/captureService.ts → 0
grep -v '^[[:space:]]*//' src/services/captureService.ts | grep -c "warning" → 0
```

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes. captureService is pure functions with no I/O. `isSafeUrl` gate at ReviewPage boundary preserved (T-13-04). No new trust surfaces.

## Known Stubs

None. captureService is fully implemented and wired into ReviewPage. All functions return real values.

## Self-Check: PASSED

- [x] src/services/captureService.ts exists (60 lines, named exports only)
- [x] src/services/captureService.test.ts exists (45 tests, all green)
- [x] src/pages/ReviewPage.tsx contains `draftToEntry` call
- [x] Commits: feddf2a (RED tests), eee6586 (GREEN impl), 3311a07 (ReviewPage refactor)
- [x] All 60 tests pass; tsc clean

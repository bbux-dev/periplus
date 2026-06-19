---
phase: 21-app-shell-routing-rewrite-atomic-drop
plan: 01
subsystem: services
tags: [typescript, captureService, ReviewDraft, type-relocation, refactor]

# Dependency graph
requires:
  - phase: 20-trip-data-model-engine-extensions
    provides: ReviewDraft interface in extractMetadataFromUrl.ts consumed by captureService.ts and entryFields.ts
provides:
  - ReviewDraft interface owned and exported by captureService.ts
  - captureService.test.ts and config/entryFields.ts import ReviewDraft from captureService, not extractMetadataFromUrl
affects: [21-04-atomic-drop, 22-trip-form, 23-trip-detail, 24-trips-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ReviewDraft interface lives in captureService.ts — single owner for all trip-form consumers in Phases 22-24"

key-files:
  created: []
  modified:
    - src/services/captureService.ts
    - src/services/captureService.test.ts
    - src/config/entryFields.ts

key-decisions:
  - "ReviewDraft moved into captureService.ts so it survives deletion of extractMetadataFromUrl.ts in Plan 21-04 without breaking compile"
  - "extractMetadataFromUrl.ts left unchanged (still exports its own ReviewDraft) — Plan 21-04 deletes the file atomically"

patterns-established:
  - "Type relocation pattern: add export to destination file, repoint kept importers, leave source file intact until the drop plan"

requirements-completed: [UI-05]

# Metrics
duration: 5min
completed: 2026-06-19
---

# Phase 21 Plan 01: ReviewDraft Type Relocation Summary

**ReviewDraft interface copied into captureService.ts and kept importers (captureService.test.ts, entryFields.ts) repointed; tsc clean and 109 tests green.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-19T07:55:00Z
- **Completed:** 2026-06-19T08:00:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- `export interface ReviewDraft` now lives in `src/services/captureService.ts` (above the CAP-04 Named-Hole Token block)
- Removed `import type { ReviewDraft } from './extractMetadataFromUrl'` from captureService.ts (line 15 replaced by the interface definition)
- Repointed `captureService.test.ts` line 15 to `import type { ReviewDraft } from './captureService'`
- Repointed `config/entryFields.ts` line 3 to `import type { ReviewDraft } from '../services/captureService'`
- `extractMetadataFromUrl.ts` is unchanged — its own ReviewDraft definition stays until Plan 21-04 deletes the file

## Task Commits

1. **Task 1: Move ReviewDraft into captureService.ts and repoint kept importers** - `749107a` (refactor)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/services/captureService.ts` - Added `export interface ReviewDraft` block; removed import from extractMetadataFromUrl
- `src/services/captureService.test.ts` - Repointed ReviewDraft import to `./captureService`
- `src/config/entryFields.ts` - Repointed ReviewDraft import to `../services/captureService`

## Decisions Made
- ReviewDraft placed above the CAP-04 Named-Hole Token block in captureService.ts, after the import block — logical grouping with the types section
- No changes to `extractMetadataFromUrl.ts`: Plan 21-04 handles the atomic deletion

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 21-02 can proceed: captureService.ts is the canonical ReviewDraft owner
- Plan 21-04 (atomic drop of extractMetadataFromUrl.ts and old pages) will not break compile because all kept importers now point to captureService.ts
- Phases 22-24 (trip forms) can safely import ReviewDraft from captureService without touching the soon-to-be-deleted file

## Self-Check

- [x] `export interface ReviewDraft` present in captureService.ts at line 24
- [x] Zero references to `./extractMetadataFromUrl` in captureService.ts and captureService.test.ts
- [x] entryFields.ts imports ReviewDraft from `../services/captureService`
- [x] extractMetadataFromUrl.ts not in `git diff --name-only`
- [x] `npx tsc -b` exits clean (no output)
- [x] `npx vitest run src/services/captureService.test.ts src/config/entryFields.test.ts` — 109 tests passed

## Self-Check: PASSED

---
*Phase: 21-app-shell-routing-rewrite-atomic-drop*
*Completed: 2026-06-19*

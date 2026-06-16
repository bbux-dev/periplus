---
phase: 05-manual-entry
plan: 01
subsystem: ui
tags: [react, typescript, entryFields, reviewDraft, indexeddb, vitest]

# Dependency graph
requires:
  - phase: 04-capture-url
    provides: ReviewPage, ExtractedDraft, FormField/Input primitives, entriesRepository
provides:
  - ReviewDraft interface (richer draft contract for both URL-capture and manual flows)
  - ENTRY_FIELDS config keyed by EntryType (all 7 types) with FieldDescriptor and buildReviewDraft mapper
  - ReviewPage extended to persist amount, occurredAt, description, and parsed tags
affects:
  - 05-02 (ManualEntryPage consumes ENTRY_FIELDS + buildReviewDraft + ReviewDraft)
  - 06-list-view (amount from core field now reliably persisted for expense entries)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FieldDescriptor discriminated-union mapTo (kind:core|metadata) for schema-driven form config
    - buildReviewDraft pure mapper — form strings → ReviewDraft; NaN numeric values always skipped
    - ReviewDraft extends ExtractedDraft via structural subtyping (all new fields optional)

key-files:
  created:
    - src/config/entryFields.ts
    - src/config/entryFields.test.ts
  modified:
    - src/services/extractMetadataFromUrl.ts
    - src/pages/ReviewPage.tsx

key-decisions:
  - "Option A-light: extend ReviewPage with specific new state vars (amount/occurredAt/tags) rather than full schema-drive; avoids Phase 4 test breakage"
  - "NaN metadata number fields skipped (not stored as raw string) for consistency with core amount NaN handling"
  - "ExtractedDraft structurally assignable to ReviewDraft: sourceUrl:string satisfies sourceUrl?:string; all new ReviewDraft fields optional"
  - "expense.amount → core LifeLogEntry.amount (not metadata); ensures Phase 6 VIEW-02 amount display works"
  - "place.address → core location field (not metadata.address); dedicated core column is the correct target"

patterns-established:
  - "ENTRY_FIELDS config: single source of truth for what fields each EntryType shows and how they map to LifeLogEntry"
  - "buildReviewDraft: seam between dynamic form (string values) and typed ReviewDraft; skip empty + skip NaN"

requirements-completed: [MAN-02, MAN-03]

# Metrics
duration: 12min
completed: 2026-06-15
---

# Phase 05 Plan 01: ReviewDraft + entryFields Config + ReviewPage Option A-light Summary

**ENTRY_FIELDS typed config for all 7 EntryTypes with buildReviewDraft mapper, ReviewDraft interface, and ReviewPage extended to persist amount/occurredAt/description/tags from richer draft**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-15T15:51:00Z
- **Completed:** 2026-06-15T15:56:00Z
- **Tasks:** 2 (Task 1 TDD: RED+GREEN; Task 2 auto)
- **Files modified:** 4

## Accomplishments
- ReviewDraft interface added to extractMetadataFromUrl.ts; ExtractedDraft unchanged and structurally assignable to ReviewDraft
- ENTRY_FIELDS covers all 7 EntryTypes (show, movie, book, podcast, place, event, expense) with exact field→LifeLogEntry mapping from research spec
- buildReviewDraft maps amount/occurredAt/title/description/location/tags to core fields; creator/rating/currency/category/merchant to metadata; NaN numerics skipped (both core and metadata)
- ReviewPage extended with occurredAt/amount/tags state vars; description now initializes from draft; handleSave persists all fields correctly; tags no longer hardcoded to []
- Phase 4 ReviewPage regression: 14/14 tests still green (ExtractedDraft structural assignability preserved)
- Full suite: 165/165 tests green; tsc + vite build clean

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: failing entryFields tests** - `86702a1` (test)
2. **Task 1 GREEN: ReviewDraft + entryFields implementation** - `ef64e9f` (feat)
3. **Task 2: ReviewPage Option A-light extension** - `cb7368e` (feat)

_Task 1 followed TDD: RED commit with failing tests, GREEN commit with implementation._

## Files Created/Modified
- `src/config/entryFields.ts` - ENTRY_FIELDS config (all 7 EntryTypes), FieldDescriptor/FieldMapping/FieldInputType types, buildReviewDraft mapper
- `src/config/entryFields.test.ts` - 17 unit tests: all 7 types covered, expense amount→core, place name→title/address→location, empty-field skip, NaN handling, tags split, date conversion
- `src/services/extractMetadataFromUrl.ts` - Added ReviewDraft interface export; ExtractedDraft unchanged
- `src/pages/ReviewPage.tsx` - Import ReviewDraft; description from draft; occurredAt/amount/tags state + FormFields; handleSave with parsedAmount/parsedDate/parsedTags

## Decisions Made
- **Option A-light chosen over full schema-drive**: Adding only the three specific new state vars (amount, occurredAt, tags) keeps ReviewPage stable for Phase 4 tests while enabling Phase 5 manual flow.
- **NaN metadata numbers skipped** (plan-check warning addressed): The RESEARCH.md had `isNaN(n) ? raw : n` for metadata numbers. Changed to `if (!isNaN(n)) draft.metadata[key] = n` to be consistent with core amount handling. Unit-tested.
- **ExtractedDraft remains structurally assignable**: All new ReviewDraft fields are optional; only `metadata` is required. Phase 4 test helper `renderWithDraft(domain, type, draft: ExtractedDraft)` works without type changes.

## Deviations from Plan

**1. [Rule 2 - Auto-fix] NaN metadata number skip (plan-check warning)**
- **Found during:** Task 1 (implementing buildReviewDraft)
- **Issue:** RESEARCH.md code had `isNaN(n) ? raw : n` for metadata number fields — stores raw string on NaN, inconsistent with core amount (which skips NaN). Plan explicitly warned to address this.
- **Fix:** Changed to `if (!isNaN(n)) draft.metadata[key] = n` — NaN metadata numbers skipped, consistent with core amount. Added unit test asserting `draft.metadata.rating` is undefined when rating is 'great'.
- **Files modified:** src/config/entryFields.ts, src/config/entryFields.test.ts
- **Committed in:** ef64e9f (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 2 - missing critical: consistent NaN handling)
**Impact on plan:** Plan anticipated this and explicitly flagged it. Fix improves data consistency; NaN strings never persisted to metadata.

## Issues Encountered
None.

## Threat Surface Scan
No new security surface introduced. React DOM auto-escapes all string values; no `dangerouslySetInnerHTML` used. `isSafeUrl()` guard in ReviewPage unchanged. Manual entries carry no sourceUrl (skipped in save). T-05-01/02/03 mitigations all confirmed in place.

## Known Stubs
None — all fields wire through to LifeLogEntry persistence. buildReviewDraft is fully functional; ReviewPage handleSave persists all reviewed values.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (ManualEntryPage) can now import ENTRY_FIELDS and buildReviewDraft from src/config/entryFields.ts
- ManualEntryPage navigates to ReviewPage with `{ state: { draft: ReviewDraft } }`; ReviewPage already reads and persists all fields
- App.tsx route change (PlaceholderPage → ManualEntryPage) is the one remaining wiring step for Plan 02

## Self-Check: PASSED

- [x] src/config/entryFields.ts exists (144 lines)
- [x] src/config/entryFields.test.ts exists (224 lines)
- [x] src/services/extractMetadataFromUrl.ts exports ReviewDraft
- [x] src/pages/ReviewPage.tsx imports ReviewDraft, has parsedTags
- [x] Commits 86702a1, ef64e9f, cb7368e all verified in git log
- [x] npx vitest run: 165/165 tests passed
- [x] npx tsc -b: no errors
- [x] npx vite build: clean

---
*Phase: 05-manual-entry*
*Completed: 2026-06-15*

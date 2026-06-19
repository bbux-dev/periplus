# Phase 16: Default occurredAt to Today - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss); enriched from design note

<domain>
## Phase Boundary

Default the `occurredAt` date field to **today (local)** on both capture paths, for entry
types that have an `occurredAt` field. It is a default, not a lock — the user can still edit
or clear it. Types without a date field are untouched. North-star quick win: one fewer field
on the common path (`seeds/fewest-buttons-slickest.md`).

Source: `.planning/todos/pending/default-occurredat-today.md` (resolves_phase: 16).
</domain>

<decisions>
## Implementation Decisions

### Locked by the design note + codebase conventions
- **Local date, not UTC.** Use the existing convention. ReviewPage form state formats with
  `new Date().toLocaleDateString('en-CA')` → `YYYY-MM-DD`. The one-tap path must convert to
  local-midnight epoch via `Date.parse(\`${d}T00:00:00\`)` (NOT `Date.UTC`), matching ReviewPage
  `handleSave` (avoids the off-by-one the v0.1.0 audit already fixed once).
- **Default, not lock** — clearing the date must still save an entry with no `occurredAt`.
- **Only types with an `occurredAt` field.** Gate on `ENTRY_FIELDS[type]` / `POSITIONAL_SCHEMA` —
  check whether the type has a `core occurredAt` field before defaulting. Do not invent a date
  for types lacking the field.

### Claude's Discretion
- Exact helper placement (e.g. a small `todayLocalDate()` / `todayLocalMidnightEpoch()` util vs
  inline) is at plan-phase's discretion — keep it DRY across ReviewPage and captureService.
</decisions>

<code_context>
## Existing Code Insights

- `src/pages/ReviewPage.tsx` (~L43-46): `occurredAt` form state inits from `initialDraft?.occurredAt`
  else `''`. Default to today when there's no initial draft date AND the type has a date field.
  `handleSave` (~L107-117) already parses `occurredAt` → epoch via `Date.parse(\`${occurredAt}T00:00:00\`)`.
- `src/services/captureService.ts` `draftToEntry` (L168-198): the one-tap direct-save path. Currently
  passes `occurredAt` through only when `draft.occurredAt != null && !NaN`. Default today's local-midnight
  epoch here (or upstream in the shortcut capture path) when the type has a date field and none supplied.
- `src/config/entryFields.ts`: `ENTRY_FIELDS[type]` lists fields incl. `occurredAt` (inputType 'date',
  mapTo core occurredAt); `POSITIONAL_SCHEMA` is the per-type slot list. Use one of these to detect
  "type has a date field".
- Direct-save call site: `src/hooks/useShortcutCapture.ts` (calls `draftToEntry`) — confirm where the
  default is cleanest (in `draftToEntry` vs the hook) so BOTH one-tap and ReviewPage get today's default
  without double-applying.
</code_context>

<specifics>
## Specific Ideas

- Add tests: ReviewPage renders today's date for a date-bearing type when opened with no initial
  occurredAt; clearing the field saves with no occurredAt; a type without a date field gets none;
  one-tap save writes today's local-midnight epoch (assert local, not UTC). Watch DST/timezone in
  tests — prefer asserting against a locally-computed expected epoch, not a hardcoded number.
</specifics>

<deferred>
## Deferred Ideas

None — small, self-contained quick win.
</deferred>

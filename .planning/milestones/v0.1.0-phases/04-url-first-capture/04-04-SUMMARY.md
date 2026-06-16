---
phase: 04-url-first-capture
plan: "04"
subsystem: ui
tags: [react, react-router, rtl, vitest, fake-indexeddb, review, form, capt-04, capt-05]

# Dependency graph
requires:
  - phase: 04-url-first-capture/04-01
    provides: FormField + Input primitives used in all review form fields
  - phase: 04-url-first-capture/04-02
    provides: ExtractedDraft type consumed via location.state
  - phase: 04-url-first-capture/04-03
    provides: CaptureUrlPage that navigates to /review with { state: { draft } }

provides:
  - ReviewPage: prefill/edit/save/cancel screen at /d/:domain/:type/review
  - save path: entriesRepository.create() → navigate /d/:domain
  - guard: null draft → redirect to capture route (T-04-09)

affects: [04-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ReviewPage guard: useEffect(!initialDraft → navigate replace:true) + return null before form render (hooks-safe)"
    - "Full Omit<LifeLogEntry,'id'> construction in handleSave: domain, type, title, recordedAt, tags[], metadata, syncedAt null; optional fields via spread conditionals"
    - "MemoryRouter v7 initialEntries object form verified: InitialEntry = string | Partial<Location>; { pathname, state } injects location.state"
    - "Test probe pattern: DomainProbe + CaptureProbe + PreviousProbe inline components for post-navigation assertions"

key-files:
  created:
    - src/pages/ReviewPage.tsx
    - src/pages/ReviewPage.test.tsx
  modified: []

key-decisions:
  - "[04-04] MemoryRouter v7 initialEntries object { pathname, state } — verified InitialEntry=string|Partial<Location> in installed react-router-dom 7.17.0 type defs; no fallback needed"
  - "[04-04] handleSave uses spread conditionals for optional fields: ...(field ? { key: field } : {}) — keeps TS happy without asserting non-undefined on each"
  - "[04-04] void handleSave() in onClick handler — async function; void discards the Promise (no unhandled promise warning)"

requirements-completed: [CAPT-04, CAPT-05]

# Metrics
duration: "8min"
completed: "2026-06-15"
tasks: 2
files: 2
---

# Phase 04 Plan 04: ReviewPage Summary

**One-liner:** ReviewPage with location.state draft prefill, controlled form editing (title/location/description/sourceUrl), entriesRepository.create() save with full LifeLogEntry shape, navigate(-1) cancel, and null-draft guard — 10 RTL+fake-indexeddb tests covering CAPT-04 SC3 and CAPT-05 SC4.

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-15T22:51:00Z
- **Completed:** 2026-06-15T22:59:00Z
- **Tasks:** 2
- **Files modified:** 2 created

## Accomplishments

- `ReviewPage` reads `useLocation().state?.draft` and seeds four controlled fields: `title`, `location_`, `description`, `sourceUrl` from the `ExtractedDraft`.
- `useEffect` guard: when `initialDraft` is null (direct URL navigation / refresh), redirects to the capture route (`/d/:domain/:type`) with `replace: true` and returns `null` — preventing any field reads from null (T-04-09 mitigated).
- `handleSave` builds a complete `Omit<LifeLogEntry, 'id'>` with all required fields (`domain as EntryDomain`, `type as EntryType`, `title.trim() || 'Untitled'`, `recordedAt: Date.now()`, `tags: []`, `metadata: initialDraft.metadata`, `syncedAt: null`) plus conditional optional fields, then calls `entriesRepository.create()` and navigates to `/d/${domain}`.
- `handleCancel` calls `navigate(-1)` — discards the draft, returns to CaptureUrlPage.
- 10 RTL+fake-indexeddb tests green (was 137, now 147); `tsc -b` clean; `vite build` 244 kB.

## Task Commits

1. **Task 1: ReviewPage component** — `73f906d` (feat)
2. **Task 2: ReviewPage tests** — `985c9a9` (test)

## Files Created/Modified

- `src/pages/ReviewPage.tsx` — Review/edit/save screen; FormField ids review-title/review-location/review-description/review-source-url; primary Save + secondary Cancel Buttons
- `src/pages/ReviewPage.test.tsx` — 10 RTL+fake-indexeddb tests covering CAPT-04 degrade, CAPT-05 prefill/save/cancel, guard

## Decisions Made

- **MemoryRouter v7 `{ pathname, state }` form** — The plan noted `[ASSUMED]` for MemoryRouter v7 location.state injection. Verified against installed react-router-dom 7.17.0 types: `InitialEntry = string | Partial<Location>`. The object form `{ pathname, state }` works exactly as described in RESEARCH.md. No fallback or `createMemoryRouter` needed.
- **`void handleSave()` in onClick** — `handleSave` is async; wrapping in `void` discards the Promise cleanly without an unhandled-rejection warning and avoids making the onClick handler return a non-void value.
- **Spread conditionals for optional fields** — `...(field ? { key: field } : {})` keeps TypeScript satisfied without non-null assertions; avoids `undefined` leaking into required field positions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `findByDisplayValue` ambiguity in prefill test**
- **Found during:** Task 2 (first test run)
- **Issue:** Both title and location fields contain "Eiffel Tower" (from Google Maps draft where title===location). `findByDisplayValue('Eiffel Tower')` found multiple elements and threw.
- **Fix:** Changed to `findByLabelText('Title')` + `.toHaveValue('Eiffel Tower')` — queries by label association, unambiguous.
- **Files modified:** `src/pages/ReviewPage.test.tsx`
- **Commit:** included in `985c9a9`

## Known Stubs

None. ReviewPage is fully wired: draft prefill → edit → `entriesRepository.create()` → navigate. The `/d/:domain` route (DomainPage) shows the domain's entry-type tiles; entry detail list rendering is Phase 6.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes beyond the plan's threat model. All reviewed threats are mitigated:
- T-04-09: null-draft guard fires before any field reads — redirect + return null
- T-04-10: all user-edited strings render as React input values (auto-escaped, no dangerouslySetInnerHTML)
- T-04-11/12: accepted per plan

## Self-Check

- [x] `src/pages/ReviewPage.tsx` exists; exports named `ReviewPage`; 114 lines (> 45 min)
- [x] Imports `useLocation`; reads `location.state?.draft`; has `navigate(…, { replace: true })` guard
- [x] `entriesRepository.create(entry)` called in `handleSave`
- [x] After save navigates to `/d/${domain}`; Cancel calls `navigate(-1)`
- [x] `src/pages/ReviewPage.test.tsx` exists with 10 tests
- [x] Commits `73f906d` (feat) and `985c9a9` (test) exist in git log
- [x] `npx vitest run src/pages/ReviewPage.test.tsx` — 10/10 passed
- [x] `npx vitest run` (full suite) — 147/147 passed (was 137, +10)
- [x] `npx tsc -b` — 0 errors
- [x] `npx vite build` — success (244 kB bundle)

## Self-Check: PASSED

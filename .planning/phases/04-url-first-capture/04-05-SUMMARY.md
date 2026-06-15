---
phase: 04-url-first-capture
plan: "05"
subsystem: routing
tags: [react-router, rtl, vitest, fake-indexeddb, dead-code-removal, e2e, capt-01]

# Dependency graph
requires:
  - phase: 04-url-first-capture/04-03
    provides: CaptureUrlPage at /d/:domain/:type
  - phase: 04-url-first-capture/04-04
    provides: ReviewPage at /d/:domain/:type/review

provides:
  - App.tsx fully rewired: CaptureUrlPage + ReviewPage live routes, /capture stub removed
  - Dead-code clean: Counter, WelcomePage, EntryTypePage all removed
  - CAPT-01 end-to-end: App-level integration test proving capture→review→save→domain flow

affects: [05-manual-entry]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route rewire: /d/:domain/:type → CaptureUrlPage; /d/:domain/:type/review → ReviewPage"
    - "E2e test pattern: renderAt('/d/trips/place') → userEvent.type URL → click Import → findByLabelText('Title') asserts prefill → click Save → findByRole('heading', Trips) + entriesRepository.list()"
    - "ReviewPage guard behavior in App context: no-draft navigation to /review redirects to capture (/add book/i heading in it.each)"

key-files:
  created: []
  modified:
    - src/App.tsx
    - src/App.test.tsx
  deleted:
    - src/components/Counter.tsx
    - src/components/Counter.test.tsx
    - src/pages/WelcomePage.tsx
    - src/pages/WelcomePage.test.tsx
    - src/pages/EntryTypePage.tsx
    - src/pages/EntryTypePage.test.tsx

key-decisions:
  - "Remove /capture route rather than redirect — CAPT-01 says capture is at /d/:domain/:type; sub-route is superseded"
  - "Update /review it.each case to expect /add book/i — documents the guard redirect behavior in the route-table test"
  - "E2e test uses renderAt() helper (same MemoryRouter wrapping) — consistent with existing App test patterns"

requirements-completed: [CAPT-01]

# Metrics
duration: "10min"
completed: "2026-06-15"
tasks: 2
files: 8
---

# Phase 04 Plan 05: App Route Rewire + Dead-Code Removal + CAPT-01 E2E Summary

**One-liner:** App.tsx rewired with CaptureUrlPage as the /d/:domain/:type default and ReviewPage live at /review; six Phase 1/replaced dead files deleted; CAPT-01 end-to-end test drives a Google Maps URL through the real App router, asserts ReviewPage prefill, persists the entry in fake-indexeddb, and confirms DomainPage navigation.

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-06-15
- **Tasks:** 2/2
- **Files modified:** 2 (App.tsx, App.test.tsx)
- **Files deleted:** 6 (Counter.tsx/test, WelcomePage.tsx/test, EntryTypePage.tsx/test)

## Accomplishments

- `App.tsx`: imports replaced (`EntryTypePage` → `CaptureUrlPage` + `ReviewPage`); `/d/:domain/:type` route now renders the real URL Capture screen; `/d/:domain/:type/review` renders the real Review/Edit/Save screen; the `/d/:domain/:type/capture` stub route line is gone; Phase 5 `/manual` stub preserved.
- Six dead files deleted via `git rm` with no dangling imports remaining (grep-verified).
- `src/services/db.ts` Counter interface + counter store untouched (preserves the v1→v2 additive upgrade invariant; db.test.ts counter tests remain green).
- `App.test.tsx` updated: stale `/d/media/book/capture` it.each case removed; `/d/media/book/review` case updated to expect `/add book/i` (documents the guard-redirect path); describe renamed 7→6 routes; W-01 + back-nav descriptions updated to say CaptureUrlPage.
- End-to-end test added in `describe('App — capture → review → save (CAPT end-to-end, SC2/SC4)')`: renders App at `/d/trips/place`, pastes a Google Maps URL, clicks Import, asserts title pre-filled as "Eiffel Tower", clicks Save, asserts DomainPage heading "Trips" + type tiles appear, asserts one entry in IndexedDB with correct domain/type/sourceUrl/syncedAt/tags.
- Full suite: 137/137 tests pass; `tsc -b` clean; `vite build` 378 kB JS bundle.

## Task Commits

1. **Task 1: App.tsx rewire + six dead files deleted** — `4d7b463` (feat)
2. **Task 2: App.test.tsx update + CAPT-01 e2e test** — `226b3c3` (feat)

## Files Created/Modified

- `src/App.tsx` — CaptureUrlPage + ReviewPage imports; /d/:domain/:type → CaptureUrlPage; /review → ReviewPage; /capture route removed
- `src/App.test.tsx` — stale /capture case removed; /review case updated; e2e describe block added (imports db + entriesRepository)
- **Deleted:** `src/components/Counter.tsx`, `src/components/Counter.test.tsx`, `src/pages/WelcomePage.tsx`, `src/pages/WelcomePage.test.tsx`, `src/pages/EntryTypePage.tsx`, `src/pages/EntryTypePage.test.tsx`

## Decisions Made

- **Remove `/capture` route rather than redirect** — The plan and RESEARCH both specify removal. CaptureUrlPage lives at `/d/:domain/:type`; the `/capture` sub-route was a Phase 3 stub that Phase 4 supersedes entirely. Keeping it as a redirect would leave dead surface.
- **Update `/review` it.each expected heading to `/add book/i`** — When ReviewPage receives no `location.state` draft (direct navigation), its `useEffect` guard redirects to the capture route with `replace: true`. The it.each case now documents this redirect behavior explicitly rather than hiding a test that would silently pass for the wrong reason.
- **E2e test uses existing `renderAt()` helper** — Consistent with all other App.test.tsx tests; MemoryRouter wraps `<App />` at the specified initial path. No need for a separate render helper.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All Phase 4 routes are live:
- `/d/:domain/:type` → CaptureUrlPage (URL input, Import, Enter Manually)
- `/d/:domain/:type/review` → ReviewPage (prefill, edit, save, cancel)
- `/d/:domain/:type/manual` → PlaceholderPage (Phase 5 will fill this)

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes beyond the plan's threat model.
- T-04-13: Unknown :domain/:type params — CaptureUrlPage carries forward the `getDomainConfig` guard and `typeConfig?.label ?? type` fallback; W-01 tests preserved and green.
- T-04-14: Dead-code deletion — grep gate confirms no dangling imports; `tsc -b` + full suite gate confirm the build is clean.
- T-04-15: XSS in rendered entry data — all strings render as React text nodes (auto-escaped); no `dangerouslySetInnerHTML` in any page.

## Self-Check

- [x] `src/App.tsx` imports CaptureUrlPage and ReviewPage; no EntryTypePage import
- [x] `grep -c 'type/capture' src/App.tsx` returns 0
- [x] All six files deleted and absent from disk
- [x] `grep -rEl "from '.*(Counter|WelcomePage|EntryTypePage)'" src/` returns no files
- [x] `src/services/db.ts` unchanged (counter store + Counter interface preserved)
- [x] App.test.tsx has no `/d/media/book/capture` case (grep -c 'book/capture' returns 0)
- [x] E2e describe block exists with db.delete/db.open beforeEach and entriesRepository assertion
- [x] Commits `4d7b463` (Task 1) and `226b3c3` (Task 2) exist in git log
- [x] `npx vitest run` — 137/137 passed
- [x] `npx tsc -b` — 0 errors
- [x] `npx vite build` — success (378 kB JS)

## Self-Check: PASSED

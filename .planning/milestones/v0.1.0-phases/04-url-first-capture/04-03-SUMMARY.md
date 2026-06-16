---
phase: 04-url-first-capture
plan: "03"
subsystem: ui
tags: [react, react-router, rtl, vitest, capture, url-import, form-field]

# Dependency graph
requires:
  - phase: 04-url-first-capture/04-01
    provides: FormField + Input primitives consumed by CaptureUrlPage
  - phase: 04-url-first-capture/04-02
    provides: extractMetadataFromUrl + ExtractedDraft called on Import

provides:
  - CaptureUrlPage: URL Capture screen at /d/:domain/:type with Import + Enter Manually
  - location.state draft transport: navigate(reviewPath, { state: { draft } })

affects: [04-04, 04-05, 05-manual-entry]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CaptureUrlPage: useParams + useNavigate + useBackOrHome + getDomainConfig pattern (mirrors EntryTypePage chrome exactly)"
    - "Draft transport: navigate(path, { state: { draft } }) → ReviewProbe reads useLocation().state"
    - "Decoupled test probe pattern: inline ReviewProbe + ManualProbe inside test file to avoid importing sibling pages built in parallel plans"

key-files:
  created:
    - src/pages/CaptureUrlPage.tsx
    - src/pages/CaptureUrlPage.test.tsx
  modified: []

key-decisions:
  - "Inline ReviewProbe + ManualProbe defined inside test file — keeps plan 04-03 file-disjoint from 04-04 (ReviewPage) and 04-05 (ManualPage) while still asserting location.state draft transport end-to-end"
  - "Import button disabled={!url.trim()} — prevents navigation to review with no input (T-04-08 mitigation)"

patterns-established:
  - "CaptureUrlPage.tsx: useParams, useNavigate, useBackOrHome, getDomainConfig + find typeConfig, useState('') for url, unknown-domain guard, exact EntryTypePage chrome classes"
  - "Test probe pattern: lightweight inline component reads useLocation().state and renders fields as data-testid spans — enables route-boundary assertion without importing the real page"

requirements-completed: [CAPT-01, CAPT-02, CAPT-06]

# Metrics
duration: 2min
completed: 2026-06-15
---

# Phase 04 Plan 03: CaptureUrlPage Summary

**URL Capture screen (React Router location.state draft transport, primary Import + secondary Enter Manually, RTL-tested with inline probe routes covering CAPT-01/02/06).**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-15T21:46:18Z
- **Completed:** 2026-06-15T21:47:30Z
- **Tasks:** 2
- **Files modified:** 2 created

## Accomplishments

- `CaptureUrlPage` renders "Add {typeConfig?.label ?? type}" heading, URL `FormField`, primary "Import from URL" `Button` (disabled when URL is empty), and secondary "Enter Manually" `Button`.
- `handleImport` calls `extractMetadataFromUrl(url.trim(), type)` then `navigate(/d/:domain/:type/review, { state: { draft } })` — satisfying CAPT-02 draft transport.
- `handleManual` navigates to `/d/:domain/:type/manual` — CAPT-06.
- Unknown-domain guard preserved exactly from `EntryTypePage` (same Back button + "Unknown domain" message).
- 4 RTL tests (137 total, up from 133) all pass green; `tsc -b` and `vite build` clean.

## Task Commits

1. **Task 1: CaptureUrlPage component** — `d474cbd` (feat)
2. **Task 2: CaptureUrlPage tests** — `f154c82` (test)

## Files Created/Modified

- `src/pages/CaptureUrlPage.tsx` — URL Capture screen; FormField + primary/secondary Buttons; import→navigate with draft in state; unknown-domain guard; exact EntryTypePage chrome
- `src/pages/CaptureUrlPage.test.tsx` — 4 RTL tests: render (CAPT-01/SC1), disabled→enabled Import (CAPT-01), Google Maps URL → Eiffel Tower in ReviewProbe (CAPT-02/SC2), Enter Manually → ManualProbe (CAPT-06)

## Decisions Made

- **Inline probe routes in test file** — `ReviewProbe` and `ManualProbe` defined inside `CaptureUrlPage.test.tsx`. Avoids importing pages from parallel wave plans (04-04 / 04-05) that don't exist yet; proves location.state draft crosses the route boundary without coupling to sibling implementations.
- **`disabled={!url.trim()}`** — Import button disabled while URL field is empty; satisfies T-04-08 (tampering via empty-URL import) with zero additional guard code.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Known Stubs

None. `CaptureUrlPage` is fully wired: URL → extractor → navigate with draft. The `/manual` and `/review` routes rendered by the real app are built in plans 04-04 and 04-05; the test uses probe components instead.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes. All string rendering goes through React JSX (text nodes, auto-escaped — T-04-06 mitigation). Import button disabled guard prevents empty-URL navigation (T-04-08). No scope outside the plan's threat model.

## Self-Check

- [x] `src/pages/CaptureUrlPage.tsx` exists and exports `CaptureUrlPage`
- [x] Imports `extractMetadataFromUrl`, `FormField`, `Button`; navigate called with `state: { draft }` to `/review`
- [x] `variant="primary"` on Import, `variant="secondary"` on Enter Manually
- [x] Commits `d474cbd` (feat) and `f154c82` (test) exist in git log
- [x] 137/137 tests pass; 0 TypeScript errors; vite build succeeds

## Self-Check: PASSED

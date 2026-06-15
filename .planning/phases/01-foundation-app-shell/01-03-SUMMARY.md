---
phase: 01-foundation-app-shell
plan: "03"
subsystem: ui-shell + counter-tracer
tags: [react-router-dom, welcomepage, counter, useLiveQuery, heroicons, dexie, tdd, rtl]

# Dependency graph
requires:
  - 01-01 (Vite scaffold + BrowserRouter dep installed + fake-indexeddb harness)
  - 01-02 (cn helper + Button primitive + Dexie db counter store)
provides:
  - WelcomePage at src/pages/WelcomePage.tsx (mobile-first "Life Log" welcome screen)
  - Counter at src/components/Counter.tsx (useLiveQuery-driven +/- heroicon buttons)
  - Routing wired: BrowserRouter in main.tsx, Route path="/" → WelcomePage in App.tsx
  - RTL tests: WelcomePage.test.tsx (1 test), Counter.test.tsx (4 tests) — all green
affects:
  - Phase 2 (data layer builds on the routing + WelcomePage shell)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BrowserRouter in main.tsx wrapping App; App.tsx renders <Routes><Route path='/' element={<WelcomePage/>}/></Routes>"
    - "WelcomePage: min-h-screen flex-col items-center justify-center, max-w-sm, gap-8 — mobile-first phone layout"
    - "Counter: useLiveQuery(() => db.counter.get(1), [], {id:1,value:0}) third-arg default avoids undefined flash"
    - "value = counter?.value ?? 0 — safe read before Dexie resolves"
    - "increment: db.counter.put({id:1, value:value+1}); decrement: value-1 — upsert creates row on first click"
    - "Button variant='ghost' size='icon' + PlusIcon/MinusIcon from @heroicons/react/24/outline"
    - "RTL Counter test: beforeEach db.delete()+db.open() for isolation; findByText waits for useLiveQuery re-render"
    - "TDD cycle: RED (import-not-found) commit → GREEN (implementation) commit per task"

key-files:
  created:
    - src/pages/WelcomePage.tsx
    - src/pages/WelcomePage.test.tsx
    - src/components/Counter.tsx
    - src/components/Counter.test.tsx
  modified:
    - src/main.tsx (added BrowserRouter import + wrapper)
    - src/App.tsx (replaced placeholder h1 with Routes/Route table)

key-decisions:
  - "MemoryRouter in WelcomePage.test.tsx: test renders WelcomePage directly; MemoryRouter satisfies react-router-dom's useContext requirement without requiring the real BrowserRouter"
  - "Counter.test.tsx uses findByText (async) not getByText (sync) for useLiveQuery values — useLiveQuery is async; sync queries would flake"
  - "act() wraps userEvent.click in Counter tests — Dexie put triggers an async LiveQuery re-render that needs act() to flush in the RTL environment"

# Metrics
duration: 4min
completed: "2026-06-15"
---

# Phase 01 Plan 03: Welcome Screen + Counter Tracer Summary

**BrowserRouter routing wired to a mobile-first "Life Log" WelcomePage hosting a useLiveQuery-driven Dexie counter with heroicon +/- buttons — closes the UI → Dexie → IndexedDB → live-read loop**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-15T18:27:10Z
- **Completed:** 2026-06-15T18:28:45Z
- **Tasks:** 2 (both TDD: RED + GREEN each)
- **Files created:** 4 (WelcomePage.tsx, WelcomePage.test.tsx, Counter.tsx, Counter.test.tsx)
- **Files modified:** 2 (main.tsx, App.tsx)

## Accomplishments

- Wired `BrowserRouter` in `src/main.tsx`; replaced placeholder App with `Routes`/`Route` table in `src/App.tsx` mapping `"/"` to `WelcomePage`
- Created `src/pages/WelcomePage.tsx`: mobile-first `min-h-screen flex-col items-center` layout, `max-w-sm` constrained, `gap-8` touch spacing, `h1` "Life Log"
- Created `src/components/Counter.tsx`: `useLiveQuery(() => db.counter.get(1), [], {id:1,value:0})`, `PlusIcon`/`MinusIcon` from `@heroicons/react/24/outline` inside `Button` (variant="ghost" size="icon"), increment/decrement via `db.counter.put` upsert
- Mounted `Counter` in `WelcomePage`
- RTL tests: `WelcomePage.test.tsx` (1 test, heading assertion) + `Counter.test.tsx` (4 tests: initial 0, increment→1, increment→2, decrement→1)
- Full gate: 14/14 tests pass; `tsc -b` exits 0; `vite build` exits 0 (360.83 kB JS, 11.95 kB CSS)

## Task Commits

| Task | Type | Hash | Description |
|------|------|------|-------------|
| Task 1 RED | test | cf0b1ad | add failing test for WelcomePage routing (SHELL-01) |
| Task 1 GREEN | feat | e8a837e | implement WelcomePage and routing (SHELL-01) |
| Task 2 RED | test | 6460d53 | add failing tests for Counter reactive useLiveQuery (DEMO-01) |
| Task 2 GREEN | feat | e20bda4 | implement Counter with useLiveQuery and heroicon buttons (DEMO-01) |

## TDD Gate Compliance

| Task | RED commit | GREEN commit | Status |
|------|------------|--------------|--------|
| Task 1 (WelcomePage + routing) | cf0b1ad (test) | e8a837e (feat) | PASS |
| Task 2 (Counter + Dexie) | 6460d53 (test) | e20bda4 (feat) | PASS |

Both tasks completed the full RED→GREEN cycle. No REFACTOR step required.

## Files Created/Modified

- `/home/bbux/git/life-log/src/pages/WelcomePage.tsx` — mobile-first "Life Log" welcome screen
- `/home/bbux/git/life-log/src/pages/WelcomePage.test.tsx` — RTL heading assertion (1 test)
- `/home/bbux/git/life-log/src/components/Counter.tsx` — useLiveQuery + heroicon Button counter
- `/home/bbux/git/life-log/src/components/Counter.test.tsx` — initial/increment/decrement RTL tests (4 tests)
- `/home/bbux/git/life-log/src/main.tsx` — added BrowserRouter wrapper
- `/home/bbux/git/life-log/src/App.tsx` — Routes table mapping '/' → WelcomePage

## Decisions Made

- `MemoryRouter` in `WelcomePage.test.tsx`: isolates the page component from the real browser history; satisfies react-router-dom's context requirement in tests without full app mounting.
- `findByText` (async) in Counter tests instead of `getByText`: `useLiveQuery` is inherently async; sync queries would fail before the hook resolves. `findByText` polls until the text appears.
- `act()` wrapper around `userEvent.click` in Counter tests: the Dexie `put` triggers an async LiveQuery re-render cycle; without `act()`, the state update warning fires and assertions may run before the DOM updates.

## Deviations from Plan

None — plan executed exactly as written. All interfaces matched exactly (useLiveQuery 3-arg pattern, heroicon imports, Button variant/size, db.counter.put/get, BrowserRouter placement).

## Known Stubs

None — all modules are fully wired with real data sources. WelcomePage renders Counter which reads live from Dexie. No hardcoded values, placeholders, or TODO comments.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. Counter writes integers to same-origin IndexedDB only.

## Manual Verifications Required

Per VALIDATION.md (cannot be automated with fake-indexeddb):

| Check | How to Verify |
|-------|---------------|
| SC1 — Phone viewport | Run `npx vite dev`, open DevTools device toolbar at ~375px width, confirm "Life Log" + counter render without horizontal scroll |
| SC4 — Cross-refresh persistence | Increment counter to N, hard-refresh browser, confirm value is still N (proves real IndexedDB persistence) |

## Self-Check: PASSED

Files exist:
- FOUND: src/pages/WelcomePage.tsx
- FOUND: src/pages/WelcomePage.test.tsx
- FOUND: src/components/Counter.tsx
- FOUND: src/components/Counter.test.tsx

Commits confirmed in git log:
- FOUND: cf0b1ad
- FOUND: e8a837e
- FOUND: 6460d53
- FOUND: e20bda4

Full test suite: 14/14 green. Build gate: exit 0.

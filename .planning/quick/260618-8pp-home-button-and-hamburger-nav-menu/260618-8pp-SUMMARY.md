---
phase: quick-260618-8pp
plan: "01"
subsystem: navigation
tags: [navigation, layout, accessibility, tdd]
dependency_graph:
  requires: [src/config/navigation.ts, react-router-dom, "@heroicons/react/24/outline"]
  provides: [AppShell sticky nav bar, home button, hamburger dropdown nav]
  affects: [src/App.tsx, all routes (bar persists across route changes)]
tech_stack:
  added: []
  patterns: [sticky header, conditional render, useEffect cleanup, outside-click ref guard, TDD RED/GREEN]
key_files:
  created:
    - src/components/layout/AppShell.tsx
    - src/components/layout/AppShell.test.tsx
  modified:
    - src/App.tsx
decisions:
  - "Sticky (not fixed) bar keeps pages in normal flow; no padding/offset needed on child routes"
  - "AppShell outside <Routes> so bar persists across route changes without remounting"
  - "NAVIGATION imported directly — no duplication of domain/type tree in AppShell"
  - "wrapperRef covers both the hamburger button and the dropdown panel for outside-click guard"
  - "aria-expanded as boolean prop: React 19 renders 'true'/'false' strings; tested with toHaveAttribute"
metrics:
  duration: "~8min"
  completed: "2026-06-18"
  tasks: 2
  files: 3
---

# Quick Task 260618-8pp: Home Button and Hamburger Nav Menu Summary

**One-liner:** Sticky AppShell bar with home button (hidden at '/') and hamburger dropdown exposing 4 top-level links plus the full NAVIGATION domain/type tree, with Escape/outside-click/selection close behaviors.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 (RED) | AppShell failing tests | 8bbb1be | src/components/layout/AppShell.test.tsx |
| 1 (GREEN) | AppShell implementation | 6762cef | src/components/layout/AppShell.tsx |
| 2 | Wire AppShell in App.tsx | 7694865 | src/App.tsx |

## What Was Built

`AppShell` is a layout wrapper rendered once in `App.tsx` around `<Routes>`. It provides:

- **Sticky header** (`sticky top-0 z-50`) using CSS custom-property tokens for background and border. Content flows naturally below it — no padding hack needed.
- **Home button** (left side): conditionally rendered when `pathname !== '/'`; navigates to `/` via `useNavigate`. `aria-label="Go home"`, `HomeIcon`.
- **Hamburger button** (right side): `aria-label="Toggle navigation menu"`, `aria-expanded={open}`, `aria-controls="app-nav-menu"`. Toggles a dropdown.
- **Dropdown nav** (`<nav id="app-nav-menu">`):
  - Four top-level `<Link>` items: Dashboard (`/`), Entries (`/entries`), Settings (`/settings`), Manage Shortcuts (`/manage`).
  - NAVIGATION tree from `src/config/navigation.ts` (single source of truth): Media, Trips, Expenditures — each as a `<Link to="/d/:domain">` with a separate expander button (`aria-label="Expand {Label}"`, `aria-expanded`). When expanded, entry-type `<Link to="/d/:domain/:type">` rows appear.
- **Close behaviors**: `setOpen(false)` on each item's `onClick`; `keydown` Escape listener via `useEffect` (cleaned up when closed); `mousedown` outside-click listener via `useEffect` with `wrapperRef` containment check.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test) | 8bbb1be | Failing at import — AppShell.tsx absent |
| GREEN (feat) | 6762cef | 12/12 tests passing |
| REFACTOR | — | Not needed |

## Verification

- `vitest run src/components/layout/AppShell.test.tsx`: **12/12 passed**
- `vitest run src/App.test.tsx src/pages/DomainPage.test.tsx`: **27/27 passed** (no regressions)
- `vitest run` (full suite): **512/512 passed**
- `npm run build` (tsc -b + vite build): **succeeded**

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, or external data sinks introduced. All nav links are built from the static in-repo `NAVIGATION` constant (T-nav-01 mitigated). No threat flags.

## Self-Check

- [x] `src/components/layout/AppShell.tsx` — exists (created)
- [x] `src/components/layout/AppShell.test.tsx` — exists (created)
- [x] `src/App.tsx` contains `AppShell` — verified
- [x] Commits 8bbb1be, 6762cef, 7694865 — all present in git log

---
phase: 03-navigation-dashboard
fixed_at: 2026-06-15T13:57:00Z
review_path: .planning/phases/03-navigation-dashboard/03-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-06-15T13:57:00Z
**Source review:** .planning/phases/03-navigation-dashboard/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: `navigate(-1)` exits the PWA when there is no in-app history

**Files modified:** `src/hooks/useBackOrHome.ts` (new), `src/pages/DomainPage.tsx`, `src/pages/EntryTypePage.tsx`, `src/pages/PlaceholderPage.tsx`, `src/pages/EntryTypePage.test.tsx`, `src/pages/PlaceholderPage.test.tsx`
**Commit:** 4dd2b0d
**Applied fix:** Created `src/hooks/useBackOrHome(fallback)` hook that checks `window.history.length <= 1` and falls back to the given path instead of `navigate(-1)`. DomainPage uses fallback `'/'`, EntryTypePage uses fallback `` `/d/${domain}` ``, PlaceholderPage uses fallback `'/'`. Updated two tests that asserted `navigate(-1)` behavior: both now simulate the PWA deep-link scenario (single-entry MemoryRouter) and assert the fallback path fires.

---

### WR-02: No catch-all route — unknown paths render a blank screen

**Files modified:** `src/App.tsx`, `src/App.test.tsx`
**Commit:** ed42ea1
**Applied fix:** Added `<Route path="*" element={<PlaceholderPage title="Page Not Found" />} />` as the last child of `<Routes>` in App.tsx. Added two tests: one asserting the "Page Not Found" heading renders for an unknown path, one asserting the Go-back button is present.

---

### WR-03: Unknown-domain error state has no navigation affordance — user is stranded

**Files modified:** `src/pages/DomainPage.tsx`, `src/pages/DomainPage.test.tsx`
**Commit:** 5107622
**Applied fix:** Replaced the bare centered `<p>` in the `!config` early-return branch with a full-layout error page that reuses the `goBack` handler (fallback `'/'`). Added two new tests: one asserting the Back button exists on the unknown-domain error page, one asserting clicking it navigates to the Dashboard.

---

### WR-04: `EntryTypePage` silently accepts an invalid `:domain` param

**Files modified:** `src/pages/EntryTypePage.tsx`, `src/pages/EntryTypePage.test.tsx`
**Commit:** c4124ae
**Applied fix:** Added an explicit `if (!config)` guard after `getDomainConfig(domain)` call, rendering a graceful error page with a Back button (mirroring DomainPage behavior). Added a test for `/d/bogus/show` asserting the unknown-domain error is shown and no Add heading is rendered. The existing unknown-type-but-valid-domain fallback continues to work unchanged.

---

### IN-01: `expense` type registered in two domains — future flat-lookup hazard

**Files modified:** `src/config/navigation.ts`
**Commit:** 7b12c80
**Applied fix:** Added a four-line inline comment immediately above the `NAVIGATION` constant explaining that `'expense'` appears in both `'trips'` and `'expenditures'` by design, and that all type lookups must remain domain-scoped to avoid silently returning only the first match in a flat cross-domain search.

---

_Fixed: 2026-06-15T13:57:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

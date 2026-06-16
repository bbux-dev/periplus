---
phase: 03-navigation-dashboard
reviewed: 2026-06-15T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/config/navigation.ts
  - src/pages/DashboardPage.tsx
  - src/pages/DomainPage.tsx
  - src/pages/EntryTypePage.tsx
  - src/pages/PlaceholderPage.tsx
  - src/App.tsx
findings:
  critical: 0
  warning: 4
  info: 1
  total: 5
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-06-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Six files were reviewed covering the navigation config, four page components, and the top-level router. The taxonomy in `navigation.ts` is consistent with `db.ts` — all domain and type values are valid members of `EntryDomain` / `EntryType`, no drift detected. Route table covers all 8 defined paths; `key` props are correctly assigned within each list. No critical bugs or security issues were found.

Four warnings were identified: the `navigate(-1)` back-button will exit the app when there is no in-app history (deep-link scenario); there is no catch-all 404 route so unknown paths render a blank screen; the unknown-domain error state in `DomainPage` strands the user with no navigation affordance; and `EntryTypePage` silently accepts an invalid domain param, diverging from `DomainPage`'s explicit error handling and setting up a correctness gap for Phase 4 when saving begins.

---

## Warnings

### WR-01: `navigate(-1)` exits the PWA when there is no in-app history

**Files:**
- `src/pages/DomainPage.tsx:24`
- `src/pages/EntryTypePage.tsx:15`
- `src/pages/PlaceholderPage.tsx:10`

**Issue:** All three pages use `navigate(-1)` (equivalent to `window.history.back()`) for the Back button. When a user opens the app fresh via a bookmark, home-screen icon, or shared deep-link (e.g. `/d/media/book`), the React Router history stack is empty. Calling `navigate(-1)` then causes the browser to go to the previous entry in the browser/OS history — which may be a different website, or may close the tab entirely. On an installed PWA in standalone display-mode, this can dismiss the app window. The Back button should degrade gracefully to a `navigate('/')` (or the logical parent path) when there is no in-app history to fall back on.

**Fix:**

```tsx
// Shared hook — src/hooks/useBackOrHome.ts
import { useNavigate } from 'react-router-dom'

export function useBackOrHome(fallback: string = '/') {
  const navigate = useNavigate()
  return () => {
    // history.length === 1 means this is the first entry — no in-app page to go back to
    if (window.history.length <= 1) {
      navigate(fallback, { replace: true })
    } else {
      navigate(-1)
    }
  }
}

// DomainPage — pass the logical parent as fallback
const goBack = useBackOrHome('/')
// EntryTypePage — parent is the domain page
const goBack = useBackOrHome(`/d/${domain}`)
```

Replace each `onClick={() => navigate(-1)}` with `onClick={goBack}`.

---

### WR-02: No catch-all route — unknown paths render a blank screen

**File:** `src/App.tsx:9-25`

**Issue:** The `<Routes>` block defines 8 specific paths but has no `<Route path="*">` fallback. Any URL that does not match — a mistyped path, a stale bookmark from a future refactor, a `/settings` page that hasn't been built yet — renders nothing at all. The user sees a blank white screen with no indication that navigation has failed and no way to recover without using the browser's native navigation.

**Fix:**

```tsx
// Add as the last route inside <Routes>
<Route path="*" element={<PlaceholderPage title="Page Not Found" />} />
```

A minimal not-found page (or repurpose `PlaceholderPage` with a "Go home" link) is sufficient; a blank screen is not acceptable.

---

### WR-03: Unknown-domain error state has no navigation affordance — user is stranded

**File:** `src/pages/DomainPage.tsx:10-16`

**Issue:** When `getDomainConfig(domain)` returns `undefined`, the component renders a centered paragraph but no Back button and no link back to the dashboard. The entire Back-button rendering block at lines 23-30 is inside the success branch only. A user who reaches an unknown-domain URL (manually typed, stale link, etc.) has no in-app way to recover — they can only use the browser's native Back or address bar.

**Fix:**

```tsx
if (!config) {
  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <p>Unknown domain: <strong>{domain}</strong></p>
      </div>
    </div>
  )
}
```

---

### WR-04: `EntryTypePage` silently accepts an invalid `:domain` param — inconsistent with `DomainPage` and will corrupt data in Phase 4

**File:** `src/pages/EntryTypePage.tsx:6-9`

**Issue:** `DomainPage` explicitly checks `getDomainConfig(domain)` and renders an error when the domain is unknown. `EntryTypePage` calls the same function but only uses the result to resolve the type label — it never checks whether `config` itself is `undefined`. Navigating to `/d/invalid_domain/expense` succeeds silently, showing "Add expense" as if everything is normal. In Phase 3 this causes no crash because nothing is saved. In Phase 4 (URL Capture), when the page passes `domain` and `type` as fields to `entriesRepository.create()`, the entry will be written with `domain: 'invalid_domain'` — a value that is not a valid `EntryDomain` in the Dexie schema and violates the TypeScript contract on `LifeLogEntry`.

**Fix:**

```tsx
export function EntryTypePage() {
  const { domain = '', type = '' } = useParams<{ domain: string; type: string }>()
  const navigate = useNavigate()
  const config = getDomainConfig(domain)
  const typeConfig = config?.types.find((t) => t.type === type)

  // Guard: unknown domain (mirrors DomainPage behavior)
  if (!config) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
          <button onClick={() => navigate('/')} aria-label="Go back"
            className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1">
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <p>Unknown domain: <strong>{domain}</strong></p>
        </div>
      </div>
    )
  }

  // remainder unchanged …
}
```

---

## Info

### IN-01: `expense` type registered in two domains — future flat-lookup hazard

**File:** `src/config/navigation.ts:49, 58`

**Issue:** The `expense` `EntryType` appears in both the `trips` and `expenditures` `DomainConfig` types arrays. This matches the intent documented in `db.ts` (`'expense' // trips OR expenditures`) and is correctly handled in the current code because all type lookups are scoped to a specific domain's `.types` array. However, if any future utility performs a flat lookup — e.g., `NAVIGATION.flatMap(d => d.types).find(t => t.type === 'expense')` — it will silently return only the `trips` instance and ignore `expenditures`. This is a subtle trap worth a short inline comment.

**Fix:**

```ts
// navigation.ts — above the NAVIGATION definition, add:
// NOTE: 'expense' intentionally appears in both 'trips' and 'expenditures'.
// All type lookups MUST be scoped to a domain; flat cross-domain lookups are incorrect.
export const NAVIGATION: DomainConfig[] = [
```

---

_Reviewed: 2026-06-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

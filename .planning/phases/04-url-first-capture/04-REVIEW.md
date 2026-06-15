---
phase: 04-url-first-capture
reviewed: 2026-06-15T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/services/extractMetadataFromUrl.ts
  - src/pages/CaptureUrlPage.tsx
  - src/pages/ReviewPage.tsx
  - src/components/ui/Input.tsx
  - src/components/ui/FormField.tsx
  - src/App.tsx
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-06-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 4 implements URL-first capture with a pure offline extractor, two new pages (CaptureUrlPage, ReviewPage), and Input/FormField primitives. The extractor is structurally sound and correctly honours CAPT-04 (never throws, always preserves `sourceUrl`). FormField label association and ARIA attributes are correct. App routing is coherent.

Two patterns undercut correctness: (1) the save path in ReviewPage silently discards Dexie rejections, creating a data-loss risk; (2) all five hostname dispatches use `String.includes()` against a full `host.tld` string, which is systematically over-greedy and can match unintended domains. A forward security concern (unvalidated URL scheme stored in the DB before Phase 6 renders it as a link) is present and should be addressed before the link-rendering phase ships.

---

## Critical Issues

### CR-01: `handleSave` discards Dexie errors — silent data-loss on save failure

**File:** `src/pages/ReviewPage.tsx:105`

**Issue:** The Save button calls `() => { void handleSave() }`. The `void` operator discards the Promise returned by the `async` `handleSave`. If `entriesRepository.create(entry)` rejects (IndexedDB quota exhausted, schema upgrade mid-session, storage error), the rejection is unhandled: no error message is shown, no navigation occurs, and the user sits on ReviewPage with a frozen form and no indication of failure. If they then dismiss the page (Back, Cancel, or a hard reload), their captured entry is permanently lost. This meets the data-loss risk threshold for a BLOCKER.

Note: the `navigate` call is correctly placed *after* `await entriesRepository.create(entry)`, so navigation does not fire on failure — but because the rejection is swallowed, the user receives zero feedback.

**Fix:**
```tsx
// Option A — inline try/catch with minimal UI (add an `error` useState):
const [saveError, setSaveError] = useState<string | null>(null)

const handleSave = async () => {
  setSaveError(null)
  try {
    const entry = { /* ... */ }
    await entriesRepository.create(entry)
    navigate(`/d/${domain}`)
  } catch (err) {
    setSaveError('Save failed. Please try again.')
    console.error('[ReviewPage] save failed:', err)
  }
}

// Then in JSX replace the void call:
<Button variant="primary" onClick={() => { void handleSave() }}>
  Save
</Button>
// with a direct handler (async onClick is fine in React — it never returns a value React cares about):
<Button variant="primary" onClick={handleSave}>
  Save
</Button>
// And render: {saveError && <p role="alert" className="text-sm text-red-500">{saveError}</p>}
```

---

## Warnings

### WR-01: `String.includes()` hostname dispatch is over-greedy across all five extractors

**File:** `src/services/extractMetadataFromUrl.ts:192-199`

**Issue:** Every non-exact hostname check uses `.includes(fragment)` against the full `hostname` string. This produces false positives because the fragment can appear as a *substring* of an unrelated hostname:

| Check (line) | Intended match | Also matches |
|---|---|---|
| `hostname.includes('google.com')` (192) | `www.google.com` | `evil-google.com`, `mygoogle.com` |
| `hostname.includes('imdb.com')` (194) | `www.imdb.com`, `m.imdb.com` | `notimdb.com` (substring at index 3) |
| `hostname.includes('goodreads.com')` (195) | `www.goodreads.com` | `notgoodreads.com` |
| `hostname.includes('amazon.')` (196) | `amazon.com`, `amazon.co.uk` | `notamazon.com` (substring at index 3) |
| `hostname.includes('podcasts.apple.com')` (197) | `podcasts.apple.com` | `xpodcasts.apple.com` |

The `amazon.` case is the worst: the trailing dot is meant to accommodate regional TLDs (`.co.uk`, `.de`), but `'notamazon.com'.includes('amazon.')` is `true` (the substring `amazon.` starts at index 3). A URL from `notamazon.com` with a `/dp/` path segment would have its slug incorrectly extracted and stored as a book title.

**Fix:** Use `===` for exact domains, `endsWith()` for subdomain variants, and a dedicated pattern for Amazon regional TLDs:

```typescript
// google.com — allow any subdomain:
if ((hostname === 'google.com' || hostname.endsWith('.google.com')) &&
    parsed.pathname.startsWith('/maps'))

// imdb.com — www + mobile:
if (hostname === 'www.imdb.com' || hostname === 'm.imdb.com')

// goodreads.com:
if (hostname === 'www.goodreads.com' || hostname === 'goodreads.com')

// amazon — regional TLDs: amazon.com, amazon.co.uk, amazon.de, …
if (hostname === 'amazon.com' ||
    hostname.match(/^(?:www\.)?amazon\.[a-z]{2,3}(?:\.[a-z]{2})?$/))

// podcasts.apple.com — exact:
if (hostname === 'podcasts.apple.com')
```

---

### WR-02: `sourceUrl` stored without scheme validation — forward XSS vector

**File:** `src/pages/CaptureUrlPage.tsx:21` and `src/pages/ReviewPage.tsx:34,51`

**Issue:** `sourceUrl` is persisted as-is from two paths:
1. CaptureUrlPage passes `url.trim()` to the extractor; for an invalid URL (e.g. `javascript:alert(1)`), the `URL` constructor throws and the catch block returns `base` with `sourceUrl` set to the raw string (extractor.ts:184-185). That draft flows into ReviewPage.
2. ReviewPage exposes `sourceUrl` as an editable `<FormField>` (lines 98-104). The user can overwrite it with any string before saving.

React's JSX auto-escaping protects text content but does NOT sanitize `href` attributes: `<a href="javascript:alert(1)">` renders and executes in all major browsers. When Phase 6 adds `<a href={entry.sourceUrl}>` link rendering, every stored entry with an unvalidated sourceUrl becomes a stored XSS vector.

This issue is noted here rather than fixed in Phase 4 (per planning scope), but the enforcement point is **now** — the DB record is the storage gate. The scheme check must be in place before Phase 6 ships any link renderer.

**Fix (apply at save time in ReviewPage, or as a shared validator):**
```typescript
function isSafeUrl(raw: string): boolean {
  try {
    const { protocol } = new URL(raw)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

// In handleSave — reject or strip before persisting:
const safeSourceUrl = sourceUrl && isSafeUrl(sourceUrl) ? sourceUrl : undefined
```

---

### WR-03: CaptureUrlPage has no guard for unknown `typeConfig` — invalid `EntryType` can be persisted

**File:** `src/pages/CaptureUrlPage.tsx:16,21` and `src/pages/ReviewPage.tsx:43`

**Issue:** CaptureUrlPage guards against an unknown *domain* (line 30: `if (!config) return …`), but not against an unknown *type* within a valid domain. When `typeConfig` is `undefined` (e.g. navigating to `/d/media/faketype`), the page renders normally, the Import button is enabled, and `handleImport` calls `extractMetadataFromUrl(url.trim(), type as EntryType)` then navigates to ReviewPage. In ReviewPage, the entry is built with `type: type as EntryType` (line 43) — an unchecked assertion. Dexie has no schema-level enforcement of the `EntryType` union, so the record is persisted with `type: "faketype"`. Future code that switches on `EntryType` (list icons, detail renderers, Phase 6 templates) receives an unexpected discriminant value.

**Fix:** Add a `typeConfig` guard immediately after the `config` guard:
```tsx
// CaptureUrlPage — after the existing !config guard:
if (!typeConfig) {
  return (
    <div …>
      <p>Unknown type: <strong>{type}</strong> in domain <strong>{domain}</strong></p>
    </div>
  )
}
```
The same guard should be mirrored in ReviewPage, which currently has no domain or type validity check at all (unlike CaptureUrlPage which guards domain at line 30).

---

## Info

### IN-01: `extractGoodreads` omits `decodeURIComponent` — inconsistency with `extractAmazon`

**File:** `src/services/extractMetadataFromUrl.ts:107`

**Issue:** `extractAmazon` calls `slugToTitle(decodeURIComponent(titleSlug))` (line 133), but `extractGoodreads` calls `slugToTitle(slug)` without decoding (line 107). `URL.pathname` preserves percent-encoding; it does not decode. A Goodreads URL containing a percent-encoded character in the slug (e.g. `%C3%A9` for `é`) would produce a title with a raw percent sequence: `The%C3%A9 Novel` instead of `The é Novel`. Goodreads slugs are typically ASCII, so this is a low-frequency edge case, but it is an inconsistency that will surface for non-ASCII book titles.

**Fix:**
```typescript
// extractGoodreads line 107 — add decodeURIComponent:
const title = slug ? slugToTitle(decodeURIComponent(slug)) : undefined
// Wrap in try/catch if strictness is desired, though slugs are unlikely to be malformed.
```

---

### IN-02: ReviewPage missing domain-validity guard — asymmetric with CaptureUrlPage

**File:** `src/pages/ReviewPage.tsx:17-18`

**Issue:** CaptureUrlPage renders a domain-unknown error page when `getDomainConfig(domain)` returns undefined (line 30). ReviewPage calls `getDomainConfig(domain)` and `config?.types.find(…)` (lines 17-18) but has no equivalent guard — it proceeds to render and, if a draft is present in `location.state`, to save with `domain: domain as EntryDomain`. In normal navigation this path is unreachable (CaptureUrlPage would have blocked). However, a user with an existing tab can manipulate browser history state (using devtools or a bookmarklet) to reach ReviewPage with arbitrary domain/type values, bypassing all TypeScript-level type safety. In a single-user local-first app the risk is minimal, but the asymmetry makes the guard contract fragile.

**Fix:** Add a domain guard to ReviewPage matching the one in CaptureUrlPage:
```tsx
// After hooks, before the !initialDraft return:
if (!config) {
  return <p>Unknown domain: <strong>{domain}</strong></p>
}
```

---

_Reviewed: 2026-06-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---
phase: 04-url-first-capture
fixed_at: 2026-06-15T22:17:00Z
review_path: .planning/phases/04-url-first-capture/04-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-06-15T22:17:00Z
**Source review:** .planning/phases/04-url-first-capture/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: `handleSave` discards Dexie errors — silent data-loss on save failure

**Files modified:** `src/pages/ReviewPage.tsx`, `src/pages/ReviewPage.test.tsx`
**Commit:** e127f43
**Applied fix:** Added `saveError` useState, wrapped `entriesRepository.create()` in try/catch so rejections surface as a `role="alert"` paragraph near the Save button and suppress navigation. Changed `onClick` from `() => { void handleSave() }` to the direct async handler `handleSave`. Added test that spies on `entriesRepository.create`, makes it reject, and asserts the error alert renders while the domain-probe (navigation target) does not appear.

---

### WR-01: `String.includes()` hostname dispatch is over-greedy across all five extractors

**Files modified:** `src/services/extractMetadataFromUrl.ts`, `src/services/extractMetadataFromUrl.test.ts`
**Commit:** 8947395
**Applied fix:** Replaced all five `hostname.includes()` guards with precise checks:
- google.com: `hostname === 'google.com' || hostname.endsWith('.google.com')`
- imdb.com: `hostname === 'www.imdb.com' || hostname === 'm.imdb.com'`
- goodreads.com: `hostname === 'goodreads.com' || hostname === 'www.goodreads.com'`
- amazon: `hostname === 'amazon.com' || /^(?:www\.)?amazon\.[a-z]{2,3}(?:\.[a-z]{2})?$/.test(hostname)` (handles regional TLDs without substring false-positives)
- podcasts.apple.com: `hostname === 'podcasts.apple.com'` (already exact, tightened)

Added five lookalike-domain tests (evil-google.com, notimdb.com, notgoodreads.com, notamazon.com, xpodcasts.apple.com) all asserting graceful fallthrough to base draft.

---

### WR-02: `sourceUrl` stored without scheme validation — forward XSS vector

**Files modified:** `src/pages/ReviewPage.tsx`, `src/pages/ReviewPage.test.tsx`
**Commit:** f85bf60
**Applied fix:** Added `isSafeUrl(raw: string): boolean` helper above `ReviewPage` that returns true only for `http:` and `https:` protocols. In `handleSave`, computed `safeSourceUrl = sourceUrl && isSafeUrl(sourceUrl) ? sourceUrl : undefined` and spread that into the entry instead of the raw `sourceUrl`. Added two tests: one asserting `javascript:alert(1)` is not stored (entry saved without sourceUrl), one asserting a valid `https:` URL passes through unchanged.

---

### WR-03: CaptureUrlPage has no guard for unknown `typeConfig`

**Files modified:** `src/pages/CaptureUrlPage.tsx`, `src/pages/CaptureUrlPage.test.tsx`, `src/pages/ReviewPage.tsx`
**Commit:** a0ca9dd
**Applied fix:** Added a `if (!typeConfig)` guard immediately after the existing domain guard in `CaptureUrlPage`, rendering a "Unknown type: X in domain Y" error page and suppressing the capture form and Import button. Mirrored the same guard in `ReviewPage` (placed before the `!initialDraft` redirect check, after all useState calls). Added test for `/d/media/faketype` asserting the error message renders and the Import button is absent.

---

### IN-01: `extractGoodreads` omits `decodeURIComponent`

**Files modified:** `src/services/extractMetadataFromUrl.ts`, `src/services/extractMetadataFromUrl.test.ts`
**Commit:** b290098
**Applied fix:** Changed `slugToTitle(slug)` to `slugToTitle(decodeURIComponent(slug))` in `extractGoodreads`, matching `extractAmazon`. Added a fixture for `le-p%C3%A9tit-prince` asserting the title contains `é` and does not contain the raw `%C3%A9` percent sequence. (Note: `slugToTitle`'s ASCII `\b\w` regex capitalises after `é` as a non-word boundary, so `PéTit` is the correct output for the current helper — the fix's goal is decoded characters, not Unicode-aware title-casing.)

---

### IN-02: ReviewPage missing domain-validity guard

**Files modified:** `src/pages/ReviewPage.tsx`, `src/pages/ReviewPage.test.tsx`
**Commit:** 7b92476
**Applied fix:** Added `if (!config) return <p>Unknown domain: <strong>{domain}</strong></p>` immediately before the typeConfig guard (which was added in WR-03). This makes ReviewPage symmetric with CaptureUrlPage. Guard is placed after all useState/useEffect hooks to satisfy React hook ordering rules. Added test asserting that rendering ReviewPage at `/d/fakeDomain/place/review` with a draft shows the unknown-domain error and does not render the Save button.

---

## Skipped Issues

None.

---

_Fixed: 2026-06-15T22:17:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

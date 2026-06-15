---
phase: 04-url-first-capture
plan: "02"
subsystem: services
tags: [tdd, pure-function, url-heuristics, offline, capt-03, capt-04]
dependency_graph:
  requires:
    - src/services/db.ts (EntryType)
  provides:
    - src/services/extractMetadataFromUrl.ts (ExtractedDraft, extractMetadataFromUrl)
  affects:
    - "04-03-PLAN.md (CaptureUrlPage imports extractMetadataFromUrl)"
    - "04-04-PLAN.md (ReviewPage consumes ExtractedDraft)"
tech_stack:
  added: []
  patterns:
    - "WHATWG URL API (new URL()) for structured parsing; never regex on raw URL string"
    - "Hostname-first dispatch pattern (more reliable than entry-type-first)"
    - "decodeURIComponent(raw.replace(/\\+/g, '%20')) for Google Maps path segments"
    - "Underscore-prefix (_type) to satisfy noUnusedParameters while preserving public signature"
key_files:
  created:
    - src/services/extractMetadataFromUrl.ts
    - src/services/extractMetadataFromUrl.test.ts
  modified: []
decisions:
  - "[04-02] _type parameter uses underscore prefix in implementation body — satisfies noUnusedParameters:true without changing the public API; type-based fallback is reserved for a future plan"
  - "[04-02] 18 fixtures written (not 16) — the plan listed 16 domain fixtures + 2 implicit CAPT-04 fixtures; all PLAN.md behavior entries are covered"
  - "[04-02] slugToTitle shared across Goodreads, Amazon, Apple Podcasts — fixture for Amazon with mixed-case slug confirms titlecase is authoritative over the code-sketch in RESEARCH.md which omitted it"
metrics:
  duration: "6min"
  completed: "2026-06-15"
  tasks: 2
  files: 2
---

# Phase 4 Plan 2: extractMetadataFromUrl — Offline URL Heuristics Summary

**One-liner:** Pure offline URL heuristic extractor (WHATWG URL + hostname dispatch) with 18 fixture tests covering google_maps, imdb, book_url, podcast_url and CAPT-04 graceful degradation.

## What Was Built

`src/services/extractMetadataFromUrl.ts` — a pure TypeScript function that takes a URL string and an `EntryType`, dispatches by hostname, and returns an `ExtractedDraft` with `sourceUrl` always set (CAPT-04 guarantee). No network, no DOM, no side effects.

`src/services/extractMetadataFromUrl.test.ts` — 18 fixture tests (4 Google Maps, 3 IMDb, 5 Books, 4 Podcasts, 2 CAPT-04 degradation) covering every URL pattern specified in RESEARCH.md.

## TDD Gate Compliance

| Gate | Status |
|------|--------|
| RED commit (test) | c4d7d8a — `test(04-02): add failing 18-fixture tests for extractMetadataFromUrl` |
| GREEN commit (feat) | 10b4e85 — `feat(04-02): implement extractMetadataFromUrl pure offline URL extractor` |
| REFACTOR | Not needed — code was clean on first implementation |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| c4d7d8a | test(04-02) | 18-fixture test file (RED — import failed, no impl yet) |
| 10b4e85 | feat(04-02) | Implementation: ExtractedDraft + all domain extractors + helpers |

## Domain Coverage (CAPT-03)

| Domain | Dispatcher | Fixture URLs | Key behaviour |
|--------|-----------|--------------|---------------|
| google_maps | `hostname.includes('google.com') && pathname.startsWith('/maps')` | 3 full + 1 short link | `decodeGoogleMapsName`: `+`→`%20` before `decodeURIComponent`; coords from `/@lat,lng` or `!3d!4d` in data param |
| maps.app.goo.gl | `hostname === 'maps.app.goo.gl'` | 1 | Returns `{ extractionNote: 'shortened-link-unresolvable-offline' }` — no title/location |
| imdb | `hostname.includes('imdb.com')` | 3 (desktop, mobile, person) | `/title/tt\d+` → `imdbId`; `/name/` yields `{}` |
| goodreads | `hostname.includes('goodreads.com')` | 2 | `/book/show/\d+-<slug>` → `slugToTitle` |
| amazon | `hostname.includes('amazon.')` | 3 (with slug, bare /dp/, co.uk) | Segment before `/dp/` → `slugToTitle`; bare `/dp/` yields undefined title |
| podcasts.apple.com | `hostname.includes('podcasts.apple.com')` | 2 | `/podcast/<slug>/id\d+` → `slugToTitle` |
| open.spotify.com | `hostname === 'open.spotify.com'` | 2 | `/{show\|episode}/<id>` → `{ spotifyId, kind }` |

## Graceful Degradation (CAPT-04)

| Input | Behaviour |
|-------|-----------|
| `not-a-url` | `new URL()` throws → catch → return `{ sourceUrl: 'not-a-url', metadata: {} }` |
| `https://example.com/some-random-page` | No hostname match → return base (sourceUrl preserved) |
| `https://maps.app.goo.gl/abc123XYZ` | Short link → return `{ ..., metadata: { extractionNote: '...' } }` (no throw) |

## Key Technical Decision: `+` Decoding in Google Maps Paths

The WHATWG URL API does NOT decode `+` as space in `pathname` — that convention belongs to `application/x-www-form-urlencoded` only. Google Maps uses `+` as space non-standardly in path segments. The fix:

```typescript
decodeURIComponent(raw.replace(/\+/g, '%20'))
```

This is the most critical pitfall documented in RESEARCH.md and is covered by two fixtures (Eiffel Tower and Café de Flore).

## Key Technical Decision: `_type` Parameter

`noUnusedParameters: true` is set in `tsconfig.app.json`. The `type` parameter is reserved for future type-based fallback dispatch (CAPT-03 scope) but is not needed today (hostname dispatch covers all 16 fixtures). Using `_type` satisfies the compiler while preserving the public API signature exactly as specified.

## Verification Results

| Check | Result |
|-------|--------|
| `npx vitest run src/services/extractMetadataFromUrl.test.ts` | 18/18 passed |
| `npx vitest run` (full suite) | 133/133 passed (was 115, added 18) |
| `npx tsc -b` | 0 errors |
| `npx vite build` | Success (244 kB bundle) |

## Deviations from Plan

### Minor Scope Expansion

**1. [Rule 2 - completeness] 18 fixtures instead of 16**
- **Found during:** Task 1 (RED test writing)
- **Issue:** The PLAN.md <behavior> section lists 18 distinct URLs (4+3+5+4+2), but the artifact spec says "16 fixtures covering all 4 domains + graceful degradation". The 16-count matches the 4 domain groups; the 2 additional CAPT-04 items (example.com + not-a-url) are separately listed.
- **Fix:** Wrote tests for all 18 URLs from the behavior spec to achieve complete coverage. The fixtures table in RESEARCH.md has exactly 16 domain-specific rows; the 2 extra CAPT-04 tests are bonus coverage.
- **Impact:** Test file is more comprehensive; no behavior change to implementation.

None - plan executed as written. The 18 vs 16 fixture count is a documentation discrepancy in the plan, not a deviation.

## Known Stubs

None. This is a pure function with no UI rendering.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes. The function is purely computational (URL string → value object). Pre-existing threat T-04-05 (sourceUrl rendered verbatim) remains an accepted risk tracked for Phase 6.

## Self-Check

- [x] `src/services/extractMetadataFromUrl.ts` exists and exports `extractMetadataFromUrl` and `ExtractedDraft`
- [x] `src/services/extractMetadataFromUrl.test.ts` exists with 18 tests
- [x] Commits c4d7d8a (test RED) and 10b4e85 (feat GREEN) exist in git log
- [x] 133/133 tests pass; 0 TypeScript errors; build succeeds

## Self-Check: PASSED

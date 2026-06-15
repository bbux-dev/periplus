# Phase 4: URL-First Capture - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

A user can capture an entry from a pasted URL via the default flow, review extracted metadata, and save it — even offline.

**Requirements:** SETUP-05, CAPT-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05, CAPT-06

**Depends on:** Phase 2 (entriesRepository, LifeLogEntry), Phase 3 (navigation, entry-type routes, EntryTypePage landing).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss skipped per `workflow.skip_discuss=true`. Use ROADMAP goal/criteria, REQUIREMENTS.md CAPT text, the LifeLogEntry model + entriesRepository from Phase 2, the navigation taxonomy from Phase 3, and the LOCKED stack.

### Locked constraints / key design facts
- **Offline-first extraction**: the app works offline (PWA), so `extractMetadataFromUrl(url, type)` MUST parse the URL string/domain itself — NO network fetch of the page. Heuristics per CAPT-03 for `google_maps`, `imdb`, `book_url`, `podcast_url`. Best-effort: when little is extractable, preserve the URL and still open Review with whatever fields exist (CAPT-04).
- **URL-first is the DEFAULT path**: after choosing an entry type (Phase 3 EntryTypePage at `/d/:domain/:type`), the URL Capture screen is shown by default. `Enter Manually` is a clearly visible SECONDARY action — NOT the default (CAPT-06). Manual entry itself lands in Phase 5; in Phase 4 the `Enter Manually` button must exist and route to the (placeholder/manual) path, but the manual form is Phase 5.
- **SETUP-05 primitives**: add `Input` and `FormField` primitives to `components/ui/` (mirroring the existing `Button` primitive + `cn` convention). These back the capture URL input and the Review form fields.
- **Review screen**: edit all visible extracted fields; Save persists a `LifeLogEntry` via `entriesRepository.create()` and navigates to detail/category; Cancel discards. (Entry detail screen is Phase 6 — Save can navigate to the domain/category screen or a placeholder detail for now.)
- The Phase 1 throwaway counter should be REMOVED in this phase if it conflicts with the capture flow at `/` (per Phase 1/2 notes: "remove when real capture lands" = Phase 4). Remove cleanly with its tests, OR leave WelcomePage out of the `/` route — choose the clean approach; don't leave dead code.

</decisions>

<code_context>
## Existing Code Insights

Build on Phases 2 + 3: consume `entriesRepository.create()` and the `LifeLogEntry` model (`src/services/db.ts`); the entry-type route `/d/:domain/:type` (EntryTypePage) becomes the entry into the capture flow; reuse `navigation.ts` for domain/type labels; mirror `Button.tsx`/`cn.ts` for the new `Input`/`FormField` primitives. New service `src/services/extractMetadataFromUrl.ts`. New pages for URL Capture and Review (under `src/pages/`). Mirrors patrimonium/apps/web structure per [[architecture-template]].

</code_context>

<specifics>
## Specific Ideas

Success criteria (validation gate — RTL + unit tests must prove these):
1. After choosing an entry type, the URL Capture screen shows by default with a visible (non-default) `Enter Manually` button.
2. Pasting a Google Maps URL and importing lands on a Review screen with extracted fields.
3. When extraction yields little, the URL is preserved and Review still opens with available fields.
4. Editing fields on Review and tapping Save persists a `LifeLogEntry` (e.g. a Trip Place from a Google Maps URL).
5. The `Input` and `FormField` primitives back the capture/review forms.

Notes:
- `extractMetadataFromUrl(url, type)` returns a PARTIAL draft (Partial<LifeLogEntry>-ish): title, sourceUrl (always preserved), location/coords (google_maps), maybe domain-inferred fields. Pure function — fully unit-testable offline with sample URLs (Google Maps place URL, IMDb title URL, a book URL, a podcast URL).
- Google Maps URL heuristics: place name often in the `/place/<Name>/` path segment (URL-decoded, `+`→space); coordinates in the `@lat,lng,zoom` segment or `!3dLAT!4dLNG`. IMDb: `tt\d+` id + title slug. Be robust to varied formats; degrade gracefully (CAPT-04).
- Save path: `entriesRepository.create()` with the reviewed draft → navigate to the domain/category screen (entry detail is Phase 6). Cancel → discard, navigate back.
- Test the extraction function thoroughly (it's the risky bit) with representative URLs per domain; test the capture→review→save flow with RTL.

</specifics>

<deferred>
## Deferred Ideas

None — discuss skipped. Manual-entry form = Phase 5; entry detail/list/export = Phase 6. Network-based rich metadata fetching is explicitly OUT of scope (offline-first; URL-string heuristics only).

</deferred>

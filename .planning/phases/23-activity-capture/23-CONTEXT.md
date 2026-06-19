# Phase 23: Activity Capture - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning
**Mode:** Auto-generated (skip_discuss) + milestone research + engine mapping

<domain>
## Phase Boundary

Build the activity-logging flow: a type-picker page → an activity form (with an accessible 1–5 star
rating). Activities are stamped with the active trip like expenses. Previous Trips / Trip Detail is
Phase 24.

Delivers (ACT-01..06):
- `ActivityTypePage` at `/activity`: large tap-target buttons Hike, Show, Restaurant, Cafe, Other →
  navigate to the form pre-seeded with the chosen type.
- `ActivityFormPage` at `/activity/:type`: Name (required), Location (optional), Rating (optional),
  Notes (optional). For "Other", an additional required free-text Type field.
- `StarRating` component: 5 `<button>` stars, tap N → set N, tap selected → clear, `aria-label`
  per star, keyboard left/right arrows.
- Save → `activity` entry stamped with `activityType` + `tripId`, `domain='trips'`, local-date
  `occurredAt`; navigate back to Trip Home.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Activity types (exact, ordered)
Hike, Show, Restaurant, Cafe, Other. Define once as a shared `ACTIVITY_TYPES` constant. Route param
`:type` carries the chosen type (URL-safe lowercase slug, e.g. `hike`/`other`); the form resolves it
back to the canonical label. For Hike/Show/Restaurant/Cafe, `metadata.activityType` = the chosen
label (e.g. `"Hike"`). For Other, `metadata.activityType` = the user's free-text Type field value
(required; saving with it empty shows a validation error, alongside the required Name).

### Activity save — reuse the single stamped path
- Build a `ReviewDraft` then call `draftToEntry(draft, 'activity', 'trips', activeMode)` and
  `entriesRepository.create(...)`.
- `domain` MUST be the literal `'trips'` (do NOT reach for any default-domain helper; the old
  `defaultDomainForType` is gone). `type` is `'activity'`.
- `metadata.tripId` is stamped AUTOMATICALLY by `draftToEntry` from the active mode — never set it by
  hand.
- Field → mapping (matches `ENTRY_FIELDS.activity`): Name → `core.title` (required); Location →
  `core.location`; Rating (1–5 or unset) → `metadata.rating`; Notes → `core.description`;
  Type → `metadata.activityType`. (Use `buildReviewDraft(ENTRY_FIELDS.activity, formValues)` if
  convenient, or construct the draft directly.)

### Dates — local, not UTC
- `occurredAt` defaults to today's LOCAL midnight epoch via `todayLocalMidnightEpoch()` /
  `todayLocalDate()` from `captureService.ts`. NEVER `new Date().toISOString()`.

### Active trip required
- These pages assume an active trip (reached from Trip Home). If there is no active trip, redirect to
  `/` (or `/create-trip`) rather than saving an unstamped entry. Reuse the active-mode read; don't
  re-introduce the loading-vs-empty ambiguity (use the established settled-signal pattern if a guard
  is needed).

### StarRating (accessible, zero new deps)
- 5 `<button type="button">` elements using `@heroicons/react/24/solid` `StarIcon` (filled) and
  `@heroicons/react/24/outline` `StarIcon` (empty) — already a dependency (`^2.2.0`).
- Each star: `aria-label="N stars"` (or "1 star"), min 44×44px tap target. Tap star N → rating N; tap
  the currently-selected star → clear to unset (0/undefined). Keyboard: Left/Right arrows move
  selection; the control is focusable. Optional (rating may be left unset). Consider
  `role="radiogroup"` + `aria-checked` OR a labeled button row — implementer's discretion, but it
  MUST be keyboard-operable and screen-reader-labeled.

### Validation
- Name is required (all types). For Other, Type is ALSO required. Save blocked with visible
  per-field validation messages when required fields are empty; the write does not happen.

### Claude's Discretion
Exact page layouts, the type→slug mapping, whether the form is one page reading `:type` or separate,
and star visual sizing are at Claude's discretion (mobile-first, minimal typing).
</decisions>

<canonical_refs>
## Canonical References

- `.planning/research/STACK.md` — StarRating = Heroicons buttons; zero new deps.
- `.planning/research/PITFALLS.md` — star-rating a11y (`<button>` not `<div>`; aria-label per star);
  domain='trips'; UTC date; activity activityType stamping.
- `src/services/captureService.ts` — `draftToEntry(draft,'activity','trips',activeMode)`,
  `todayLocalMidnightEpoch()`.
- `src/config/entryFields.ts` — `ENTRY_FIELDS.activity` (name/location/rating/description/activityType),
  `buildReviewDraft`.
- `src/components/dashboard/ExpenseSheet.tsx` — the Phase-22 save-path analog (draft build →
  draftToEntry → create; strict input validation; saving/double-submit guard pattern to mirror).
- `src/services/tripService.ts` — `useActiveMode` (active trip). `src/services/entriesRepository.ts`.
- `src/components/ui/{FormField,Input,Button}` — reuse for the form.
- `src/App.tsx` — placeholder routes `/activity` and `/activity/:type` to replace.
- `src/pages/CreateTripPage.tsx` — a simple form page analog (validation + navigate).
</canonical_refs>

<specifics>
## Specific Ideas

- Mirror the Phase-22 ExpenseSheet save hardening: strict required-field validation, a synchronous
  `savingRef` double-submit guard, a `catch` around the Dexie write, and `Number.isFinite`/strict
  parsing where numeric. Set `title` = Name (so entries aren't 'Untitled').
- `ACTIVITY_TYPES` constant is the single source of truth (the type page maps over it).
- All new Dexie tests use `vi.useFakeTimers({ toFake: ['Date'] })`. Test: type page renders 5
  buttons; Other shows the required Type field and validates it; saved entry has `type:'activity'`,
  `domain:'trips'`, `metadata.activityType`, `metadata.tripId`, local-date `occurredAt`; StarRating
  tap-to-set, tap-to-clear, arrow keys, aria-labels.
</specifics>

<deferred>
## Deferred Ideas
- Previous Trips list + Trip Detail + category-grouped expense report + timeline + inline edit/delete
  → Phase 24.
</deferred>

---

*Phase: 23-activity-capture*
*Context gathered: 2026-06-19 (skip_discuss + research + engine mapping)*

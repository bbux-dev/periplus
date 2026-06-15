# Phase 6: Entry List, Detail & Export - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

A user can browse, filter, and inspect all saved entries and export the whole log as JSON.

**Requirements:** VIEW-01, VIEW-02, VIEW-03, VIEW-04, EXP-01

**Depends on:** Phase 2 (entriesRepository: list/get/useEntries, LifeLogEntry), Phase 3 (navigation/routes — /entries + /entries/:id placeholders exist), Phases 4-5 (entries are now created via capture + manual).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss skipped per `workflow.skip_discuss=true`. Use ROADMAP goal/criteria, REQUIREMENTS.md VIEW/EXP text, the entriesRepository + useEntries reactive hook, navigation taxonomy, and Phases 1-5 conventions.

### Locked constraints / key design facts
- **Entry List (VIEW-01/02)**: a screen at the existing `/entries` route (swap PlaceholderPage → EntryListPage) listing ALL saved entries reactively (useEntries). Each row shows title, type, date (occurredAt or recordedAt), and amount when present. Filter control: All / Media / Trips / Expenditures (by domain). The list must be reachable — add a link to `/entries` from the Dashboard (currently no link exists).
- **Entry Detail (VIEW-03)**: a screen at the existing `/entries/:id` route (swap PlaceholderPage → EntryDetailPage) showing the FULL entry: title, type, description, source URL, amount, location, tags, and a metadata JSON preview (pretty-printed JSON.stringify of the metadata bag). Reachable by tapping a list row.
- **SECURITY (carried from Phase 4)**: when rendering `sourceUrl` as a clickable link, validate the scheme is http/https first (reuse the `isSafeUrl` helper from Phase 4) — do NOT render a `javascript:` URL as an href. If unsafe/absent, render as plain text or omit the link.
- **Persistence (VIEW-04)**: entries persist across refresh — already guaranteed by Dexie/IndexedDB from Phase 2; the list reads from the repository so a refresh shows the same entries. (Real cross-refresh in a browser is manual-only; the automated proxy is that the list reads persisted IndexedDB state.)
- **Export (EXP-01)**: `services/exportEntries.ts` exports ALL entries as a JSON file. Pure data function (returns the JSON string / blob) + a small browser trigger (Blob + URL.createObjectURL + anchor download). Keep the data-shaping pure & unit-testable; the download trigger is thin and mockable in tests.

</decisions>

<code_context>
## Existing Code Insights

Build on Phases 2-5: consume `entriesRepository.list()` / `useEntries()` (reactive) and `entriesRepository.get(id)`; swap the `/entries` + `/entries/:id` PlaceholderPage routes in src/App.tsx for EntryListPage + EntryDetailPage; reuse `navigation.ts` for domain labels/filters, `Button`/`Input`/`FormField`/`cn` primitives, and the Phase 4 `isSafeUrl` helper for the sourceUrl link. New: `src/pages/EntryListPage.tsx`, `src/pages/EntryDetailPage.tsx`, `src/services/exportEntries.ts`, and a Dashboard link to /entries. Mirrors patrimonium/apps/web structure per [[architecture-template]]. This is the final milestone phase — after it the v0.1.0 tracer milestone is functionally a working local life-log.

</code_context>

<specifics>
## Specific Ideas

Success criteria (validation gate — RTL + unit tests must prove these):
1. Entry List shows all saved entries with title, type, date, and amount when present.
2. The user can filter the list by All / Media / Trips / Expenditures.
3. Entry Detail shows the full entry including a metadata JSON preview.
4. Saved entries are still present after a page refresh.
5. The user can export all entries as a JSON file.

Notes:
- EntryListPage: reactive via useEntries; filter state (All/Media/Trips/Expenditures) filters by `entry.domain`; empty state when no entries; row → navigate to /entries/:id. Show amount only when present (expenses).
- EntryDetailPage: reads :id via entriesRepository.get (a reactive get hook or one-shot load + state); renders all core fields + tags + a `<pre>`/code block of JSON.stringify(metadata, null, 2). Guard for unknown id (not found → graceful message + Back). sourceUrl rendered as a safe link (isSafeUrl) or plain text.
- exportEntries: pure function builds the JSON (all entries, stable shape, maybe a wrapper {version, exportedAt?, entries}). NOTE: exportedAt would need a timestamp — if included, inject it (don't call Date.now() inside the pure fn in a way that breaks determinism in tests; pass it in or keep the pure part just the entries array). The download trigger (Blob/createObjectURL/anchor) is a thin separate function, mocked in tests (jsdom lacks a real download).
- Test: list renders rows from fake-indexeddb entries (VIEW-01/02), filter narrows by domain (VIEW-02), detail shows full entry + metadata JSON (VIEW-03), persistence proxy = list reads repository state (VIEW-04), export produces correct JSON for all entries (EXP-01) with the download trigger mocked.

</specifics>

<deferred>
## Deferred Ideas

None — discuss skipped. This is the final phase of the milestone. Edit/delete-from-detail and import are out of scope unless trivially adjacent.

</deferred>

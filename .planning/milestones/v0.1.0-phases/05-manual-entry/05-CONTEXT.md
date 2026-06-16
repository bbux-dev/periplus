# Phase 5: Manual Entry - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

A user can create any entry type through the secondary manual path with type-appropriate fields.

**Requirements:** MAN-01, MAN-02, MAN-03

**Depends on:** Phase 2 (LifeLogEntry, entriesRepository), Phase 3 (navigation/routes), Phase 4 (Input/FormField primitives, ReviewPage→Save flow, "Enter Manually" button + /d/:domain/:type/manual route placeholder).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss skipped per `workflow.skip_discuss=true`. Use ROADMAP goal/criteria, REQUIREMENTS.md MAN text, the LifeLogEntry model + entriesRepository, the navigation taxonomy, and Phase 4's Input/FormField + ReviewPage→Save infrastructure.

### Locked constraints / key design facts
- **Reachability (MAN-01)**: the Manual Entry screen is reachable ONLY by clicking "Enter Manually" on the URL Capture screen (CAPT-06). It must NOT be the default; the URL-first path stays default. The route `/d/:domain/:type/manual` already exists (currently a placeholder) and the "Enter Manually" button already targets it (Phase 4).
- **Type-appropriate fields (MAN-02)**: the manual form shows fields appropriate to the entry type:
  - common (all): title, description, occurredAt, tags
  - expense: amount, currency, category, merchant, notes
  - place: name, address, notes, tags
  - media (show/movie/book/podcast): title, creator, date, rating, notes
  This implies a per-type FIELD SCHEMA config (which fields each EntryType shows), driving the form. Map these onto LifeLogEntry fields (e.g. amount→amount, name/address→title/location, creator→metadata or a mapped field), keeping the LifeLogEntry contract intact (extra type-specific fields can live in metadata).
- **Review → Save (MAN-03)**: the manual form does NOT save directly — it builds a draft and flows through the SAME ReviewPage → Save path as URL capture (navigate to the review route with `{ state: { draft } }`). This reuses Phase 4's ReviewPage + entriesRepository.create. Keeps one Save path.
- Reuse Phase 4's Input + FormField primitives. Reuse the existing unknown-domain/unknown-type guards pattern.

</decisions>

<code_context>
## Existing Code Insights

Build on Phase 4: the `/d/:domain/:type/manual` route (currently PlaceholderPage in src/App.tsx) becomes ManualEntryPage. Reuse `src/components/ui/Input.tsx` + `FormField.tsx`, the ReviewPage draft contract (`{ state: { draft } }` via react-router location.state) and `entriesRepository.create()`. The extractMetadataFromUrl `ExtractedDraft` shape is the draft contract ReviewPage already consumes — the manual form should produce a compatible draft. New: a field-schema config (e.g. `src/config/entryFields.ts`) keyed by EntryType, and `src/pages/ManualEntryPage.tsx`. Mirrors patrimonium/apps/web structure per [[architecture-template]].

</code_context>

<specifics>
## Specific Ideas

Success criteria (validation gate — RTL + unit tests must prove these):
1. Manual Entry screen is only reachable by clicking "Enter Manually" (not the default; URL-first stays default).
2. The manual form shows type-appropriate fields (expense: amount/currency; place: name/address; media: creator; plus the common fields).
3. A Media Book entry can be created manually and saves.
4. A Trip Expense AND an Expenditure Expense can be created manually (note: 'expense' type exists in both trips and expenditures domains — the form must work for both domain contexts).

Notes:
- Build a `entryFields` config keyed by EntryType (or domain+type) listing the fields to render, their labels, input types (text/number/date/select for currency), and how each maps onto LifeLogEntry (core field vs metadata bag). Single source of truth so the form stays in sync.
- ManualEntryPage reads :domain/:type, renders the field set from the config, collects values into a draft, and navigates to the existing ReviewPage (`/d/:domain/:type/review`) with `{ state: { draft } }`. ReviewPage already edits + Saves — verify ReviewPage shows the manually-entered fields (it currently renders a fixed set: title/description/location/sourceUrl). If the manual draft carries fields ReviewPage doesn't display (e.g. amount, currency, creator), either extend ReviewPage to render draft-present fields generically OR ensure those fields are mapped into the draft fields ReviewPage already shows + metadata. Choose the approach that makes SC3/SC4 (book saves; trip/expenditure expense saves with their fields) actually persist correctly — this is the integration risk.
- Test: Enter Manually reachability (MAN-01); per-type field rendering (MAN-02) for expense/place/media; full manual→review→save for a Book (SC3) and for a Trip Expense + Expenditure Expense (SC4) persisting via fake-indexeddb with the type-specific fields intact.

</specifics>

<deferred>
## Deferred Ideas

None — discuss skipped. Entry list/detail/export = Phase 6.

</deferred>

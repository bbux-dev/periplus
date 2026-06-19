# Phase 17: Editable & Deletable Saved Entries - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped); enriched from design note

<domain>
## Phase Boundary

Make saved entries editable and deletable from the entry detail experience. Wire an edit form
(reusing `ENTRY_FIELDS[type]` + `buildReviewDraft`) over the EXISTING `entriesRepository.update`
/ `.delete` (both already implemented, currently unused). Edit metadata, fix core fields, delete
with confirm. `recordedAt` immutable; `occurredAt` editable.

Source: `.planning/notes/editable-saved-entries-design.md`.
</domain>

<decisions>
## Implementation Decisions

### Locked by design note + codebase conventions
- **Dedicated edit route** `/entries/:id/edit` (cleaner than inline toggle; matches the app's
  page-per-screen routing). Detail page stays read-only + gains Edit/Delete affordances.
- **Reuse the capture field config**: render `ENTRY_FIELDS[entry.type]` via the existing
  `FormField` component exactly like `ManualEntryPage`; pre-populate from the saved entry (inverse
  of `buildReviewDraft`). The DSL/field config stays the single source of truth.
- **Persist via the existing repo** — `entriesRepository.update(id, changes)` (returns Dexie count);
  delete via `entriesRepository.delete(id)`. Do not add new persistence primitives unless a verified
  clearing-semantics gap forces it.
- **`recordedAt` immutable** — never rendered as an editable field, never in the changes object.
  `occurredAt` IS editable (it's a normal date field in ENTRY_FIELDS).
- **Metadata is MERGED, not replaced**, on save: `{ ...entry.metadata, ...edits }`. An entry may
  carry metadata keys not in `ENTRY_FIELDS` (e.g. `currency` IS in fields, but URL/DSL capture and
  the upcoming Phase 18 `mode`/`modeLabel` stamps are not). Replacing wholesale would silently drop
  them. Known fields can still be cleared (delete the key); unknown keys are preserved.
- **Editable "extra metadata"**: render a text input for every metadata key present on the entry
  that ENTRY_FIELDS does not already cover. This is exactly how "re-assigning an entry's
  mode/modeLabel after the fact falls out of metadata editing" (EEDIT-01) — including the Phase 18
  stamps once they exist.

### Claude's Discretion
- Delete confirm style: prefer an inline two-step confirm (Delete → "Confirm? / Cancel") over
  `window.confirm` (more testable + mobile-slick). Placement of Edit vs Delete affordances.
- Whether to split EntryEditPage into a loader (tri-state) + an inner form component that owns
  lazy-initialized form state (recommended — avoids async-init-after-mount churn).
</decisions>

<code_context>
## Existing Code Insights

- `src/pages/ManualEntryPage.tsx` — the form-rendering template: `fields.map(f => <FormField ...>)`,
  `inputType==='tags' ? 'text' : inputType`, required-field pre-flight validation, Back/Cancel.
- `src/config/entryFields.ts` — `ENTRY_FIELDS[type]` (FieldDescriptor[]), `buildReviewDraft(fields,
  formValues)` (sparse: skips empty; date via `Date.parse(\`${d}T00:00:00\`)`; tags split on comma;
  number NaN/range-skip). `FieldMapping` is `{kind:'core',field}` | `{kind:'metadata',key}`.
- `src/services/entriesRepository.ts` — `update(id, changes): Promise<number>` and
  `delete(id): Promise<void>` already exist; `useEntry(id)` tri-state hook (undefined=loading,
  null=not found, entry).
- `src/pages/EntryDetailPage.tsx` — read-only detail; `useEntry` tri-state; renders title (h1),
  description, sourceUrl (isSafeUrl-gated), amount, location, tags, metadata JSON. Add Edit + Delete
  here.
- `src/App.tsx` — routes; add `<Route path="/entries/:id/edit" element={<EntryEditPage />} />` after
  the `/entries/:id` detail route.
- `src/components/ui/FormField.tsx` — props id, label, type, placeholder, required, min, max, value,
  onChange.
- Test harness: `EntryDetailPage.test.tsx` — `db.delete()/open()` in beforeEach, `entriesRepository.create(makeEntryData())`,
  MemoryRouter+Routes with `/entries/:id`. Mirror this for the new page/affordance tests.
</code_context>

<specifics>
## Specific Ideas

- Inverse mapper `formValuesFromEntry(fields, entry)`: title→entry.title; description/location→''-fallback;
  amount→String(amount) or ''; occurredAt→`new Date(occurredAt).toLocaleDateString('en-CA')` or '';
  tags→`entry.tags.join(', ')`; metadata key→stringified metadata value or ''.
- `buildEntryUpdate(fields, entry, formValues, extraMetadata)` → `Partial<Omit<LifeLogEntry,'id'>>`:
  core fields covered by the form set from parsed values (cleared → undefined; title falls back to
  'Untitled'); metadata = `{...entry.metadata}` with known-field keys set/deleted per the form and
  extra-metadata keys set/deleted per their inputs. NEVER includes recordedAt/syncedAt/domain/type.
- Verify clearing works end-to-end (edit → clear description → save → detail no longer shows it). If
  Dexie `update` leaves a stale key, the detail-page truthy guards still hide it; only escalate to a
  repository `put`/full-replace if a test proves a real data bug.
</specifics>

<deferred>
## Deferred Ideas

- Filtering/grouping entries by mode instance — future milestone (STAMP-01 enables it).
- JSON import of entries — unchanged, still deferred.
</deferred>

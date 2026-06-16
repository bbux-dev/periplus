# Phase 5: Manual Entry - Research

**Researched:** 2026-06-15
**Domain:** React form configuration, draft typing, ReviewPage integration
**Confidence:** HIGH — all findings derived from direct codebase inspection; no external libraries added

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Reachability: ManualEntryPage is at `/d/:domain/:type/manual` (already routed to PlaceholderPage); reachable ONLY via "Enter Manually" on CaptureUrlPage (Phase 4 already wired). URL-first path stays default.
- Type-appropriate fields per MAN-02 (exact field list enforced by test SC2).
- Manual form does NOT save directly — it navigates to ReviewPage with `{ state: { draft } }` (MAN-03).
- Reuse Phase 4's Input + FormField primitives. Reuse unknown-domain / unknown-type guard pattern.
- Tech stack LOCKED: React 19 + TypeScript 5.9 + Vite 7 + Tailwind v4 + react-router-dom v7 + Dexie + Vitest. No new runtime dependencies.

### Claude's Discretion
All implementation choices not listed above are at Claude's discretion (discuss skipped, `skip_discuss: true`).

### Deferred Ideas (OUT OF SCOPE)
Entry list / detail / export = Phase 6. No changes to Dexie schema. No sync layer.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAN-01 | Manual Entry screen reachable ONLY by clicking "Enter Manually" | Route already wired in App.tsx; CaptureUrlPage.test.tsx already covers the CAPT-06 navigation. ManualEntryPage must not be the default route. |
| MAN-02 | Manual form shows type-appropriate fields (common: title/description/occurredAt/tags; expense: amount/currency/category/merchant/notes; place: name/address/notes/tags; media: title/creator/date/rating/notes) | Satisfied by `ENTRY_FIELDS` config keyed by EntryType; ManualEntryPage renders the config for the `:type` param. |
| MAN-03 | Manually entered entries flow through Review → Save and persist as `LifeLogEntry` | Satisfied by ManualEntryPage producing a `ReviewDraft` and navigating to existing ReviewPage, which is extended to read amount/occurredAt/description/tags from the richer draft. |
</phase_requirements>

---

## Summary

Phase 5 builds a secondary form-based entry path. The entire implementation is internal to the codebase: no new packages, no API calls, no schema migrations. The two core design problems are (1) how to express type-appropriate field lists in a single config and (2) how to thread type-specific fields like `amount` and `creator` through the existing ReviewPage so they persist to the correct `LifeLogEntry` fields.

The solution is two targeted changes: a new `src/config/entryFields.ts` that is the single source of truth for what fields each EntryType shows and how each maps onto `LifeLogEntry`, and a minimal but exact extension of `ReviewPage` to accept a richer `ReviewDraft` type that carries `amount`, `occurredAt`, `description`, and `tags` from the manual form forward into the save path. The URL-capture path (Phase 4) is entirely unaffected: `ExtractedDraft` is structurally assignable to `ReviewDraft` in TypeScript (all new fields are optional), and every existing Phase 4 test assertion continues to pass unchanged.

Phase 5 adds three test files: a unit suite for the config and mapper, RTL tests for ManualEntryPage (MAN-01 reachability, MAN-02 field rendering), and a full integration flow test (fake-indexeddb, SC3 Book, SC4 Trip Expense and Expenditure Expense).

**Primary recommendation:** Use a typed `ENTRY_FIELDS` config + a minimal ReviewPage extension (Option A-light). Do not schema-drive ReviewPage; only add the specific new fields needed. The `buildReviewDraft` mapper is the seam between the dynamic form and the fixed ReviewPage state.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Type-appropriate field list | Config layer (`entryFields.ts`) | — | Single source of truth consumed by both the form renderer and the unit test suite |
| Form state management | Browser (React component state) | — | Pure client-side local state; no server |
| Draft building (form values → ReviewDraft) | Config layer (`buildReviewDraft`) | ManualEntryPage (caller) | Pure function; testable in isolation from the page |
| Draft passing | react-router location.state | — | Matches Phase 4's CaptureUrlPage → ReviewPage contract |
| Review + edit of all fields | ReviewPage (existing, extended) | — | MAN-03 requires one shared save path |
| Persistence | entriesRepository.create() (existing) | — | No changes to the repository |
| Entry routing | App.tsx (existing, one-line change) | — | Replace PlaceholderPage with ManualEntryPage on the manual route |

---

## Standard Stack

Phase 5 introduces zero new runtime packages. Every tool is already installed.

### Core (all already in package.json)
| Library | Installed Version | Role in Phase 5 |
|---------|------------------|-----------------|
| React 19 | 19.1.1 | ManualEntryPage component |
| TypeScript 5.9 | ~5.9.3 | `FieldDescriptor`, `ReviewDraft`, strict discriminated unions |
| react-router-dom v7 | 7.17.0 | `useParams`, `useNavigate`, `useLocation` (same as CaptureUrlPage pattern) |
| Tailwind CSS v4 | 4.3.1 | Styling via CSS custom properties (same as existing pages) |
| Dexie / dexie-react-hooks | 4.4.3 / 4.4.0 | `entriesRepository.create()` — unchanged |
| Vitest 4 | 4.1.9 | Unit + RTL tests |
| @testing-library/react | 16.3.2 | RTL tests |
| @testing-library/user-event | 14.6.1 | `userEvent.setup()` (Phase 4 pattern) |
| fake-indexeddb | 6.2.5 | Auto-imported via `test-setup.ts`; no per-test setup needed beyond `db.delete(); db.open()` |

### No New Packages
**Installation:** None required.

---

## Package Legitimacy Audit

Not applicable. Phase 5 installs no external packages.

---

## Architecture Patterns

### System Architecture Diagram

```
User clicks "Enter Manually" (CaptureUrlPage)
         |
         v
ManualEntryPage (/d/:domain/:type/manual)
  - reads :domain, :type from params
  - applies unknown-domain / unknown-type guards (same pattern as CaptureUrlPage)
  - loads ENTRY_FIELDS[type as EntryType]
  - renders a FormField per FieldDescriptor
  - manages formValues: Record<string, string>
         |
         | user fills form + clicks "Review"
         v
buildReviewDraft(fields, formValues) → ReviewDraft
  { title?, location?, description?, occurredAt?, amount?, tags?, metadata: {...} }
         |
         | navigate(`/d/${domain}/${type}/review`, { state: { draft } })
         v
ReviewPage (existing, extended)
  - casts location.state to { draft?: ReviewDraft }
  - initializes: title, location_, description, sourceUrl, occurredAt, amount, tags
  - renders FormFields (new: occurredAt always; amount conditionally)
  - user edits + clicks Save
         |
         v
entriesRepository.create({ domain, type, title, recordedAt, tags, metadata,
                           amount?, occurredAt?, description?, location? })
         |
         v
IndexedDB (LifeLogEntry persisted)
         |
         v
navigate(`/d/${domain}`) — domain page
```

### Recommended Project Structure (new/changed files)

```
src/
├── services/
│   └── extractMetadataFromUrl.ts     MODIFY: add ReviewDraft interface
├── config/
│   ├── entryFields.ts                NEW: ENTRY_FIELDS + FieldDescriptor + buildReviewDraft
│   └── entryFields.test.ts           NEW: unit tests for config completeness + mapper
├── pages/
│   ├── ManualEntryPage.tsx           NEW: form renderer using ENTRY_FIELDS config
│   ├── ManualEntryPage.test.tsx      NEW: RTL tests (MAN-01, MAN-02)
│   ├── ManualEntryPage.integration.test.tsx  NEW: full flow tests (SC3, SC4)
│   ├── ReviewPage.tsx                MODIFY: extend draft type, add state + fields + save
│   └── ReviewPage.test.tsx           NO CHANGES (Phase 4 tests continue to pass)
└── App.tsx                           MODIFY: replace PlaceholderPage with ManualEntryPage
```

---

## The KEY Decision: ReviewPage Integration

**Decision: Option A-light** — extend ReviewPage minimally with the specific new fields needed, rather than making it fully schema-driven. Reasoning:

- Option (b) (map everything to metadata, keep ReviewPage fixed) fails because `LifeLogEntry.amount` would never be set; Phase 6 VIEW-02 ("amount when present") reads `LifeLogEntry.amount`, not `metadata.amount`. Putting amount only in metadata is a data-model violation.
- Option (a) full schema-drive (ReviewPage renders from ENTRY_FIELDS) is over-engineered for Phase 5 and risks breaking Phase 4 tests by changing ReviewPage's rendered output substantially.
- Option A-light adds exactly three new fields to ReviewPage state (`amount`, `occurredAt`, `tags`) and fixes `description` initialization from the draft. The URL-capture path is not broken because `ExtractedDraft` is structurally assignable to `ReviewDraft` (TypeScript structural typing confirms this — see proof below), and all existing test assertions still hold.

**TypeScript structural assignability proof:**
- `ExtractedDraft = { sourceUrl: string; title?: string; location?: string; metadata: Record<string, unknown> }`
- `ReviewDraft = { sourceUrl?: string; title?: string; location?: string; description?: string; occurredAt?: number; amount?: number; tags?: string[]; metadata: Record<string, unknown> }`
- `ExtractedDraft` satisfies all required properties of `ReviewDraft` (only `metadata` is required; `sourceUrl: string` is assignable to `sourceUrl?: string`). Extra properties in ReviewDraft are optional. Result: `ExtractedDraft extends ReviewDraft`. Confirmed assignable. [VERIFIED: direct TypeScript structural subtyping analysis of actual interface declarations]

**Existing Phase 4 test assertions that are NOT broken by the ReviewPage change:**
- `findByLabelText('Title')` — title field still rendered ✓
- `findByDisplayValue(sourceUrl)` — sourceUrl field still rendered ✓
- `findAllByDisplayValue('Eiffel Tower')` uses `toBeGreaterThanOrEqual(1)` — flexible ✓
- `entries[0].tags` equals `[]` — empty string → `filter(Boolean)` = `[]` ✓
- No test counts `getByRole('textbox')` by exact number — safe to add fields ✓
- `<input type="number">` has ARIA role `spinbutton` in jsdom, not `textbox` — won't affect textbox queries ✓

---

## Exact Field → LifeLogEntry Mapping Table

This table is the authoritative reference. Implement `ENTRY_FIELDS` from this exactly.

| EntryType | Field Key | Form Label | Input Type | mapTo.kind | mapTo target | LifeLogEntry field |
|-----------|-----------|------------|------------|------------|-------------|-------------------|
| ALL | `title` | "Title" (except place uses "Name") | text | core | title | `title: string` |
| ALL | `description` | "Notes" | text | core | description | `description?: string` |
| ALL | `occurredAt` | "Date" | date | core | occurredAt | `occurredAt?: number` (epoch ms) |
| ALL | `tags` | "Tags" | tags (→ text) | core | tags | `tags: string[]` |
| expense | `amount` | "Amount" | number | core | amount | `amount?: number` |
| expense | `currency` | "Currency" | text | metadata | currency | `metadata.currency: string` |
| expense | `category` | "Category" | text | metadata | category | `metadata.category: string` |
| expense | `merchant` | "Merchant" | text | metadata | merchant | `metadata.merchant: string` |
| place | `name` | "Name" | text | core | **title** | `title: string` (label differs, field same) |
| place | `address` | "Address" | text | core | **location** | `location?: string` |
| show/podcast | `creator` | "Creator" | text | metadata | creator | `metadata.creator: string` |
| movie | `creator` | "Director" | text | metadata | creator | `metadata.creator: string` |
| book | `creator` | "Author" | text | metadata | creator | `metadata.creator: string` |
| podcast | `creator` | "Host" | text | metadata | creator | `metadata.creator: string` |
| all media | `rating` | "Rating" | number | metadata | rating | `metadata.rating: number` |

**Notes:**
- `notes` from MAN-02 spec maps to `description` (core field). The form label is "Notes" for expense and place types; "Description" is never shown as a separate label when "Notes" is present.
- `place.name` → `title` (not a new field; only the label changes).
- `place.address` → `location` (the existing `location?: string` core field is the correct target; alternative of putting it in metadata is rejected because `location` has a dedicated core column).
- `media.creator` → `metadata.creator` (no dedicated core field exists; metadata bag is the correct target).
- `media.rating` → `metadata.rating` (stored as number in metadata).
- `media.date` from MAN-02 spec → `occurredAt` core field (epoch ms; the date input provides 'YYYY-MM-DD', converted via `Date.parse()`).
- `expense.notes` from MAN-02 spec → `description` core field (same mapping as all other types; relabeled "Notes").
- `expense.amount` → `amount?: number` (dedicated core field — MUST use this, not metadata, for Phase 6 VIEW-02 compatibility).
- `event` type not listed in MAN-02 per-type section; uses common fields + location (label "Location").

---

## Code Examples

### 1. ReviewDraft interface (add to `src/services/extractMetadataFromUrl.ts`)

```typescript
// [VERIFIED: direct inspection of extractMetadataFromUrl.ts — ExtractedDraft lives here;
//  ReviewDraft is the richer contract shared by both URL-capture and manual flows]

export interface ReviewDraft {
  sourceUrl?: string         // URL-captured: always set; manual entries: absent
  title?: string
  location?: string
  description?: string       // pre-populated from manual form's notes/description field
  occurredAt?: number        // epoch ms; manual form date input → Date.parse()
  amount?: number            // expense entries; MUST map to LifeLogEntry.amount (core)
  tags?: string[]            // manual form tags field (comma-split)
  metadata: Record<string, unknown>  // type-specific extras (currency, creator, rating, …)
}

// ExtractedDraft is UNCHANGED. It remains the return type of extractMetadataFromUrl().
// ExtractedDraft is structurally assignable to ReviewDraft (sourceUrl:string satisfies
// sourceUrl?:string; all new ReviewDraft fields are optional).
```

### 2. entryFields.ts — types, ENTRY_FIELDS config, and buildReviewDraft (new file)

```typescript
// src/config/entryFields.ts
import type { EntryType } from '../services/db'
import type { ReviewDraft } from '../services/extractMetadataFromUrl'

export type FieldInputType = 'text' | 'number' | 'date' | 'tags'
//   'tags' renders as type="text" with placeholder "tag1, tag2"; split on comma in mapper

export type FieldMapping =
  | { kind: 'core'; field: 'title' | 'description' | 'occurredAt' | 'amount' | 'location' | 'tags' }
  | { kind: 'metadata'; key: string }

export interface FieldDescriptor {
  key: string           // unique within the type's field list; used as formValues key
  label: string         // shown in the form above the input
  inputType: FieldInputType
  placeholder?: string
  required?: boolean
  mapTo: FieldMapping
}

export const ENTRY_FIELDS: Record<EntryType, FieldDescriptor[]> = {
  // ─── Media types ──────────────────────────────────────────────────────────────
  show: [
    { key: 'title',       label: 'Title',    inputType: 'text',   required: true,  mapTo: { kind: 'core', field: 'title' } },
    { key: 'creator',     label: 'Creator',  inputType: 'text',                    mapTo: { kind: 'metadata', key: 'creator' } },
    { key: 'occurredAt',  label: 'Date',     inputType: 'date',                    mapTo: { kind: 'core', field: 'occurredAt' } },
    { key: 'rating',      label: 'Rating',   inputType: 'number', placeholder: '1–5', mapTo: { kind: 'metadata', key: 'rating' } },
    { key: 'description', label: 'Notes',    inputType: 'text',                    mapTo: { kind: 'core', field: 'description' } },
    { key: 'tags',        label: 'Tags',     inputType: 'tags',   placeholder: 'tag1, tag2', mapTo: { kind: 'core', field: 'tags' } },
  ],
  movie: [
    { key: 'title',       label: 'Title',    inputType: 'text',   required: true,  mapTo: { kind: 'core', field: 'title' } },
    { key: 'creator',     label: 'Director', inputType: 'text',                    mapTo: { kind: 'metadata', key: 'creator' } },
    { key: 'occurredAt',  label: 'Date',     inputType: 'date',                    mapTo: { kind: 'core', field: 'occurredAt' } },
    { key: 'rating',      label: 'Rating',   inputType: 'number', placeholder: '1–5', mapTo: { kind: 'metadata', key: 'rating' } },
    { key: 'description', label: 'Notes',    inputType: 'text',                    mapTo: { kind: 'core', field: 'description' } },
    { key: 'tags',        label: 'Tags',     inputType: 'tags',   placeholder: 'tag1, tag2', mapTo: { kind: 'core', field: 'tags' } },
  ],
  book: [
    { key: 'title',       label: 'Title',    inputType: 'text',   required: true,  mapTo: { kind: 'core', field: 'title' } },
    { key: 'creator',     label: 'Author',   inputType: 'text',                    mapTo: { kind: 'metadata', key: 'creator' } },
    { key: 'occurredAt',  label: 'Date Read',inputType: 'date',                    mapTo: { kind: 'core', field: 'occurredAt' } },
    { key: 'rating',      label: 'Rating',   inputType: 'number', placeholder: '1–5', mapTo: { kind: 'metadata', key: 'rating' } },
    { key: 'description', label: 'Notes',    inputType: 'text',                    mapTo: { kind: 'core', field: 'description' } },
    { key: 'tags',        label: 'Tags',     inputType: 'tags',   placeholder: 'tag1, tag2', mapTo: { kind: 'core', field: 'tags' } },
  ],
  podcast: [
    { key: 'title',       label: 'Title',    inputType: 'text',   required: true,  mapTo: { kind: 'core', field: 'title' } },
    { key: 'creator',     label: 'Host',     inputType: 'text',                    mapTo: { kind: 'metadata', key: 'creator' } },
    { key: 'occurredAt',  label: 'Date',     inputType: 'date',                    mapTo: { kind: 'core', field: 'occurredAt' } },
    { key: 'rating',      label: 'Rating',   inputType: 'number', placeholder: '1–5', mapTo: { kind: 'metadata', key: 'rating' } },
    { key: 'description', label: 'Notes',    inputType: 'text',                    mapTo: { kind: 'core', field: 'description' } },
    { key: 'tags',        label: 'Tags',     inputType: 'tags',   placeholder: 'tag1, tag2', mapTo: { kind: 'core', field: 'tags' } },
  ],
  // ─── Trips types ──────────────────────────────────────────────────────────────
  place: [
    // 'name' key maps → core.title (the label differs; place "name" IS the title)
    { key: 'name',        label: 'Name',     inputType: 'text',   required: true,  mapTo: { kind: 'core', field: 'title' } },
    // 'address' key maps → core.location (dedicated core field, not metadata)
    { key: 'address',     label: 'Address',  inputType: 'text',                    mapTo: { kind: 'core', field: 'location' } },
    { key: 'occurredAt',  label: 'Date',     inputType: 'date',                    mapTo: { kind: 'core', field: 'occurredAt' } },
    { key: 'description', label: 'Notes',    inputType: 'text',                    mapTo: { kind: 'core', field: 'description' } },
    { key: 'tags',        label: 'Tags',     inputType: 'tags',   placeholder: 'tag1, tag2', mapTo: { kind: 'core', field: 'tags' } },
  ],
  event: [
    // MAN-02 has no event-specific fields; event uses common fields + location
    { key: 'title',       label: 'Title',    inputType: 'text',   required: true,  mapTo: { kind: 'core', field: 'title' } },
    { key: 'location',    label: 'Location', inputType: 'text',                    mapTo: { kind: 'core', field: 'location' } },
    { key: 'occurredAt',  label: 'Date',     inputType: 'date',                    mapTo: { kind: 'core', field: 'occurredAt' } },
    { key: 'description', label: 'Notes',    inputType: 'text',                    mapTo: { kind: 'core', field: 'description' } },
    { key: 'tags',        label: 'Tags',     inputType: 'tags',   placeholder: 'tag1, tag2', mapTo: { kind: 'core', field: 'tags' } },
  ],
  expense: [
    // 'expense' type exists in BOTH 'trips' and 'expenditures' domains (see navigation.ts note).
    // The same field set applies to both. Domain is carried in the route param, not in the config.
    { key: 'title',       label: 'Title',    inputType: 'text',   required: true,  mapTo: { kind: 'core', field: 'title' } },
    { key: 'amount',      label: 'Amount',   inputType: 'number',                  mapTo: { kind: 'core', field: 'amount' } },
    { key: 'currency',    label: 'Currency', inputType: 'text',   placeholder: 'USD', mapTo: { kind: 'metadata', key: 'currency' } },
    { key: 'category',    label: 'Category', inputType: 'text',                    mapTo: { kind: 'metadata', key: 'category' } },
    { key: 'merchant',    label: 'Merchant', inputType: 'text',                    mapTo: { kind: 'metadata', key: 'merchant' } },
    { key: 'occurredAt',  label: 'Date',     inputType: 'date',                    mapTo: { kind: 'core', field: 'occurredAt' } },
    { key: 'description', label: 'Notes',    inputType: 'text',                    mapTo: { kind: 'core', field: 'description' } },
    { key: 'tags',        label: 'Tags',     inputType: 'tags',   placeholder: 'tag1, tag2', mapTo: { kind: 'core', field: 'tags' } },
  ],
}

/**
 * Maps raw form string values → ReviewDraft using the FieldDescriptor.mapTo directives.
 *
 * Rules:
 * - Empty/whitespace-only values are skipped (field remains undefined/absent).
 * - 'number' inputType in metadata is stored as a JS number (parseFloat), not a string.
 * - 'date' inputType: expects 'YYYY-MM-DD' from <input type="date">; converts via Date.parse()
 *   to epoch ms for ReviewDraft.occurredAt.
 * - 'tags' inputType: splits on comma, trims each segment, filters empty.
 * - NaN amount/date values are skipped (field remains undefined).
 */
export function buildReviewDraft(
  fields: FieldDescriptor[],
  formValues: Record<string, string>,
): ReviewDraft {
  const draft: ReviewDraft = { metadata: {} }

  for (const field of fields) {
    const raw = (formValues[field.key] ?? '').trim()
    if (!raw) continue

    if (field.mapTo.kind === 'core') {
      switch (field.mapTo.field) {
        case 'title':
          draft.title = raw
          break
        case 'description':
          draft.description = raw
          break
        case 'location':
          draft.location = raw
          break
        case 'amount': {
          const n = parseFloat(raw)
          if (!isNaN(n)) draft.amount = n
          break
        }
        case 'occurredAt': {
          const t = Date.parse(raw)   // 'YYYY-MM-DD' → epoch ms (UTC midnight)
          if (!isNaN(t)) draft.occurredAt = t
          break
        }
        case 'tags':
          draft.tags = raw.split(',').map((s) => s.trim()).filter(Boolean)
          break
      }
    } else {
      // kind === 'metadata'
      if (field.inputType === 'number') {
        const n = parseFloat(raw)
        draft.metadata[field.mapTo.key] = isNaN(n) ? raw : n
      } else {
        draft.metadata[field.mapTo.key] = raw
      }
    }
  }

  return draft
}
```

### 3. ManualEntryPage — structure pattern (new file `src/pages/ManualEntryPage.tsx`)

```typescript
// Pattern mirrors CaptureUrlPage exactly for guards + navigation.
// Key differences: renders ENTRY_FIELDS[type] instead of a URL input;
// "Review" button instead of "Import from URL".

export function ManualEntryPage() {
  const { domain = '', type = '' } = useParams<{ domain: string; type: string }>()
  const navigate = useNavigate()
  const goBack = useBackOrHome(`/d/${domain}`)
  const config = getDomainConfig(domain)
  const typeConfig = config?.types.find((t) => t.type === type)
  const fields = ENTRY_FIELDS[type as EntryType] ?? []

  // Form state: one string value per field key, initialized to ''
  const [formValues, setFormValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.key, ''])),
  )

  const handleChange = (key: string, value: string) =>
    setFormValues((prev) => ({ ...prev, [key]: value }))

  const handleReview = () => {
    const draft = buildReviewDraft(fields, formValues)
    navigate(`/d/${domain}/${type}/review`, { state: { draft } })
  }

  // Guards: same structure as CaptureUrlPage (full layout wrapper + back button)
  if (!config) { /* ... */ }
  if (!typeConfig) { /* ... */ }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] ...">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        {/* Back button */}
        <h1 className="text-2xl font-bold tracking-tight">
          Add {typeConfig.label}
        </h1>
        {fields.map((field) => (
          <FormField
            key={field.key}
            id={`manual-${field.key}`}
            label={field.label}
            type={field.inputType === 'tags' ? 'text' : field.inputType}
            placeholder={field.placeholder}
            value={formValues[field.key] ?? ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
          />
        ))}
        <Button variant="primary" onClick={handleReview}>
          Review
        </Button>
        <Button variant="secondary" onClick={goBack}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
```

**Note on `useState` initialization:** `fields` is derived from the route params. Since params don't change after mount, using `() => Object.fromEntries(fields.map(...))` as the lazy initializer is safe (the function runs once). If params could change (they can't in this app), the initializer would be stale — but it's not an issue here.

### 4. ReviewPage changes — exact diff description

**Import change:**
```typescript
// Remove:
import type { ExtractedDraft } from '../services/extractMetadataFromUrl'
// Add:
import type { ReviewDraft } from '../services/extractMetadataFromUrl'
```

**State change (location.state cast):**
```typescript
// Was:
const initialDraft = (location.state as { draft?: ExtractedDraft } | null)?.draft
// Becomes:
const initialDraft = (location.state as { draft?: ReviewDraft } | null)?.draft
```

**New/updated state variables (after the existing `const [title, ...]`):**
```typescript
// description: was useState(''); now initialized from draft
const [description, setDescription] = useState(initialDraft?.description ?? '')

// NEW: occurredAt — epoch ms from draft → 'YYYY-MM-DD' string for <input type="date">
const [occurredAt, setOccurredAt] = useState(
  initialDraft?.occurredAt
    ? new Date(initialDraft.occurredAt).toISOString().split('T')[0]
    : '',
)

// NEW: amount — number from draft → string for <input type="number">
const [amount, setAmount] = useState(
  initialDraft?.amount != null ? String(initialDraft.amount) : '',
)

// NEW: tags — string[] from draft → comma-separated string for <input type="text">
const [tags, setTags] = useState(initialDraft?.tags?.join(', ') ?? '')
```

**Updated handleSave (relevant additions):**
```typescript
const parsedAmount = parseFloat(amount)
const parsedDate  = occurredAt ? Date.parse(occurredAt) : NaN
const parsedTags  = tags.split(',').map((t) => t.trim()).filter(Boolean)

const entry = {
  domain: domain as EntryDomain,
  type: type as EntryType,
  title: title.trim() || 'Untitled',
  recordedAt: Date.now(),
  tags: parsedTags,                    // was hardcoded [] — now from state
  metadata: initialDraft.metadata ?? {},
  syncedAt: null as number | null,
  ...(safeSourceUrl ? { sourceUrl: safeSourceUrl } : {}),
  ...(location_    ? { location: location_ }        : {}),
  ...(description  ? { description }                : {}),
  ...(!isNaN(parsedAmount) ? { amount: parsedAmount }     : {}),  // NEW
  ...(!isNaN(parsedDate)   ? { occurredAt: parsedDate }   : {}),  // NEW
}
```

**New FormFields to render (after existing sourceUrl field):**
```tsx
{/* Always shown — useful for all types */}
<FormField
  id="review-occurred-at"
  label="Date"
  type="date"
  value={occurredAt}
  onChange={(e) => setOccurredAt(e.target.value)}
/>

{/* Shown only when this is an expense or the draft already carries an amount */}
{(type === 'expense' || initialDraft?.amount != null) && (
  <FormField
    id="review-amount"
    label="Amount"
    type="number"
    placeholder="0.00"
    value={amount}
    onChange={(e) => setAmount(e.target.value)}
  />
)}

{/* Always shown — useful for all types */}
<FormField
  id="review-tags"
  label="Tags"
  placeholder="tag1, tag2"
  value={tags}
  onChange={(e) => setTags(e.target.value)}
/>
```

**Phase 4 test backward-compatibility guarantee (exact assertions that continue to pass):**
- `tags: parsedTags` where `parsedTags = ''.split(',').map(t=>t.trim()).filter(Boolean)` = `[]` — matches `entries[0].tags` to equal `[]` ✓
- `<input type="number">` has ARIA role `spinbutton`, not `textbox` — amount field does not appear in `getByRole('textbox')` queries ✓
- `getByLabelText('Title')` still finds title input ✓
- No test checks for absence of the new Date/Tags/Amount fields ✓

### 5. App.tsx change (one import + one JSX replacement)

```typescript
// Add import:
import { ManualEntryPage } from './pages/ManualEntryPage'

// Replace:
<Route path="/d/:domain/:type/manual"  element={<PlaceholderPage title="Manual Entry" />} />
// With:
<Route path="/d/:domain/:type/manual"  element={<ManualEntryPage />} />
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date string → epoch ms | Custom date parser | `Date.parse('YYYY-MM-DD')` | Built-in; handles ISO format from `<input type="date">` correctly |
| Tags splitting | Complex tag tokenizer | `raw.split(',').map(s => s.trim()).filter(Boolean)` | Sufficient for a single-locale prototype |
| Comma-joined display | Custom join | `Array.join(', ')` | Built-in |
| Form state | Redux / Zustand / React Hook Form | `useState<Record<string, string>>` | Three fields max per type; prototype doesn't need form libraries |
| Dynamic field rendering | Custom renderer | Map over `FieldDescriptor[]` and use existing `FormField` | FormField already handles `type="text"/"number"/"date"` via `InputHTMLAttributes` spread |

**Key insight:** The `FormField` component already accepts any `InputHTMLAttributes<HTMLInputElement>` prop via spread. `type="number"` gives a spinner input; `type="date"` gives a native date picker. No new UI primitives are needed.

---

## Common Pitfalls

### Pitfall 1: amount in metadata instead of the core field
**What goes wrong:** `LifeLogEntry.amount` is undefined; Phase 6 VIEW-02 ("amount when present") shows nothing for all expense entries.
**Why it happens:** Developer puts amount in `metadata` bag alongside currency/category rather than mapping to the dedicated `amount?: number` core field.
**How to avoid:** Follow the mapping table exactly — `expense.amount` maps to `{ kind: 'core', field: 'amount' }`. Only currency/category/merchant go to metadata.
**Warning signs:** Integration test `entries[0].amount` is undefined; `entries[0].metadata.amount` is set.

### Pitfall 2: tags hardcoded to [] in ReviewPage save — already fixed
**What goes wrong:** Manual entry with tags persists `tags: []` regardless of what the user entered.
**Why it happens:** The current ReviewPage hardcodes `tags: [] as string[]`. This must change to `parsedTags`.
**How to avoid:** The research-prescribed change to handleSave covers this. Confirmed non-breaking for Phase 4 tests (empty string → `filter(Boolean)` = `[]`).
**Warning signs:** SC3/SC4 integration tests: `entries[0].tags` is `[]` even after typing tags.

### Pitfall 3: description not initialized from draft in ReviewPage
**What goes wrong:** ManualEntryPage sends notes/description in the draft but ReviewPage ignores it; user sees empty Description field on Review and notes are lost on Save.
**Why it happens:** Current ReviewPage has `useState('')` for description (not from draft). This was correct for URL-captured drafts (which have no description) but wrong for manual drafts.
**How to avoid:** Change to `useState(initialDraft?.description ?? '')`. The change is backward-compatible because `ReviewDraft.description` is optional and undefined for URL-captured entries.
**Warning signs:** SC3 test: persisted `entries[0].description` is undefined/empty even after typing notes.

### Pitfall 4: useState initializer runs on every render for ENTRY_FIELDS
**What goes wrong:** `useState(Object.fromEntries(fields.map(...)))` runs on every render, but `useState` only uses the value on the first render. This is wasteful but not a bug. However, using a lazy initializer `useState(() => Object.fromEntries(...))` is the correct React pattern.
**How to avoid:** Always use the lazy initializer form `useState(() => ...)` for non-trivial initializations.

### Pitfall 5: `<input type="date">` value format
**What goes wrong:** Setting `value` to an epoch ms number (e.g. `1718409600000`) on `<input type="date">` results in an empty/invalid input — the browser expects 'YYYY-MM-DD'.
**Why it happens:** Developer passes `draft.occurredAt` (number) directly as the value.
**How to avoid:** Convert epoch ms to 'YYYY-MM-DD' string via `new Date(ms).toISOString().split('T')[0]` when initializing ReviewPage state.

### Pitfall 6: expense type in two domains — same field set, different domain param
**What goes wrong:** Developer creates separate field configs for `trips/expense` and `expenditures/expense`, leading to maintenance drift.
**Why it happens:** SC4 tests both trip expense (domain='trips') and expenditure expense (domain='expenditures').
**How to avoid:** `ENTRY_FIELDS` has a single `expense` key. The domain is carried by the `:domain` route param, NOT by the field config. ManualEntryPage passes both domain and type to ReviewPage via the route; ReviewPage passes domain to `entriesRepository.create()`. The `expense` field config is domain-agnostic. [VERIFIED: navigation.ts confirms 'expense' type exists in both 'trips' and 'expenditures' domains with a comment warning against flat cross-domain lookups]

### Pitfall 7: 'tags' inputType must be mapped to type="text" for FormField
**What goes wrong:** `<FormField type="tags" ... />` passes `type="tags"` to `<input>`, which is an invalid HTML type and renders as `type="text"` by default (silent fallback) — but the intent is unclear and can break in unusual environments.
**How to avoid:** In the ManualEntryPage render loop: `type={field.inputType === 'tags' ? 'text' : field.inputType}`. The 'tags' inputType is a semantic label in the config, not an HTML attribute value.

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 |
| Config file | `vite.config.ts` (`test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'] }`) |
| Setup | `test-setup.ts` imports `fake-indexeddb/auto` (global) and `@testing-library/jest-dom` |
| Quick run command | `npx vitest run src/config/entryFields.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | SC | Behavior | Test Type | File | Command Fragment |
|--------|-----|----------|-----------|------|-----------------|
| MAN-01 | SC1 | Screen reachable only via "Enter Manually" | RTL | `ManualEntryPage.test.tsx` | `describe('MAN-01 reachability')` — click Enter Manually on CaptureUrlPage → ManualEntryPage renders |
| MAN-02 | SC2 | Expense shows amount/currency fields | RTL | `ManualEntryPage.test.tsx` | `findByLabelText('Amount')`, `findByLabelText('Currency')` for `trips/expense` |
| MAN-02 | SC2 | Place shows Name/Address (not Title/Location) | RTL | `ManualEntryPage.test.tsx` | `findByLabelText('Name')`, `findByLabelText('Address')`, `queryByLabelText('Title') → null` |
| MAN-02 | SC2 | Book shows Author field | RTL | `ManualEntryPage.test.tsx` | `findByLabelText('Author')` for `media/book` |
| MAN-03 | SC3 | Book manual → review → save persists creator+rating in metadata | Integration | `ManualEntryPage.integration.test.tsx` | `entries[0].metadata.creator`, `entries[0].metadata.rating` |
| MAN-03 | SC3 | Book save: title/description go to core fields | Integration | `ManualEntryPage.integration.test.tsx` | `entries[0].title`, `entries[0].description` |
| MAN-03 | SC4 | Trip Expense manual → review → save: `entries[0].amount` set (not just metadata) | Integration | `ManualEntryPage.integration.test.tsx` | `entries[0].amount === 45`, `entries[0].domain === 'trips'` |
| MAN-03 | SC4 | Expenditure Expense manual → review → save: `entries[0].amount` set | Integration | `ManualEntryPage.integration.test.tsx` | `entries[0].amount === 120.5`, `entries[0].domain === 'expenditures'` |
| — | — | `buildReviewDraft` maps expense correctly | Unit | `entryFields.test.ts` | `draft.amount === 15.5`, `draft.metadata.currency === 'USD'` |
| — | — | `buildReviewDraft` maps place name→title, address→location | Unit | `entryFields.test.ts` | `draft.title === 'Eiffel Tower'`, `draft.location === '...'` |
| — | — | `ENTRY_FIELDS` covers all 7 EntryType values | Unit | `entryFields.test.ts` | Enumerate all types |
| — | — | `buildReviewDraft` skips empty fields | Unit | `entryFields.test.ts` | undefined fields for empty inputs |
| — | — | Phase 4 ReviewPage tests still pass | Regression | `ReviewPage.test.tsx` (unchanged) | `npx vitest run src/pages/ReviewPage.test.tsx` |

### Sampling Rate
- **Per task commit:** `npx vitest run src/config/entryFields.test.ts src/pages/ManualEntryPage.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps (test files that don't exist yet)
- [ ] `src/config/entryFields.test.ts` — covers all `ENTRY_FIELDS` shape assertions + `buildReviewDraft` mapper (Wave 1)
- [ ] `src/pages/ManualEntryPage.test.tsx` — RTL tests for MAN-01 reachability + MAN-02 field rendering (Wave 2)
- [ ] `src/pages/ManualEntryPage.integration.test.tsx` — full manual→review→save flow for SC3 (Book) + SC4 (trip/expenditure Expense) using fake-indexeddb (Wave 3)

---

## Open Questions

1. **Should ReviewPage show the "Date" field for URL-captured entries?** (RESOLVED)
   RESOLVED: Yes. The `occurredAt` field is added to ReviewPage unconditionally. For URL-captured entries, the field is empty and ignored in save. No Phase 4 test checks for its absence. Showing it is an improvement (user can set event date during URL capture review as well).

2. **Should `description` be pre-populated from `initialDraft.description` in ReviewPage?** (RESOLVED)
   RESOLVED: Yes — change from `useState('')` to `useState(initialDraft?.description ?? '')`. For URL-captured `ExtractedDraft`, `description` is undefined (ExtractedDraft has no description field), so backward-compat is maintained. For manual drafts, notes/description is now visible on Review.

3. **Is `ExtractedDraft` structurally assignable to `ReviewDraft`?** (RESOLVED)
   RESOLVED: Yes. `ExtractedDraft.sourceUrl: string` is assignable to `ReviewDraft.sourceUrl?: string`. All new fields in `ReviewDraft` are optional. TypeScript structural subtyping confirms no type errors at the call sites. Phase 4 `renderWithDraft(domain, type, draft: ExtractedDraft)` test helper continues to work because draft is passed as runtime data via MemoryRouter `initialEntries` state — no TypeScript enforcement at that call.

4. **Should `place.address` go to `metadata.address` or `core.location`?** (RESOLVED)
   RESOLVED: `core.location`. The `LifeLogEntry.location?: string` field exists precisely for place/location data (Phase 4's Google Maps extractor also sets `location`). Putting address in metadata is wrong by design; it would make the `location` core field permanently empty for all manually-entered places.

5. **How does the 'expense' type work for both `trips` and `expenditures` domains?** (RESOLVED)
   RESOLVED: A single `ENTRY_FIELDS.expense` config covers both. The domain is always carried by the `:domain` route param, not by the field schema. ManualEntryPage reads `domain` from params and passes it forward; ReviewPage reads it from params and passes it to `entriesRepository.create()`. The same form renders correctly whether reached via `/d/trips/expense/manual` or `/d/expenditures/expense/manual`.

6. **Does FormField support `type="number"` and `type="date"`?** (RESOLVED)
   RESOLVED: Yes. `FormField` extends `InputHTMLAttributes<HTMLInputElement>` and passes unknown props via `...inputProps` spread onto `<Input>`, which also spreads onto `<input>`. Both `type="number"` and `type="date"` are valid `InputHTMLAttributes` values and are fully supported. [VERIFIED: direct inspection of FormField.tsx and Input.tsx]

7. **Do any Phase 4 tests break from the ReviewPage changes?** (RESOLVED)
   RESOLVED: No. All Phase 4 ReviewPage tests use label-specific queries (`getByLabelText`) or `getByDisplayValue`, which are unaffected by adding new fields. `<input type="number">` role is `spinbutton` (not `textbox`). `tags: parsedTags` where formValues are empty = `[]`, matching existing `toEqual([])` assertions. No test checks for the absence of new fields.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `event` type gets common fields + location (MAN-02 does not list event explicitly) | Standard Stack / entryFields config | Low — event is not tested in SC1–SC4; if product wants event-specific fields, they can be added without breaking other types |
| A2 | Tags UX as comma-separated text input is sufficient for Phase 5 prototype | entryFields config (FieldInputType 'tags') | Low — prototype; Phase 6 list/detail only needs `tags: string[]` persisted, not a fancy chip UI |

---

## Environment Availability

Step 2.6: SKIPPED — Phase 5 is purely code changes. No external tools, services, or CLIs are needed beyond what Phase 1–4 already verified (Node.js, npm, Vitest).

---

## Security Domain

`security_enforcement` not set in config — treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in this prototype |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | Single-user local PWA |
| V5 Input Validation | Yes (limited) | All form inputs stored in local IndexedDB only; no server; XSS via sourceUrl already guarded by `isSafeUrl()` in ReviewPage; no HTML rendering of user input |
| V6 Cryptography | No | No crypto in this phase |

### Known Threat Patterns (relevant to Phase 5)

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via user-entered title/description | Tampering/EoP | React DOM escapes string values by default; user input is stored as plain strings in IndexedDB and rendered via JSX text nodes — not via `dangerouslySetInnerHTML`. No mitigation change needed. |
| javascript: sourceUrl in manual entry | Spoofing | ManualEntryPage does NOT include a sourceUrl field (manual entries have no URL). ReviewPage's `isSafeUrl()` guard is already in place for the sourceUrl field that remains from URL-capture drafts. Manual drafts produce `ReviewDraft` with `sourceUrl: undefined` → ReviewPage skips sourceUrl entirely in save. No additional risk. |

---

## Sources

### Primary (HIGH confidence)
- Direct inspection: `src/services/db.ts` — `LifeLogEntry`, `EntryType`, `EntryDomain`
- Direct inspection: `src/services/extractMetadataFromUrl.ts` — `ExtractedDraft` interface
- Direct inspection: `src/pages/ReviewPage.tsx` — current state management, handleSave, rendered fields
- Direct inspection: `src/pages/CaptureUrlPage.tsx` — pattern for ManualEntryPage to mirror (guards, navigation)
- Direct inspection: `src/config/navigation.ts` — NAVIGATION config, `getDomainConfig`, domain/type structure
- Direct inspection: `src/components/ui/FormField.tsx` + `Input.tsx` — prop interface (`InputHTMLAttributes<HTMLInputElement>` spread confirms `type="number"` and `type="date"` work)
- Direct inspection: `src/pages/ReviewPage.test.tsx` — all Phase 4 assertions verified to remain passing after the proposed changes
- Direct inspection: `src/test-setup.ts` — `fake-indexeddb/auto` auto-import (global for all tests)
- Direct inspection: `vite.config.ts` + `package.json` — test environment (jsdom, Vitest 4.1.9, no new packages needed)

### Secondary (MEDIUM confidence)
- TypeScript specification: structural subtyping rules (ExtractedDraft assignable to ReviewDraft) — standard TS behavior, applies to installed TS ~5.9.3 [ASSUMED]
- jsdom / @testing-library/react: `<input type="number">` has ARIA role `spinbutton` — standard HTML/ARIA spec behavior; confirmed by general knowledge of testing-library defaults [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Field-schema config: HIGH — derived from direct inspection of `LifeLogEntry` fields + MAN-02 exact text
- ReviewPage integration (A-light): HIGH — all claims verified against actual ReviewPage.tsx and ReviewPage.test.tsx
- Pitfalls: HIGH — each pitfall identified from direct code reading (not speculation)
- Phase 4 test backward-compat: HIGH — every individual assertion traced through the proposed changes

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (stable codebase; no external dependencies to drift)

---

## RESEARCH COMPLETE

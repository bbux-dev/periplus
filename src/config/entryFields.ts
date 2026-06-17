// src/config/entryFields.ts
import type { EntryType } from '../services/db'
import type { ReviewDraft } from '../services/extractMetadataFromUrl'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  /** Inclusive numeric bounds; enforced in buildReviewDraft — out-of-range values are skipped */
  min?: number
  max?: number
  mapTo: FieldMapping
}

// ─── ENTRY_FIELDS config ──────────────────────────────────────────────────────

export const ENTRY_FIELDS: Record<EntryType, FieldDescriptor[]> = {
  // ─── Media types ────────────────────────────────────────────────────────────
  show: [
    { key: 'title',       label: 'Title',   inputType: 'text',   required: true,  mapTo: { kind: 'core', field: 'title' } },
    { key: 'creator',     label: 'Creator', inputType: 'text',                    mapTo: { kind: 'metadata', key: 'creator' } },
    { key: 'occurredAt',  label: 'Date',    inputType: 'date',                    mapTo: { kind: 'core', field: 'occurredAt' } },
    { key: 'rating',      label: 'Rating',  inputType: 'number', placeholder: '1–5', min: 1, max: 5, mapTo: { kind: 'metadata', key: 'rating' } },
    { key: 'description', label: 'Notes',   inputType: 'text',                    mapTo: { kind: 'core', field: 'description' } },
    { key: 'tags',        label: 'Tags',    inputType: 'tags',   placeholder: 'tag1, tag2', mapTo: { kind: 'core', field: 'tags' } },
  ],
  movie: [
    { key: 'title',       label: 'Title',    inputType: 'text',   required: true,  mapTo: { kind: 'core', field: 'title' } },
    { key: 'creator',     label: 'Director', inputType: 'text',                    mapTo: { kind: 'metadata', key: 'creator' } },
    { key: 'occurredAt',  label: 'Date',     inputType: 'date',                    mapTo: { kind: 'core', field: 'occurredAt' } },
    { key: 'rating',      label: 'Rating',   inputType: 'number', placeholder: '1–5', min: 1, max: 5, mapTo: { kind: 'metadata', key: 'rating' } },
    { key: 'description', label: 'Notes',    inputType: 'text',                    mapTo: { kind: 'core', field: 'description' } },
    { key: 'tags',        label: 'Tags',     inputType: 'tags',   placeholder: 'tag1, tag2', mapTo: { kind: 'core', field: 'tags' } },
  ],
  book: [
    { key: 'title',       label: 'Title',     inputType: 'text',   required: true,  mapTo: { kind: 'core', field: 'title' } },
    { key: 'creator',     label: 'Author',    inputType: 'text',                    mapTo: { kind: 'metadata', key: 'creator' } },
    { key: 'occurredAt',  label: 'Date Read', inputType: 'date',                    mapTo: { kind: 'core', field: 'occurredAt' } },
    { key: 'rating',      label: 'Rating',    inputType: 'number', placeholder: '1–5', min: 1, max: 5, mapTo: { kind: 'metadata', key: 'rating' } },
    { key: 'description', label: 'Notes',     inputType: 'text',                    mapTo: { kind: 'core', field: 'description' } },
    { key: 'tags',        label: 'Tags',      inputType: 'tags',   placeholder: 'tag1, tag2', mapTo: { kind: 'core', field: 'tags' } },
  ],
  podcast: [
    { key: 'title',       label: 'Title',  inputType: 'text',   required: true,  mapTo: { kind: 'core', field: 'title' } },
    { key: 'creator',     label: 'Host',   inputType: 'text',                    mapTo: { kind: 'metadata', key: 'creator' } },
    { key: 'occurredAt',  label: 'Date',   inputType: 'date',                    mapTo: { kind: 'core', field: 'occurredAt' } },
    { key: 'rating',      label: 'Rating', inputType: 'number', placeholder: '1–5', min: 1, max: 5, mapTo: { kind: 'metadata', key: 'rating' } },
    { key: 'description', label: 'Notes',  inputType: 'text',                    mapTo: { kind: 'core', field: 'description' } },
    { key: 'tags',        label: 'Tags',   inputType: 'tags',   placeholder: 'tag1, tag2', mapTo: { kind: 'core', field: 'tags' } },
  ],
  // ─── Trips types ────────────────────────────────────────────────────────────
  place: [
    // 'name' key maps → core.title (the label differs; place "name" IS the title)
    { key: 'name',        label: 'Name',    inputType: 'text',   required: true,  mapTo: { kind: 'core', field: 'title' } },
    // 'address' key maps → core.location (dedicated core field, not metadata)
    { key: 'address',     label: 'Address', inputType: 'text',                    mapTo: { kind: 'core', field: 'location' } },
    { key: 'occurredAt',  label: 'Date',    inputType: 'date',                    mapTo: { kind: 'core', field: 'occurredAt' } },
    { key: 'description', label: 'Notes',   inputType: 'text',                    mapTo: { kind: 'core', field: 'description' } },
    { key: 'tags',        label: 'Tags',    inputType: 'tags',   placeholder: 'tag1, tag2', mapTo: { kind: 'core', field: 'tags' } },
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
    // 'expense' type exists in BOTH 'trips' and 'expenditures' domains.
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

// ─── Positional schema (Quick-Capture DSL) ────────────────────────────────────
//
// Declares which fields are POSITIONAL in the DSL shorthand `[type] s1:s2 ?k=v`,
// and in what order. slot1 = primary identity, slot2 = "who/where" secondary.
// Values are `key`s into the type's ENTRY_FIELDS list (so the parser reuses the
// same field mapping as the manual form via buildReviewDraft). Everything not
// listed here is reachable as a named `?key=value` param.
//
// Expense is the only type whose slot1 is a number (amount), not a name — that is
// exactly why a bare expense (`12.50:food`) reads naturally.

export const POSITIONAL_SCHEMA: Record<EntryType, string[]> = {
  show:    ['title', 'creator'],
  movie:   ['title', 'creator'],
  book:    ['title', 'creator'],
  podcast: ['title', 'creator'],
  place:   ['name', 'address'],
  event:   ['title', 'location'],
  expense: ['amount', 'category'],
}

// ─── buildReviewDraft mapper ──────────────────────────────────────────────────

/**
 * Maps raw form string values → ReviewDraft using the FieldDescriptor.mapTo directives.
 *
 * Rules:
 * - Empty/whitespace-only values are skipped (field remains undefined/absent).
 * - 'number' inputType: parseFloat; NaN values are skipped for BOTH core amount and
 *   metadata number fields (consistent — never persist a NaN numeric value).
 * - 'date' inputType: expects 'YYYY-MM-DD' from <input type="date">; converts via
 *   Date.parse() to epoch ms for ReviewDraft.occurredAt; NaN dates are skipped.
 * - 'tags' inputType: splits on comma, trims each segment, filters empty segments.
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
          // Append T00:00:00 so the spec treats this as LOCAL midnight, not UTC midnight.
          // Date.parse('YYYY-MM-DD') is UTC midnight per ECMAScript — wrong in UTC-offset zones.
          const t = Date.parse(`${raw}T00:00:00`)
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
        // Consistent with core amount: skip NaN instead of falling back to raw string.
        const n = parseFloat(raw)
        if (!isNaN(n)) {
          // IN-03: skip out-of-range values when min/max are declared on the descriptor
          const inRange =
            (field.min == null || n >= field.min) &&
            (field.max == null || n <= field.max)
          if (inRange) draft.metadata[field.mapTo.key] = n
        }
      } else {
        draft.metadata[field.mapTo.key] = raw
      }
    }
  }

  return draft
}

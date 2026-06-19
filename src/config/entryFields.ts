// src/config/entryFields.ts
import type { EntryType, LifeLogEntry } from '../services/db'
import type { ReviewDraft } from '../services/captureService'

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
  // ─── Trip types (v0.5.0) ─────────────────────────────────────────────────────
  trip: [
    // A trip record: only the name is captured; ties entries via metadata.tripId.
    { key: 'name', label: 'Name', inputType: 'text', required: true, mapTo: { kind: 'core', field: 'title' } },
  ],
  activity: [
    // Activity within a trip (hike / show / restaurant / cafe / other).
    { key: 'name',         label: 'Name',     inputType: 'text',   required: true,  mapTo: { kind: 'core', field: 'title' } },
    { key: 'location',     label: 'Location', inputType: 'text',                    mapTo: { kind: 'core', field: 'location' } },
    { key: 'occurredAt',   label: 'Date',     inputType: 'date',                    mapTo: { kind: 'core', field: 'occurredAt' } },
    { key: 'rating',       label: 'Rating',   inputType: 'number', placeholder: '1-5', min: 1, max: 5, mapTo: { kind: 'metadata', key: 'rating' } },
    { key: 'description',  label: 'Notes',    inputType: 'text',                    mapTo: { kind: 'core', field: 'description' } },
    { key: 'activityType', label: 'Type',     inputType: 'text',                    mapTo: { kind: 'metadata', key: 'activityType' } },
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
  show:     ['title', 'creator'],
  movie:    ['title', 'creator'],
  book:     ['title', 'creator'],
  podcast:  ['title', 'creator'],
  place:    ['name', 'address'],
  event:    ['title', 'location'],
  expense:  ['amount', 'category'],
  trip:     ['name'],
  activity: ['name', 'location'],
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

// ─── formValuesFromEntry (inverse mapper) ─────────────────────────────────────

/**
 * Inverse of buildReviewDraft: projects a saved LifeLogEntry back into the
 * `Record<fieldKey, string>` shape the manual/edit form consumes.
 *
 * - Core fields read from the entry's top-level columns (absent → '').
 * - occurredAt is formatted with the LOCAL date convention (toLocaleDateString
 *   'en-CA' → 'YYYY-MM-DD') so it round-trips through buildReviewDraft's
 *   `Date.parse(`${d}T00:00:00`)` to the same local-midnight epoch.
 * - amount stringifies via String(); metadata strings pass through, metadata
 *   numbers stringify, and any other metadata value type yields ''.
 */
export function formValuesFromEntry(
  fields: FieldDescriptor[],
  entry: LifeLogEntry,
): Record<string, string> {
  const values: Record<string, string> = {}

  for (const field of fields) {
    if (field.mapTo.kind === 'core') {
      switch (field.mapTo.field) {
        case 'title':
          values[field.key] = entry.title
          break
        case 'description':
          values[field.key] = entry.description ?? ''
          break
        case 'location':
          values[field.key] = entry.location ?? ''
          break
        case 'amount':
          values[field.key] = entry.amount != null ? String(entry.amount) : ''
          break
        case 'occurredAt':
          values[field.key] =
            entry.occurredAt != null
              ? new Date(entry.occurredAt).toLocaleDateString('en-CA')
              : ''
          break
        case 'tags':
          values[field.key] = entry.tags.join(', ')
          break
      }
    } else {
      // kind === 'metadata'
      const raw = entry.metadata[field.mapTo.key]
      values[field.key] =
        typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : ''
    }
  }

  return values
}

// ─── buildEntryUpdate (change-builder) ────────────────────────────────────────

/**
 * Builds the partial `changes` object passed to entriesRepository.update().
 *
 * Core fields are derived from buildReviewDraft (so all parsing/validation stays
 * in the single source of truth): a cleared field collapses to `undefined`
 * (Dexie update drops it), title falls back to 'Untitled', and tags fall back to
 * `[]`. Metadata is MERGED, never replaced — existing keys (including unknown
 * ones like URL/DSL capture data or the Phase-18 `mode`/`modeLabel` stamps)
 * survive untouched unless explicitly edited. Known metadata fields that map to a
 * form field are set when present and DELETED when cleared; extraMetadata edits
 * set/delete arbitrary keys by trimmed truthiness.
 *
 * recordedAt, syncedAt, domain, and type are NEVER written.
 */
export function buildEntryUpdate(
  fields: FieldDescriptor[],
  entry: LifeLogEntry,
  formValues: Record<string, string>,
  extraMetadata: Record<string, string>,
): Partial<Omit<LifeLogEntry, 'id'>> {
  const draft = buildReviewDraft(fields, formValues)
  const changes: Partial<Omit<LifeLogEntry, 'id'>> = {}

  // ── Core fields ────────────────────────────────────────────────────────────
  for (const field of fields) {
    if (field.mapTo.kind !== 'core') continue
    switch (field.mapTo.field) {
      case 'title':
        changes.title = draft.title ?? 'Untitled'
        break
      case 'description':
        changes.description = draft.description
        break
      case 'location':
        changes.location = draft.location
        break
      case 'amount':
        changes.amount = draft.amount
        break
      case 'occurredAt':
        changes.occurredAt = draft.occurredAt
        break
      case 'tags':
        changes.tags = draft.tags ?? []
        break
    }
  }

  // ── Metadata: merge onto a copy of the existing bag ──────────────────────────
  const meta: Record<string, unknown> = { ...entry.metadata }
  // Known metadata fields: set when the parsed draft has them, delete when cleared.
  for (const field of fields) {
    if (field.mapTo.kind !== 'metadata') continue
    const key = field.mapTo.key
    if (key in draft.metadata) meta[key] = draft.metadata[key]
    else delete meta[key]
  }
  // Extra (uncovered) keys: trimmed-truthy sets the value, empty deletes the key.
  for (const [key, raw] of Object.entries(extraMetadata)) {
    const trimmed = raw.trim()
    if (trimmed) meta[key] = trimmed
    else delete meta[key]
  }
  changes.metadata = meta

  return changes
}

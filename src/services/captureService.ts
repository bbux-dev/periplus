/**
 * Capture service: pure functions for hole detection, the {} named-hole token,
 * DSL preview reconstruction, and draft→entry finalization.
 *
 * Single source of truth for entry construction shared by:
 *   - ReviewPage.handleSave (refactored in 13-01 Task 2)
 *   - Direct-save capture path (13-02 / 13-03)
 *
 * Pure-function module (named exports only, no class, no default export).
 * Mirror: src/services/exportEntries.ts
 */

import { ENTRY_FIELDS, POSITIONAL_SCHEMA } from '../config/entryFields'
import type { EntryDomain, EntryType, LifeLogEntry } from './db'
import type { ActiveMode } from './activeMode'

// ─── ReviewDraft ──────────────────────────────────────────────────────────────

/**
 * Shared draft shape consumed by buildReviewDraft, draftToEntry, and
 * projectEntryToFormValues. Moved here from extractMetadataFromUrl.ts (Plan 21-01)
 * so it survives the deletion of extractMetadataFromUrl.ts in Plan 21-04.
 */
export interface ReviewDraft {
  sourceUrl?: string      // URL-captured: always set; manual entries: absent
  title?: string
  location?: string
  description?: string    // pre-populated from manual form's notes/description field
  occurredAt?: number     // epoch ms; manual form date input → Date.parse()
  amount?: number         // expense entries; MUST map to LifeLogEntry.amount (core)
  tags?: string[]         // manual form tags field (comma-split)
  metadata: Record<string, unknown>  // type-specific extras (currency, creator, rating, …)
}

// ─── CAP-04 Named-Hole Token ──────────────────────────────────────────────────

/**
 * The named-hole placeholder convention (CAP-04).
 *
 * A DSL template may mark a named param as a "hole" by assigning this token as
 * its value: `expense :food?merchant={}`. After parseDSL, the orchestrator calls
 * detectHoles(type, parsed.values) to discover these holes, then cleanValues()
 * to strip them before building the draft.
 *
 * Token choice rationale (RESEARCH §3):
 * - `{}` is not a natural expense value or title.
 * - It does not collide with any DSL delimiter (?, :, ,).
 * - It reads visually as "empty slot" to template authors.
 */
export const HOLE_TOKEN = '{}'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Result of detectHoles: separates positional holes (schema slots missing from
 * cleaned values) from named holes (CAP-04 {} token entries).
 */
export interface HoleMap {
  /** Field keys from POSITIONAL_SCHEMA missing in cleaned values */
  positional: string[]
  /** Field keys whose parsed value was HOLE_TOKEN before cleaning */
  named: string[]
  hasHoles: boolean
}

// ─── cleanValues ──────────────────────────────────────────────────────────────

/**
 * Remove HOLE_TOKEN ('{}') entries from values — they are holes, not real values.
 *
 * Always call before buildReviewDraft so '{}' is never persisted as a string
 * value in metadata (RESEARCH Pitfall 1).
 */
export function cleanValues(
  values: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== HOLE_TOKEN),
  )
}

// ─── detectHoles ──────────────────────────────────────────────────────────────

/**
 * Detects holes in a parsed template's values.
 *
 * Uses POSITIONAL_SCHEMA[type] comparison EXCLUSIVELY — does NOT inspect
 * parser output strings (RESEARCH Pitfall 2):
 *   - The parser condition (parts.length > 1) misses bare templates like 'expense'
 *     where no positional region is present and no issues are emitted.
 *   - Schema comparison handles ALL cases correctly, including bare templates.
 *
 * Call with raw values from parseDSL (before cleaning).
 *
 * Hole ordering (deterministic):
 *   positional holes in POSITIONAL_SCHEMA order, then named holes in
 *   discovery order (entry order in rawValues).
 */
export function detectHoles(
  type: EntryType,
  rawValues: Record<string, string>,
): HoleMap {
  // Named holes: entries whose value is HOLE_TOKEN (before cleaning)
  const named = Object.entries(rawValues)
    .filter(([, v]) => v === HOLE_TOKEN)
    .map(([k]) => k)

  // Positional holes: schema slots absent from cleaned values
  const cleanVals = cleanValues(rawValues)
  const positional = POSITIONAL_SCHEMA[type].filter((k) => !cleanVals[k])

  // De-duplicate: if a key appears as HOLE_TOKEN for a positional slot (e.g.
  // `expense :{}` produces category='{}'→ named AND positional both claim it),
  // keep it only in `positional` so HoleSheet renders it once.
  const namedDeduped = named.filter((k) => !positional.includes(k))

  return {
    positional,
    named: namedDeduped,
    hasHoles: positional.length + namedDeduped.length > 0,
  }
}

// ─── applyFills ───────────────────────────────────────────────────────────────

/**
 * Merge user-provided fills over base template values.
 *
 * Used by BOTH the live DSL preview and the save path — always pass the
 * SAME mergedValues to buildDSLPreview and buildReviewDraft (RESEARCH Pitfall 6).
 */
export function applyFills(
  baseValues: Record<string, string>,
  fills: Record<string, string>,
): Record<string, string> {
  return { ...baseValues, ...fills }
}

// ─── buildDSLPreview ──────────────────────────────────────────────────────────

/**
 * Reconstructs a human-readable DSL line from type + merged values.
 *
 * Used for the live preview in HoleSheet (13-02). Values must be clean
 * (no HOLE_TOKEN) — positional holes become empty string slots in the output.
 *
 * Named param quoting: values containing space, colon, comma, or ? are
 * double-quoted (mirrors DSL grammar conventions).
 */
export function buildDSLPreview(
  type: EntryType,
  mergedValues: Record<string, string>,
): string {
  const schema = POSITIONAL_SCHEMA[type]
  const positionals = schema.map((k) => mergedValues[k] ?? '').join(':')

  const namedEntries = Object.entries(mergedValues)
    .filter(([k, v]) => !schema.includes(k) && v)
    .map(([k, v]) => {
      const needsQuote = /[ :,?]/.test(v)
      // Escape backslash first, then double-quote, so the preview is valid DSL
      // if the user copies it into the Quick Capture omnibar.
      const escaped = v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      return `${k}=${needsQuote ? `"${escaped}"` : v}`
    })

  const namedStr = namedEntries.length ? `?${namedEntries.join(',')}` : ''
  return `${type} ${positionals}${namedStr}`
}

// ─── draftToEntry ─────────────────────────────────────────────────────────────

/**
 * Finalizes a ReviewDraft into a complete Omit<LifeLogEntry, 'id'>.
 *
 * SINGLE entry-construction site shared by ReviewPage.handleSave and the
 * direct-save capture path. Any change to entry construction MUST be reflected
 * in both this function and the ReviewPage contract (cross-referenced here).
 *
 * See: src/pages/ReviewPage.tsx handleSave (the authoritative contract this
 * mirrors, lines 109–123).
 *
 * sourceUrl: passed through when truthy. ReviewPage pre-validates via isSafeUrl
 * before calling draftToEntry (T-13-04). Shortcut drafts have no sourceUrl.
 */
export function draftToEntry(
  draft: ReviewDraft,
  type: EntryType,
  domain: EntryDomain,
  activeMode?: ActiveMode | null,
): Omit<LifeLogEntry, 'id'> {
  // STAMP-01/02: stamp mode provenance ONLY when a mode is actually active (non-empty
  // mode string). Otherwise write NONE of mode, modeLabel, tripId.
  // STAMP-02: tripId spread sits inside the same activeMode?.mode guard so it inherits
  // the undefined/null/empty-mode protection automatically.
  const baseMetadata = draft.metadata ?? {}
  const metadata =
    activeMode?.mode
      ? {
          ...baseMetadata,
          mode: activeMode.mode,
          modeLabel: activeMode.label,
          ...(activeMode.tripId ? { tripId: activeMode.tripId } : {}),  // STAMP-02 (ENG-03)
        }
      : baseMetadata
  return {
    domain,
    type,
    title:      draft.title?.trim() || 'Untitled',  // mirrors: title.trim() || 'Untitled'
    recordedAt: Date.now(),                          // mirrors: Date.now()
    tags:       draft.tags ?? [],                    // draft.tags is already string[] (no re-split)
    metadata,                                        // base metadata, optionally mode-stamped (STAMP-01)
    syncedAt:   null as number | null,               // mirrors: null as number | null
    // Optional fields — included only when truthy / not null-or-NaN:
    ...(draft.sourceUrl
      ? { sourceUrl: draft.sourceUrl }
      : {}),
    ...(draft.location
      ? { location: draft.location }
      : {}),
    ...(draft.description
      ? { description: draft.description }
      : {}),
    ...(draft.amount != null && !Number.isNaN(draft.amount)
      ? { amount: draft.amount }
      : {}),
    ...(draft.occurredAt != null && !Number.isNaN(draft.occurredAt)
      ? { occurredAt: draft.occurredAt }
      : {}),
  }
}

// ─── Date-default helpers (DATE-01) ────────────────────────────────────────────

/**
 * Today's date as a LOCAL 'YYYY-MM-DD' string.
 *
 * Uses toLocaleDateString('en-CA') (NOT toISOString, which is UTC) so the value
 * matches what <input type="date"> shows and what buildReviewDraft expects.
 * Mirror: ReviewPage occurredAt useState init (WR-03), entryFields.ts L154-160.
 */
export function todayLocalDate(): string {
  return new Date().toLocaleDateString('en-CA')
}

/**
 * Today's LOCAL-midnight epoch (ms).
 *
 * Appends T00:00:00 so Date.parse treats it as local midnight, NOT UTC midnight
 * (Date.UTC / toISOString would be off-by-one in UTC-offset zones — the project
 * already fixed this once). Mirror: buildReviewDraft 'occurredAt' case.
 */
export function todayLocalMidnightEpoch(): number {
  return Date.parse(`${todayLocalDate()}T00:00:00`)
}

/**
 * True iff the type's ENTRY_FIELDS config has a core occurredAt descriptor.
 *
 * Currently: activity, event, expense, place, show, movie, book, podcast (yes);
 * trip (no — trip entries record only a name, no per-entry date).
 * The optional-chain + `?? false` handles any unknown future type safely.
 */
export function typeHasDateField(type: EntryType): boolean {
  return (
    ENTRY_FIELDS[type]?.some(
      (f) => f.mapTo.kind === 'core' && f.mapTo.field === 'occurredAt',
    ) ?? false
  )
}

/**
 * Returns a draft with occurredAt defaulted to today's local-midnight epoch when
 * the draft carries no usable date AND the type has a date field. Otherwise the
 * draft is returned unchanged.
 *
 * Pure — never mutates the input. Intentionally NOT applied inside draftToEntry,
 * which is shared with ReviewPage.handleSave where defaulting would override a
 * user who deliberately cleared the date (DATE-01: default, not lock).
 */
export function withDefaultOccurredAt(
  draft: ReviewDraft,
  type: EntryType,
): ReviewDraft {
  const hasDate = draft.occurredAt != null && !Number.isNaN(draft.occurredAt)
  if (hasDate || !typeHasDateField(type)) return draft
  return { ...draft, occurredAt: todayLocalMidnightEpoch() }
}

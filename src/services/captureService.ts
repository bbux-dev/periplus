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

import { POSITIONAL_SCHEMA } from '../config/entryFields'
import type { EntryDomain, EntryType, LifeLogEntry } from './db'
import type { ReviewDraft } from './extractMetadataFromUrl'

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
      return `${k}=${needsQuote ? `"${v}"` : v}`
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
): Omit<LifeLogEntry, 'id'> {
  return {
    domain,
    type,
    title:      draft.title?.trim() || 'Untitled',  // mirrors: title.trim() || 'Untitled'
    recordedAt: Date.now(),                          // mirrors: Date.now()
    tags:       draft.tags ?? [],                    // draft.tags is already string[] (no re-split)
    metadata:   draft.metadata ?? {},                // mirrors: initialDraft.metadata ?? {}
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

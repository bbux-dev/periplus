// src/services/dsl/suggest.ts
//
// Suggestion logic for the Quick-Capture omnibar (OMNI-03 type-token suggestions,
// OMNI-04 history-backed value suggestions). Pure functions over the input string;
// the component wires the results to useDistinctValues.

import { POSITIONAL_SCHEMA } from '../../config/entryFields'
import type { EntryType } from '../db'
import type { DistinctField } from '../entriesRepository'
import { TYPE_NAMES, TYPE_ALIASES, NAMED_ALIASES, indexOfTopLevel } from './parser'

const DISTINCT_FIELDS = new Set<string>(['category', 'merchant', 'tags'])

function isDistinctField(field: string): field is DistinctField {
  return DISTINCT_FIELDS.has(field)
}

/**
 * Entry types whose canonical name or alias starts with `prefix` (case-insensitive).
 * Drives the type-token menu that disambiguates single-letter collisions
 * (`p` → place/podcast, `e` → event/expense).
 */
export function typeMatches(prefix: string): EntryType[] {
  const p = prefix.trim().toLowerCase()
  if (p === '') return [...TYPE_NAMES]
  const direct = TYPE_NAMES.filter((t) => t.startsWith(p))
  const viaAlias = Object.entries(TYPE_ALIASES)
    .filter(([alias]) => alias.startsWith(p))
    .map(([, t]) => t)
  return Array.from(new Set([...direct, ...viaAlias]))
}

/** Wrap a value in double quotes (escaping `"`/`\`) when it contains a DSL delimiter. */
export function quoteValue(v: string): string {
  if (/[\s:,?"\\]/.test(v)) {
    return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return v
}

/**
 * Replace the value currently being typed at the end of `input` with `value`
 * (auto-quoting if needed). Used when the user clicks a history suggestion.
 * Only valid when suggestionContext(input).kind === 'value'.
 */
export function applyValueSuggestion(input: string, value: string): string {
  const qIdx = indexOfTopLevel(input, '?')
  let start: number
  if (qIdx !== -1) {
    const region = input.slice(qIdx + 1)
    const lastComma = lastIndexOfTopLevel(region, ',')
    const segStart = qIdx + 1 + lastComma + 1
    const seg = input.slice(segStart)
    const eq = indexOfTopLevel(seg, '=')
    start = segStart + eq + 1
  } else {
    start = lastIndexOfTopLevel(input, ':') + 1 // -1 → 0 (replace whole), else after the colon
  }
  return input.slice(0, start) + quoteValue(value)
}

export type SuggestContext =
  | { kind: 'type'; prefix: string }
  | { kind: 'value'; field: DistinctField; prefix: string }
  | { kind: 'none' }

function lastIndexOfTopLevel(str: string, delim: string): number {
  let inStr = false
  let esc = false
  let last = -1
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (!inStr && ch === delim) last = i
  }
  return last
}

function countTopLevel(str: string, delim: string): number {
  let inStr = false
  let esc = false
  let n = 0
  for (const ch of str) {
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (!inStr && ch === delim) n++
  }
  return n
}

function indexOfTopLevelWhitespace(str: string): number {
  let inStr = false
  let esc = false
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (!inStr && /\s/.test(ch)) return i
  }
  return -1
}

/** Strip a single leading quote from a partial (still-being-typed) value for prefix matching. */
function partialPrefix(s: string): string {
  const t = s.trimStart()
  return t.startsWith('"') ? t.slice(1) : t
}

/**
 * What value is being typed at the END of `input` (cursor assumed at end), and
 * whether it's a field we can offer history suggestions for.
 *
 * - `type`  — the user is still typing the leading type token.
 * - `value` — the active positional slot or `key=` param maps to a DistinctField.
 * - `none`  — nothing suggestable (numeric/free-text field, typing a key, etc.).
 *
 * `resolvedType` comes from parseDSL(input).type — needed to map a positional slot
 * index to a field key.
 */
export function suggestionContext(input: string, resolvedType: EntryType | null): SuggestContext {
  const raw = input // trailing whitespace is significant — do NOT trim end
  if (raw.trim() === '') return { kind: 'none' }

  // ── Param region (after a top-level '?') ─────────────────────────────────────
  const qIdx = indexOfTopLevel(raw, '?')
  if (qIdx !== -1) {
    if (!resolvedType) return { kind: 'none' }
    const paramRegion = raw.slice(qIdx + 1)
    const lastComma = lastIndexOfTopLevel(paramRegion, ',')
    const seg = paramRegion.slice(lastComma + 1)
    const eq = indexOfTopLevel(seg, '=')
    if (eq === -1) return { kind: 'none' } // typing the key, not a value
    const key = seg.slice(0, eq).trim().toLowerCase()
    const canonical = NAMED_ALIASES[key] ?? key
    if (isDistinctField(canonical)) {
      return { kind: 'value', field: canonical, prefix: partialPrefix(seg.slice(eq + 1)) }
    }
    return { kind: 'none' }
  }

  // ── Left region (type token + positionals) ───────────────────────────────────
  const firstWs = indexOfTopLevelWhitespace(raw)
  const firstColon = indexOfTopLevel(raw, ':')

  // Still on the first token, and it looks like an alphabetic type attempt → type menu.
  if (firstWs === -1 && firstColon === -1) {
    const tok = raw.trim()
    if (/^[a-z]+$/i.test(tok)) return { kind: 'type', prefix: tok.toLowerCase() }
    return { kind: 'none' }
  }

  // Positional slots — need a resolved type to map slot index → field.
  if (!resolvedType) return { kind: 'none' }

  // Strip a leading type token (if the first token is a known type/alias).
  let posRegion = raw
  if (firstWs !== -1) {
    const firstTok = raw.slice(0, firstWs).toLowerCase()
    if (TYPE_NAMES.includes(firstTok as EntryType) || TYPE_ALIASES[firstTok]) {
      posRegion = raw.slice(firstWs + 1)
    }
  }

  const schema = POSITIONAL_SCHEMA[resolvedType]
  const lastColon = lastIndexOfTopLevel(posRegion, ':')
  // Slot index of the active (last) value = count of top-level colons preceding it.
  const activeSlot = countTopLevel(posRegion.slice(0, lastColon + 1), ':')
  const field = schema[activeSlot]
  if (field && isDistinctField(field)) {
    const activeValue = posRegion.slice(lastColon + 1)
    return { kind: 'value', field, prefix: partialPrefix(activeValue) }
  }
  return { kind: 'none' }
}

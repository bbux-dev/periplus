// src/services/dsl/parser.ts
//
// Quick-Capture DSL parser (DSL-01..04). Ported from the validated spike
// `.planning/spikes/001-dsl-parser` (VALIDATED, 24/24).
//
// Grammar:  [type] pos1 : pos2 ? key=value, key=value
//
//   - type      optional leading word. Resolves ONLY exact type names + explicit
//               aliases. Partial/prefix tokens (`p`, `boo`) are NOT resolved here —
//               that is the suggestion menu's job — so they return status 'ambiguous'.
//   - pos1:pos2 positional slots, ':'-separated. Per-type schema = POSITIONAL_SCHEMA.
//   - ?k=v,k=v  named params, ','-separated. Keys validated against the type's fields.
//   - quoting   any value containing a delimiter (space/':'/','/'?') is wrapped in
//               double quotes; \" and \\ escape inside quotes.
//
// Output (ParseResult): the `values` map is keyed by ENTRY_FIELDS field keys, so it
// feeds straight into buildReviewDraft(ENTRY_FIELDS[type], values).

import { ENTRY_FIELDS, POSITIONAL_SCHEMA } from '../../config/entryFields'
import type { EntryType } from '../db'

// ─── Public types ───────────────────────────────────────────────────────────────

export type ParseStatus = 'ok' | 'ambiguous' | 'error'

export interface ParseResult {
  status: ParseStatus
  type: EntryType | null
  /** Flat formValues keyed by ENTRY_FIELDS field keys — ready for buildReviewDraft. */
  values: Record<string, string>
  /** Hard problems → must route to ReviewPage, never save silently. */
  issues: string[]
  /** Soft surprises → save allowed, but surface in the live preview. */
  warnings: string[]
}

export interface ParseOptions {
  /** Resolved single type from domain context, used when no type token is given. */
  defaultType?: EntryType | null
}

// ─── Type registry ────────────────────────────────────────────────────────────────

const TYPE_NAMES = Object.keys(POSITIONAL_SCHEMA) as EntryType[]

const TYPE_ALIASES: Record<string, EntryType> = {
  exp: 'expense',
  mov: 'movie',
  pod: 'podcast',
}

// Named-param aliases → canonical field key (so users type `date=` not `occurredAt=`).
const NAMED_ALIASES: Record<string, string> = {
  date: 'occurredAt', when: 'occurredAt',
  note: 'description', notes: 'description', desc: 'description',
  author: 'creator', director: 'creator', host: 'creator', cur: 'currency',
}

/** Valid field keys for a type, derived from ENTRY_FIELDS (single source of truth). */
function fieldKeys(type: EntryType): string[] {
  return ENTRY_FIELDS[type].map((f) => f.key)
}

// ─── Quote-aware helpers ────────────────────────────────────────────────────────

function indexOfTopLevel(str: string, delim: string): number {
  let inStr = false
  let esc = false
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (!inStr && ch === delim) return i
  }
  return -1
}

function splitTopLevel(str: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let inStr = false
  let esc = false
  for (const ch of str) {
    if (esc) { cur += ch; esc = false; continue }
    if (ch === '\\') { cur += ch; esc = true; continue }
    if (ch === '"') { inStr = !inStr; cur += ch; continue }
    if (!inStr && ch === delim) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out
}

class ParseError extends Error {
  readonly isParseError = true
}

/** Strip surrounding quotes, unescape \" and \\. Throws ParseError on malformed quoting. */
function unquote(input: string): string {
  const s = input.trim()
  if (s === '' || s[0] !== '"') return s
  let val = ''
  let closed = false
  let i = 1
  for (; i < s.length; i++) {
    const ch = s[i]
    if (ch === '\\') {
      const n = s[i + 1]
      if (n === '"' || n === '\\') { val += n; i++; continue }
      val += ch
      continue
    }
    if (ch === '"') { closed = true; i++; break }
    val += ch
  }
  if (!closed) throw new ParseError(`unterminated quote in: ${s}`)
  const rest = s.slice(i).trim()
  if (rest !== '') throw new ParseError(`unexpected text after quoted value: ${rest}`)
  return val
}

// ─── Main parser ────────────────────────────────────────────────────────────────

export function parseDSL(input: string, opts: ParseOptions = {}): ParseResult {
  const defaultType = opts.defaultType ?? null
  const issues: string[] = []
  const warnings: string[] = []
  const values: Record<string, string> = {}

  const raw = (input ?? '').trim()
  if (!raw) {
    return { status: 'error', type: null, values, issues: ['empty input'], warnings }
  }

  try {
    // 1. Split off the named-param region at the first top-level '?'
    const qIdx = indexOfTopLevel(raw, '?')
    const leftRegion = (qIdx === -1 ? raw : raw.slice(0, qIdx)).trim()
    const paramRegion = qIdx === -1 ? null : raw.slice(qIdx + 1)

    // 2. Extract an optional leading type token
    let type: EntryType | null = null
    let posRegion = leftRegion
    let typeFromLeadingWord = false

    if (leftRegion && leftRegion[0] !== '"') {
      const m = leftRegion.match(/^(\S+)(\s+([\s\S]*))?$/)
      const candidate = m && m[1] ? m[1].toLowerCase() : ''
      const remainder = m && m[3] != null ? m[3] : ''
      if (TYPE_NAMES.includes(candidate as EntryType) || TYPE_ALIASES[candidate]) {
        type = TYPE_ALIASES[candidate] ?? (candidate as EntryType)
        posRegion = remainder
        typeFromLeadingWord = true
      } else if (
        /^[a-z]+$/.test(candidate) &&
        TYPE_NAMES.some((t) => t.startsWith(candidate)) &&
        remainder !== ''
      ) {
        // Looks like a partial type attempt (alpha, prefix of ≥1 type, followed by a value).
        const matches = TYPE_NAMES.filter((t) => t.startsWith(candidate))
        return {
          status: 'ambiguous',
          type: null,
          values,
          issues: [`"${candidate}" is a partial type (matches: ${matches.join(', ')}) — pick from suggestions`],
          warnings,
        }
      }
      // else: candidate is not a type → the whole leftRegion is positional (no type token)
    }

    // 3. Resolve the type from context if none was given
    if (!type) {
      if (defaultType) {
        type = defaultType
      } else {
        return {
          status: 'ambiguous',
          type: null,
          values,
          issues: ['no type given and no domain context — choose a type'],
          warnings,
        }
      }
    }

    // Soft warning: a leading word hijacked a type that differs from the domain default.
    if (typeFromLeadingWord && defaultType && type !== defaultType) {
      warnings.push(`leading word interpreted as type "${type}" (domain default is "${defaultType}"); quote it to use as text`)
    }

    // 4. Positionals
    const schema = POSITIONAL_SCHEMA[type]
    if (posRegion.trim() !== '') {
      const parts = splitTopLevel(posRegion, ':')
      if (parts.length > schema.length) {
        issues.push(`${parts.length} positional slots but "${type}" defines ${schema.length} (quote values containing ':')`)
      }
      parts.forEach((part, i) => {
        if (i >= schema.length) return
        const val = unquote(part.trim())
        if (val === '') {
          if (part.trim() === '' && parts.length > 1) warnings.push(`empty "${schema[i]}" slot`)
          return
        }
        values[schema[i]] = val
      })
    }

    // 5. Named params
    if (paramRegion != null) {
      if (paramRegion.trim() === '') {
        warnings.push("trailing '?' with no params")
      } else {
        for (const seg of splitTopLevel(paramRegion, ',')) {
          if (seg.trim() === '') continue
          const eq = indexOfTopLevel(seg, '=')
          if (eq === -1) { issues.push(`param "${seg.trim()}" missing '='`); continue }
          const key = seg.slice(0, eq).trim().toLowerCase()
          const val = unquote(seg.slice(eq + 1).trim())
          if (key === '') { issues.push(`empty param name in "${seg.trim()}"`); continue }
          const canonical = NAMED_ALIASES[key] ?? key
          if (!fieldKeys(type).includes(canonical)) {
            issues.push(`unknown field "${key}" for type "${type}"`)
            continue
          }
          values[canonical] = val
        }
      }
    }

    const status: ParseStatus = issues.length ? 'error' : 'ok'
    return { status, type, values, issues, warnings }
  } catch (e) {
    if (e instanceof ParseError) {
      return { status: 'error', type: null, values, issues: [e.message], warnings }
    }
    throw e
  }
}

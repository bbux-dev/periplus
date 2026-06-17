/*
 * Quick-Capture DSL parser — SPIKE prototype (throwaway).
 *
 * Grammar:  [type] pos1 : pos2 ? key=value, key=value
 *
 *   - type      optional leading word (whitespace-separated). Parser resolves ONLY
 *               exact type names + explicit aliases. Partial/prefix tokens (e.g. "p",
 *               "boo") are NOT resolved here — that is the suggestion menu's job — so
 *               they return status "ambiguous".
 *   - pos1:pos2 positional slots, ':'-separated. Per-type schema (POSITIONAL_SCHEMA).
 *   - ?k=v,k=v  named params, ','-separated. Keys validated against the type's fields.
 *   - quoting   any value containing a delimiter (space / ':' / ',' / '?') is wrapped
 *               in double quotes; \" and \\ escape inside quotes.
 *
 * Output: { status, type, values, issues, warnings }
 *   status  : 'ok' | 'ambiguous' | 'error'
 *   values  : Record<string,string> — flat formValues keyed by ENTRY_FIELDS field keys,
 *             ready to hand to buildReviewDraft().
 *   issues  : hard problems → must route to ReviewPage, never save silently.
 *   warnings: soft surprises → save allowed, but surface in the live preview.
 */

// ─── Type registry (mirrors src/config/navigation.ts + entryFields.ts) ──────────
const TYPE_NAMES = ['show', 'movie', 'book', 'podcast', 'place', 'event', 'expense']
const TYPE_ALIASES = { exp: 'expense', mov: 'movie', pod: 'podcast' }

// Positional slot → field key, per type. slot1 = primary identity, slot2 = secondary.
const POSITIONAL_SCHEMA = {
  expense: ['amount', 'category'],
  book:    ['title', 'creator'],
  movie:   ['title', 'creator'],
  show:    ['title', 'creator'],
  podcast: ['title', 'creator'],
  place:   ['name', 'address'],
  event:   ['title', 'location'],
}

// Valid field keys per type (mirrors ENTRY_FIELDS keys). Used to reject unknown params.
const FIELD_KEYS = {
  expense: ['title', 'amount', 'currency', 'category', 'merchant', 'occurredAt', 'description', 'tags'],
  book:    ['title', 'creator', 'occurredAt', 'rating', 'description', 'tags'],
  movie:   ['title', 'creator', 'occurredAt', 'rating', 'description', 'tags'],
  show:    ['title', 'creator', 'occurredAt', 'rating', 'description', 'tags'],
  podcast: ['title', 'creator', 'occurredAt', 'rating', 'description', 'tags'],
  place:   ['name', 'address', 'occurredAt', 'description', 'tags'],
  event:   ['title', 'location', 'occurredAt', 'description', 'tags'],
}

// Named-param aliases → canonical field key (so users type `date=` not `occurredAt=`).
const NAMED_ALIASES = {
  date: 'occurredAt', when: 'occurredAt',
  note: 'description', notes: 'description', desc: 'description',
  author: 'creator', director: 'creator', host: 'creator', cur: 'currency',
}

// ─── Quote-aware helpers ────────────────────────────────────────────────────────
function indexOfTopLevel(str, delim) {
  let inStr = false, esc = false
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (!inStr && ch === delim) return i
  }
  return -1
}

function splitTopLevel(str, delim) {
  const out = []
  let cur = '', inStr = false, esc = false
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
  constructor(message) { super(message); this.isParseError = true }
}

// Strip surrounding quotes, unescape \" and \\. Throws ParseError on malformed quoting.
function unquote(s) {
  s = s.trim()
  if (s === '' || s[0] !== '"') return s
  let val = '', closed = false, i = 1
  for (; i < s.length; i++) {
    const ch = s[i]
    if (ch === '\\') {
      const n = s[i + 1]
      if (n === '"' || n === '\\') { val += n; i++; continue }
      val += ch; continue
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
function parseDSL(input, opts = {}) {
  const defaultType = opts.defaultType || null  // resolved single type from domain context, if any
  const issues = []
  const warnings = []
  const values = {}

  const raw = (input || '').trim()
  if (!raw) return { status: 'error', type: null, values, issues: ['empty input'], warnings }

  try {
    // 1. Split off named-param region at first top-level '?'
    const qIdx = indexOfTopLevel(raw, '?')
    const leftRegion = (qIdx === -1 ? raw : raw.slice(0, qIdx)).trim()
    const paramRegion = qIdx === -1 ? null : raw.slice(qIdx + 1)

    // 2. Extract optional leading type token
    let type = null
    let posRegion = leftRegion
    let typeFromLeadingWord = false

    if (leftRegion && leftRegion[0] !== '"') {
      const m = leftRegion.match(/^(\S+)(\s+([\s\S]*))?$/)
      const candidate = m && m[1] ? m[1].toLowerCase() : ''
      const remainder = m && m[3] != null ? m[3] : ''
      if (TYPE_NAMES.includes(candidate) || TYPE_ALIASES[candidate]) {
        type = TYPE_ALIASES[candidate] || candidate
        posRegion = remainder
        typeFromLeadingWord = true
      } else if (/^[a-z]+$/.test(candidate) && TYPE_NAMES.some(t => t.startsWith(candidate)) && remainder !== '') {
        // Looks like a partial type attempt (alpha, prefix of ≥1 type, followed by a value).
        const matches = TYPE_NAMES.filter(t => t.startsWith(candidate))
        return {
          status: 'ambiguous', type: null, values,
          issues: [`"${candidate}" is a partial type (matches: ${matches.join(', ')}) — pick from suggestions`],
          warnings,
        }
      }
      // else: candidate is not a type → whole leftRegion is positional (no type token)
    }

    // 3. Resolve type from context if none given
    if (!type) {
      if (defaultType) {
        type = defaultType
      } else {
        return {
          status: 'ambiguous', type: null, values,
          issues: ['no type given and no domain context — choose a type'],
          warnings,
        }
      }
    }
    if (!POSITIONAL_SCHEMA[type]) {
      return { status: 'error', type, values, issues: [`unknown type "${type}"`], warnings }
    }

    // Soft warning: leading word hijacked a type that differs from the domain default.
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
          const canonical = NAMED_ALIASES[key] || key
          if (!FIELD_KEYS[type].includes(canonical)) {
            issues.push(`unknown field "${key}" for type "${type}"`)
            continue
          }
          values[canonical] = val
        }
      }
    }

    const status = issues.length ? 'error' : 'ok'
    return { status, type, values, issues, warnings }
  } catch (e) {
    if (e.isParseError) {
      return { status: 'error', type: null, values, issues: [e.message], warnings }
    }
    throw e
  }
}

// UMD-ish export: works in Node (require) and browser (<script src> → global parseDSL).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseDSL, POSITIONAL_SCHEMA, TYPE_NAMES, TYPE_ALIASES }
}

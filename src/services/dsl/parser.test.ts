import { describe, it, expect } from 'vitest'
import { parseDSL } from './parser'
import type { ParseOptions } from './parser'
import { ENTRY_FIELDS, POSITIONAL_SCHEMA } from '../../config/entryFields'

// Ported from the validated spike `.planning/spikes/001-dsl-parser/test.js` (24 cases),
// covering all 7 types + the four risk areas (DSL-01..04).

interface Case {
  id: string
  input: string
  opts?: ParseOptions
  expect: {
    status: 'ok' | 'ambiguous' | 'error'
    type?: string
    values?: Record<string, string>
    warns?: boolean
  }
}

const cases: Case[] = [
  // ── Happy path: all 7 types (DSL-01) ────────────────────────────────────────
  { id: 'expense-full', input: 'expense 12.50:food?merchant=Blue Bottle',
    expect: { status: 'ok', type: 'expense', values: { amount: '12.50', category: 'food', merchant: 'Blue Bottle' } } },
  { id: 'expense-alias', input: 'exp 12.50:food',
    expect: { status: 'ok', type: 'expense', values: { amount: '12.50', category: 'food' } } },
  { id: 'book-quoted-colon', input: 'book "Dune: A Novel":Herbert?rating=5',
    expect: { status: 'ok', type: 'book', values: { title: 'Dune: A Novel', creator: 'Herbert', rating: '5' } } },
  { id: 'movie-slot2-omitted', input: 'movie "Blade Runner 2049"?rating=5',
    expect: { status: 'ok', type: 'movie', values: { title: 'Blade Runner 2049', rating: '5' } } },
  { id: 'place-two-quoted', input: 'place "Blue Bottle":"315 Linden St"',
    expect: { status: 'ok', type: 'place', values: { name: 'Blue Bottle', address: '315 Linden St' } } },
  { id: 'show-named-rating', input: 'show Severance:Apple TV?rating=5',
    expect: { status: 'ok', type: 'show', values: { title: 'Severance', creator: 'Apple TV', rating: '5' } } },
  { id: 'podcast-quoted', input: 'podcast "Hardcore History":"Dan Carlin"',
    expect: { status: 'ok', type: 'podcast', values: { title: 'Hardcore History', creator: 'Dan Carlin' } } },
  { id: 'event-date-alias', input: 'event Standup:Office?date=2026-06-16',
    expect: { status: 'ok', type: 'event', values: { title: 'Standup', location: 'Office', occurredAt: '2026-06-16' } } },

  // ── Type inference from domain context (DSL-02) ─────────────────────────────
  { id: 'infer-expense', input: '12.50:coffee', opts: { defaultType: 'expense' },
    expect: { status: 'ok', type: 'expense', values: { amount: '12.50', category: 'coffee' } } },
  { id: 'unquoted-spaces-title', input: 'book Blade Runner 2049:Tolkien',
    expect: { status: 'ok', type: 'book', values: { title: 'Blade Runner 2049', creator: 'Tolkien' } } },

  // ── Risk #1: leading type-word hijack + the quoting escape hatch ────────────
  { id: 'quote-escapes-typeword', input: 'book "Show Dogs":Author',
    expect: { status: 'ok', type: 'book', values: { title: 'Show Dogs', creator: 'Author' } } },
  { id: 'leading-typeword-warns', input: 'show dogs:5', opts: { defaultType: 'expense' },
    expect: { status: 'ok', type: 'show', values: { title: 'dogs', creator: '5' }, warns: true } },

  // ── Risk #2: single-letter / partial type collisions (parser refuses) (DSL-02)
  { id: 'ambiguous-p', input: 'p coffee:5',
    expect: { status: 'ambiguous' } },
  { id: 'ambiguous-e', input: 'e lunch:food', opts: { defaultType: 'expense' },
    expect: { status: 'ambiguous' } },
  { id: 'no-type-no-context', input: '12.50:food',
    expect: { status: 'ambiguous' } },

  // ── Risk #3: quote / escape handling (DSL-03) ───────────────────────────────
  { id: 'unterminated-quote', input: 'book "Dune:Herbert',
    expect: { status: 'error' } },
  { id: 'escaped-quote-inside', input: 'book "The \\"Real\\" Dune":Herbert',
    expect: { status: 'ok', type: 'book', values: { title: 'The "Real" Dune', creator: 'Herbert' } } },

  // ── Risk #4: partial / malformed input (DSL-04) ─────────────────────────────
  { id: 'param-missing-eq', input: 'expense 12:food?merchant',
    expect: { status: 'error' } },
  { id: 'empty-param-name', input: 'expense 12:food?=blue',
    expect: { status: 'error' } },
  { id: 'empty-positional-slot', input: 'expense :food', opts: { defaultType: 'expense' },
    expect: { status: 'ok', type: 'expense', values: { category: 'food' }, warns: true } },
  { id: 'unknown-field', input: 'expense 12:food?colour=blue',
    expect: { status: 'error' } },
  { id: 'trailing-question', input: 'movie Dune?',
    expect: { status: 'ok', type: 'movie', values: { title: 'Dune' }, warns: true } },

  // ── The multi-value-param trap (tags vs comma separator) (DSL-03) ───────────
  { id: 'tags-unquoted-breaks', input: 'expense 12:food?tags=a,b,c',
    expect: { status: 'error' } },
  { id: 'tags-quoted-works', input: 'expense 12:food?tags="a, b, c"',
    expect: { status: 'ok', type: 'expense', values: { amount: '12', category: 'food', tags: 'a, b, c' } } },
]

describe('parseDSL', () => {
  for (const c of cases) {
    it(c.id, () => {
      const r = parseDSL(c.input, c.opts ?? {})
      expect(r.status).toBe(c.expect.status)
      if (c.expect.type) expect(r.type).toBe(c.expect.type)
      if (c.expect.values) expect(r.values).toEqual(c.expect.values)
      if (c.expect.warns) expect(r.warnings.length).toBeGreaterThan(0)
    })
  }

  it('empty input is an error', () => {
    expect(parseDSL('').status).toBe('error')
    expect(parseDSL('   ').status).toBe('error')
  })
})

describe('POSITIONAL_SCHEMA invariants', () => {
  it('every positional key is a real ENTRY_FIELDS key for its type', () => {
    for (const [type, keys] of Object.entries(POSITIONAL_SCHEMA)) {
      const valid = ENTRY_FIELDS[type as keyof typeof ENTRY_FIELDS].map((f) => f.key)
      for (const k of keys) expect(valid).toContain(k)
    }
  })
})

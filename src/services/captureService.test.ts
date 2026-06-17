import { describe, it, expect } from 'vitest'
import {
  HOLE_TOKEN,
  cleanValues,
  detectHoles,
  applyFills,
  buildDSLPreview,
  draftToEntry,
} from './captureService'
import type { ReviewDraft } from './extractMetadataFromUrl'

// ─── Factory helper ───────────────────────────────────────────────────────────

function makeReviewDraft(overrides?: Partial<ReviewDraft>): ReviewDraft {
  return {
    metadata: {},
    ...overrides,
  }
}

// ─── HOLE_TOKEN ───────────────────────────────────────────────────────────────

describe('HOLE_TOKEN', () => {
  it('is the string "{}" (CAP-04 named-hole convention)', () => {
    expect(HOLE_TOKEN).toBe('{}')
  })
})

// ─── cleanValues ──────────────────────────────────────────────────────────────

describe('cleanValues', () => {
  it('strips entries whose value is HOLE_TOKEN, leaving others intact', () => {
    expect(cleanValues({ category: 'food', merchant: '{}' })).toEqual({ category: 'food' })
  })

  it('leaves all entries intact when none are HOLE_TOKEN', () => {
    expect(cleanValues({ amount: '5', category: 'coffee' })).toEqual({
      amount: '5',
      category: 'coffee',
    })
  })

  it('returns empty object when all values are HOLE_TOKEN', () => {
    expect(cleanValues({ amount: '{}', category: '{}' })).toEqual({})
  })

  it('returns empty object when input is empty', () => {
    expect(cleanValues({})).toEqual({})
  })
})

// ─── detectHoles ──────────────────────────────────────────────────────────────

describe('detectHoles', () => {
  it('zero-hole: expense with amount and category → hasHoles false (CAP-01)', () => {
    const result = detectHoles('expense', { amount: '5', category: 'coffee' })
    expect(result).toEqual({ positional: [], named: [], hasHoles: false })
  })

  it('positional hole: missing amount → positional includes "amount" (CAP-02)', () => {
    const result = detectHoles('expense', { category: 'food' })
    expect(result.positional).toEqual(['amount'])
    expect(result.named).toEqual([])
    expect(result.hasHoles).toBe(true)
  })

  it('bare template (no positional region): all slots are positional holes (RESEARCH Pitfall 2)', () => {
    // Uses POSITIONAL_SCHEMA comparison, NOT warning strings — handles `expense` with no values
    const result = detectHoles('expense', {})
    expect(result.positional).toEqual(['amount', 'category'])
    expect(result.named).toEqual([])
    expect(result.hasHoles).toBe(true)
  })

  it('named {} hole: merchant={} detected as named hole, amount still positional (CAP-04)', () => {
    const result = detectHoles('expense', { category: 'food', merchant: '{}' })
    expect(result.positional).toEqual(['amount'])
    expect(result.named).toEqual(['merchant'])
    expect(result.hasHoles).toBe(true)
  })

  it('positional holes follow POSITIONAL_SCHEMA order (amount before category)', () => {
    const result = detectHoles('expense', {})
    expect(result.positional[0]).toBe('amount')
    expect(result.positional[1]).toBe('category')
  })

  it('named holes appear in discovery order', () => {
    // merchant first, then category (in entry order)
    const result = detectHoles('expense', { merchant: '{}', amount: '5', category: '{}' })
    // amount is present → no positional hole
    // named holes: merchant and category are HOLE_TOKEN
    expect(result.positional).toEqual([])
    expect(result.named).toEqual(['merchant', 'category'])
  })

  it('does NOT inspect warning strings — schema comparison catches bare template', () => {
    // This verifies Pitfall 2: a bare 'expense' template emits no parser warning
    // but still has holes detected by POSITIONAL_SCHEMA comparison
    const result = detectHoles('expense', { category: 'food' })
    expect(result.positional).toContain('amount')
  })
})

// ─── applyFills ───────────────────────────────────────────────────────────────

describe('applyFills', () => {
  it('merges fills over base values', () => {
    const result = applyFills({ amount: '', category: 'food' }, { amount: '12' })
    expect(result).toEqual({ amount: '12', category: 'food' })
  })

  it('fills overwrite base values for matching keys', () => {
    expect(applyFills({ amount: '5' }, { amount: '10' })).toEqual({ amount: '10' })
  })

  it('returns base values unchanged when fills is empty', () => {
    expect(applyFills({ amount: '5', category: 'food' }, {})).toEqual({
      amount: '5',
      category: 'food',
    })
  })

  it('fills can add new keys not in base', () => {
    expect(applyFills({ category: 'food' }, { amount: '12', merchant: 'target' })).toEqual({
      category: 'food',
      amount: '12',
      merchant: 'target',
    })
  })
})

// ─── buildDSLPreview ──────────────────────────────────────────────────────────

describe('buildDSLPreview', () => {
  it('builds correct preview for expense with all positional slots filled', () => {
    expect(buildDSLPreview('expense', { amount: '12', category: 'food' })).toBe('expense 12:food')
  })

  it('renders empty positional slots as empty string (holes become colons)', () => {
    expect(buildDSLPreview('expense', { category: 'food' })).toBe('expense :food')
  })

  it('appends named params as ?k=v joined by comma', () => {
    expect(
      buildDSLPreview('expense', { amount: '12', category: 'food', merchant: 'target' }),
    ).toBe('expense 12:food?merchant=target')
  })

  it('quotes named param values containing spaces', () => {
    expect(
      buildDSLPreview('expense', { amount: '12', category: 'food', merchant: 'whole foods' }),
    ).toBe('expense 12:food?merchant="whole foods"')
  })

  it('quotes named param values containing colons', () => {
    expect(
      buildDSLPreview('expense', { amount: '12', category: 'food', merchant: 'a:b' }),
    ).toBe('expense 12:food?merchant="a:b"')
  })

  it('quotes named param values containing commas', () => {
    expect(
      buildDSLPreview('expense', { amount: '12', category: 'food', merchant: 'a,b' }),
    ).toBe('expense 12:food?merchant="a,b"')
  })

  it('skips falsy named param values (empty string)', () => {
    expect(
      buildDSLPreview('expense', { amount: '12', category: 'food', merchant: '' }),
    ).toBe('expense 12:food')
  })

  it('handles multiple named params', () => {
    expect(
      buildDSLPreview('expense', { amount: '12', category: 'food', merchant: 'target', currency: 'USD' }),
    ).toBe('expense 12:food?merchant=target,currency=USD')
  })
})

// ─── draftToEntry ─────────────────────────────────────────────────────────────

describe('draftToEntry — shape matches ReviewPage.handleSave contract (CAP-01)', () => {
  it('produces correct required fields: domain, type, title, recordedAt, tags, metadata, syncedAt', () => {
    const draft = makeReviewDraft({ title: ' x ', tags: ['a'] })
    const entry = draftToEntry(draft, 'expense', 'expenditures')
    expect(entry.domain).toBe('expenditures')
    expect(entry.type).toBe('expense')
    expect(entry.title).toBe('x')
    expect(entry.tags).toEqual(['a'])
    expect(entry.metadata).toEqual({})
    expect(entry.syncedAt).toBeNull()
    expect(typeof entry.recordedAt).toBe('number')
  })

  it('trims title whitespace — mirrors title.trim() || "Untitled"', () => {
    expect(draftToEntry(makeReviewDraft({ title: '  hello  ' }), 'expense', 'expenditures').title)
      .toBe('hello')
  })

  it('falls back to "Untitled" when title is empty', () => {
    expect(draftToEntry(makeReviewDraft({ title: '' }), 'expense', 'expenditures').title)
      .toBe('Untitled')
  })

  it('falls back to "Untitled" when title is whitespace-only', () => {
    expect(draftToEntry(makeReviewDraft({ title: '   ' }), 'expense', 'expenditures').title)
      .toBe('Untitled')
  })

  it('falls back to "Untitled" when title is undefined', () => {
    expect(draftToEntry(makeReviewDraft(), 'expense', 'expenditures').title)
      .toBe('Untitled')
  })

  it('defaults tags to [] when draft.tags is undefined', () => {
    const entry = draftToEntry(makeReviewDraft({ title: 'Test' }), 'expense', 'expenditures')
    expect(entry.tags).toEqual([])
  })

  it('defaults metadata to {} when draft.metadata is undefined/empty', () => {
    const draft = makeReviewDraft({ title: 'Test' })
    const entry = draftToEntry(draft, 'expense', 'expenditures')
    expect(entry.metadata).toEqual({})
  })

  it('preserves metadata from draft', () => {
    const draft = makeReviewDraft({ title: 'Test', metadata: { currency: 'USD', creator: 'me' } })
    const entry = draftToEntry(draft, 'expense', 'expenditures')
    expect(entry.metadata).toEqual({ currency: 'USD', creator: 'me' })
  })

  it('syncedAt is always null (never yet synced)', () => {
    const entry = draftToEntry(makeReviewDraft({ title: 'Test' }), 'expense', 'expenditures')
    expect(entry.syncedAt).toBeNull()
  })
})

describe('draftToEntry — optional-field omission (if-truthy / if-not-null-or-NaN)', () => {
  it('includes amount when numeric and not NaN', () => {
    const entry = draftToEntry(makeReviewDraft({ title: 'Test', amount: 12.5 }), 'expense', 'expenditures')
    expect(entry.amount).toBe(12.5)
  })

  it('omits amount when null', () => {
    const entry = draftToEntry(makeReviewDraft({ title: 'Test' }), 'expense', 'expenditures')
    expect('amount' in entry).toBe(false)
  })

  it('omits amount when NaN', () => {
    const entry = draftToEntry(makeReviewDraft({ title: 'Test', amount: NaN }), 'expense', 'expenditures')
    expect('amount' in entry).toBe(false)
  })

  it('includes occurredAt when epoch ms present', () => {
    const entry = draftToEntry(makeReviewDraft({ title: 'Test', occurredAt: 1700000000000 }), 'expense', 'expenditures')
    expect(entry.occurredAt).toBe(1700000000000)
  })

  it('omits occurredAt when null', () => {
    const entry = draftToEntry(makeReviewDraft({ title: 'Test' }), 'expense', 'expenditures')
    expect('occurredAt' in entry).toBe(false)
  })

  it('includes location when truthy', () => {
    const entry = draftToEntry(makeReviewDraft({ title: 'Test', location: 'Paris' }), 'expense', 'expenditures')
    expect(entry.location).toBe('Paris')
  })

  it('omits location when empty string (falsy)', () => {
    const entry = draftToEntry(makeReviewDraft({ title: 'Test', location: '' }), 'expense', 'expenditures')
    expect('location' in entry).toBe(false)
  })

  it('includes description when truthy', () => {
    const entry = draftToEntry(makeReviewDraft({ title: 'Test', description: 'Nice trip' }), 'expense', 'expenditures')
    expect(entry.description).toBe('Nice trip')
  })

  it('omits description when empty string (falsy)', () => {
    const entry = draftToEntry(makeReviewDraft({ title: 'Test', description: '' }), 'expense', 'expenditures')
    expect('description' in entry).toBe(false)
  })

  it('preserves sourceUrl when truthy (ReviewPage pre-validates; shortcut drafts omit)', () => {
    const entry = draftToEntry(
      makeReviewDraft({ title: 'Test', sourceUrl: 'https://example.com' }),
      'expense',
      'expenditures',
    )
    expect(entry.sourceUrl).toBe('https://example.com')
  })

  it('omits sourceUrl when falsy/undefined (shortcut draft, no URL)', () => {
    const entry = draftToEntry(makeReviewDraft({ title: 'Test' }), 'expense', 'expenditures')
    expect('sourceUrl' in entry).toBe(false)
  })
})

describe('draftToEntry — full entry shape (draftToEntry vs buildDSLPreview round-trip)', () => {
  it('complete expense draft produces all expected fields', () => {
    const draft = makeReviewDraft({
      title: ' Grocery run ',
      amount: 42.5,
      tags: ['food', 'weekly'],
      location: 'Whole Foods',
      description: 'Weekly shop',
      occurredAt: 1700000000000,
      metadata: { category: 'groceries', currency: 'USD' },
    })
    const entry = draftToEntry(draft, 'expense', 'expenditures')
    expect(entry).toMatchObject({
      domain: 'expenditures',
      type: 'expense',
      title: 'Grocery run',
      amount: 42.5,
      tags: ['food', 'weekly'],
      location: 'Whole Foods',
      description: 'Weekly shop',
      occurredAt: 1700000000000,
      metadata: { category: 'groceries', currency: 'USD' },
      syncedAt: null,
    })
    expect(typeof entry.recordedAt).toBe('number')
  })
})

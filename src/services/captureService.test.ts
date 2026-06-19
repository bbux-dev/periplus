import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  HOLE_TOKEN,
  cleanValues,
  detectHoles,
  applyFills,
  buildDSLPreview,
  draftToEntry,
  todayLocalDate,
  todayLocalMidnightEpoch,
  typeHasDateField,
  withDefaultOccurredAt,
} from './captureService'
import type { EntryType } from './db'
import type { ReviewDraft } from './captureService'

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

  it('named holes appear in discovery order (non-positional named fields)', () => {
    // merchant and currency are non-positional named fields for expense
    // amount and category are filled → no positional holes
    const result = detectHoles('expense', {
      merchant: '{}',
      amount: '5',
      category: 'food',
      currency: '{}',
    })
    expect(result.positional).toEqual([])
    expect(result.named).toEqual(['merchant', 'currency'])
  })

  it('does NOT inspect warning strings — schema comparison catches bare template', () => {
    // This verifies Pitfall 2: a bare 'expense' template emits no parser warning
    // but still has holes detected by POSITIONAL_SCHEMA comparison
    const result = detectHoles('expense', { category: 'food' })
    expect(result.positional).toContain('amount')
  })

  it('WR-01: positional field with HOLE_TOKEN value is reported only once (no double-count)', () => {
    // Template `expense :{}` → parser produces { category: '{}' } (amount absent)
    // category appears in named (HOLE_TOKEN) AND would appear in positional (absent from cleanVals)
    // After de-duplication, category should be in positional only, not in named.
    const result = detectHoles('expense', { category: '{}' })
    expect(result.positional).toContain('amount')
    expect(result.positional).toContain('category')
    expect(result.named).toEqual([])   // category de-duped out of named
    expect(result.hasHoles).toBe(true)
    // Ensure category appears exactly once across both arrays
    const allKeys = [...result.positional, ...result.named]
    expect(allKeys.filter((k) => k === 'category')).toHaveLength(1)
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

  it('WR-02: escapes embedded double-quote in quoted named param values', () => {
    // merchant value contains a space (triggers quoting) and a double-quote
    expect(
      buildDSLPreview('expense', { amount: '12', category: 'food', merchant: 'say "hello"' }),
    ).toBe('expense 12:food?merchant="say \\"hello\\""')
  })

  it('WR-02: escapes backslash before double-quote in quoted values', () => {
    expect(
      buildDSLPreview('expense', { amount: '12', category: 'food', merchant: 'a\\b c' }),
    ).toBe('expense 12:food?merchant="a\\\\b c"')
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

// ─── Date-default helpers (DATE-01) ───────────────────────────────────────────

describe('todayLocalDate / todayLocalMidnightEpoch', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('todayLocalDate returns the local YYYY-MM-DD string (en-CA convention)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-18T14:00:00'))
    expect(todayLocalDate()).toBe(new Date().toLocaleDateString('en-CA'))
    expect(todayLocalDate()).toBe('2026-06-18')
  })

  it('todayLocalMidnightEpoch returns the local-midnight epoch of today (Date.parse `${d}T00:00:00`)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-18T14:00:00'))
    const expected = Date.parse('2026-06-18T00:00:00')
    expect(todayLocalMidnightEpoch()).toBe(expected)
  })
})

describe('typeHasDateField', () => {
  it('returns true for types with a core occurredAt descriptor', () => {
    expect(typeHasDateField('expense')).toBe(true)
    expect(typeHasDateField('movie')).toBe(true)
  })

  it('returns false for an unknown/bogus type', () => {
    expect(typeHasDateField('bogus' as EntryType)).toBe(false)
  })
})

describe('withDefaultOccurredAt (DATE-01)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fills today local-midnight epoch when occurredAt is absent and type has a date field', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-18T14:00:00'))
    const draft = makeReviewDraft({ title: 'Coffee' })
    const result = withDefaultOccurredAt(draft, 'expense')
    expect(result.occurredAt).toBe(Date.parse('2026-06-18T00:00:00'))
  })

  it('leaves an explicit occurredAt untouched', () => {
    const draft = makeReviewDraft({ title: 'Coffee', occurredAt: 1700000000000 })
    const result = withDefaultOccurredAt(draft, 'expense')
    expect(result.occurredAt).toBe(1700000000000)
  })

  it('does not mutate the input draft', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-18T14:00:00'))
    const draft = makeReviewDraft({ title: 'Coffee' })
    const result = withDefaultOccurredAt(draft, 'expense')
    expect(draft.occurredAt).toBeUndefined()
    expect(result).not.toBe(draft)
  })

  it('returns the draft unchanged for a type with no date field', () => {
    const bogus = 'bogus' as EntryType
    // sanity: the gate is typeHasDateField → false
    expect(typeHasDateField(bogus)).toBe(false)
    const draft = makeReviewDraft({ title: 'Coffee' })
    const result = withDefaultOccurredAt(draft, bogus)
    expect(result.occurredAt).toBeUndefined()
  })

  it('treats a NaN occurredAt as absent and fills today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-18T14:00:00'))
    const draft = makeReviewDraft({ title: 'Coffee', occurredAt: NaN })
    const result = withDefaultOccurredAt(draft, 'expense')
    expect(result.occurredAt).toBe(Date.parse('2026-06-18T00:00:00'))
  })
})

// ─── STAMP-01: active-mode stamping ───────────────────────────────────────────

describe('draftToEntry — active-mode stamping (STAMP-01)', () => {
  it('stamps metadata.mode + metadata.modeLabel when an active mode is passed', () => {
    const draft = makeReviewDraft({ title: 'Coffee' })
    const entry = draftToEntry(draft, 'expense', 'expenditures', {
      mode: 'Travel',
      label: 'Oregon',
    })
    expect(entry.metadata).toEqual({ mode: 'Travel', modeLabel: 'Oregon' })
  })

  it('merges mode/modeLabel over existing draft.metadata (preserves prior keys)', () => {
    const draft = makeReviewDraft({
      title: 'Coffee',
      metadata: { category: 'coffee', currency: 'USD' },
    })
    const entry = draftToEntry(draft, 'expense', 'expenditures', {
      mode: 'Travel',
      label: 'Oregon',
    })
    expect(entry.metadata).toEqual({
      category: 'coffee',
      currency: 'USD',
      mode: 'Travel',
      modeLabel: 'Oregon',
    })
  })

  it('does NOT write mode/modeLabel when activeMode is undefined', () => {
    const draft = makeReviewDraft({ title: 'Coffee', metadata: { category: 'coffee' } })
    const entry = draftToEntry(draft, 'expense', 'expenditures', undefined)
    expect(entry.metadata).toEqual({ category: 'coffee' })
    expect('mode' in entry.metadata).toBe(false)
    expect('modeLabel' in entry.metadata).toBe(false)
  })

  it('does NOT write mode/modeLabel when activeMode is null', () => {
    const draft = makeReviewDraft({ title: 'Coffee' })
    const entry = draftToEntry(draft, 'expense', 'expenditures', null)
    expect('mode' in entry.metadata).toBe(false)
    expect('modeLabel' in entry.metadata).toBe(false)
  })

  it('does NOT write mode/modeLabel when the mode string is empty', () => {
    const draft = makeReviewDraft({ title: 'Coffee', metadata: { category: 'coffee' } })
    const entry = draftToEntry(draft, 'expense', 'expenditures', { mode: '', label: '' })
    expect(entry.metadata).toEqual({ category: 'coffee' })
    expect('mode' in entry.metadata).toBe(false)
    expect('modeLabel' in entry.metadata).toBe(false)
  })

  it('omitting the activeMode arg entirely behaves like no active mode', () => {
    const draft = makeReviewDraft({ title: 'Coffee', metadata: { category: 'coffee' } })
    const entry = draftToEntry(draft, 'expense', 'expenditures')
    expect(entry.metadata).toEqual({ category: 'coffee' })
  })
})

// ─── STAMP-02: tripId stamping (ENG-03) ──────────────────────────────────────

describe('draftToEntry — tripId stamping (STAMP-02 / ENG-03)', () => {
  it('stamps metadata.tripId when activeMode.tripId is set', () => {
    const draft = makeReviewDraft({ title: 'Coffee' })
    const entry = draftToEntry(draft, 'expense', 'trips', {
      mode: 'trip',
      label: 'Paris',
      tripId: 'uuid-x',
    })
    expect(entry.metadata.tripId).toBe('uuid-x')
    expect(entry.metadata.mode).toBe('trip')
    expect(entry.metadata.modeLabel).toBe('Paris')
  })

  it('does NOT stamp tripId when activeMode has no tripId', () => {
    const draft = makeReviewDraft({ title: 'Coffee' })
    const entry = draftToEntry(draft, 'expense', 'expenditures', {
      mode: 'Travel',
      label: 'Oregon',
    })
    expect('tripId' in entry.metadata).toBe(false)
    expect(entry.metadata.mode).toBe('Travel')
  })

  it('does NOT stamp tripId when activeMode is undefined', () => {
    const draft = makeReviewDraft({ title: 'Coffee' })
    const entry = draftToEntry(draft, 'expense', 'expenditures', undefined)
    expect('tripId' in entry.metadata).toBe(false)
  })

  it('does NOT stamp tripId when activeMode is null', () => {
    const draft = makeReviewDraft({ title: 'Coffee' })
    const entry = draftToEntry(draft, 'expense', 'expenditures', null)
    expect('tripId' in entry.metadata).toBe(false)
  })

  it('does NOT stamp tripId when activeMode.mode is empty string', () => {
    const draft = makeReviewDraft({ title: 'Coffee' })
    const entry = draftToEntry(draft, 'expense', 'expenditures', {
      mode: '',
      label: '',
      tripId: 'should-not-appear',
    })
    expect('tripId' in entry.metadata).toBe(false)
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

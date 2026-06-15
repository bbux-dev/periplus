import { describe, it, expect } from 'vitest'
import { ENTRY_FIELDS, buildReviewDraft } from './entryFields'
import type { EntryType } from '../services/db'

// ─── ENTRY_FIELDS shape assertions ────────────────────────────────────────────

describe('ENTRY_FIELDS', () => {
  const ALL_ENTRY_TYPES: EntryType[] = [
    'show', 'movie', 'book', 'podcast', 'place', 'event', 'expense',
  ]

  it('covers all 7 EntryType values', () => {
    for (const type of ALL_ENTRY_TYPES) {
      expect(ENTRY_FIELDS[type], `ENTRY_FIELDS missing entry for type: ${type}`).toBeDefined()
      expect(ENTRY_FIELDS[type].length).toBeGreaterThan(0)
    }
  })

  it('has correct creator labels: book="Author", movie="Director", podcast="Host", show="Creator"', () => {
    expect(ENTRY_FIELDS.book.find((f) => f.key === 'creator')?.label).toBe('Author')
    expect(ENTRY_FIELDS.movie.find((f) => f.key === 'creator')?.label).toBe('Director')
    expect(ENTRY_FIELDS.podcast.find((f) => f.key === 'creator')?.label).toBe('Host')
    expect(ENTRY_FIELDS.show.find((f) => f.key === 'creator')?.label).toBe('Creator')
  })

  it('place: "name" field has label "Name" and maps to core.title', () => {
    const nameField = ENTRY_FIELDS.place.find((f) => f.key === 'name')
    expect(nameField?.label).toBe('Name')
    expect(nameField?.mapTo).toEqual({ kind: 'core', field: 'title' })
  })

  it('place: "address" field has label "Address" and maps to core.location', () => {
    const addressField = ENTRY_FIELDS.place.find((f) => f.key === 'address')
    expect(addressField?.label).toBe('Address')
    expect(addressField?.mapTo).toEqual({ kind: 'core', field: 'location' })
  })

  it('expense: "amount" maps to core.amount (not metadata)', () => {
    const amountField = ENTRY_FIELDS.expense.find((f) => f.key === 'amount')
    expect(amountField?.mapTo).toEqual({ kind: 'core', field: 'amount' })
  })

  it('expense: currency/category/merchant map to metadata', () => {
    expect(ENTRY_FIELDS.expense.find((f) => f.key === 'currency')?.mapTo).toEqual(
      { kind: 'metadata', key: 'currency' },
    )
    expect(ENTRY_FIELDS.expense.find((f) => f.key === 'category')?.mapTo).toEqual(
      { kind: 'metadata', key: 'category' },
    )
    expect(ENTRY_FIELDS.expense.find((f) => f.key === 'merchant')?.mapTo).toEqual(
      { kind: 'metadata', key: 'merchant' },
    )
  })
})

// ─── buildReviewDraft mapper ──────────────────────────────────────────────────

describe('buildReviewDraft — expense mapping', () => {
  it('maps amount to draft.amount (core JS number) and currency to draft.metadata.currency', () => {
    const fields = ENTRY_FIELDS.expense
    const draft = buildReviewDraft(fields, {
      title: 'Dinner',
      amount: '15.5',
      currency: 'USD',
      category: '',
      merchant: '',
      occurredAt: '',
      description: '',
      tags: '',
    })
    expect(draft.amount).toBe(15.5)
    expect(draft.metadata.currency).toBe('USD')
    expect(draft.title).toBe('Dinner')
  })

  it('skips amount when non-numeric — draft.amount is undefined', () => {
    const fields = ENTRY_FIELDS.expense
    const draft = buildReviewDraft(fields, {
      title: 'Dinner',
      amount: 'abc',
      currency: 'USD',
      category: '',
      merchant: '',
      occurredAt: '',
      description: '',
      tags: '',
    })
    expect(draft.amount).toBeUndefined()
    expect(draft.metadata.currency).toBe('USD')
  })
})

describe('buildReviewDraft — place mapping', () => {
  it('maps name to draft.title and address to draft.location', () => {
    const fields = ENTRY_FIELDS.place
    const draft = buildReviewDraft(fields, {
      name: 'Eiffel Tower',
      address: 'Champ de Mars, 5 Av. Anatole France',
      occurredAt: '',
      description: '',
      tags: '',
    })
    expect(draft.title).toBe('Eiffel Tower')
    expect(draft.location).toBe('Champ de Mars, 5 Av. Anatole France')
  })
})

describe('buildReviewDraft — empty/whitespace skip', () => {
  it('skips empty string values — fields remain undefined', () => {
    const fields = ENTRY_FIELDS.show
    const draft = buildReviewDraft(fields, {
      title: '',
      creator: '',
      occurredAt: '',
      rating: '',
      description: '',
      tags: '',
    })
    expect(draft.title).toBeUndefined()
    expect(draft.description).toBeUndefined()
    expect(draft.metadata.creator).toBeUndefined()
    expect(draft.tags).toBeUndefined()
  })

  it('skips whitespace-only values', () => {
    const fields = ENTRY_FIELDS.show
    const draft = buildReviewDraft(fields, {
      title: '   ',
      creator: '  ',
      occurredAt: '',
      rating: '',
      description: '',
      tags: '',
    })
    expect(draft.title).toBeUndefined()
    expect(draft.metadata.creator).toBeUndefined()
  })
})

describe('buildReviewDraft — metadata number NaN handling (consistent with core amount)', () => {
  it('skips NaN metadata number fields — e.g. rating with non-numeric input', () => {
    const fields = ENTRY_FIELDS.show
    const draft = buildReviewDraft(fields, {
      title: 'Breaking Bad',
      creator: '',
      occurredAt: '',
      rating: 'great',   // non-numeric
      description: '',
      tags: '',
    })
    // NaN rating is skipped — consistent with core amount NaN handling
    expect(draft.metadata.rating).toBeUndefined()
  })

  it('stores metadata number as JS number when valid', () => {
    const fields = ENTRY_FIELDS.show
    const draft = buildReviewDraft(fields, {
      title: 'Breaking Bad',
      creator: '',
      occurredAt: '',
      rating: '4.5',
      description: '',
      tags: '',
    })
    expect(draft.metadata.rating).toBe(4.5)
    expect(typeof draft.metadata.rating).toBe('number')
  })
})

describe('buildReviewDraft — tags splitting', () => {
  it('splits comma-separated tags, trims each, and filters empty segments', () => {
    const fields = ENTRY_FIELDS.show
    const draft = buildReviewDraft(fields, {
      title: 'Breaking Bad',
      creator: '',
      occurredAt: '',
      rating: '',
      description: '',
      tags: 'drama, crime , , thriller',
    })
    expect(draft.tags).toEqual(['drama', 'crime', 'thriller'])
  })

  it('produces no tags field for empty tags input', () => {
    const fields = ENTRY_FIELDS.show
    const draft = buildReviewDraft(fields, {
      title: 'Breaking Bad',
      creator: '',
      occurredAt: '',
      rating: '',
      description: '',
      tags: '',
    })
    expect(draft.tags).toBeUndefined()
  })
})

describe('buildReviewDraft — date handling', () => {
  it('converts YYYY-MM-DD date string to LOCAL-midnight epoch ms (WR-03)', () => {
    const fields = ENTRY_FIELDS.show
    const raw = '2024-01-15'
    const draft = buildReviewDraft(fields, {
      title: 'Breaking Bad',
      creator: '',
      occurredAt: raw,
      rating: '',
      description: '',
      tags: '',
    })
    // Stored epoch must equal local midnight, NOT UTC midnight.
    // Date.parse(raw) is UTC midnight; Date.parse(`${raw}T00:00:00`) is local midnight.
    expect(draft.occurredAt).toBe(new Date(`${raw}T00:00:00`).getTime())
  })

  it('round-trips: stored epoch formats back to the same YYYY-MM-DD in local tz (WR-03)', () => {
    const fields = ENTRY_FIELDS.show
    const raw = '2024-01-15'
    const draft = buildReviewDraft(fields, {
      title: 'Breaking Bad',
      creator: '',
      occurredAt: raw,
      rating: '',
      description: '',
      tags: '',
    })
    // toLocaleDateString('en-CA') produces 'YYYY-MM-DD' in local tz — must match input
    expect(new Date(draft.occurredAt!).toLocaleDateString('en-CA')).toBe(raw)
  })

  it('skips invalid date strings — occurredAt remains undefined', () => {
    const fields = ENTRY_FIELDS.show
    const draft = buildReviewDraft(fields, {
      title: 'Breaking Bad',
      creator: '',
      occurredAt: 'not-a-date',
      rating: '',
      description: '',
      tags: '',
    })
    expect(draft.occurredAt).toBeUndefined()
  })
})

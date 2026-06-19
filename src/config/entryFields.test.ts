import { describe, it, expect } from 'vitest'
import {
  ENTRY_FIELDS,
  buildReviewDraft,
  formValuesFromEntry,
  buildEntryUpdate,
} from './entryFields'
import type { EntryType, LifeLogEntry } from '../services/db'

// Local-midnight epoch helper (matches the LOCAL date convention used everywhere)
const localEpoch = (d: string) => new Date(`${d}T00:00:00`).getTime()

/** Factory for a fully-populated entry; override per test. */
function makeEntry(overrides?: Partial<LifeLogEntry>): LifeLogEntry {
  return {
    id: 'test-id',
    domain: 'media',
    type: 'show',
    title: 'Breaking Bad',
    description: 'A great show',
    occurredAt: localEpoch('2024-03-10'),
    recordedAt: 1700000000000,
    tags: ['drama', 'crime'],
    metadata: { creator: 'Vince Gilligan', rating: 5 },
    syncedAt: null,
    ...overrides,
  }
}

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

describe('buildReviewDraft — rating range enforcement (IN-03)', () => {
  it('stores in-range rating (1–5 inclusive)', () => {
    const fields = ENTRY_FIELDS.show
    for (const val of ['1', '3', '5']) {
      const draft = buildReviewDraft(fields, {
        title: 'Show', creator: '', occurredAt: '', rating: val, description: '', tags: '',
      })
      expect(draft.metadata.rating).toBe(parseFloat(val))
    }
  })

  it('skips rating below minimum (0 is below 1)', () => {
    const fields = ENTRY_FIELDS.show
    const draft = buildReviewDraft(fields, {
      title: 'Show', creator: '', occurredAt: '', rating: '0', description: '', tags: '',
    })
    expect(draft.metadata.rating).toBeUndefined()
  })

  it('skips rating above maximum (6 is above 5)', () => {
    const fields = ENTRY_FIELDS.show
    const draft = buildReviewDraft(fields, {
      title: 'Show', creator: '', occurredAt: '', rating: '6', description: '', tags: '',
    })
    expect(draft.metadata.rating).toBeUndefined()
  })

  it('skips negative rating', () => {
    const fields = ENTRY_FIELDS.movie
    const draft = buildReviewDraft(fields, {
      title: 'Film', creator: '', occurredAt: '', rating: '-1', description: '', tags: '',
    })
    expect(draft.metadata.rating).toBeUndefined()
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

// ─── formValuesFromEntry (inverse mapper) ─────────────────────────────────────

describe('formValuesFromEntry', () => {
  it('maps core fields to their string form (title, description, tags)', () => {
    const fields = ENTRY_FIELDS.show
    const values = formValuesFromEntry(fields, makeEntry())
    expect(values.title).toBe('Breaking Bad')
    expect(values.description).toBe('A great show')
    expect(values.tags).toBe('drama, crime')
  })

  it('stringifies a numeric amount and yields "" when amount is absent', () => {
    const fields = ENTRY_FIELDS.expense
    const withAmount = formValuesFromEntry(
      fields,
      makeEntry({ type: 'expense', amount: 15.5 }),
    )
    expect(withAmount.amount).toBe('15.5')
    const noAmount = formValuesFromEntry(
      fields,
      makeEntry({ type: 'expense', amount: undefined }),
    )
    expect(noAmount.amount).toBe('')
  })

  it('yields "" for absent optional core fields (description, location)', () => {
    const fields = ENTRY_FIELDS.event
    const values = formValuesFromEntry(
      fields,
      makeEntry({ type: 'event', description: undefined, location: undefined }),
    )
    expect(values.description).toBe('')
    expect(values.location).toBe('')
  })

  it('formats occurredAt to local YYYY-MM-DD and "" when absent', () => {
    const fields = ENTRY_FIELDS.show
    const values = formValuesFromEntry(fields, makeEntry())
    expect(values.occurredAt).toBe('2024-03-10')
    const noDate = formValuesFromEntry(fields, makeEntry({ occurredAt: undefined }))
    expect(noDate.occurredAt).toBe('')
  })

  it('maps a string metadata field to its value and a number to String(it)', () => {
    const fields = ENTRY_FIELDS.show
    const values = formValuesFromEntry(fields, makeEntry())
    expect(values.creator).toBe('Vince Gilligan') // string metadata
    expect(values.rating).toBe('5') // number metadata stringified
  })

  it('yields "" for a metadata field whose value is neither string nor number', () => {
    const fields = ENTRY_FIELDS.show
    const values = formValuesFromEntry(
      fields,
      makeEntry({ metadata: { creator: { nested: true } } }),
    )
    expect(values.creator).toBe('')
  })

  it('round-trips through buildReviewDraft back to the original core/metadata values', () => {
    const fields = ENTRY_FIELDS.show
    const entry = makeEntry()
    const draft = buildReviewDraft(fields, formValuesFromEntry(fields, entry))
    expect(draft.title).toBe(entry.title)
    expect(draft.description).toBe(entry.description)
    expect(draft.tags).toEqual(entry.tags)
    expect(draft.occurredAt).toBe(entry.occurredAt)
    expect(draft.metadata.creator).toBe(entry.metadata.creator)
    expect(draft.metadata.rating).toBe(entry.metadata.rating)
  })
})

// ─── buildEntryUpdate (change-builder) ────────────────────────────────────────

describe('buildEntryUpdate', () => {
  const fields = ENTRY_FIELDS.show

  it('produces core field changes from edited form values', () => {
    const entry = makeEntry()
    const values = formValuesFromEntry(fields, entry)
    values.title = 'Better Call Saul'
    const changes = buildEntryUpdate(fields, entry, values, {})
    expect(changes.title).toBe('Better Call Saul')
    expect(changes.tags).toEqual(['drama', 'crime'])
  })

  it('falls back to "Untitled" when title is cleared', () => {
    const entry = makeEntry()
    const values = formValuesFromEntry(fields, entry)
    values.title = ''
    const changes = buildEntryUpdate(fields, entry, values, {})
    expect(changes.title).toBe('Untitled')
  })

  it('clears a core field to undefined when emptied (description)', () => {
    const entry = makeEntry()
    const values = formValuesFromEntry(fields, entry)
    values.description = ''
    const changes = buildEntryUpdate(fields, entry, values, {})
    expect('description' in changes).toBe(true)
    expect(changes.description).toBeUndefined()
  })

  it('returns tags as [] when the tags field is cleared', () => {
    const entry = makeEntry()
    const values = formValuesFromEntry(fields, entry)
    values.tags = ''
    const changes = buildEntryUpdate(fields, entry, values, {})
    expect(changes.tags).toEqual([])
  })

  it('merges unknown metadata keys untouched (mode survives)', () => {
    const entry = makeEntry({
      metadata: { creator: 'Vince Gilligan', rating: 5, mode: 'Travel' },
    })
    const values = formValuesFromEntry(fields, entry)
    const changes = buildEntryUpdate(fields, entry, values, {})
    expect(changes.metadata).toMatchObject({ mode: 'Travel' })
  })

  it('deletes a known metadata key when its form field is cleared', () => {
    const entry = makeEntry()
    const values = formValuesFromEntry(fields, entry)
    values.creator = ''
    const changes = buildEntryUpdate(fields, entry, values, {})
    expect(changes.metadata && 'creator' in changes.metadata).toBe(false)
    // rating (untouched known key) is preserved
    expect(changes.metadata).toMatchObject({ rating: 5 })
  })

  it('sets a new key from extraMetadata', () => {
    const entry = makeEntry()
    const values = formValuesFromEntry(fields, entry)
    const changes = buildEntryUpdate(fields, entry, values, { mode: 'Focus' })
    expect(changes.metadata).toMatchObject({ mode: 'Focus' })
  })

  it('trims an extraMetadata value before storing it', () => {
    const entry = makeEntry()
    const values = formValuesFromEntry(fields, entry)
    const changes = buildEntryUpdate(fields, entry, values, { mode: '  Focus  ' })
    expect(changes.metadata).toMatchObject({ mode: 'Focus' })
  })

  it('deletes an extra key when its value is cleared', () => {
    const entry = makeEntry({
      metadata: { creator: 'Vince Gilligan', rating: 5, mode: 'Travel' },
    })
    const values = formValuesFromEntry(fields, entry)
    const changes = buildEntryUpdate(fields, entry, values, { mode: '' })
    expect(changes.metadata && 'mode' in changes.metadata).toBe(false)
  })

  it('never includes recordedAt, syncedAt, domain, or type in the changes', () => {
    const entry = makeEntry()
    const values = formValuesFromEntry(fields, entry)
    const changes = buildEntryUpdate(fields, entry, values, {})
    expect('recordedAt' in changes).toBe(false)
    expect('syncedAt' in changes).toBe(false)
    expect('domain' in changes).toBe(false)
    expect('type' in changes).toBe(false)
  })
})

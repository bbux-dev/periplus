import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../services/db'
import { entriesRepository } from '../services/entriesRepository'
import type { LifeLogEntry } from '../services/db'
import { EntryDetailPage } from './EntryDetailPage'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Renders EntryDetailPage mounted at /entries/:id via MemoryRouter + Routes. */
function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/entries/${id}`]}>
      <Routes>
        <Route path="/entries/:id" element={<EntryDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Factory for test entry data — all optional fields populated by default. */
function makeEntryData(
  overrides?: Partial<Omit<LifeLogEntry, 'id'>>,
): Omit<LifeLogEntry, 'id'> {
  return {
    domain: 'media',
    type: 'book',
    title: 'The Pragmatic Programmer',
    description: 'A book about software craftsmanship',
    recordedAt: 1700000000000,
    sourceUrl: 'https://example.com',
    location: 'City Library',
    tags: ['programming', 'reference'],
    amount: 29.99,
    metadata: { isbn: '978-0-201-61622-4', pages: 352 },
    syncedAt: null,
    ...overrides,
  }
}

// ─── DB reset ─────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await db.delete()
  await db.open()
})

// ─── SC1: Full field render ───────────────────────────────────────────────────

describe('EntryDetailPage: full field render', () => {
  it('shows title as h1 after the entry resolves from IndexedDB', async () => {
    const created = await entriesRepository.create(makeEntryData())
    renderDetail(created.id)
    expect(await screen.findByRole('heading', { name: 'The Pragmatic Programmer' })).toBeInTheDocument()
  })

  it('shows the domain-scoped type label (Book for media/book)', async () => {
    const created = await entriesRepository.create(makeEntryData())
    renderDetail(created.id)
    await screen.findByRole('heading', { name: 'The Pragmatic Programmer' })
    expect(screen.getByText('Book')).toBeInTheDocument()
  })

  it('shows description, location, and each tag', async () => {
    const created = await entriesRepository.create(makeEntryData())
    renderDetail(created.id)
    await screen.findByRole('heading', { name: 'The Pragmatic Programmer' })
    expect(screen.getByText('A book about software craftsmanship')).toBeInTheDocument()
    expect(screen.getByText('City Library')).toBeInTheDocument()
    expect(screen.getByText('programming')).toBeInTheDocument()
    expect(screen.getByText('reference')).toBeInTheDocument()
  })

  it('shows the formatted amount when present', async () => {
    const created = await entriesRepository.create(makeEntryData({ amount: 29.99 }))
    renderDetail(created.id)
    await screen.findByRole('heading', { name: 'The Pragmatic Programmer' })
    expect(screen.getByText('$29.99')).toBeInTheDocument()
  })

  it('shows the metadata JSON preview with a known key', async () => {
    const created = await entriesRepository.create(
      makeEntryData({ metadata: { isbn: '978-0-201-61622-4', pages: 352 } }),
    )
    renderDetail(created.id)
    await screen.findByRole('heading', { name: 'The Pragmatic Programmer' })
    const metaEl = screen.getByTestId('metadata-json')
    expect(metaEl).toBeInTheDocument()
    expect(metaEl.textContent).toContain('isbn')
    expect(metaEl.textContent).toContain('978-0-201-61622-4')
  })
})

// ─── SC2: sourceUrl safe-link gate ────────────────────────────────────────────

describe('EntryDetailPage: sourceUrl handling', () => {
  it('renders a safe https:// sourceUrl as a clickable link with correct href', async () => {
    const created = await entriesRepository.create(
      makeEntryData({ sourceUrl: 'https://example.com' }),
    )
    renderDetail(created.id)
    await screen.findByRole('heading', { name: 'The Pragmatic Programmer' })
    const link = screen.getByRole('link', { name: 'https://example.com' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://example.com')
  })

  it('renders an unsafe javascript: sourceUrl as plain text — no <a> element', async () => {
    const created = await entriesRepository.create(
      makeEntryData({ sourceUrl: 'javascript:alert(1)' }),
    )
    renderDetail(created.id)
    await screen.findByRole('heading', { name: 'The Pragmatic Programmer' })
    // The raw URL text is visible
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument()
    // But it must NOT be wrapped in a link
    expect(screen.queryByRole('link', { name: 'javascript:alert(1)' })).toBeNull()
  })

  it('renders an unsafe data: sourceUrl as plain text — no <a> element', async () => {
    const created = await entriesRepository.create(
      makeEntryData({ sourceUrl: 'data:text/html,<h1>xss</h1>' }),
    )
    renderDetail(created.id)
    await screen.findByRole('heading', { name: 'The Pragmatic Programmer' })
    expect(screen.queryByRole('link')).toBeNull()
  })
})

// ─── SC3: Loading state ───────────────────────────────────────────────────────

describe('EntryDetailPage: loading state', () => {
  it('initially shows a Loading paragraph while Dexie resolves', async () => {
    const created = await entriesRepository.create(makeEntryData())
    renderDetail(created.id)
    // Loading is the first synchronous render — it is replaced once useLiveQuery fires
    // findByText waits past it; we check the heading appears (loading was shown, then resolved)
    expect(await screen.findByRole('heading', { name: 'The Pragmatic Programmer' })).toBeInTheDocument()
  })
})

// ─── SC3b: Tag deduplication ──────────────────────────────────────────────────

describe('EntryDetailPage: tag deduplication', () => {
  it('renders each unique tag exactly once even when entry.tags contains duplicates', async () => {
    const created = await entriesRepository.create(
      makeEntryData({ tags: ['food', 'food', 'travel'] }),
    )
    renderDetail(created.id)
    await screen.findByRole('heading', { name: 'The Pragmatic Programmer' })

    // "food" should appear exactly once (de-duplicated), "travel" exactly once
    const foodChips = screen.getAllByText('food')
    expect(foodChips).toHaveLength(1)
    expect(screen.getByText('travel')).toBeInTheDocument()
  })
})

// ─── SC4: Not-found guard ─────────────────────────────────────────────────────

describe('EntryDetailPage: not-found guard', () => {
  it('shows "Entry not found." for an unknown id', async () => {
    renderDetail('this-id-does-not-exist-in-the-db')
    expect(await screen.findByText('Entry not found.')).toBeInTheDocument()
  })

  it('shows a Go back button alongside the not-found message', async () => {
    renderDetail('unknown-id')
    await screen.findByText('Entry not found.')
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('shows not-found for a random uuid that was never created', async () => {
    // Extra not-found case: a syntactically valid id that simply has no matching entry
    renderDetail('00000000-0000-0000-0000-000000000000')
    expect(await screen.findByText('Entry not found.')).toBeInTheDocument()
  })
})

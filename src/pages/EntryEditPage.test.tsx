import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../services/db'
import { entriesRepository } from '../services/entriesRepository'
import type { LifeLogEntry } from '../services/db'
import { EntryEditPage } from './EntryEditPage'
import { EntryDetailPage } from './EntryDetailPage'

// ─── Harness ──────────────────────────────────────────────────────────────────

/** Mounts the edit route alongside the detail route + an /entries list stub so
 *  Save (→ detail) and Delete-style navigation are assertable. */
function renderEdit(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/entries/${id}/edit`]}>
      <Routes>
        <Route path="/entries/:id/edit" element={<EntryEditPage />} />
        <Route path="/entries/:id" element={<EntryDetailPage />} />
        <Route path="/entries" element={<div>Entry List Stub</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const localEpoch = (d: string) => new Date(`${d}T00:00:00`).getTime()

function makeEntryData(
  overrides?: Partial<Omit<LifeLogEntry, 'id'>>,
): Omit<LifeLogEntry, 'id'> {
  return {
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

beforeEach(async () => {
  await db.delete()
  await db.open()
})

// ─── Pre-population ─────────────────────────────────────────────────────────────

describe('EntryEditPage — pre-population', () => {
  it('renders core fields pre-populated from the saved entry', async () => {
    const created = await entriesRepository.create(makeEntryData())
    renderEdit(created.id)
    expect(await screen.findByLabelText('Title')).toHaveValue('Breaking Bad')
    expect(screen.getByLabelText('Notes')).toHaveValue('A great show')
    expect(screen.getByLabelText('Date')).toHaveValue('2024-03-10')
    expect(screen.getByLabelText('Tags')).toHaveValue('drama, crime')
  })

  it('renders metadata fields pre-populated (creator, rating)', async () => {
    const created = await entriesRepository.create(makeEntryData())
    renderEdit(created.id)
    expect(await screen.findByLabelText('Creator')).toHaveValue('Vince Gilligan')
    expect(screen.getByLabelText('Rating')).toHaveValue(5)
  })

  it('never renders recordedAt as an editable field', async () => {
    const created = await entriesRepository.create(makeEntryData())
    renderEdit(created.id)
    await screen.findByLabelText('Title')
    expect(screen.queryByLabelText(/recorded/i)).toBeNull()
  })
})

// ─── Tri-state loader ───────────────────────────────────────────────────────────

describe('EntryEditPage — loader states', () => {
  it('shows a not-found guard for an unknown id', async () => {
    renderEdit('no-such-id')
    expect(await screen.findByText('Entry not found.')).toBeInTheDocument()
  })
})

// ─── Persisting core + metadata edits ───────────────────────────────────────────

describe('EntryEditPage — save persists core + metadata', () => {
  it('editing amount + a metadata field persists via update and renders on detail', async () => {
    const user = userEvent.setup()
    const created = await entriesRepository.create(
      makeEntryData({
        domain: 'expenditures',
        type: 'expense',
        title: 'Dinner',
        amount: 29.99,
        metadata: { category: 'food', currency: 'USD' },
      }),
    )
    renderEdit(created.id)

    const amount = await screen.findByLabelText('Amount')
    await user.clear(amount)
    await user.type(amount, '50')

    const category = screen.getByLabelText('Category')
    await user.clear(category)
    await user.type(category, 'groceries')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Navigated to the detail view, which reflects the persisted change
    expect(await screen.findByText('$50.00')).toBeInTheDocument()
    const meta = screen.getByTestId('metadata-json')
    expect(meta.textContent).toContain('groceries')

    // And the repository row carries the change
    const saved = await entriesRepository.get(created.id)
    expect(saved?.amount).toBe(50)
    expect(saved?.metadata.category).toBe('groceries')
  })

  it('editing an arbitrary extra metadata key (mode) shows and persists it', async () => {
    const user = userEvent.setup()
    const created = await entriesRepository.create(
      makeEntryData({ metadata: { creator: 'Vince Gilligan', mode: 'Travel' } }),
    )
    renderEdit(created.id)

    const modeInput = await screen.findByLabelText('mode')
    expect(modeInput).toHaveValue('Travel')
    await user.clear(modeInput)
    await user.type(modeInput, 'Focus')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('heading', { name: 'Breaking Bad' })
    const saved = await entriesRepository.get(created.id)
    expect(saved?.metadata.mode).toBe('Focus')
    // Unknown key preserved through the round-trip (creator still present)
    expect(saved?.metadata.creator).toBe('Vince Gilligan')
  })

  it('clearing the description persists the cleared value (detail omits it)', async () => {
    const user = userEvent.setup()
    const created = await entriesRepository.create(makeEntryData())
    renderEdit(created.id)

    const notes = await screen.findByLabelText('Notes')
    await user.clear(notes)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('heading', { name: 'Breaking Bad' })
    expect(screen.queryByText('A great show')).toBeNull()
    const saved = await entriesRepository.get(created.id)
    expect(saved?.description).toBeUndefined()
  })

  it('leaves recordedAt unchanged after an edit', async () => {
    const user = userEvent.setup()
    const created = await entriesRepository.create(makeEntryData())
    renderEdit(created.id)

    const title = await screen.findByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Better Call Saul')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('heading', { name: 'Better Call Saul' })
    const saved = await entriesRepository.get(created.id)
    expect(saved?.recordedAt).toBe(1700000000000)
  })
})

// ─── Required validation ────────────────────────────────────────────────────────

describe('EntryEditPage — required validation', () => {
  it('blocks Save with an alert when a required field (title) is empty', async () => {
    const user = userEvent.setup()
    const created = await entriesRepository.create(makeEntryData())
    renderEdit(created.id)

    const title = await screen.findByLabelText('Title')
    await user.clear(title)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    // Still on the edit form — Title input remains
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    // No write occurred — original title preserved
    const saved = await entriesRepository.get(created.id)
    expect(saved?.title).toBe('Breaking Bad')
  })
})

// ─── Cancel ─────────────────────────────────────────────────────────────────────

describe('EntryEditPage — cancel', () => {
  it('Cancel returns to the detail view without persisting', async () => {
    const user = userEvent.setup()
    const created = await entriesRepository.create(makeEntryData())
    renderEdit(created.id)

    const title = await screen.findByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Discarded')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByRole('heading', { name: 'Breaking Bad' })).toBeInTheDocument()
    const saved = await entriesRepository.get(created.id)
    expect(saved?.title).toBe('Breaking Bad')
  })
})

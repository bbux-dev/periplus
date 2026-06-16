import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { entriesRepository } from '../services/entriesRepository'
import type { LifeLogEntry } from '../services/db'
import { triggerDownload } from '../services/exportEntries'
import { EntryListPage } from './EntryListPage'

// Mock triggerDownload so jsdom does not throw on Blob/URL.createObjectURL.
// Keep the real buildExportJson so the JSON argument is fully shaped and testable.
vi.mock('../services/exportEntries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/exportEntries')>()
  return {
    ...actual,
    triggerDownload: vi.fn(),
  }
})

beforeEach(async () => {
  await db.delete()
  await db.open()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <EntryListPage />
    </MemoryRouter>,
  )
}

function makeMediaEntry(
  overrides?: Partial<Omit<LifeLogEntry, 'id'>>,
): Omit<LifeLogEntry, 'id'> {
  return {
    domain: 'media',
    type: 'book',
    title: 'The Pragmatic Programmer',
    recordedAt: 1700000000000,
    tags: [],
    metadata: {},
    syncedAt: null,
    ...overrides,
  }
}

function makeTripsEntry(
  overrides?: Partial<Omit<LifeLogEntry, 'id'>>,
): Omit<LifeLogEntry, 'id'> {
  return {
    domain: 'trips',
    type: 'expense',
    title: 'Hotel Stay',
    recordedAt: 1700000001000,
    amount: 149.99,
    tags: [],
    metadata: {},
    syncedAt: null,
    ...overrides,
  }
}

// ─── VIEW-01 / VIEW-02: row fields ───────────────────────────────────────────

describe('EntryListPage — row fields (VIEW-01/02)', () => {
  it('renders titles, domain-scoped type labels, and date elements for seeded entries', async () => {
    await act(async () => {
      await entriesRepository.create(makeMediaEntry())
      await entriesRepository.create(makeTripsEntry())
    })

    renderPage()

    // Titles (wait for the loading state to resolve)
    expect(await screen.findByText('The Pragmatic Programmer')).toBeInTheDocument()
    expect(screen.getByText('Hotel Stay')).toBeInTheDocument()

    // Date test-ids (one per row)
    expect(screen.getAllByTestId('entry-date')).toHaveLength(2)

    // Amount only for the trips expense row
    expect(screen.getByText('$149.99')).toBeInTheDocument()
  })

  it('does not render an amount when entry.amount is absent', async () => {
    await act(async () => {
      // media book has no amount
      await entriesRepository.create(makeMediaEntry())
    })

    renderPage()
    await screen.findByText('The Pragmatic Programmer')

    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument()
  })

  it('each row is a Link to /entries/:id', async () => {
    await act(async () => {
      await entriesRepository.create(makeMediaEntry())
    })

    renderPage()
    await screen.findByText('The Pragmatic Programmer')

    const link = screen.getByRole('link', { name: /The Pragmatic Programmer/i })
    expect(link.getAttribute('href')).toMatch(/^\/entries\//)
  })
})

// ─── VIEW-02: filter ─────────────────────────────────────────────────────────

describe('EntryListPage — filter (VIEW-02)', () => {
  beforeEach(async () => {
    await act(async () => {
      await entriesRepository.create(makeMediaEntry())
      await entriesRepository.create(makeTripsEntry())
    })
  })

  it('shows filter buttons with aria-pressed', async () => {
    renderPage()
    await screen.findByText('The Pragmatic Programmer')

    const group = screen.getByRole('group', { name: 'Filter entries' })
    expect(group).toBeInTheDocument()

    const allBtn = screen.getByRole('button', { name: 'All' })
    expect(allBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking Trips hides media entry and keeps trips entry', async () => {
    renderPage()
    await screen.findByText('The Pragmatic Programmer')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Trips' }))

    expect(screen.queryByText('The Pragmatic Programmer')).not.toBeInTheDocument()
    expect(screen.getByText('Hotel Stay')).toBeInTheDocument()
  })

  it('clicking All after a domain filter shows all entries again', async () => {
    renderPage()
    await screen.findByText('The Pragmatic Programmer')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Trips' }))
    expect(screen.queryByText('The Pragmatic Programmer')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('The Pragmatic Programmer')).toBeInTheDocument()
    expect(screen.getByText('Hotel Stay')).toBeInTheDocument()
  })
})

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('EntryListPage — empty state', () => {
  it('shows "No entries yet." when there are no entries', async () => {
    renderPage()
    expect(await screen.findByText('No entries yet.')).toBeInTheDocument()
  })
})

// ─── VIEW-04: automated persistence proxy ────────────────────────────────────

describe('EntryListPage — VIEW-04 automated persistence proxy', () => {
  it('reads persisted IndexedDB state and renders the saved entry', async () => {
    await act(async () => {
      await entriesRepository.create(makeMediaEntry({ title: 'Persisted Entry' }))
    })

    renderPage()
    expect(await screen.findByText('Persisted Entry')).toBeInTheDocument()
  })
})

// ─── EXP-01: export button ───────────────────────────────────────────────────

describe('EntryListPage — Export button (EXP-01)', () => {
  it('calls triggerDownload once with a JSON string containing all entry titles', async () => {
    await act(async () => {
      await entriesRepository.create(makeMediaEntry())
    })

    renderPage()
    await screen.findByText('The Pragmatic Programmer')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Export JSON/i }))

    expect(vi.mocked(triggerDownload)).toHaveBeenCalledOnce()
    const [jsonArg] = vi.mocked(triggerDownload).mock.calls[0]
    expect(jsonArg).toContain('The Pragmatic Programmer')
  })
})

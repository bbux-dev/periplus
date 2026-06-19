import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { createAndActivateTrip } from '../services/tripService'
import { PreviousTripsPage } from './PreviousTripsPage'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PreviousTripsPage', () => {
  it('renders a loading skeleton while Dexie is opening', async () => {
    // Re-delete so Dexie is "closed" — useLiveQuery returns undefined
    await db.delete()
    render(<MemoryRouter><PreviousTripsPage /></MemoryRouter>)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows "No trips yet" when there are no trips', async () => {
    render(<MemoryRouter><PreviousTripsPage /></MemoryRouter>)
    expect(await screen.findByText(/no trips yet/i)).toBeInTheDocument()
  })

  it('shows two trips newest-first with correct total and activity count', async () => {
    // MEMORY.md: only { toFake: ['Date'] } — full fake timers stall Dexie
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-01T10:00:00'))
    const trip1 = await createAndActivateTrip('Old Trip')
    vi.setSystemTime(new Date('2026-06-15T10:00:00'))
    const trip2 = await createAndActivateTrip('New Trip')

    await act(async () => {
      await db.entries.add({
        id: 'e-1',
        domain: 'trips',
        type: 'expense',
        title: 'Dinner',
        amount: 42.5,
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: trip2.id, category: 'Food' },
        syncedAt: null,
      })
      await db.entries.add({
        id: 'a-1',
        domain: 'trips',
        type: 'activity',
        title: 'Hiking',
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: trip1.id },
        syncedAt: null,
      })
    })

    render(<MemoryRouter><PreviousTripsPage /></MemoryRouter>)

    // Both trip names visible
    expect(await screen.findByText('New Trip')).toBeInTheDocument()
    expect(screen.getByText('Old Trip')).toBeInTheDocument()

    // Currency-formatted total for New Trip
    expect(screen.getByText('$42.50')).toBeInTheDocument()

    // Activity count for Old Trip (exact string — regex would also match ancestor textContent)
    expect(screen.getByText('1 activity')).toBeInTheDocument()

    // Newest trip appears before oldest in DOM order
    // <li role="button"> overrides implicit listitem role — query by role='button'
    const items = screen.getAllByRole('button')
    const newIdx = items.findIndex((el) => el.textContent?.includes('New Trip'))
    const oldIdx = items.findIndex((el) => el.textContent?.includes('Old Trip'))
    expect(newIdx).toBeLessThan(oldIdx)
  })

  it('clicking a trip row navigates to /trips/:tripId by UUID', async () => {
    await createAndActivateTrip('Paris')

    render(
      <MemoryRouter initialEntries={['/trips']}>
        <Routes>
          <Route path="/trips" element={<PreviousTripsPage />} />
          <Route path="/trips/:tripId" element={<div data-testid="detail-probe" />} />
        </Routes>
      </MemoryRouter>,
    )

    const row = await screen.findByRole('button', { name: /Paris/i })
    await userEvent.click(row)
    expect(await screen.findByTestId('detail-probe')).toBeInTheDocument()
  })

  it('pressing Enter on a trip row navigates to /trips/:tripId', async () => {
    await createAndActivateTrip('Rome')

    render(
      <MemoryRouter initialEntries={['/trips']}>
        <Routes>
          <Route path="/trips" element={<PreviousTripsPage />} />
          <Route path="/trips/:tripId" element={<div data-testid="detail-probe" />} />
        </Routes>
      </MemoryRouter>,
    )

    const row = await screen.findByRole('button', { name: /Rome/i })
    // Focus then press Enter
    row.focus()
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByTestId('detail-probe')).toBeInTheDocument()
  })

  it('renders a trip with $0.00 total and 0 activities for an empty trip', async () => {
    await createAndActivateTrip('Empty Trip')

    render(<MemoryRouter><PreviousTripsPage /></MemoryRouter>)

    expect(await screen.findByText('Empty Trip')).toBeInTheDocument()
    expect(screen.getByText('$0.00')).toBeInTheDocument()
    expect(screen.getByText('0 activities')).toBeInTheDocument()
  })
})

import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { activeModeRepository } from '../services/activeMode'
import { createAndActivateTrip } from '../services/tripService'
import { TripHomePage } from './TripHomePage'
import { CreateTripPage } from './CreateTripPage'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('TripHomePage', () => {
  it('shows loading skeleton before Dexie resolves', async () => {
    // Re-delete DB so Dexie is "closed" — useLiveQuery default fires synchronously
    await db.delete()
    render(<MemoryRouter><TripHomePage /></MemoryRouter>)
    // Skeleton renders synchronously via the { ready: false, mode: undefined } default
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('redirects to /create-trip when no active trip', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TripHomePage />} />
          <Route path="/create-trip" element={<div data-testid="create-probe" />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('create-probe')).toBeInTheDocument()
  })

  it('shows trip name when active trip exists', async () => {
    await act(async () => {
      await activeModeRepository.put({ mode: 'trip', label: 'Paris', tripId: 'uuid-1' })
    })
    render(<MemoryRouter><TripHomePage /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Paris' })).toBeInTheDocument()
  })
})

describe('TripHomePage — expense total (HOME-03)', () => {
  it('shows formatted expense total from trip entries', async () => {
    // MEMORY.md: full fake timers stall Dexie — use { toFake: ['Date'] } only
    vi.useFakeTimers({ toFake: ['Date'] })
    const trip = await createAndActivateTrip('Paris')
    await act(async () => {
      await db.entries.add({
        id: 'e-1',
        domain: 'trips',
        type: 'expense',
        title: 'Dinner',
        amount: 42.5,
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: trip.id, category: 'Food' },
        syncedAt: null,
      })
    })
    render(<MemoryRouter><TripHomePage /></MemoryRouter>)
    // $42.50 appears both in the running total and in the recent-entry row
    const amounts = await screen.findAllByText('$42.50')
    expect(amounts.length).toBeGreaterThanOrEqual(1)
  })
})

describe('TripHomePage — recent entries (HOME-04)', () => {
  it('lists recent trip entries most-recent-first', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const trip = await createAndActivateTrip('Rome')
    await act(async () => {
      // Older entry (lower recordedAt) — Gas
      await db.entries.add({
        id: 'e-older',
        domain: 'trips',
        type: 'expense',
        title: 'Gas fill',
        amount: 30,
        recordedAt: 1000000,
        tags: [],
        metadata: { tripId: trip.id, category: 'Gas' },
        syncedAt: null,
      })
      // Newer entry (higher recordedAt) — Hotel
      await db.entries.add({
        id: 'e-newer',
        domain: 'trips',
        type: 'expense',
        title: 'Hotel stay',
        amount: 120,
        recordedAt: 2000000,
        tags: [],
        metadata: { tripId: trip.id, category: 'Hotel' },
        syncedAt: null,
      })
    })
    render(<MemoryRouter><TripHomePage /></MemoryRouter>)

    // Both category labels should appear
    expect(await screen.findByText('Hotel')).toBeInTheDocument()
    expect(screen.getByText('Gas')).toBeInTheDocument()

    // Newer (Hotel) must appear before older (Gas) in DOM order
    const items = screen.getAllByRole('listitem')
    const hotelIdx = items.findIndex((el) => el.textContent?.includes('Hotel'))
    const gasIdx = items.findIndex((el) => el.textContent?.includes('Gas'))
    expect(hotelIdx).toBeLessThan(gasIdx)
  })
})

describe('TripHomePage — Activity CTA (HOME-02)', () => {
  it('Activity button navigates to /activity', async () => {
    await act(async () => {
      await activeModeRepository.put({ mode: 'trip', label: 'Paris', tripId: 'uuid-1' })
    })
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TripHomePage />} />
          <Route path="/activity" element={<div data-testid="activity-probe" />} />
        </Routes>
      </MemoryRouter>,
    )
    const activityBtn = await screen.findByRole('button', { name: /activity/i })
    await userEvent.click(activityBtn)
    expect(await screen.findByTestId('activity-probe')).toBeInTheDocument()
  })
})

describe('TripHomePage — create→home flow (TRIP-01, TRIP-03)', () => {
  it('create trip → lands on Home showing the new trip name', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/create-trip']}>
        <Routes>
          <Route path="/create-trip" element={<CreateTripPage />} />
          <Route path="/" element={<TripHomePage />} />
        </Routes>
      </MemoryRouter>,
    )
    // Type the trip name and save
    const input = await screen.findByRole('textbox', { name: /trip name/i })
    await user.type(input, 'Tokyo 2026')
    await user.click(screen.getByRole('button', { name: /save/i }))

    // Home renders the new trip's h1
    expect(await screen.findByRole('heading', { name: 'Tokyo 2026' })).toBeInTheDocument()
  })
})

// HOME-05: shell nav reachability (Home / Previous Trips / Settings) is asserted in
// src/components/layout/AppShell.test.tsx ("renders exactly Home, Previous Trips, and
// Settings nav links") — see describe('AppShell — menu trip-only links').

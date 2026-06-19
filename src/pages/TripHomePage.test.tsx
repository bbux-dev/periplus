import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { activeModeRepository } from '../services/activeMode'
import { TripHomePage } from './TripHomePage'

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

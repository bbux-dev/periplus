import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { activeModeRepository } from '../services/activeMode'
import { CreateTripPage } from './CreateTripPage'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('CreateTripPage', () => {
  it('fills name + saves → navigates to /', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/create-trip']}>
        <Routes>
          <Route path="/create-trip" element={<CreateTripPage />} />
          <Route path="/" element={<div data-testid="home-probe">Home</div>} />
        </Routes>
      </MemoryRouter>,
    )
    const input = await screen.findByRole('textbox')
    await user.type(input, 'Paris')
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(await screen.findByTestId('home-probe')).toBeInTheDocument()
  })

  it('persists activeMode with mode=trip after save', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/create-trip']}>
        <Routes>
          <Route path="/create-trip" element={<CreateTripPage />} />
          <Route path="/" element={<div data-testid="home-probe" />} />
        </Routes>
      </MemoryRouter>,
    )
    await user.type(await screen.findByRole('textbox'), 'Tokyo')
    await user.click(screen.getByRole('button', { name: /save/i }))
    await screen.findByTestId('home-probe')
    const stored = await activeModeRepository.get()
    expect(stored?.mode).toBe('trip')
    expect(stored?.label).toBe('Tokyo')
  })

  it('does not navigate when Save is clicked with empty input', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/create-trip']}>
        <Routes>
          <Route path="/create-trip" element={<CreateTripPage />} />
          <Route path="/" element={<div data-testid="home-probe" />} />
        </Routes>
      </MemoryRouter>,
    )
    await screen.findByRole('textbox')
    await user.click(screen.getByRole('button', { name: /save/i }))
    // Still on create-trip — heading is visible, home-probe is absent
    expect(screen.getByRole('heading', { name: /create a trip/i })).toBeInTheDocument()
    expect(screen.queryByTestId('home-probe')).not.toBeInTheDocument()
  })
})

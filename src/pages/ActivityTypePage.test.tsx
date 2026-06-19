import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { ActivityTypePage } from './ActivityTypePage'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ActivityTypePage', () => {
  it('renders 5 activity type buttons', async () => {
    render(<MemoryRouter><ActivityTypePage /></MemoryRouter>)
    // Hike, Show, Restaurant, Cafe, Other
    expect(await screen.findByRole('button', { name: /hike/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restaurant/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cafe/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /other/i })).toBeInTheDocument()
  })

  it('Hike button navigates to /activity/hike', async () => {
    render(
      <MemoryRouter initialEntries={['/activity']}>
        <Routes>
          <Route path="/activity" element={<ActivityTypePage />} />
          <Route path="/activity/:type" element={<div data-testid="form-probe" />} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole('button', { name: /hike/i }))
    expect(await screen.findByTestId('form-probe')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { EntryTypePage } from './EntryTypePage'

describe('EntryTypePage', () => {
  function renderAtPath(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/d/:domain/:type" element={<EntryTypePage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('renders "Add Book" heading for /d/media/book', async () => {
    renderAtPath('/d/media/book')
    expect(await screen.findByRole('heading', { name: /add book/i })).toBeInTheDocument()
  })

  it('has a Back button with accessible name "Go back"', async () => {
    renderAtPath('/d/media/book')
    await screen.findByRole('heading', { name: /add book/i })
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('falls back to raw type string for an unknown type on a valid domain (no crash)', async () => {
    renderAtPath('/d/media/bogus_type')
    expect(await screen.findByText(/bogus_type/i)).toBeInTheDocument()
    // Must still show the Add heading, not an error (domain is valid)
    expect(screen.getByRole('heading', { name: /add bogus_type/i })).toBeInTheDocument()
  })

  it('renders unknown-domain error for /d/bogus/show — no Add heading (WR-04)', async () => {
    renderAtPath('/d/bogus/show')
    expect(await screen.findByText(/unknown domain/i)).toBeInTheDocument()
    // Must NOT render an Add screen for an invalid domain
    expect(screen.queryByRole('heading', { name: /add/i })).not.toBeInTheDocument()
    // Must have a Back affordance
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('Back button navigates to parent domain page when no prior in-app history', async () => {
    // jsdom always has window.history.length === 1, so the hook's fallback path fires.
    // A single-entry MemoryRouter simulates the PWA deep-link scenario.
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/d/media/book']}>
        <Routes>
          <Route path="/d/:domain" element={<div>MediaDomain</div>} />
          <Route path="/d/:domain/:type" element={<EntryTypePage />} />
        </Routes>
      </MemoryRouter>
    )
    await screen.findByRole('heading', { name: /add book/i })
    await user.click(screen.getByRole('button', { name: /go back/i }))
    expect(await screen.findByText('MediaDomain')).toBeInTheDocument()
  })
})

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

  it('falls back to raw type string for an unknown type (no crash)', async () => {
    renderAtPath('/d/media/bogus_type')
    expect(await screen.findByText(/bogus_type/i)).toBeInTheDocument()
  })

  it('Back button calls navigate(-1)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/', '/d/media/book']} initialIndex={1}>
        <Routes>
          <Route path="/" element={<div>Dashboard</div>} />
          <Route path="/d/:domain/:type" element={<EntryTypePage />} />
        </Routes>
      </MemoryRouter>
    )
    await screen.findByRole('heading', { name: /add book/i })
    await user.click(screen.getByRole('button', { name: /go back/i }))
    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })
})

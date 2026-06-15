import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { PlaceholderPage } from './PlaceholderPage'

describe('PlaceholderPage', () => {
  function renderWithTitle(title: string) {
    return render(
      <MemoryRouter initialEntries={['/test']}>
        <Routes>
          <Route path="/test" element={<PlaceholderPage title={title} />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('renders the title as a heading', async () => {
    renderWithTitle('Review')
    expect(await screen.findByRole('heading', { name: /review/i })).toBeInTheDocument()
  })

  it('has a Back button with accessible name "Go back"', async () => {
    renderWithTitle('Review')
    await screen.findByRole('heading', { name: /review/i })
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('renders any title passed via prop', async () => {
    renderWithTitle('Manual Entry')
    expect(await screen.findByRole('heading', { name: /manual entry/i })).toBeInTheDocument()
  })

  it('Back button calls navigate(-1)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/prev', '/test']} initialIndex={1}>
        <Routes>
          <Route path="/prev" element={<div>Previous Page</div>} />
          <Route path="/test" element={<PlaceholderPage title="Review" />} />
        </Routes>
      </MemoryRouter>
    )
    await screen.findByRole('heading', { name: /review/i })
    await user.click(screen.getByRole('button', { name: /go back/i }))
    expect(await screen.findByText('Previous Page')).toBeInTheDocument()
  })
})

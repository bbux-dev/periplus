import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { DomainPage } from './DomainPage'
import { DashboardPage } from './DashboardPage'

/** Render DomainPage at a given domain path, with DashboardPage at "/" for back-nav tests. */
function renderAtDomain(domain: string) {
  return render(
    <MemoryRouter initialEntries={['/', `/d/${domain}`]} initialIndex={1}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/d/:domain" element={<DomainPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('DomainPage — media', () => {
  it('shows Show, Movie, Book, Podcast entry types', async () => {
    renderAtDomain('media')
    expect(await screen.findByText('Show')).toBeInTheDocument()
    expect(screen.getByText('Movie')).toBeInTheDocument()
    expect(screen.getByText('Book')).toBeInTheDocument()
    expect(screen.getByText('Podcast')).toBeInTheDocument()
  })

  it('each type tile links to /d/media/<type>', () => {
    renderAtDomain('media')
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/d/media/show')
    expect(hrefs).toContain('/d/media/movie')
    expect(hrefs).toContain('/d/media/book')
    expect(hrefs).toContain('/d/media/podcast')
  })
})

describe('DomainPage — trips', () => {
  it('shows Place, Event, Expense entry types', async () => {
    renderAtDomain('trips')
    expect(await screen.findByText('Place')).toBeInTheDocument()
    expect(screen.getByText('Event')).toBeInTheDocument()
    expect(screen.getByText('Expense')).toBeInTheDocument()
  })
})

describe('DomainPage — expenditures', () => {
  it('shows Expense entry type', async () => {
    renderAtDomain('expenditures')
    expect(await screen.findByText('Expense')).toBeInTheDocument()
  })

  it('renders exactly 1 entry-type link', () => {
    renderAtDomain('expenditures')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})

describe('DomainPage — Back navigation', () => {
  it('Go back button is present with accessible name', async () => {
    renderAtDomain('media')
    expect(await screen.findByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('clicking Go back returns to Dashboard', async () => {
    const user = userEvent.setup()
    renderAtDomain('media')
    await screen.findByText('Show')
    await user.click(screen.getByRole('button', { name: /go back/i }))
    expect(await screen.findByText('Trips')).toBeInTheDocument()
    expect(screen.getByText('Expenditures')).toBeInTheDocument()
  })
})

describe('DomainPage — unknown domain', () => {
  function renderUnknownDomain() {
    return render(
      <MemoryRouter initialEntries={['/d/nope']}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/d/:domain" element={<DomainPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('renders a graceful message for an unknown :domain without crashing', async () => {
    renderUnknownDomain()
    expect(await screen.findByText(/unknown domain/i)).toBeInTheDocument()
  })

  it('unknown-domain error state includes a Back affordance for recovery (WR-03)', async () => {
    renderUnknownDomain()
    await screen.findByText(/unknown domain/i)
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('Back button on unknown-domain error navigates to Dashboard (WR-03)', async () => {
    const user = userEvent.setup()
    renderUnknownDomain()
    await screen.findByText(/unknown domain/i)
    await user.click(screen.getByRole('button', { name: /go back/i }))
    // fallback to '/' — Dashboard shows domain tiles
    expect(await screen.findByText('Media')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import App from './App'

/** Helper: render <App /> inside MemoryRouter at the given initial path. */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
}

// ─── SC1 / NAV-01: Dashboard at / (not the Phase 1 counter) ─────────────────

describe('App — dashboard route', () => {
  it('renders the three domain tiles at /, not the Phase 1 counter', async () => {
    renderAt('/')
    expect(await screen.findByText('Media')).toBeInTheDocument()
    expect(screen.getByText('Trips')).toBeInTheDocument()
    expect(screen.getByText('Expenditures')).toBeInTheDocument()
    // Confirm the Phase 1 counter is NOT rendered on the dashboard
    expect(screen.queryByRole('button', { name: /increment/i })).not.toBeInTheDocument()
  })
})

// ─── SC3 / NAV-03: All 7 route paths render a heading without throwing ───────

describe('App — all 7 routes reachable (SC3/NAV-03)', () => {
  const routes: { path: string; expectedHeading: RegExp }[] = [
    { path: '/d/media',              expectedHeading: /^media$/i },
    { path: '/d/media/book',         expectedHeading: /add book/i },
    { path: '/d/media/book/capture', expectedHeading: /url capture/i },
    { path: '/d/media/book/review',  expectedHeading: /review/i },
    { path: '/d/media/book/manual',  expectedHeading: /manual entry/i },
    { path: '/entries',              expectedHeading: /entry list/i },
    { path: '/entries/abc',          expectedHeading: /entry detail/i },
  ]

  it.each(routes)(
    'route $path renders "$expectedHeading" heading without crashing',
    async ({ path, expectedHeading }) => {
      renderAt(path)
      expect(await screen.findByRole('heading', { name: expectedHeading })).toBeInTheDocument()
    }
  )
})

// ─── WR-02: Catch-all 404 route ──────────────────────────────────────────────

describe('App — catch-all 404 route (WR-02)', () => {
  it('renders "Page Not Found" for an unknown path', async () => {
    renderAt('/some/unknown/path')
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })

  it('not-found page has a Back/home affordance (Go back button)', async () => {
    renderAt('/does-not-exist')
    await screen.findByRole('heading', { name: /page not found/i })
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })
})

// ─── W-01: Unknown :type falls back to raw string, no crash ──────────────────

describe('App — unknown route params (W-01)', () => {
  it('renders raw type string for unknown :type on EntryTypePage', async () => {
    renderAt('/d/media/bogus_type')
    // EntryTypePage should show "Add bogus_type" without crashing
    expect(await screen.findByText(/bogus_type/i)).toBeInTheDocument()
  })

  it('renders graceful message for unknown :domain on DomainPage', async () => {
    renderAt('/d/unknown_domain')
    expect(await screen.findByText(/unknown domain/i)).toBeInTheDocument()
  })
})

// ─── SC3: Navigation flow / → domain → entry-type via click ─────────────────

describe('App — navigation flow (SC3)', () => {
  it('clicking Media tile shows media entry types', async () => {
    const user = userEvent.setup()
    renderAt('/')

    const mediaLink = await screen.findByRole('link', { name: /media/i })
    await user.click(mediaLink)

    expect(await screen.findByText('Show')).toBeInTheDocument()
    expect(screen.getByText('Movie')).toBeInTheDocument()
    expect(screen.getByText('Book')).toBeInTheDocument()
    expect(screen.getByText('Podcast')).toBeInTheDocument()
  })

  it('clicking Book tile shows the EntryTypePage heading', async () => {
    const user = userEvent.setup()
    renderAt('/')

    await user.click(await screen.findByRole('link', { name: /media/i }))
    await user.click(await screen.findByRole('link', { name: /^book$/i }))

    expect(await screen.findByRole('heading', { name: /add book/i })).toBeInTheDocument()
  })
})

// ─── SC4 / NAV-04: Back walks up the tree (domain → type, type → dashboard) ─

describe('App — back navigation (SC4/NAV-04)', () => {
  it('Back from EntryTypePage returns to the domain screen', async () => {
    const user = userEvent.setup()
    renderAt('/')

    // Navigate down: dashboard → media domain → book entry type
    await user.click(await screen.findByRole('link', { name: /media/i }))
    await user.click(await screen.findByRole('link', { name: /^book$/i }))
    expect(await screen.findByRole('heading', { name: /add book/i })).toBeInTheDocument()

    // One Back: EntryTypePage → DomainPage (media)
    await user.click(screen.getByRole('button', { name: /go back/i }))
    expect(await screen.findByText('Show')).toBeInTheDocument()
    expect(screen.getByText('Movie')).toBeInTheDocument()
    expect(screen.getByText('Book')).toBeInTheDocument()
    expect(screen.getByText('Podcast')).toBeInTheDocument()
  })

  it('Back from DomainPage returns to the dashboard', async () => {
    const user = userEvent.setup()
    renderAt('/')

    // Navigate down: dashboard → media domain
    await user.click(await screen.findByRole('link', { name: /media/i }))
    expect(await screen.findByText('Show')).toBeInTheDocument()

    // Back: DomainPage → Dashboard
    await user.click(screen.getByRole('button', { name: /go back/i }))
    expect(await screen.findByText('Trips')).toBeInTheDocument()
    expect(screen.getByText('Expenditures')).toBeInTheDocument()
  })

  it('two-level Back: EntryTypePage → DomainPage → Dashboard', async () => {
    const user = userEvent.setup()
    renderAt('/')

    // Navigate down two levels
    await user.click(await screen.findByRole('link', { name: /media/i }))
    await user.click(await screen.findByRole('link', { name: /^book$/i }))
    expect(await screen.findByRole('heading', { name: /add book/i })).toBeInTheDocument()

    // First Back: → DomainPage
    await user.click(screen.getByRole('button', { name: /go back/i }))
    expect(await screen.findByText('Show')).toBeInTheDocument()

    // Second Back: → Dashboard
    await user.click(screen.getByRole('button', { name: /go back/i }))
    expect(await screen.findByText('Trips')).toBeInTheDocument()
    expect(screen.getByText('Expenditures')).toBeInTheDocument()
  })
})

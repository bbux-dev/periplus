import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import App from './App'
import { db } from './services/db'
import { entriesRepository } from './services/entriesRepository'

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

// ─── SC3 / NAV-03: All 6 route paths render a heading without throwing ───────
// Note: /d/:domain/:type/capture was removed in Phase 4 (CaptureUrlPage is now
// the default at /d/:domain/:type). /d/:domain/:type/review redirects to the
// capture screen when there is no location.state draft (Pitfall 3 guard).

describe('App — all 6 routes reachable (SC3/NAV-03)', () => {
  const routes: { path: string; expectedHeading: RegExp }[] = [
    { path: '/d/media',              expectedHeading: /^media$/i },
    { path: '/d/media/book',         expectedHeading: /add book/i },
    // /d/media/book/review has no location.state draft → guard redirects to /d/media/book
    { path: '/d/media/book/review',  expectedHeading: /add book/i },
    // ManualEntryPage replaced PlaceholderPage — heading is now "Add Book"
    { path: '/d/media/book/manual',  expectedHeading: /add book/i },
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

// ─── Phase 6: Entry List + Detail routes wired (VIEW-01, VIEW-03) ───────────

describe('App — Phase 6 entry routes (VIEW-01, VIEW-03)', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('/entries renders the EntryListPage "Entries" heading', async () => {
    renderAt('/entries')
    expect(await screen.findByRole('heading', { name: /^entries$/i })).toBeInTheDocument()
  })

  it('/entries/:id with unknown id renders "Entry not found."', async () => {
    renderAt('/entries/abc')
    expect(await screen.findByText('Entry not found.')).toBeInTheDocument()
  })
})

// ─── W-01: Unknown :type falls back to raw string, no crash ──────────────────

describe('App — unknown route params (W-01)', () => {
  it('renders raw type string for unknown :type on CaptureUrlPage', async () => {
    renderAt('/d/media/bogus_type')
    // CaptureUrlPage shows "Add bogus_type" without crashing (typeConfig?.label ?? type)
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
  it('Back from CaptureUrlPage returns to the domain screen', async () => {
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

  it('two-level Back: CaptureUrlPage → DomainPage → Dashboard', async () => {
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

// ─── CAPT-01 end-to-end: capture → review → save (SC2/SC4) ──────────────────

describe('App — capture → review → save (CAPT end-to-end, SC2/SC4)', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('Google Maps URL → Import → Review prefill → Save → persists entry + navigates to trips domain', async () => {
    const user = userEvent.setup()
    renderAt('/d/trips/place')

    // CaptureUrlPage renders "Add Place" at /d/trips/place
    expect(await screen.findByRole('heading', { name: /add place/i })).toBeInTheDocument()

    // Paste a Google Maps URL into the URL input
    const urlInput = screen.getByLabelText('URL')
    await user.type(
      urlInput,
      'https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2944813,17z',
    )

    // Click "Import from URL" — extracts metadata and navigates to ReviewPage
    await user.click(screen.getByRole('button', { name: /import from url/i }))

    // ReviewPage appears; title is pre-filled from the Google Maps extraction
    const titleInput = await screen.findByLabelText('Title')
    expect(titleInput).toHaveValue('Eiffel Tower')

    // Click "Save" — persists entry and navigates to /d/trips
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // DomainPage for trips renders with "Trips" heading + type tiles
    expect(await screen.findByRole('heading', { name: /^trips$/i })).toBeInTheDocument()
    expect(screen.getByText('Place')).toBeInTheDocument()

    // Verify the entry was persisted in IndexedDB via fake-indexeddb
    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(1)
    expect(entries[0].title).toBe('Eiffel Tower')
    expect(entries[0].domain).toBe('trips')
    expect(entries[0].type).toBe('place')
    expect(entries[0].sourceUrl).toBe(
      'https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2944813,17z',
    )
    expect(entries[0].syncedAt).toBeNull()
    expect(entries[0].tags).toEqual([])
  })
})

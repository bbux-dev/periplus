import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import App from './App'
import { db } from './services/db'

/** Helper: render <App /> inside MemoryRouter at the given initial path. */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
}

// Reset Dexie before each test that reads from the DB
beforeEach(async () => {
  await db.delete()
  await db.open()
})

// ─── Trip home route (/): TripHomePage renders without crashing ───────────────

describe('App — trip home route', () => {
  it('renders loading state at "/" before Dexie resolves', async () => {
    // Re-delete so dbReady fires false first
    await db.delete()
    renderAt('/')
    // TripHomePage shows loading skeleton before dbReady
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('redirects to /create-trip when no active trip is set', async () => {
    renderAt('/')
    // After Dexie resolves with no activeMode, TripHomePage navigates to /create-trip
    expect(await screen.findByRole('heading', { name: /create a trip/i })).toBeInTheDocument()
  })
})

// ─── Create trip route (/create-trip) ────────────────────────────────────────

describe('App — create trip route', () => {
  it('renders the Create a Trip heading at /create-trip', async () => {
    renderAt('/create-trip')
    expect(await screen.findByRole('heading', { name: /create a trip/i })).toBeInTheDocument()
  })
})

// ─── Settings route (/settings) ──────────────────────────────────────────────

describe('App — settings route', () => {
  it('renders the Settings page at /settings', async () => {
    renderAt('/settings')
    expect(await screen.findByRole('heading', { name: /^settings$/i })).toBeInTheDocument()
  })

  it('Settings page shows Export JSON button', async () => {
    renderAt('/settings')
    expect(await screen.findByRole('button', { name: /export json/i })).toBeInTheDocument()
  })
})

// ─── Placeholder routes (Phase 22–24 stubs) ──────────────────────────────────

describe('App — placeholder routes', () => {
  // IN-01: /expense removed — expense entry is via ExpenseSheet bottom-sheet, not a routed page
  it.each([
    ['/activity',      'Log Activity'],
    ['/trips',         'Previous Trips'],
  ])(
    'route %s renders the "%s" heading',
    async (path, title) => {
      renderAt(path)
      expect(await screen.findByRole('heading', { name: new RegExp(title, 'i') })).toBeInTheDocument()
    }
  )
})

// ─── Catch-all 404 route (T-21-04: unknown path never crashes) ───────────────

describe('App — catch-all 404 route (T-21-04)', () => {
  it('renders "Page Not Found" for an unknown path', async () => {
    renderAt('/some/unknown/path')
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })

  it('renders "Page Not Found" for /foo', async () => {
    renderAt('/foo')
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })

  it('not-found page has a Go back affordance', async () => {
    renderAt('/does-not-exist')
    await screen.findByRole('heading', { name: /page not found/i })
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })
})

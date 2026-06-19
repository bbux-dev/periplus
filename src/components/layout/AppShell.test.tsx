import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../services/db'
import { activeModeRepository } from '../../services/activeMode'
import { AppShell } from './AppShell'

// Reset Dexie before each test — AppShell reads activeMode reactively.
beforeEach(async () => {
  await db.delete()
  await db.open()
})

/**
 * Renders AppShell inside a MemoryRouter at the given initial path.
 * Provides sentinel routes for navigation assertions.
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell>
        <Routes>
          <Route path="/"        element={<div data-testid="home-sentinel">Home</div>} />
          <Route path="/trips"   element={<div data-testid="trips-sentinel">Previous Trips</div>} />
          <Route path="/settings" element={<div data-testid="settings-sentinel">Settings</div>} />
          <Route path="/other"   element={<div data-testid="other-sentinel">Other</div>} />
        </Routes>
      </AppShell>
    </MemoryRouter>,
  )
}

// ─── Home button ──────────────────────────────────────────────────────────────

describe('AppShell — home button', () => {
  it('is hidden at "/"', () => {
    renderAt('/')
    expect(screen.queryByRole('button', { name: /go home/i })).not.toBeInTheDocument()
  })

  it('is visible on routes other than "/"', () => {
    renderAt('/other')
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument()
  })

  it('navigates to "/" when clicked', async () => {
    const user = userEvent.setup()
    renderAt('/other')
    await user.click(screen.getByRole('button', { name: /go home/i }))
    expect(screen.getByTestId('home-sentinel')).toBeInTheDocument()
  })
})

// ─── Hamburger toggle ─────────────────────────────────────────────────────────

describe('AppShell — hamburger menu toggle', () => {
  it('hamburger button starts closed (aria-expanded="false")', () => {
    renderAt('/')
    const btn = screen.getByRole('button', { name: /toggle navigation menu/i })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicking hamburger opens the menu (aria-expanded="true") and reveals Home link', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const btn = screen.getByRole('button', { name: /toggle navigation menu/i })
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument()
  })

  it('clicking hamburger again closes the menu', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const btn = screen.getByRole('button', { name: /toggle navigation menu/i })
    await user.click(btn)
    expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument()
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: /^home$/i })).not.toBeInTheDocument()
  })
})

// ─── Menu contents: exactly Home, Previous Trips, Settings ────────────────────

describe('AppShell — menu trip-only links', () => {
  it('renders exactly Home, Previous Trips, and Settings nav links', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: /toggle navigation menu/i }))
    expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^previous trips$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^settings$/i })).toBeInTheDocument()
  })

  it('does NOT render the old Dashboard, Entries, or Manage Shortcuts links', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: /toggle navigation menu/i }))
    expect(screen.queryByRole('link', { name: /^dashboard$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^entries$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^manage shortcuts$/i })).not.toBeInTheDocument()
  })
})

// ─── Close behaviors ──────────────────────────────────────────────────────────

describe('AppShell — close behaviors', () => {
  it('clicking a nav link closes the menu and navigates', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: /toggle navigation menu/i }))
    expect(screen.getByRole('link', { name: /^settings$/i })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /^settings$/i }))
    // menu closed
    expect(screen.queryByRole('link', { name: /^settings$/i })).not.toBeInTheDocument()
    // navigation occurred
    expect(screen.getByTestId('settings-sentinel')).toBeInTheDocument()
  })

  it('closes menu on Escape key', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: /toggle navigation menu/i }))
    expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('link', { name: /^home$/i })).not.toBeInTheDocument()
  })

  it('closes menu on outside click', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: /toggle navigation menu/i }))
    expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument()
    // click outside the nav bar (the home sentinel is page content below the bar)
    await user.click(screen.getByTestId('home-sentinel'))
    expect(screen.queryByRole('link', { name: /^home$/i })).not.toBeInTheDocument()
  })
})

// ─── App bar: active trip name display ───────────────────────────────────────

describe('AppShell — app bar trip name display', () => {
  it('renders nothing in the center when no active mode is set', () => {
    renderAt('/')
    // No "·" separator (old format) and no trip name text besides the sentinel
    expect(screen.queryByText(/·/)).not.toBeInTheDocument()
  })

  it('shows the trip label when activeMode.mode === "trip"', async () => {
    await act(async () => {
      await activeModeRepository.put({ mode: 'trip', label: 'Paris Summer', tripId: 'uuid-1' })
    })
    renderAt('/')
    expect(await screen.findByText('Paris Summer')).toBeInTheDocument()
  })

  it('does NOT show a non-trip mode label in the app bar', async () => {
    await act(async () => {
      await activeModeRepository.put({ mode: 'DayToDay', label: 'Daily' })
    })
    renderAt('/')
    // mode !== 'trip', so label must NOT appear in the app bar
    expect(screen.queryByText('Daily')).not.toBeInTheDocument()
  })
})

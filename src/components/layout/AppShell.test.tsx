import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../services/db'
import { configRepository } from '../../services/configRepository'
import {
  activeModeRepository,
  defaultInstanceLabel,
} from '../../services/activeMode'
import { DEFAULT_SHORTCUT_CONFIG } from '../../config/shortcutConfig'
import { AppShell } from './AppShell'

// Reset Dexie before each test — AppShell now reads config + active mode reactively.
beforeEach(async () => {
  await db.delete()
  await db.open()
})

/**
 * Renders AppShell inside a MemoryRouter at the given initial path.
 * Provides minimal sentinel routes for navigation assertions.
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell>
        <Routes>
          <Route path="/"        element={<div data-testid="home-sentinel">Home</div>} />
          <Route path="/entries" element={<div data-testid="entries-sentinel">Entries</div>} />
          <Route path="/settings" element={<div data-testid="settings-sentinel">Settings</div>} />
          <Route path="/manage"  element={<div data-testid="manage-sentinel">Manage</div>} />
          <Route path="/d/:domain"       element={<div data-testid="domain-sentinel">Domain</div>} />
          <Route path="/d/:domain/:type" element={<div data-testid="type-sentinel">Type</div>} />
        </Routes>
      </AppShell>
    </MemoryRouter>,
  )
}

// ─── Home button ──────────────────────────────────────────────────────────────

describe('AppShell — home button', () => {
  it('is hidden on "/"', () => {
    renderAt('/')
    expect(screen.queryByRole('button', { name: /go home/i })).not.toBeInTheDocument()
  })

  it('is visible on routes other than "/"', () => {
    renderAt('/entries')
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument()
  })

  it('navigates to "/" when clicked', async () => {
    const user = userEvent.setup()
    renderAt('/entries')
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

  it('clicking hamburger opens the menu (aria-expanded="true") and reveals Dashboard link', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const btn = screen.getByRole('button', { name: /toggle navigation menu/i })
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: /^dashboard$/i })).toBeInTheDocument()
  })

  it('clicking hamburger again closes the menu', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const btn = screen.getByRole('button', { name: /toggle navigation menu/i })
    await user.click(btn)
    expect(screen.getByRole('link', { name: /^dashboard$/i })).toBeInTheDocument()
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: /^dashboard$/i })).not.toBeInTheDocument()
  })
})

// ─── Menu contents ────────────────────────────────────────────────────────────

describe('AppShell — menu top-level links', () => {
  it('renders Dashboard, Entries, Settings, and Manage Shortcuts links', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: /toggle navigation menu/i }))
    expect(screen.getByRole('link', { name: /^dashboard$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^entries$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^settings$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^manage shortcuts$/i })).toBeInTheDocument()
  })

  it('renders all NAVIGATION domains as links (Media, Trips, Expenditures)', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: /toggle navigation menu/i }))
    expect(screen.getByRole('link', { name: /^media$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^trips$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^expenditures$/i })).toBeInTheDocument()
  })
})

// ─── Domain expansion ─────────────────────────────────────────────────────────

describe('AppShell — domain expansion', () => {
  it('expanding Media reveals Show, Movie, Book, Podcast links', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: /toggle navigation menu/i }))
    await user.click(screen.getByRole('button', { name: /expand media/i }))

    const showLink = screen.getByRole('link', { name: /^show$/i })
    expect(showLink).toBeInTheDocument()
    expect(showLink).toHaveAttribute('href', '/d/media/show')

    expect(screen.getByRole('link', { name: /^movie$/i })).toHaveAttribute('href', '/d/media/movie')
    expect(screen.getByRole('link', { name: /^book$/i })).toHaveAttribute('href', '/d/media/book')
    expect(screen.getByRole('link', { name: /^podcast$/i })).toHaveAttribute('href', '/d/media/podcast')
  })
})

// ─── Close behaviors ──────────────────────────────────────────────────────────

describe('AppShell — close behaviors', () => {
  it('closes menu on item selection and navigates (top-level link click)', async () => {
    const user = userEvent.setup()
    renderAt('/entries')
    await user.click(screen.getByRole('button', { name: /toggle navigation menu/i }))
    expect(screen.getByRole('link', { name: /^dashboard$/i })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /^dashboard$/i }))
    // menu closed — Dashboard link no longer in document
    expect(screen.queryByRole('link', { name: /^dashboard$/i })).not.toBeInTheDocument()
    // navigation occurred — home sentinel renders
    expect(screen.getByTestId('home-sentinel')).toBeInTheDocument()
  })

  it('closes menu on Escape key', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: /toggle navigation menu/i }))
    expect(screen.getByRole('link', { name: /^dashboard$/i })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('link', { name: /^dashboard$/i })).not.toBeInTheDocument()
  })

  it('closes menu on outside click', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: /toggle navigation menu/i }))
    expect(screen.getByRole('link', { name: /^dashboard$/i })).toBeInTheDocument()
    // click the page content sentinel (outside the nav bar wrapper)
    await user.click(screen.getByTestId('home-sentinel'))
    expect(screen.queryByRole('link', { name: /^dashboard$/i })).not.toBeInTheDocument()
  })
})

// ─── Active mode — app bar display (MODE-04) ──────────────────────────────────

describe('AppShell — app bar active mode display', () => {
  it('renders nothing when no active mode is set', () => {
    renderAt('/')
    expect(screen.queryByText(/·/)).not.toBeInTheDocument()
  })

  it('shows "{mode} · {label}" when an active mode is set', async () => {
    await act(async () => {
      await activeModeRepository.put({ mode: 'Travel', label: 'Italy-trip' })
    })
    renderAt('/')
    expect(await screen.findByText(/Travel\s*·\s*Italy-trip/)).toBeInTheDocument()
  })
})

// ─── Active mode — hamburger menu switcher (MODE-03) ──────────────────────────

describe('AppShell — Active Mode menu', () => {
  async function openMenuWithConfig(path = '/') {
    await act(async () => {
      await configRepository.put(DEFAULT_SHORTCUT_CONFIG)
    })
    const user = userEvent.setup()
    renderAt(path)
    // Wait for config to load reactively before opening the submenu.
    await user.click(screen.getByRole('button', { name: /toggle navigation menu/i }))
    return user
  }

  it('exposes an "Active Mode" control in the menu', async () => {
    const user = await openMenuWithConfig()
    expect(screen.getByRole('button', { name: /active mode/i })).toBeInTheDocument()
    // touch user to satisfy lint
    expect(user).toBeDefined()
  })

  it('opening "Active Mode" lists the configured mode names', async () => {
    const user = await openMenuWithConfig()
    await user.click(screen.getByRole('button', { name: /active mode/i }))
    expect(await screen.findByRole('button', { name: 'DayToDay' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Travel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'WorkTrip' })).toBeInTheDocument()
  })

  it('selecting a mode shows a label input pre-filled with the default instance label', async () => {
    const user = await openMenuWithConfig()
    await user.click(screen.getByRole('button', { name: /active mode/i }))
    await user.click(await screen.findByRole('button', { name: 'Travel' }))
    const input = await screen.findByLabelText(/instance label/i)
    expect(input).toHaveValue(defaultInstanceLabel('Travel'))
  })

  it('editing the label + Confirm persists via activateMode and updates the app bar', async () => {
    const user = await openMenuWithConfig()
    await user.click(screen.getByRole('button', { name: /active mode/i }))
    await user.click(await screen.findByRole('button', { name: 'Travel' }))

    const input = await screen.findByLabelText(/instance label/i)
    await user.clear(input)
    await user.type(input, 'Italy-2026')
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^confirm$/i }))
    })

    await waitFor(async () => {
      const persisted = await activeModeRepository.get()
      expect(persisted).toEqual({ mode: 'Travel', label: 'Italy-2026' })
    })
    // App bar reflects the new active mode and the menu has closed.
    expect(await screen.findByText(/Travel\s*·\s*Italy-2026/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^dashboard$/i })).not.toBeInTheDocument()
  })

  it('Cancel discards the pending selection without persisting', async () => {
    const user = await openMenuWithConfig()
    await user.click(screen.getByRole('button', { name: /active mode/i }))
    await user.click(await screen.findByRole('button', { name: 'Travel' }))
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(screen.queryByLabelText(/instance label/i)).not.toBeInTheDocument()
    expect(await activeModeRepository.get()).toBeUndefined()
  })
})

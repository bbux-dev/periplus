import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../services/db'
import { configRepository, activeLayoutRepository } from '../services/configRepository'
import type { ShortcutConfig } from '../config/shortcutConfig'
import { DashboardPage } from './DashboardPage'

describe('DashboardPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  function renderDashboard() {
    return render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
  }

  // ─── Seeding (DASH-03) ────────────────────────────────────────────────────────

  it('seeds DEFAULT_SHORTCUT_CONFIG on fresh install', async () => {
    renderDashboard()
    expect(await screen.findByRole('button', { name: 'DayToDay' })).toBeInTheDocument()
  })

  it('does NOT overwrite an existing config on remount', async () => {
    const customConfig: ShortcutConfig = {
      version: 1,
      layouts: [{ name: 'MyLayout', shortcuts: [], icon: 'HomeIcon' }],
    }
    await configRepository.put(customConfig)
    renderDashboard()
    await screen.findByRole('button', { name: 'MyLayout' })
    const stored = await configRepository.get()
    expect(stored?.layouts[0].name).toBe('MyLayout')
  })

  // ─── Chips (DASH-02) ──────────────────────────────────────────────────────────

  it('active chip has aria-pressed="true"', async () => {
    renderDashboard()
    const chip = await screen.findByRole('button', { name: 'DayToDay' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders + New chip as disabled', async () => {
    renderDashboard()
    await screen.findByRole('button', { name: 'DayToDay' })
    expect(screen.getByRole('button', { name: '+ New' })).toBeDisabled()
  })

  it('clicking a chip persists selection and updates rows (DASH-02)', async () => {
    const user = userEvent.setup()
    renderDashboard()
    // Wait for chips to appear
    await screen.findByRole('button', { name: 'DayToDay' })

    // Click the Travel chip
    const travelChip = screen.getByRole('button', { name: 'Travel' })
    await user.click(travelChip)

    // Rows update to Travel's shortcuts (regex prefix — button also shows dslTemplate text)
    expect(await screen.findByRole('button', { name: /^Taxi/ })).toBeInTheDocument()

    // Persisted via activeLayoutRepository
    const persisted = await activeLayoutRepository.get()
    expect(persisted).toBe('Travel')
  })

  // ─── Shortcut rows (DASH-01) ──────────────────────────────────────────────────

  it('renders the active layout shortcut names as buttons', async () => {
    renderDashboard()
    await screen.findByRole('button', { name: 'DayToDay' })
    // Shortcut row buttons include name + dslTemplate text — match by regex prefix
    expect(screen.getByRole('button', { name: /^Coffee/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Groceries/ })).toBeInTheDocument()
  })

  // ─── Existing nav regression ──────────────────────────────────────────────────

  it('shows the Media domain tile', async () => {
    renderDashboard()
    await screen.findByRole('button', { name: /DayToDay/i })
    expect(screen.getByText('Media')).toBeInTheDocument()
  })

  it('shows the Trips domain tile', async () => {
    renderDashboard()
    await screen.findByRole('button', { name: /DayToDay/i })
    expect(screen.getByText('Trips')).toBeInTheDocument()
  })

  it('shows the Expenditures domain tile', async () => {
    renderDashboard()
    await screen.findByRole('button', { name: /DayToDay/i })
    expect(screen.getByText('Expenditures')).toBeInTheDocument()
  })

  it('renders Quick Capture + 3 domain links + View All Entries (5 total)', async () => {
    renderDashboard()
    // Wait for async seeding to complete (shortcut rows are <button>, not <a>, so link count is unchanged)
    await screen.findByRole('button', { name: /DayToDay/i })
    expect(screen.getAllByRole('link')).toHaveLength(5)
  })

  it('Quick Capture link targets /capture', async () => {
    renderDashboard()
    await screen.findByRole('button', { name: /DayToDay/i })
    const links = screen.getAllByRole('link')
    const captureLink = links.find((l) => l.textContent?.includes('Quick Capture'))
    expect(captureLink?.getAttribute('href')).toBe('/capture')
  })

  it('media link targets /d/media', async () => {
    renderDashboard()
    await screen.findByRole('button', { name: /DayToDay/i })
    const links = screen.getAllByRole('link')
    const mediaLink = links.find((l) => l.textContent?.includes('Media'))
    expect(mediaLink?.getAttribute('href')).toBe('/d/media')
  })

  it('View All Entries link targets /entries', async () => {
    renderDashboard()
    await screen.findByRole('button', { name: /DayToDay/i })
    const links = screen.getAllByRole('link')
    const entriesLink = links.find((l) => l.textContent?.includes('View All Entries'))
    expect(entriesLink?.getAttribute('href')).toBe('/entries')
  })
})

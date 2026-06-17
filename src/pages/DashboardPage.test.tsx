import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { configRepository, activeLayoutRepository } from '../services/configRepository'
import type { ShortcutConfig } from '../config/shortcutConfig'
import type { Shortcut } from '../config/shortcutConfig'
import { entriesRepository } from '../services/entriesRepository'
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

  it('+ New chip is enabled (no longer a disabled placeholder)', async () => {
    renderDashboard()
    await screen.findByRole('button', { name: 'DayToDay' })
    expect(screen.getByRole('button', { name: '+ New' })).not.toBeDisabled()
  })

  it('clicking + New chip navigates to /manage', async () => {
    const user = userEvent.setup()
    function ManageProbe() { return <div data-testid="manage-probe">Manage</div> }
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/manage" element={<ManageProbe />} />
        </Routes>
      </MemoryRouter>,
    )
    await screen.findByRole('button', { name: 'DayToDay' })
    await user.click(screen.getByRole('button', { name: '+ New' }))
    expect(await screen.findByTestId('manage-probe')).toBeInTheDocument()
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

  it('renders Quick Capture + 3 domain links + View All Entries + Shortcuts Config (6 total)', async () => {
    renderDashboard()
    // Wait for async seeding to complete (shortcut rows are <button>, not <a>, so link count is unchanged)
    await screen.findByRole('button', { name: /DayToDay/i })
    expect(screen.getAllByRole('link')).toHaveLength(6)
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

  // ─── Phase 13 capture flow integration (CAP-01/02/03/04) ──────────────────────
  //
  // These tests cover the five success criteria for Phase 13 end-to-end via the
  // rendered DashboardPage. Each test seeds its own ShortcutConfig so assertions
  // are unambiguous. The outer beforeEach resets the db before each test.

  describe('Phase 13 capture flow', () => {
    // ── Helpers ───────────────────────────────────────────────────────────────

    function makeTestConfig(shortcuts: Shortcut[]): ShortcutConfig {
      return {
        version: 1,
        layouts: [{ name: 'Test', shortcuts, icon: 'HomeIcon' }],
      }
    }

    /** Probe component rendered after navigate('/d/:domain/:type/review') */
    function ReviewProbe() {
      return <div data-testid="review-probe">Review Page</div>
    }

    /** Renders DashboardPage inside a router that includes a ReviewPage probe. */
    function renderDashboardWithRoutes() {
      return render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/d/:domain/:type/review" element={<ReviewProbe />} />
          </Routes>
        </MemoryRouter>,
      )
    }

    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    // ── CAP-01: Zero-hole direct save ─────────────────────────────────────────

    it('CAP-01: zero-hole confirm:false tap saves immediately with no prompt', async () => {
      const user = userEvent.setup()
      await configRepository.put(makeTestConfig([
        { name: 'Coffee', dslTemplate: 'expense 5:coffee', confirm: false },
      ]))
      renderDashboard()
      await screen.findByRole('button', { name: 'Test' })

      await user.click(screen.getByRole('button', { name: /^Coffee/ }))

      // Toast signals save completed (async after create)
      await screen.findByRole('status')

      const entries = await entriesRepository.list()
      expect(entries).toHaveLength(1)
      expect(entries[0].amount).toBe(5)
      // No dialog opened
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // ── CAP-02: Hole → sheet → keypad + live preview → save ──────────────────

    it('CAP-02: amount-hole opens dialog; keypad updates live preview; Save persists entry', async () => {
      const user = userEvent.setup()
      await configRepository.put(makeTestConfig([
        { name: 'Lunch', dslTemplate: 'expense :food', confirm: false },
      ]))
      renderDashboard()
      await screen.findByRole('button', { name: 'Test' })

      await user.click(screen.getByRole('button', { name: /^Lunch/ }))

      // HoleSheet dialog opens
      expect(await screen.findByRole('dialog')).toBeInTheDocument()

      // Type amount on keypad
      await user.click(screen.getByRole('button', { name: '1' }))
      await user.click(screen.getByRole('button', { name: '2' }))

      // Live DSL preview updates
      expect(screen.getByText('expense 12:food')).toBeInTheDocument()

      // Save
      await user.click(screen.getByRole('button', { name: 'Save' }))

      // Toast signals save
      await screen.findByRole('status')

      const entries = await entriesRepository.list()
      expect(entries).toHaveLength(1)
      expect(entries[0].amount).toBe(12)

      // Dialog dismissed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // ── CAP-03: confirm:true → ReviewPage (no write) ──────────────────────────

    it('CAP-03 confirm:true: routes to ReviewPage without writing to IndexedDB', async () => {
      const user = userEvent.setup()
      await configRepository.put(makeTestConfig([
        { name: 'New Movie', dslTemplate: 'movie :', confirm: true },
      ]))
      renderDashboardWithRoutes()
      await screen.findByRole('button', { name: 'Test' })

      await user.click(screen.getByRole('button', { name: /^New Movie/ }))

      // ReviewProbe renders (navigation happened)
      expect(await screen.findByTestId('review-probe')).toBeInTheDocument()
      // No entry saved
      expect(await entriesRepository.list()).toHaveLength(0)
    })

    // ── CAP-03: direct save + Undo ────────────────────────────────────────────

    it('CAP-03 undo: toast appears after direct save; Undo deletes entry and removes toast', async () => {
      const user = userEvent.setup()
      await configRepository.put(makeTestConfig([
        { name: 'Coffee', dslTemplate: 'expense 5:coffee', confirm: false },
      ]))
      renderDashboard()
      await screen.findByRole('button', { name: 'Test' })

      await user.click(screen.getByRole('button', { name: /^Coffee/ }))

      // Toast ("Saved … Undo") appears
      expect(await screen.findByRole('status')).toBeInTheDocument()

      const entries = await entriesRepository.list()
      expect(entries).toHaveLength(1)
      const savedId = entries[0].id

      // Click Undo
      await user.click(screen.getByRole('button', { name: /undo/i }))

      // Toast gone
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
      })
      // Entry deleted
      expect(await entriesRepository.get(savedId)).toBeUndefined()
    })

    // ── CAP-03: 4-second auto-dismiss ─────────────────────────────────────────
    //
    // Deviation [Rule 3 - Blocking]: same Dexie+fake-timer issue as hook tests.
    // Seed + render with REAL timers (Dexie works), then activate fake timers +
    // mock create before clicking so the dismiss setTimeout is a fake timer.
    // MutationObserver-based findByRole works even with fake timers.

    it('CAP-03 dismiss: toast auto-dismisses after 4 seconds', async () => {
      await configRepository.put(makeTestConfig([
        { name: 'Coffee', dslTemplate: 'expense 5:coffee', confirm: false },
      ]))
      renderDashboard()
      // Wait for page to load with real timers (Dexie config load works fine)
      await screen.findByRole('button', { name: 'Test' })

      // Only fake setTimeout/clearTimeout for the 4 s dismiss timer.
      // setImmediate, setInterval, MessageChannel stay real so Dexie and
      // React's scheduler (MessageChannel-based) continue to work.
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      // Mock create: resolves via microtask (Promise.resolve) instead of
      // Dexie's timer-based scheduler so handleTap completes in the act below.
      vi.spyOn(entriesRepository, 'create').mockResolvedValue({
        id: 'mock-dismiss-id',
        domain: 'expenditures',
        type: 'expense',
        title: 'Coffee',
        recordedAt: 0,
        tags: [],
        metadata: {},
        syncedAt: null,
        amount: 5,
      })

      // Fire click synchronously inside act, then drain the microtask queue so
      // the fire-and-forget handleTap chain (create → showToast → setToastEntryId)
      // finishes before act flushes React's pending state updates.
      await act(async () => {
        screen.getByRole('button', { name: /^Coffee/ }).click()
        // Three microtask yields: ① create resolves ② handleTap resumes
        // ③ showToast/setToastEntryId called — React queues the DOM update.
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })
      // act has force-flushed all pending React work → SavedToast is visible.
      expect(screen.getByRole('status')).toBeInTheDocument()

      // Advance fake timer 4000ms → dismiss callback fires → React flushes within act.
      act(() => { vi.advanceTimersByTime(4000) })
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // ── CAP-04: {} named-hole → sheet prompts field; no {} in metadata ────────

    it('CAP-04: {} named-hole opens sheet for merchant; saved metadata.merchant is not "{}"', async () => {
      const user = userEvent.setup()
      await configRepository.put(makeTestConfig([
        { name: 'Shop', dslTemplate: 'expense 5:food?merchant={}', confirm: false },
      ]))
      renderDashboard()
      await screen.findByRole('button', { name: 'Test' })

      await user.click(screen.getByRole('button', { name: /^Shop/ }))

      // Dialog opens
      expect(await screen.findByRole('dialog')).toBeInTheDocument()
      // Merchant label/input present (named hole)
      expect(screen.getByLabelText(/merchant/i)).toBeInTheDocument()
      // Amount keypad NOT present (no positional holes — amount=5 is filled)
      expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument()

      // Fill merchant
      await user.type(screen.getByLabelText(/merchant/i), 'Acme')

      // Save
      await user.click(screen.getByRole('button', { name: 'Save' }))

      // Toast signals save
      await screen.findByRole('status')

      const entries = await entriesRepository.list()
      expect(entries).toHaveLength(1)
      // Amount came from the template (baseValues), not from a fill — must be preserved
      expect(entries[0].amount).toBe(5)
      // metadata.merchant is the filled value, NOT the '{}' placeholder
      expect(entries[0].metadata?.merchant).toBe('Acme')
      // Metadata should not contain the literal '{}' string
      expect(JSON.stringify(entries[0].metadata)).not.toContain('{}')
    })
  })
})

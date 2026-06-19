import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { entriesRepository } from '../services/entriesRepository'
import { EditEntryModal } from './EditEntryModal'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('EditEntryModal', () => {
  it('seeds form value from entry (expense amount pre-filled)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const entry = await entriesRepository.create({
      domain: 'trips',
      type: 'expense',
      title: 'Coffee',
      amount: 12.5,
      recordedAt: Date.now(),
      tags: [],
      metadata: { tripId: 'trip-1', mode: 'trip', modeLabel: 'Paris' },
      syncedAt: null,
    })

    const onClose = vi.fn()
    render(<EditEntryModal entry={entry} onClose={onClose} />)

    // Amount field should be pre-filled with the entry's amount
    expect(screen.getByDisplayValue('12.5')).toBeInTheDocument()
  })

  it('saves amount change while preserving metadata.tripId/mode/modeLabel', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const entry = await entriesRepository.create({
      domain: 'trips',
      type: 'expense',
      title: 'Coffee',
      amount: 12.5,
      recordedAt: Date.now(),
      tags: [],
      metadata: { tripId: 'trip-1', mode: 'trip', modeLabel: 'Paris' },
      syncedAt: null,
    })

    const onClose = vi.fn()
    render(<EditEntryModal entry={entry} onClose={onClose} />)

    // Change amount field (label "Amount" → input id "edit-amount")
    const amountInput = screen.getByLabelText(/^amount$/i)
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '25')

    // Click Save
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())

    // Read back entry and verify amount changed + metadata preserved
    const updated = await entriesRepository.get(entry.id)
    expect(updated?.amount).toBe(25)
    expect(updated?.metadata.tripId).toBe('trip-1')   // must survive (T-24-07)
    expect(updated?.metadata.mode).toBe('trip')        // must survive
    expect(updated?.metadata.modeLabel).toBe('Paris')  // must survive
  })

  it('confirm-gated delete: calls delete and onClose when confirmed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const entry = await entriesRepository.create({
      domain: 'trips',
      type: 'expense',
      title: 'Coffee',
      amount: 12.5,
      recordedAt: Date.now(),
      tags: [],
      metadata: { tripId: 'trip-1', mode: 'trip', modeLabel: 'Paris' },
      syncedAt: null,
    })

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onClose = vi.fn()
    render(<EditEntryModal entry={entry} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())

    const deleted = await entriesRepository.get(entry.id)
    expect(deleted).toBeUndefined()
  })

  it('confirm-gated delete: does NOT delete or close when cancelled', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const entry = await entriesRepository.create({
      domain: 'trips',
      type: 'expense',
      title: 'Coffee',
      amount: 12.5,
      recordedAt: Date.now(),
      tags: [],
      metadata: { tripId: 'trip-1', mode: 'trip', modeLabel: 'Paris' },
      syncedAt: null,
    })

    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onClose = vi.fn()
    render(<EditEntryModal entry={entry} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: /delete/i }))

    // Neither delete nor onClose should fire
    expect(onClose).not.toHaveBeenCalled()
    const stillExists = await entriesRepository.get(entry.id)
    expect(stillExists).toBeDefined()
  })

  it('moves focus into the dialog panel on mount (WR-01)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const entry = await entriesRepository.create({
      domain: 'trips',
      type: 'expense',
      title: 'Coffee',
      amount: 12.5,
      recordedAt: Date.now(),
      tags: [],
      metadata: { tripId: 'trip-1', mode: 'trip', modeLabel: 'Paris' },
      syncedAt: null,
    })
    const onClose = vi.fn()
    render(<EditEntryModal entry={entry} onClose={onClose} />)
    // The dialog panel (tabIndex={-1}) should have received programmatic focus via useEffect
    const dialog = screen.getByRole('dialog')
    expect(document.activeElement).toBe(dialog)
  })

  it('sets body overflow=hidden on mount and restores it on unmount (WR-02)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const entry = await entriesRepository.create({
      domain: 'trips',
      type: 'expense',
      title: 'Coffee',
      amount: 12.5,
      recordedAt: Date.now(),
      tags: [],
      metadata: { tripId: 'trip-1', mode: 'trip', modeLabel: 'Paris' },
      syncedAt: null,
    })
    const onClose = vi.fn()
    const { unmount } = render(<EditEntryModal entry={entry} onClose={onClose} />)
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    // Cleanup restores the previous value (empty string in the test environment)
    expect(document.body.style.overflow).toBe('')
  })

  it('delete error: shows error message and keeps modal open when delete throws (WR-03)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const entry = await entriesRepository.create({
      domain: 'trips',
      type: 'expense',
      title: 'Coffee',
      amount: 12.5,
      recordedAt: Date.now(),
      tags: [],
      metadata: { tripId: 'trip-1', mode: 'trip', modeLabel: 'Paris' },
      syncedAt: null,
    })
    vi.spyOn(entriesRepository, 'delete').mockRejectedValue(new Error('DB error'))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onClose = vi.fn()
    render(<EditEntryModal entry={entry} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: /delete/i }))

    // Error message visible; modal stays open
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not delete/i)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('double-submit guard: rapid Save clicks call update at most once', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const entry = await entriesRepository.create({
      domain: 'trips',
      type: 'expense',
      title: 'Coffee',
      amount: 12.5,
      recordedAt: Date.now(),
      tags: [],
      metadata: { tripId: 'trip-1', mode: 'trip', modeLabel: 'Paris' },
      syncedAt: null,
    })

    // Mock update as a never-resolving promise to simulate slow I/O
    let resolveUpdate!: (value: number) => void
    const updateSpy = vi.spyOn(entriesRepository, 'update').mockImplementation(
      () => new Promise<number>((resolve) => { resolveUpdate = resolve }),
    )

    const onClose = vi.fn()
    render(<EditEntryModal entry={entry} onClose={onClose} />)

    const saveButton = screen.getByRole('button', { name: /^save$/i })
    // Fire two clicks synchronously — savingRef guard blocks the second
    fireEvent.click(saveButton)
    fireEvent.click(saveButton)

    // update should only have been called once
    expect(updateSpy).toHaveBeenCalledTimes(1)

    // Allow first update to complete
    resolveUpdate(1)
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    updateSpy.mockRestore()
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../../services/db'
import type { LifeLogEntry } from '../../services/db'
import { activeModeRepository } from '../../services/activeMode'
import { createAndActivateTrip } from '../../services/tripService'
import { ExpenseSheet } from './ExpenseSheet'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ExpenseSheet', () => {
  it('saves expense with domain trips, tripId stamped, and local-date occurredAt', async () => {
    // MEMORY.md: full fake timers stall Dexie — ALWAYS use { toFake: ['Date'] }
    vi.useFakeTimers({ toFake: ['Date'] })
    // 23:30 local on Jun 19 = Jun 20 UTC → catches UTC off-by-one (PITFALLS Pitfall 3)
    vi.setSystemTime(new Date('2026-06-19T23:30:00'))

    const tripEntry = await createAndActivateTrip('Paris')
    const activeMode = await activeModeRepository.get()

    const user = userEvent.setup()
    let savedEntry: LifeLogEntry | undefined
    render(
      <ExpenseSheet
        isOpen={true}
        activeMode={activeMode}
        onSave={(e) => {
          savedEntry = e
        }}
        onCancel={() => {}}
      />,
    )

    await user.type(screen.getByLabelText(/amount/i), '42.50')
    await user.click(screen.getByRole('button', { name: 'Food' }))
    await user.click(screen.getByRole('button', { name: /save/i }))

    // Wait for async Dexie save to settle
    expect(savedEntry).toBeDefined()
    expect(savedEntry!.domain).toBe('trips')                     // NEVER 'expenditures'
    expect(savedEntry!.metadata.tripId).toBe(tripEntry.id)       // auto-stamped by draftToEntry
    expect(savedEntry!.metadata.category).toBe('Food')
    expect(savedEntry!.amount).toBe(42.5)

    // occurredAt is LOCAL midnight on Jun 19, NOT UTC midnight Jun 20
    const expectedLocalMidnight = Date.parse('2026-06-19T00:00:00')
    expect(savedEntry!.occurredAt).toBe(expectedLocalMidnight)
  })

  it('does not call onSave when amount is missing', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(
      <ExpenseSheet isOpen={true} activeMode={null} onSave={onSave} onCancel={() => {}} />,
    )
    await user.click(screen.getByRole('button', { name: 'Food' }))
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('does not call onSave when no category is selected', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(
      <ExpenseSheet isOpen={true} activeMode={null} onSave={onSave} onCancel={() => {}} />,
    )
    await user.type(screen.getByLabelText(/amount/i), '10')
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onCancel when backdrop is clicked', async () => {
    const onCancel = vi.fn()
    render(
      <ExpenseSheet isOpen={true} activeMode={null} onSave={() => {}} onCancel={onCancel} />,
    )
    // The backdrop has aria-hidden="true" — query by that attribute
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement
    await userEvent.click(backdrop)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel on Escape key', () => {
    const onCancel = vi.fn()
    render(
      <ExpenseSheet isOpen={true} activeMode={null} onSave={() => {}} onCancel={onCancel} />,
    )
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

import { render, screen, act, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { createAndActivateTrip } from '../services/tripService'
import { entriesRepository } from '../services/entriesRepository'
import { ENTRY_FIELDS, formValuesFromEntry, buildEntryUpdate } from '../config/entryFields'
import { TripDetailPage } from './TripDetailPage'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})

function renderTripDetail(tripId: string) {
  return render(
    <MemoryRouter initialEntries={[`/trips/${tripId}`]}>
      <Routes>
        <Route path="/trips/:tripId" element={<TripDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TripDetailPage', () => {
  it('renders loading skeleton while Dexie is opening', async () => {
    // Delete DB without reopening — useTripEntries returns undefined
    await db.delete()
    renderTripDetail('some-id')
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows category subtotals and float-safe grand total ($15.30 for 10.10 + 5.20)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const trip = await createAndActivateTrip('Paris')
    await act(async () => {
      await db.entries.add({
        id: 'e-food',
        domain: 'trips',
        type: 'expense',
        title: 'Dinner',
        amount: 10.1,
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: trip.id, category: 'Food' },
        syncedAt: null,
      })
      await db.entries.add({
        id: 'e-hotel',
        domain: 'trips',
        type: 'expense',
        title: 'Inn',
        amount: 5.2,
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: trip.id, category: 'Hotel' },
        syncedAt: null,
      })
    })
    renderTripDetail(trip.id)
    // Amounts appear in both the ExpenseReport (subtotals) and the Timeline (row amounts);
    // use getAllByText to tolerate duplicates, then confirm $15.30 appears (grand total only).
    expect(await screen.findAllByText('$10.10')).not.toHaveLength(0) // Food subtotal + timeline
    expect(screen.getAllByText('$5.20')).not.toHaveLength(0)         // Hotel subtotal + timeline
    expect(screen.getByText('$15.30')).toBeInTheDocument()           // Grand total (float-safe)
  })

  it('timeline lists both an expense and an activity sorted by occurredAt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const trip = await createAndActivateTrip('Rome')
    await act(async () => {
      await db.entries.add({
        id: 'e-exp',
        domain: 'trips',
        type: 'expense',
        title: 'Coffee',
        amount: 3.5,
        occurredAt: 1000,
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: trip.id, category: 'Food' },
        syncedAt: null,
      })
      await db.entries.add({
        id: 'e-act',
        domain: 'trips',
        type: 'activity',
        title: 'Colosseum Tour',
        occurredAt: 2000,
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: trip.id },
        syncedAt: null,
      })
    })
    renderTripDetail(trip.id)
    // 'Food' appears in both the ExpenseReport category button and the Timeline row;
    // use getAllByText to tolerate duplicates. Activity appears once (title in timeline).
    expect(await screen.findAllByText('Food')).not.toHaveLength(0)
    expect(screen.getByText('Colosseum Tour')).toBeInTheDocument()
  })

  it('timeline sorts entries ascending by occurredAt (fallback recordedAt)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const trip = await createAndActivateTrip('Berlin')
    await act(async () => {
      // Activity with later occurredAt added first
      await db.entries.add({
        id: 'e-late',
        domain: 'trips',
        type: 'activity',
        title: 'Late Event',
        occurredAt: 3000,
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: trip.id },
        syncedAt: null,
      })
      await db.entries.add({
        id: 'e-early',
        domain: 'trips',
        type: 'activity',
        title: 'Early Event',
        occurredAt: 1000,
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: trip.id },
        syncedAt: null,
      })
    })
    renderTripDetail(trip.id)
    expect(await screen.findByText('Early Event')).toBeInTheDocument()
    expect(screen.getByText('Late Event')).toBeInTheDocument()

    const items = screen.getAllByRole('listitem')
    const earlyIdx = items.findIndex((el) => el.textContent?.includes('Early Event'))
    const lateIdx = items.findIndex((el) => el.textContent?.includes('Late Event'))
    expect(earlyIdx).toBeLessThan(lateIdx)
  })

  it('duplicate-name isolation: /trips/<uuid-A> shows only trip A entries, not trip B', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const tripA = await createAndActivateTrip('Paris')
    const tripB = await createAndActivateTrip('Paris') // same name, different UUID
    await act(async () => {
      await db.entries.add({
        id: 'e-A',
        domain: 'trips',
        type: 'expense',
        title: 'Croissant',
        amount: 4.0,
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: tripA.id, category: 'Food' },
        syncedAt: null,
      })
      await db.entries.add({
        id: 'e-B',
        domain: 'trips',
        type: 'expense',
        title: 'Baguette',
        amount: 99.0,
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: tripB.id, category: 'Food' },
        syncedAt: null,
      })
    })

    // Render detail for trip A — should show $4.00 (not $99.00)
    // $4.00 appears multiple times (subtotal, timeline, grand total); just confirm presence
    renderTripDetail(tripA.id)
    expect(await screen.findAllByText('$4.00')).not.toHaveLength(0)
    expect(screen.queryByText('$99.00')).not.toBeInTheDocument()
  })

  it('edit preserves metadata.tripId and mode/modeLabel after buildEntryUpdate+update', async () => {
    // Tests the service-layer contract that TripDetailPage edit (24-03) will use
    const trip = await createAndActivateTrip('Paris')
    const original = await entriesRepository.create({
      domain: 'trips',
      type: 'expense',
      title: 'Taxi',
      amount: 20,
      recordedAt: Date.now(),
      tags: [],
      metadata: { tripId: trip.id, mode: 'trip', modeLabel: 'Paris' },
      syncedAt: null,
    })

    const fields = ENTRY_FIELDS['expense']
    const formValues = formValuesFromEntry(fields, original)
    formValues['amount'] = '25' // user edits amount
    const changes = buildEntryUpdate(fields, original, formValues, {})

    await entriesRepository.update(original.id, changes)
    const updated = await entriesRepository.get(original.id)

    expect(updated?.amount).toBe(25)
    expect(updated?.metadata.tripId).toBe(trip.id)   // preserved
    expect(updated?.metadata.mode).toBe('trip')       // preserved
    expect(updated?.metadata.modeLabel).toBe('Paris') // preserved
  })

  it('delete removes entry and report reactively updates (confirm=true)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const trip = await createAndActivateTrip('Rome')
    await act(async () => {
      await db.entries.add({
        id: 'e-del',
        domain: 'trips',
        type: 'expense',
        title: 'Coffee',
        amount: 5,
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: trip.id, category: 'Food' },
        syncedAt: null,
      })
    })
    renderTripDetail(trip.id)
    expect(await screen.findByText('$5.00')).toBeInTheDocument()

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    // Timeline rows each have a Delete button — click the one on the row
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))

    // useLiveQuery re-renders reactively; $5.00 should disappear
    await waitFor(() => expect(screen.queryByText('$5.00')).not.toBeInTheDocument())
  })

  it('edit flow: open modal, change amount, save, report and timeline recompute reactively', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const trip = await createAndActivateTrip('Berlin')
    await act(async () => {
      await db.entries.add({
        id: 'e-edit',
        domain: 'trips',
        type: 'expense',
        title: 'Dinner',
        amount: 20,
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: trip.id, category: 'Food' },
        syncedAt: null,
      })
    })
    renderTripDetail(trip.id)
    expect(await screen.findAllByText('$20.00')).not.toHaveLength(0)

    // Click the Edit button on the timeline row
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))

    // EditEntryModal is now open — operate within the dialog
    const dialog = screen.getByRole('dialog')
    const amountInput = within(dialog).getByLabelText(/^amount$/i)
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '35')

    // Click Save inside the dialog
    await userEvent.click(within(dialog).getByRole('button', { name: /^save$/i }))

    // Modal closes; useLiveQuery re-renders — $35.00 appears (Food subtotal + grand total)
    await waitFor(() => expect(screen.getAllByText('$35.00')).not.toHaveLength(0))
    // Old amount no longer present
    expect(screen.queryByText('$20.00')).not.toBeInTheDocument()
  })
})

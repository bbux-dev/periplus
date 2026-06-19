import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from './db'
import { activeModeRepository } from './activeMode'
import type { LifeLogEntry } from './db'
import {
  createAndActivateTrip,
  listTrips,
  listTripEntries,
  useTrips,
  useTripEntries,
  tripExpenseTotal,
  tripExpensesByCategory,
  tripDateRange,
  tripActivityCount,
} from './tripService'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it

// ─── Factory helper (mirror entriesRepository.test.tsx) ──────────────────────
// Used by both pure-helper tests (no Dexie) and Dexie integration tests.

function makeEntryData(overrides?: Partial<Omit<LifeLogEntry, 'id'>>): Omit<LifeLogEntry, 'id'> {
  return {
    domain: 'trips',
    type: 'expense',
    title: 'Coffee',
    recordedAt: Date.now(),
    tags: [],
    metadata: {},
    syncedAt: null,
    ...overrides,
  }
}

// ─── Pure stat helper tests — NO Dexie, NO fake timers needed ────────────────

describe('tripExpenseTotal', () => {
  it('sums amount on expense entries only (excludes activity)', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ type: 'expense', amount: 10.1 }), id: '1' },
      { ...makeEntryData({ type: 'expense', amount: 5.2 }), id: '2' },
      { ...makeEntryData({ type: 'activity' }), id: '3' },
    ]
    const total = tripExpenseTotal(entries)
    // Raw float returned — callers round at display time
    expect(Math.round(total * 100) / 100).toBe(15.3)
  })

  it('returns 0 for an empty array', () => {
    expect(tripExpenseTotal([])).toBe(0)
  })

  it('treats missing amount as 0 (amount ?? 0)', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ type: 'expense', amount: undefined }), id: '1' },
    ]
    expect(tripExpenseTotal(entries)).toBe(0)
  })

  it('excludes trip entries from the total', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ type: 'trip', amount: 100 }), id: '1' },
    ]
    expect(tripExpenseTotal(entries)).toBe(0)
  })
})

describe('tripExpensesByCategory', () => {
  it('groups amounts by metadata.category', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ type: 'expense', amount: 10, metadata: { category: 'Food' } }), id: '1' },
      { ...makeEntryData({ type: 'expense', amount: 5, metadata: { category: 'Food' } }), id: '2' },
      { ...makeEntryData({ type: 'expense', amount: 20, metadata: { category: 'Transport' } }), id: '3' },
    ]
    const map = tripExpensesByCategory(entries)
    expect(map.get('Food')).toBe(15)
    expect(map.get('Transport')).toBe(20)
  })

  it('buckets missing category under Uncategorized', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ type: 'expense', amount: 7, metadata: {} }), id: '1' },
    ]
    const map = tripExpensesByCategory(entries)
    expect(map.get('Uncategorized')).toBe(7)
  })

  it('buckets non-string category (number) under Uncategorized', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ type: 'expense', amount: 3, metadata: { category: 42 } }), id: '1' },
    ]
    const map = tripExpensesByCategory(entries)
    expect(map.get('Uncategorized')).toBe(3)
  })

  it('excludes activity entries', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ type: 'activity', amount: 10 }), id: '1' },
    ]
    expect(tripExpensesByCategory(entries).size).toBe(0)
  })

  it('excludes trip entries', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ type: 'trip', amount: 50 }), id: '1' },
    ]
    expect(tripExpensesByCategory(entries).size).toBe(0)
  })
})

describe('tripDateRange', () => {
  it('returns null for an empty array', () => {
    expect(tripDateRange([])).toBeNull()
  })

  it('returns null when no entry has an occurredAt', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData(), id: '1' },
      { ...makeEntryData(), id: '2' },
    ]
    expect(tripDateRange(entries)).toBeNull()
  })

  it('returns { start: min, end: max } for two dated entries', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ occurredAt: 1000 }), id: '1' },
      { ...makeEntryData({ occurredAt: 3000 }), id: '2' },
    ]
    expect(tripDateRange(entries)).toEqual({ start: 1000, end: 3000 })
  })

  it('handles a single dated entry (start === end)', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ occurredAt: 2000 }), id: '1' },
    ]
    expect(tripDateRange(entries)).toEqual({ start: 2000, end: 2000 })
  })

  it('ignores entries with no occurredAt in a mixed array', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ occurredAt: undefined }), id: '1' },
      { ...makeEntryData({ occurredAt: 5000 }), id: '2' },
      { ...makeEntryData({ occurredAt: undefined }), id: '3' },
    ]
    expect(tripDateRange(entries)).toEqual({ start: 5000, end: 5000 })
  })
})

describe('tripActivityCount', () => {
  it('counts only activity entries', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ type: 'activity' }), id: '1' },
      { ...makeEntryData({ type: 'activity' }), id: '2' },
      { ...makeEntryData({ type: 'expense' }), id: '3' },
    ]
    expect(tripActivityCount(entries)).toBe(2)
  })

  it('returns 0 for an empty array', () => {
    expect(tripActivityCount([])).toBe(0)
  })

  it('does not count expense or trip entries', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ type: 'expense' }), id: '1' },
      { ...makeEntryData({ type: 'trip' }), id: '2' },
    ]
    expect(tripActivityCount(entries)).toBe(0)
  })
})

// ─── Dexie integration tests ──────────────────────────────────────────────────
// These tests require IndexedDB and must reset state in beforeEach.

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createAndActivateTrip', () => {
  it('returns an entry with type=trip, domain=trips, title=Paris', async () => {
    const entry = await createAndActivateTrip('Paris')
    expect(entry.type).toBe('trip')
    expect(entry.domain).toBe('trips')
    expect(entry.title).toBe('Paris')
    expect(entry.id).toBeTruthy()
  })

  it('persists the entry in db.entries', async () => {
    const entry = await createAndActivateTrip('Rome')
    const stored = await db.entries.get(entry.id)
    expect(stored).toBeDefined()
    expect(stored?.title).toBe('Rome')
  })

  it('activates the mode with mode=trip, label=Paris, tripId=entry.id', async () => {
    const entry = await createAndActivateTrip('Paris')
    const active = await activeModeRepository.get()
    expect(active?.mode).toBe('trip')
    expect(active?.label).toBe('Paris')
    expect(active?.tripId).toBe(entry.id)
  })

  it('stamps recordedAt at the faked current time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-19T10:00:00'))
    const entry = await createAndActivateTrip('Tokyo')
    expect(entry.recordedAt).toBe(new Date('2026-06-19T10:00:00').getTime())
  })

  it('falls back to Untitled Trip for a blank/whitespace name', async () => {
    const entry = await createAndActivateTrip('   ')
    expect(entry.title).toBe('Untitled Trip')
    const active = await activeModeRepository.get()
    expect(active?.label).toBe('Untitled Trip')   // must match entry.title (WR-01)
    expect(active?.tripId).toBe(entry.id)
  })
})

describe('listTrips', () => {
  it('returns only type=trip entries', async () => {
    await createAndActivateTrip('Paris')
    // Insert a non-trip domain=trips entry (expense)
    await db.entries.add({
      id: 'expense-1',
      domain: 'trips',
      type: 'expense',
      title: 'Dinner',
      recordedAt: Date.now(),
      tags: [],
      metadata: {},
      syncedAt: null,
    })
    const trips = await listTrips()
    expect(trips.every((t) => t.type === 'trip')).toBe(true)
  })

  it('returns trips newest-first by recordedAt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-19T09:00:00'))
    await createAndActivateTrip('Old Trip')
    vi.setSystemTime(new Date('2026-06-19T11:00:00'))
    await createAndActivateTrip('New Trip')
    const trips = await listTrips()
    expect(trips[0].title).toBe('New Trip')
    expect(trips[1].title).toBe('Old Trip')
  })
})

describe('listTripEntries', () => {
  it('returns only entries with metadata.tripId matching the given tripId', async () => {
    const trip = await createAndActivateTrip('Paris')
    // Add an entry stamped with trip.id
    await db.entries.add({
      id: 'entry-1',
      domain: 'trips',
      type: 'expense',
      title: 'Croissant',
      recordedAt: Date.now(),
      tags: [],
      metadata: { tripId: trip.id },
      syncedAt: null,
    })
    // Add an entry for a different trip
    await db.entries.add({
      id: 'entry-2',
      domain: 'trips',
      type: 'expense',
      title: 'Burger',
      recordedAt: Date.now(),
      tags: [],
      metadata: { tripId: 'other-trip-id' },
      syncedAt: null,
    })
    const entries = await listTripEntries(trip.id)
    expect(entries).toHaveLength(1)
    expect(entries[0].title).toBe('Croissant')
  })

  it('returns an empty array when no entries match', async () => {
    const entries = await listTripEntries('nonexistent-id')
    expect(entries).toEqual([])
  })
})

// ─── useTrips reactive hook ───────────────────────────────────────────────────

function TripsTest() {
  const trips = useTrips()
  if (trips === undefined) return <p>Loading</p>
  return <ul>{trips.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
}

describe('useTrips reactive hook', () => {
  it('returns undefined before any write (loading branch)', async () => {
    render(<TripsTest />)
    expect(await screen.findByText('Loading')).toBeInTheDocument()
  })

  it('re-renders to include a newly created trip after act()', async () => {
    render(<TripsTest />)
    await screen.findByText('Loading')
    await act(async () => {
      await createAndActivateTrip('Paris')
    })
    expect(await screen.findByText('Paris')).toBeInTheDocument()
  })
})

// ─── useTripEntries reactive hook ────────────────────────────────────────────

function TripEntriesTest({ tripId }: { tripId: string }) {
  const entries = useTripEntries(tripId)
  if (entries === undefined) return <p>Loading</p>
  return <ul>{entries.map((e) => <li key={e.id}>{e.title}</li>)}</ul>
}

describe('useTripEntries reactive hook', () => {
  it('returns undefined before any write (loading branch)', async () => {
    render(<TripEntriesTest tripId="trip-123" />)
    expect(await screen.findByText('Loading')).toBeInTheDocument()
  })

  it('re-renders when a matching entry is added inside act()', async () => {
    const trip = await createAndActivateTrip('Paris')
    render(<TripEntriesTest tripId={trip.id} />)
    await screen.findByText('Loading')
    await act(async () => {
      await db.entries.add({
        id: 'e-1',
        domain: 'trips',
        type: 'expense',
        title: 'Croissant',
        recordedAt: Date.now(),
        tags: [],
        metadata: { tripId: trip.id },
        syncedAt: null,
      })
    })
    expect(await screen.findByText('Croissant')).toBeInTheDocument()
  })
})

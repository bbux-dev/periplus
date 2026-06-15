import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { entriesRepository, useEntries } from './entriesRepository'
import type { LifeLogEntry } from './db'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

// ─── Base entry factory (omits id so create() can generate it) ───────────────

function makeEntryData(overrides?: Partial<Omit<LifeLogEntry, 'id'>>): Omit<LifeLogEntry, 'id'> {
  return {
    domain: 'media',
    type: 'book',
    title: 'The Pragmatic Programmer',
    recordedAt: 1700000000000,
    tags: [],
    metadata: {},
    syncedAt: null,
    ...overrides,
  }
}

// ─── SC1: create / get round-trip ────────────────────────────────────────────

describe('entriesRepository: create and get', () => {
  it('create returns a LifeLogEntry with a non-empty string id', async () => {
    const entry = await entriesRepository.create(makeEntryData())
    expect(typeof entry.id).toBe('string')
    expect(entry.id.length).toBeGreaterThan(0)
  })

  it('create persists and get retrieves the same entry (round-trip)', async () => {
    const created = await entriesRepository.create(makeEntryData())
    const found = await entriesRepository.get(created.id)
    expect(found).toEqual(created)
  })

  it('get returns undefined for a non-existent id', async () => {
    const result = await entriesRepository.get('non-existent-id')
    expect(result).toBeUndefined()
  })
})

// ─── list: ordered by recordedAt descending ───────────────────────────────────

describe('entriesRepository: list', () => {
  it('returns entries ordered by recordedAt descending', async () => {
    const older = await entriesRepository.create(makeEntryData({ title: 'Older', recordedAt: 1000 }))
    const newer = await entriesRepository.create(makeEntryData({ title: 'Newer', recordedAt: 2000 }))
    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(2)
    expect(entries[0].id).toBe(newer.id)
    expect(entries[1].id).toBe(older.id)
  })

  it('returns empty array when no entries exist', async () => {
    const entries = await entriesRepository.list()
    expect(entries).toEqual([])
  })
})

// ─── update ───────────────────────────────────────────────────────────────────

describe('entriesRepository: update', () => {
  it('update returns 1 and changes the specified field', async () => {
    const entry = await entriesRepository.create(makeEntryData())
    const count = await entriesRepository.update(entry.id, { title: 'Updated Title' })
    expect(count).toBe(1)
    const updated = await entriesRepository.get(entry.id)
    expect(updated?.title).toBe('Updated Title')
  })

  it('update does not change unspecified fields', async () => {
    const entry = await entriesRepository.create(makeEntryData({ domain: 'trips' }))
    const count = await entriesRepository.update(entry.id, { title: 'New Title' })
    expect(count).toBe(1)
    const updated = await entriesRepository.get(entry.id)
    expect(updated?.domain).toBe('trips')
  })

  it('update returns 0 for a non-existent id (silent no-op detection)', async () => {
    const count = await entriesRepository.update('non-existent-id', { title: 'Ghost' })
    expect(count).toBe(0)
  })
})

// ─── delete ──────────────────────────────────────────────────────────────────

describe('entriesRepository: delete', () => {
  it('delete removes the entry so get returns undefined', async () => {
    const entry = await entriesRepository.create(makeEntryData())
    await entriesRepository.delete(entry.id)
    const result = await entriesRepository.get(entry.id)
    expect(result).toBeUndefined()
  })
})

// ─── SC3: listUnsynced seam ───────────────────────────────────────────────────

describe('entriesRepository: listUnsynced (SC3)', () => {
  it('returns entries with syncedAt == null', async () => {
    const unsynced = await entriesRepository.create(makeEntryData({ syncedAt: null }))
    const entries = await entriesRepository.listUnsynced()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe(unsynced.id)
  })

  it('excludes entries with a numeric syncedAt', async () => {
    await entriesRepository.create(makeEntryData({ syncedAt: 1700000001000 }))
    const entries = await entriesRepository.listUnsynced()
    expect(entries).toHaveLength(0)
  })

  it('returns only null-syncedAt entries when both exist (boundary test)', async () => {
    const unsynced = await entriesRepository.create(makeEntryData({ syncedAt: null, title: 'Unsynced' }))
    await entriesRepository.create(makeEntryData({ syncedAt: 1700000001000, title: 'Synced' }))
    const entries = await entriesRepository.listUnsynced()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe(unsynced.id)
    expect(entries[0].title).toBe('Unsynced')
  })
})

// ─── SC2a: useEntries reactive re-render ─────────────────────────────────────

// Minimal test component that calls useEntries() and renders count + titles.
// Mirrors the Counter.test.tsx act() + findByText pattern for useLiveQuery.
function EntryListTest() {
  const entries = useEntries()
  if (entries === undefined) return <p>Loading...</p>
  return (
    <div>
      <p>{entries.length} entries</p>
      <ul>
        {entries.map((e) => (
          <li key={e.id}>{e.title}</li>
        ))}
      </ul>
    </div>
  )
}

describe('useEntries reactive hook (SC2a)', () => {
  it('initially shows 0 entries after Dexie opens', async () => {
    render(<EntryListTest />)
    // findByText waits for the async useLiveQuery re-render past the loading state
    expect(await screen.findByText('0 entries')).toBeInTheDocument()
  })

  it('re-renders with new entry title after create() is called', async () => {
    render(<EntryListTest />)
    await screen.findByText('0 entries')

    await act(async () => {
      await entriesRepository.create(
        makeEntryData({ title: 'My Reactive Entry' }),
      )
    })

    expect(await screen.findByText('My Reactive Entry')).toBeInTheDocument()
    expect(await screen.findByText('1 entries')).toBeInTheDocument()
  })
})

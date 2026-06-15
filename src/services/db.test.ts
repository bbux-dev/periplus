import { describe, it, expect, beforeEach } from 'vitest'
import { db, type LifeLogEntry } from './db'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('counter store', () => {
  it('put creates a row when id=1 does not exist', async () => {
    await db.counter.put({ id: 1, value: 0 })
    const row = await db.counter.get(1)
    expect(row?.value).toBe(0)
  })

  it('put overwrites an existing row (upsert)', async () => {
    await db.counter.put({ id: 1, value: 3 })
    await db.counter.put({ id: 1, value: 7 })
    const row = await db.counter.get(1)
    expect(row?.value).toBe(7)
  })

  it('multiple puts at id=1 result in a single row', async () => {
    await db.counter.put({ id: 1, value: 3 })
    await db.counter.put({ id: 1, value: 7 })
    const count = await db.counter.count()
    expect(count).toBe(1)
  })
})

// ─── v2 schema tests ─────────────────────────────────────────────────────────

const sampleEntry: LifeLogEntry = {
  id: 'test-uuid-1234',
  domain: 'media',
  type: 'book',
  title: 'Test Book',
  recordedAt: 1700000000000,
  tags: [],
  metadata: {},
  syncedAt: null,
}

describe('v2 schema: entries store', () => {
  it('add and get round-trips a LifeLogEntry', async () => {
    await db.entries.add(sampleEntry)
    const result = await db.entries.get('test-uuid-1234')
    expect(result).toEqual(sampleEntry)
  })

  it('recordedAt is a queryable index', async () => {
    await db.entries.add(sampleEntry)
    const results = await db.entries.where('recordedAt').above(0).toArray()
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('test-uuid-1234')
  })

  it('domain is a queryable index', async () => {
    await db.entries.add(sampleEntry)
    const results = await db.entries.where('domain').equals('media').toArray()
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Test Book')
  })
})

describe('v2 schema: settings store', () => {
  it('put and get round-trips a setting', async () => {
    await db.settings.put({ key: 'theme', value: 'dark' })
    const result = await db.settings.get('theme')
    expect(result).toEqual({ key: 'theme', value: 'dark' })
  })

  it('put overwrites an existing setting (upsert)', async () => {
    await db.settings.put({ key: 'theme', value: 'dark' })
    await db.settings.put({ key: 'theme', value: 'light' })
    const result = await db.settings.get('theme')
    expect(result?.value).toBe('light')
  })
})

describe('v2 schema: counter store still works after upgrade', () => {
  it('counter store survives the version(2) upgrade', async () => {
    await db.counter.put({ id: 1, value: 42 })
    const row = await db.counter.get(1)
    expect(row?.value).toBe(42)
  })
})

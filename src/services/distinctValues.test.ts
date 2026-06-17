import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { entriesRepository } from './entriesRepository'
import type { LifeLogEntry } from './db'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

function make(overrides?: Partial<Omit<LifeLogEntry, 'id'>>): Omit<LifeLogEntry, 'id'> {
  return {
    domain: 'expenditures',
    type: 'expense',
    title: 'x',
    recordedAt: 1700000000000,
    tags: [],
    metadata: {},
    syncedAt: null,
    ...overrides,
  }
}

describe('entriesRepository.listDistinctValues (DATA-01)', () => {
  it('ranks metadata values by frequency, ties alphabetical', async () => {
    await entriesRepository.create(make({ metadata: { category: 'food' } }))
    await entriesRepository.create(make({ metadata: { category: 'food' } }))
    await entriesRepository.create(make({ metadata: { category: 'fuel' } }))
    await entriesRepository.create(make({ metadata: { category: 'coffee' } }))

    const result = await entriesRepository.listDistinctValues('category')
    expect(result).toEqual([
      { value: 'food', count: 2 },
      { value: 'coffee', count: 1 },
      { value: 'fuel', count: 1 },
    ])
  })

  it('case-insensitive prefix filter, case-insensitive on the matched value', async () => {
    await entriesRepository.create(make({ metadata: { category: 'Food' } }))
    await entriesRepository.create(make({ metadata: { category: 'food' } }))
    await entriesRepository.create(make({ metadata: { category: 'Fuel' } }))
    await entriesRepository.create(make({ metadata: { category: 'coffee' } }))

    const result = await entriesRepository.listDistinctValues('category', 'fo')
    // 'Food' and 'food' collapse to one case-insensitive bucket (count 2).
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(2)
    expect(result[0].value.toLowerCase()).toBe('food')
  })

  it('counts each tag in the tags array individually', async () => {
    await entriesRepository.create(make({ tags: ['travel', 'work'] }))
    await entriesRepository.create(make({ tags: ['travel'] }))
    const result = await entriesRepository.listDistinctValues('tags')
    expect(result).toEqual([
      { value: 'travel', count: 2 },
      { value: 'work', count: 1 },
    ])
  })

  it('reads merchant from metadata and skips non-string / empty values', async () => {
    await entriesRepository.create(make({ metadata: { merchant: 'Blue Bottle' } }))
    await entriesRepository.create(make({ metadata: { merchant: '  ' } }))
    await entriesRepository.create(make({ metadata: { merchant: 42 } }))
    const result = await entriesRepository.listDistinctValues('merchant')
    expect(result).toEqual([{ value: 'Blue Bottle', count: 1 }])
  })

  it('returns empty array when no entries match', async () => {
    expect(await entriesRepository.listDistinctValues('category')).toEqual([])
    await entriesRepository.create(make({ metadata: { category: 'food' } }))
    expect(await entriesRepository.listDistinctValues('category', 'zzz')).toEqual([])
  })
})

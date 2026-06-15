import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'

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

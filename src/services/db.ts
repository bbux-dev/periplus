import Dexie, { type EntityTable } from 'dexie'

interface Counter {
  id: number    // fixed: always 1
  value: number
}

class LifeLogDB extends Dexie {
  counter!: EntityTable<Counter, 'id'>

  constructor() {
    super('LifeLogDB')
    this.version(1).stores({
      counter: 'id',  // plain key, NOT ++id (no auto-increment; we own the key)
    })
  }
}

export const db = new LifeLogDB()

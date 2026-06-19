import Dexie, { type EntityTable } from 'dexie'

// ─── Domain types (DATA-01) ──────────────────────────────────────────────────

export type EntryDomain = 'media' | 'trips' | 'expenditures'

export type EntryType =
  | 'show'      // media
  | 'movie'     // media
  | 'book'      // media
  | 'podcast'   // media
  | 'place'     // trips legacy (kept for data compat)
  | 'event'     // trips legacy (kept for data compat)
  | 'expense'   // trips + expenditures
  | 'trip'      // NEW: trip record
  | 'activity'  // NEW: hike/show/restaurant/cafe/other

export interface LifeLogEntry {
  id: string                          // UUID; provided by entriesRepository.create()
  domain: EntryDomain                 // indexed; used for category filtering
  type: EntryType                     // discriminant; not indexed in Phase 2
  title: string
  description?: string
  occurredAt?: number                 // epoch ms; optional (event time, may be unknown)
  recordedAt: number                  // epoch ms; indexed; when entry was captured (always present)
  sourceUrl?: string                  // original URL for URL-captured entries
  amount?: number                     // expense amount
  location?: string
  tags: string[]                      // string array; NOT indexed in Phase 2
  metadata: Record<string, unknown>   // opaque bag for extraction data; NOT indexed
  syncedAt: number | null             // null = not yet synced; NOT indexed (IDB cannot index null)
}

// ─── Internal types ──────────────────────────────────────────────────────────

interface Counter {
  id: number    // fixed: always 1
  value: number
}

interface Setting {
  key: string
  value: unknown
}

// ─── Database class ──────────────────────────────────────────────────────────

class LifeLogDB extends Dexie {
  counter!: EntityTable<Counter, 'id'>
  entries!: EntityTable<LifeLogEntry, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('LifeLogDB')

    // Phase 1: counter store — DO NOT modify this block (version is persisted in IDB)
    this.version(1).stores({
      counter: 'id',  // plain key, NOT ++id (no auto-increment; we own the key)
    })

    // Phase 2: additive upgrade — add entries + settings; counter is preserved automatically
    // Index string: &id = unique primary key; recordedAt + domain = secondary indexes
    // syncedAt/tags/metadata are intentionally NOT indexed (IDB cannot index null; defer arrays)
    this.version(2).stores({
      entries: '&id, recordedAt, domain',
      settings: 'key',
    })
  }
}

export const db = new LifeLogDB()

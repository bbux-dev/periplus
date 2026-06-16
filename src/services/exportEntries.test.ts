import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildExportJson } from './exportEntries'
import type { LifeLogEntry, ExportEnvelope } from './exportEntries'

// ─── buildExportJson (pure — no mocks needed) ────────────────────────────────

describe('buildExportJson', () => {
  it('returns valid JSON with version=1, correct exportedAt, and all entries', () => {
    const entries = [
      {
        id: 'abc',
        domain: 'media',
        type: 'book',
        title: 'Test Book',
        recordedAt: 1000,
        tags: [],
        metadata: {},
        syncedAt: null,
      },
    ] as LifeLogEntry[]
    const exportedAt = 1700000000000
    const json = buildExportJson(entries, exportedAt)
    const parsed = JSON.parse(json) as ExportEnvelope
    expect(parsed.version).toBe(1)
    expect(parsed.exportedAt).toBe(exportedAt)
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.entries[0].id).toBe('abc')
  })

  it('builds correct JSON for an empty entries array', () => {
    const json = buildExportJson([], 999)
    const parsed = JSON.parse(json) as ExportEnvelope
    expect(parsed.entries).toEqual([])
    expect(parsed.version).toBe(1)
  })

  it('is deterministic — same inputs produce identical output', () => {
    const entries = [
      {
        id: 'xyz',
        domain: 'expenditures',
        type: 'expense',
        title: 'Coffee',
        recordedAt: 2000,
        tags: ['food'],
        metadata: { shop: 'Starbucks' },
        syncedAt: null,
      },
    ] as LifeLogEntry[]
    const json1 = buildExportJson(entries, 12345)
    const json2 = buildExportJson(entries, 12345)
    expect(json1).toBe(json2)
  })
})

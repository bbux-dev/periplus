import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildExportJson, triggerDownload } from './exportEntries'
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

// ─── triggerDownload (side-effectful shim — mocked in jsdom) ─────────────────

describe('triggerDownload', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls URL.createObjectURL with a Blob, clicks anchor, and revokes the URL', () => {
    const fakeUrl = 'blob:fake-url'
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(fakeUrl)
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    triggerDownload('{"version":1}')

    expect(createSpy).toHaveBeenCalledOnce()
    expect(createSpy).toHaveBeenCalledWith(expect.any(Blob))
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(revokeSpy).toHaveBeenCalledWith(fakeUrl)
  })

  it('sets the download attribute to the filename and href to the blob URL', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    let capturedAnchor: HTMLAnchorElement | null = null
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      capturedAnchor = this
    })

    triggerDownload('{}', 'my-log.json')

    expect(capturedAnchor).not.toBeNull()
    expect(capturedAnchor!.download).toBe('my-log.json')
    expect(capturedAnchor!.href).toContain('blob:x')
  })

  it('revokes the blob URL even when the anchor click throws', () => {
    const fakeUrl = 'blob:throw-url'
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(fakeUrl)
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('click intercepted')
    })

    expect(() => triggerDownload('{"version":1}')).toThrow('click intercepted')
    expect(revokeSpy).toHaveBeenCalledWith(fakeUrl)
  })
})

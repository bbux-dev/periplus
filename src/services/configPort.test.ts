import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { buildConfigExportJson, importConfig } from './configPort'
import type { ConfigExportEnvelope, ImportResult } from './configPort'
import { DEFAULT_SHORTCUT_CONFIG } from '../config/shortcutConfig'
import type { ShortcutConfig } from '../config/shortcutConfig'
import { db } from './db'
import { configRepository } from './configRepository'

// ─── buildConfigExportJson (pure — no mocks needed) ──────────────────────────

describe('buildConfigExportJson', () => {
  it('returns valid JSON with version=1, correct exportedAt, and the config', () => {
    const exportedAt = 1718600000000
    const json = buildConfigExportJson(DEFAULT_SHORTCUT_CONFIG, exportedAt)
    const parsed = JSON.parse(json) as ConfigExportEnvelope
    expect(parsed.version).toBe(1)
    expect(parsed.exportedAt).toBe(exportedAt)
    expect(parsed.config).toEqual(DEFAULT_SHORTCUT_CONFIG)
  })

  it('is deterministic — same inputs produce byte-identical output', () => {
    const exportedAt = 1718600000000
    const json1 = buildConfigExportJson(DEFAULT_SHORTCUT_CONFIG, exportedAt)
    const json2 = buildConfigExportJson(DEFAULT_SHORTCUT_CONFIG, exportedAt)
    expect(json1).toBe(json2)
  })

  it('does NOT read the clock — exportedAt comes only from the argument', () => {
    const dateSpy = vi.spyOn(Date, 'now')
    buildConfigExportJson(DEFAULT_SHORTCUT_CONFIG, 42)
    expect(dateSpy).not.toHaveBeenCalled()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
})

// ─── importConfig (parse → migrate → put, wholesale reject) ──────────────────

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it
beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** Construct a File object for a valid/invalid config — jsdom supports new File([...], name) */
function makeConfigFile(config: unknown): File {
  const json = JSON.stringify(config)
  return new File([json], 'shortcuts.json', { type: 'application/json' })
}

describe('importConfig', () => {
  it('Test 1 (valid): returns { ok: true } and persists the config', async () => {
    const file = makeConfigFile(DEFAULT_SHORTCUT_CONFIG)
    const result = await importConfig(file)
    expect(result).toEqual({ ok: true })
    const stored = await configRepository.get()
    expect(stored).toEqual(DEFAULT_SHORTCUT_CONFIG)
  })

  it('Test 2 (malformed JSON): returns { ok: false, reason } and writes nothing', async () => {
    const file = new File(['{ not json'], 'shortcuts.json', { type: 'application/json' })
    const result: ImportResult = await importConfig(file)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBeTruthy()
    }
    const stored = await configRepository.get()
    expect(stored).toBeUndefined()
  })

  it('Test 3 (structurally invalid): returns { ok: false, reason } with validator message; nothing written', async () => {
    const file = makeConfigFile({ version: 1, layouts: 'nope' })
    const result: ImportResult = await importConfig(file)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('"layouts" must be an array')
    }
    const stored = await configRepository.get()
    expect(stored).toBeUndefined()
  })

  it('Test 4 (newer version): returns { ok: false, reason } mentioning newer app version; nothing written', async () => {
    const file = makeConfigFile({ version: 999, layouts: [] })
    const result: ImportResult = await importConfig(file)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/newer/i)
    }
    const stored = await configRepository.get()
    expect(stored).toBeUndefined()
  })

  it('Test 5 (older/migration path): a valid v1 config flows through migrateConfig and is applied', async () => {
    // For v1 (current version), migration chain is a no-op — but the seam IS exercised.
    // Pass a valid v1 config and assert it round-trips successfully.
    const v1Config: ShortcutConfig = {
      version: 1,
      layouts: [
        {
          name: 'TestLayout',
          shortcuts: [
            { name: 'Test', dslTemplate: 'expense 5:coffee', confirm: false },
          ],
        },
      ],
    }
    const file = makeConfigFile(v1Config)
    const result: ImportResult = await importConfig(file)
    expect(result).toEqual({ ok: true })
    const stored = await configRepository.get()
    expect(stored).toEqual(v1Config)
  })

  it('Test 6 (no partial apply): configRepository.put is never called on { ok: false }', async () => {
    const putSpy = vi.spyOn(configRepository, 'put')
    const file = new File(['{ not json'], 'shortcuts.json', { type: 'application/json' })
    const result = await importConfig(file)
    expect(result.ok).toBe(false)
    expect(putSpy).not.toHaveBeenCalled()
  })

  it('Test 7 (round-trip): buildConfigExportJson output re-imports successfully', async () => {
    // Regression for the v0.3.0 milestone-audit BLOCKER: export wraps the config
    // in an envelope; importConfig must unwrap it so the round-trip works.
    const json = buildConfigExportJson(DEFAULT_SHORTCUT_CONFIG, 1718600000000)
    const file = new File([json], 'life-log-shortcuts.json', { type: 'application/json' })
    const result = await importConfig(file)
    expect(result).toEqual({ ok: true })
    expect(await configRepository.get()).toEqual(DEFAULT_SHORTCUT_CONFIG)
  })
})

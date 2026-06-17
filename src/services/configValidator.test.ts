import { describe, it, expect } from 'vitest'
import {
  validateShortcutConfig,
  migrateConfig,
  CURRENT_CONFIG_VERSION,
} from './configValidator'
import type { ShortcutConfig } from '../config/shortcutConfig'

// ─── Test fixture factory ─────────────────────────────────────────────────────

function makeValidConfig(overrides?: Partial<ShortcutConfig>): ShortcutConfig {
  return {
    version: 1,
    layouts: [],
    ...overrides,
  }
}

function makeFullConfig(): ShortcutConfig {
  return {
    version: 1,
    layouts: [
      {
        name: 'DayToDay',
        icon: 'HomeIcon',
        shortcuts: [
          {
            name: 'Log expense',
            icon: 'BanknotesIcon',
            dslTemplate: 'expense _:food',
            confirm: false,
          },
          {
            name: 'Log book',
            dslTemplate: 'book _:_',
            confirm: true,
          },
        ],
      },
    ],
  }
}

// ─── validateShortcutConfig ───────────────────────────────────────────────────

describe('validateShortcutConfig', () => {
  it('accepts a minimal valid v1 config ({ version: 1, layouts: [] })', () => {
    const result = validateShortcutConfig(makeValidConfig())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.config.version).toBe(1)
      expect(result.config.layouts).toEqual([])
    }
  })

  it('accepts a fully-populated config (layouts with name+icon, shortcuts with all fields)', () => {
    const result = validateShortcutConfig(makeFullConfig())
    expect(result.ok).toBe(true)
  })

  it('rejects null with a reason mentioning "object"', () => {
    const result = validateShortcutConfig(null)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason.toLowerCase()).toContain('object')
    }
  })

  it('rejects an array with a reason mentioning "object"', () => {
    const result = validateShortcutConfig([])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason.toLowerCase()).toContain('object')
    }
  })

  it('rejects a string with a reason mentioning "object"', () => {
    const result = validateShortcutConfig('bad')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason.toLowerCase()).toContain('object')
    }
  })

  it('rejects a number with a reason mentioning "object"', () => {
    const result = validateShortcutConfig(42)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason.toLowerCase()).toContain('object')
    }
  })

  it('rejects version !== 1 with a version-specific reason', () => {
    const result = validateShortcutConfig({ version: 2, layouts: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/version/i)
    }
  })

  it('rejects missing layouts with a reason about layouts', () => {
    const result = validateShortcutConfig({ version: 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/layouts/i)
    }
  })

  it('rejects non-array layouts with a reason about layouts', () => {
    const result = validateShortcutConfig({ version: 1, layouts: 'bad' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/layouts/i)
    }
  })

  it('rejects a layout with empty/whitespace name — reason path "layouts[0].name"', () => {
    const result = validateShortcutConfig({
      version: 1,
      layouts: [{ name: '   ', shortcuts: [] }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('layouts[0].name')
    }
  })

  it('rejects a layout icon that is present but non-string', () => {
    const result = validateShortcutConfig({
      version: 1,
      layouts: [{ name: 'MyLayout', icon: 42, shortcuts: [] }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('layouts[0].icon')
    }
  })

  it('rejects a shortcut with empty dslTemplate — reason path "layouts[0].shortcuts[0].dslTemplate"', () => {
    const result = validateShortcutConfig({
      version: 1,
      layouts: [
        {
          name: 'MyLayout',
          shortcuts: [{ name: 'Shortcut', dslTemplate: '', confirm: false }],
        },
      ],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('layouts[0].shortcuts[0].dslTemplate')
    }
  })

  it('rejects a shortcut with non-boolean confirm', () => {
    const result = validateShortcutConfig({
      version: 1,
      layouts: [
        {
          name: 'MyLayout',
          shortcuts: [{ name: 'Shortcut', dslTemplate: 'book _', confirm: 'yes' }],
        },
      ],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('layouts[0].shortcuts[0].confirm')
    }
  })

  it('ACCEPTS an unknown icon string — lenient on icons (structural only)', () => {
    const result = validateShortcutConfig({
      version: 1,
      layouts: [
        {
          name: 'MyLayout',
          icon: 'UnknownIcon',
          shortcuts: [
            { name: 'Shortcut', icon: 'AlsoUnknownIcon', dslTemplate: 'book _', confirm: false },
          ],
        },
      ],
    })
    expect(result.ok).toBe(true)
  })

  it('reason is always a non-empty human-readable string on { ok: false }', () => {
    const cases: unknown[] = [
      null, 42, [], 'string',
      { version: 2, layouts: [] },
      { version: 1, layouts: [{ name: '', shortcuts: [] }] },
    ]
    for (const c of cases) {
      const result = validateShortcutConfig(c)
      if (!result.ok) {
        expect(typeof result.reason).toBe('string')
        expect(result.reason.length).toBeGreaterThan(0)
      }
    }
  })
})

// ─── migrateConfig ────────────────────────────────────────────────────────────

describe('migrateConfig', () => {
  it('CURRENT_CONFIG_VERSION is 1', () => {
    expect(CURRENT_CONFIG_VERSION).toBe(1)
  })

  it('delegates version 1 to validateShortcutConfig — valid v1 → { ok: true }', () => {
    const result = migrateConfig(makeValidConfig())
    expect(result.ok).toBe(true)
  })

  it('version > CURRENT_CONFIG_VERSION → { ok: false } with "update" or "newer" message', () => {
    const result = migrateConfig({ version: 99, layouts: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason.toLowerCase()).toMatch(/update|newer/)
    }
  })

  it('non-integer version string "1" → { ok: false } mentioning integer', () => {
    const result = migrateConfig({ version: '1', layouts: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason.toLowerCase()).toContain('integer')
    }
  })

  it('non-integer version 1.5 → { ok: false } mentioning integer', () => {
    const result = migrateConfig({ version: 1.5, layouts: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason.toLowerCase()).toContain('integer')
    }
  })

  it('rejects non-object input', () => {
    const result = migrateConfig(null)
    expect(result.ok).toBe(false)
  })

  it('migration-seam test: v1 passes straight through the (empty) chain to validateShortcutConfig', () => {
    // This exercises the migration seam even though it is a no-op for v1.
    // Future vN→vN+1 migration steps will insert before the final validateShortcutConfig call.
    const config = makeFullConfig()
    const result = migrateConfig(config)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.config).toEqual(config)
    }
  })
})

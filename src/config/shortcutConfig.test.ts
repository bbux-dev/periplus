import { describe, it, expect } from 'vitest'
import {
  resolveShortcutIcon,
  SHORTCUT_ICON_MAP,
  DEFAULT_SHORTCUT_ICON,
} from './shortcutConfig'
import { BanknotesIcon, BoltIcon } from '@heroicons/react/24/outline'

// ─── DEFAULT_SHORTCUT_ICON ────────────────────────────────────────────────────

describe('DEFAULT_SHORTCUT_ICON', () => {
  it('is BoltIcon (identity assertion)', () => {
    expect(DEFAULT_SHORTCUT_ICON).toBe(BoltIcon)
  })
})

// ─── SHORTCUT_ICON_MAP ────────────────────────────────────────────────────────

describe('SHORTCUT_ICON_MAP', () => {
  it('contains BoltIcon under key "BoltIcon"', () => {
    expect(SHORTCUT_ICON_MAP['BoltIcon']).toBe(BoltIcon)
  })

  it('every map value is a React component (function or forwardRef object)', () => {
    for (const [key, value] of Object.entries(SHORTCUT_ICON_MAP)) {
      const t = typeof value
      expect(
        t === 'function' || (t === 'object' && value !== null),
        `SHORTCUT_ICON_MAP["${key}"] is not a React component (got ${t})`,
      ).toBe(true)
    }
  })

  it('contains at least 21 entries (full curated allow-list)', () => {
    expect(Object.keys(SHORTCUT_ICON_MAP).length).toBeGreaterThanOrEqual(21)
  })
})

// ─── resolveShortcutIcon ──────────────────────────────────────────────────────

describe('resolveShortcutIcon', () => {
  it('returns the BanknotesIcon component for "BanknotesIcon"', () => {
    expect(resolveShortcutIcon('BanknotesIcon')).toBe(BanknotesIcon)
  })

  it('returns DEFAULT_SHORTCUT_ICON for an unknown key', () => {
    expect(resolveShortcutIcon('UnknownIcon')).toBe(DEFAULT_SHORTCUT_ICON)
  })

  it('returns DEFAULT_SHORTCUT_ICON for undefined', () => {
    expect(resolveShortcutIcon(undefined)).toBe(DEFAULT_SHORTCUT_ICON)
  })

  it('returns DEFAULT_SHORTCUT_ICON for an empty string', () => {
    expect(resolveShortcutIcon('')).toBe(DEFAULT_SHORTCUT_ICON)
  })

  it('never throws for any input', () => {
    expect(() => resolveShortcutIcon('anything')).not.toThrow()
    expect(() => resolveShortcutIcon(undefined)).not.toThrow()
    expect(() => resolveShortcutIcon('')).not.toThrow()
  })
})

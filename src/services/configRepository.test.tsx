import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { configRepository, useShortcutConfig } from './configRepository'
import type { ShortcutConfig } from '../config/shortcutConfig'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it

beforeEach(async () => {
  await db.delete()
  await db.open()
})

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
            dslTemplate: 'expense 12.50:food',
            confirm: false,
          },
        ],
      },
    ],
  }
}

// ─── configRepository: get and put ───────────────────────────────────────────

describe('configRepository: get', () => {
  it('returns undefined before any write', async () => {
    const result = await configRepository.get()
    expect(result).toBeUndefined()
  })
})

describe('configRepository: put and get round-trip', () => {
  it('put stores config and get returns it deep-equal (lossless round-trip)', async () => {
    const config = makeValidConfig()
    await configRepository.put(config)
    const result = await configRepository.get()
    expect(result).toEqual(config)
  })

  it('round-trip result is typed as ShortcutConfig (version: 1)', async () => {
    await configRepository.put(makeValidConfig())
    const result = await configRepository.get()
    expect(result?.version).toBe(1)
  })

  it('put is an upsert — second put with a different config replaces the first', async () => {
    const first = makeValidConfig({ layouts: [] })
    const second = makeFullConfig()
    await configRepository.put(first)
    await configRepository.put(second)
    const result = await configRepository.get()
    expect(result).toEqual(second)
  })

  it('a populated config (layouts with shortcuts) round-trips with no data loss', async () => {
    const config = makeFullConfig()
    await configRepository.put(config)
    const result = await configRepository.get()
    expect(result).toEqual(config)
  })
})

// ─── useShortcutConfig reactive hook ─────────────────────────────────────────

function ConfigTest() {
  const config = useShortcutConfig()
  if (config === undefined) return <p>Loading</p>
  return <p>{config.layouts.length} layouts</p>
}

describe('useShortcutConfig reactive hook', () => {
  it('returns undefined before a config is saved (renders the loading branch)', async () => {
    render(<ConfigTest />)
    expect(await screen.findByText('Loading')).toBeInTheDocument()
  })

  it('re-renders reactively after configRepository.put() is called inside act()', async () => {
    render(<ConfigTest />)
    await screen.findByText('Loading')
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    expect(await screen.findByText('0 layouts')).toBeInTheDocument()
  })

  it('re-renders with the correct layout count after put() with a populated config', async () => {
    render(<ConfigTest />)
    await screen.findByText('Loading')
    await act(async () => {
      await configRepository.put(makeFullConfig())
    })
    expect(await screen.findByText('1 layouts')).toBeInTheDocument()
  })
})

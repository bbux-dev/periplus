import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from './db'
import {
  activeModeRepository,
  useActiveMode,
  defaultInstanceLabel,
  activateMode,
} from './activeMode'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it

beforeEach(async () => {
  await db.delete()
  await db.open()
})

// ─── activeModeRepository: get and put ────────────────────────────────────────

describe('activeModeRepository: get', () => {
  it('returns undefined before any write', async () => {
    expect(await activeModeRepository.get()).toBeUndefined()
  })
})

describe('activeModeRepository: put and get round-trip', () => {
  it('stores an ActiveMode and returns it deep-equal', async () => {
    const active = { mode: 'Travel', label: 'Oregon' }
    await activeModeRepository.put(active)
    expect(await activeModeRepository.get()).toEqual(active)
  })

  it('put is an upsert — second put overwrites the first', async () => {
    await activeModeRepository.put({ mode: 'DayToDay', label: 'a' })
    await activeModeRepository.put({ mode: 'Travel', label: 'b' })
    expect(await activeModeRepository.get()).toEqual({ mode: 'Travel', label: 'b' })
  })
})

// ─── defaultInstanceLabel ─────────────────────────────────────────────────────

describe('defaultInstanceLabel', () => {
  it('formats as <Mode>-<Mon>-<Year> (short month, full year)', () => {
    expect(defaultInstanceLabel('Travel', new Date('2026-06-18T12:00:00'))).toBe(
      'Travel-Jun-2026',
    )
  })

  it('uses the provided mode name verbatim', () => {
    expect(defaultInstanceLabel('WorkTrip', new Date('2026-01-02T09:00:00'))).toBe(
      'WorkTrip-Jan-2026',
    )
  })

  it('defaults to the current date when no Date is passed (faked Date)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-18T14:00:00'))
    try {
      expect(defaultInstanceLabel('Travel')).toBe('Travel-Jun-2026')
    } finally {
      vi.useRealTimers()
    }
  })
})

// ─── activateMode ─────────────────────────────────────────────────────────────

describe('activateMode', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('persists the default label when none is given', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-18T14:00:00'))
    await activateMode('Travel')
    expect(await activeModeRepository.get()).toEqual({
      mode: 'Travel',
      label: 'Travel-Jun-2026',
    })
  })

  it('persists an explicit label verbatim', async () => {
    await activateMode('Travel', 'Oregon')
    expect(await activeModeRepository.get()).toEqual({ mode: 'Travel', label: 'Oregon' })
  })

  it('treats a blank/whitespace label as absent → default label', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-18T14:00:00'))
    await activateMode('Travel', '   ')
    expect(await activeModeRepository.get()).toEqual({
      mode: 'Travel',
      label: 'Travel-Jun-2026',
    })
  })

  it('trims a provided label', async () => {
    await activateMode('Travel', '  Oregon  ')
    expect(await activeModeRepository.get()).toEqual({ mode: 'Travel', label: 'Oregon' })
  })

  it('persists tripId when a 3rd param is provided (ENG-02)', async () => {
    await activateMode('trip', 'Paris', 'uuid-1')
    const stored = await activeModeRepository.get()
    expect(stored?.tripId).toBe('uuid-1')
    expect(stored?.mode).toBe('trip')
    expect(stored?.label).toBe('Paris')
  })

  it('does NOT persist tripId when 2-arg caller omits it (ENG-02)', async () => {
    await activateMode('Travel', 'Oregon')
    const stored = await activeModeRepository.get()
    expect('tripId' in (stored ?? {})).toBe(false)
  })
})

// ─── useActiveMode reactive hook ──────────────────────────────────────────────

function ActiveModeTest() {
  const active = useActiveMode()
  if (active === undefined) return <p>Loading</p>
  return <p>{active.mode}:{active.label}</p>
}

describe('useActiveMode reactive hook', () => {
  it('returns undefined before any write (renders the loading branch)', async () => {
    render(<ActiveModeTest />)
    expect(await screen.findByText('Loading')).toBeInTheDocument()
  })

  it('re-renders reactively after activeModeRepository.put() inside act()', async () => {
    render(<ActiveModeTest />)
    await screen.findByText('Loading')
    await act(async () => {
      await activeModeRepository.put({ mode: 'Travel', label: 'Oregon' })
    })
    expect(await screen.findByText('Travel:Oregon')).toBeInTheDocument()
  })

  it('re-renders with the new value after a second put() (upsert)', async () => {
    render(<ActiveModeTest />)
    await screen.findByText('Loading')
    await act(async () => {
      await activeModeRepository.put({ mode: 'DayToDay', label: 'a' })
    })
    await screen.findByText('DayToDay:a')
    await act(async () => {
      await activeModeRepository.put({ mode: 'WorkTrip', label: 'b' })
    })
    expect(await screen.findByText('WorkTrip:b')).toBeInTheDocument()
  })
})

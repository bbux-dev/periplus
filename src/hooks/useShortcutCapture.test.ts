/**
 * useShortcutCapture — decision-tree unit tests (RED phase)
 *
 * Uses vi.mock to replace useNavigate so tests have no router-context dependency.
 * Fake-indexeddb is auto-imported via test-setup.ts; db is reset in beforeEach.
 * Fake timers cover the 4-second auto-dismiss path.
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { entriesRepository } from '../services/entriesRepository'
import { activeModeRepository } from '../services/activeMode'
import { useShortcutCapture } from './useShortcutCapture'
import type { Shortcut } from '../config/shortcutConfig'

// ── Navigate mock ─────────────────────────────────────────────────────────────
// Hoisted by Vitest before imports resolve — replaces useNavigate for the hook.

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

// ── Test shortcuts ────────────────────────────────────────────────────────────

const coffeeShortcut: Shortcut = {
  name: 'Coffee',
  dslTemplate: 'expense 5:coffee',
  confirm: false,
}

const groceriesShortcut: Shortcut = {
  name: 'Groceries',
  dslTemplate: 'expense :groceries',
  confirm: false,
}

const movieShortcut: Shortcut = {
  name: 'New Movie',
  dslTemplate: 'movie :',
  confirm: true,
}

/** Empty template — parseDSL will return status 'error' with no type */
const badShortcut: Shortcut = {
  name: 'Bad',
  dslTemplate: '',
  confirm: false,
}

/** Named-hole: amount + category pre-filled, merchant='{}'  */
const merchantHole: Shortcut = {
  name: 'Merchant',
  dslTemplate: 'expense 5:food?merchant={}',
  confirm: false,
}

/** Zero-hole confirm:false whose template explicitly specifies a date (date= alias) */
const datedShortcut: Shortcut = {
  name: 'Dated',
  dslTemplate: 'expense 5:coffee?date=2024-01-15',
  confirm: false,
}

// ── Shared setup ─────────────────────────────────────────────────────────────

describe('useShortcutCapture', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    mockNavigate.mockClear()
  })

  // ── Bad template: silent no-op ────────────────────────────────────────────

  it('bad template is a silent no-op (no save, no navigate, no sheet)', async () => {
    const { result } = renderHook(() => useShortcutCapture())
    await act(async () => {
      await result.current.handleTap(badShortcut)
    })
    expect(result.current.toastEntryId).toBeNull()
    expect(result.current.sheetState).toBeNull()
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(await entriesRepository.list()).toHaveLength(0)
  })

  // ── confirm:true → navigate, no write ────────────────────────────────────

  it('confirm:true shortcut navigates to review without writing to IndexedDB', async () => {
    const { result } = renderHook(() => useShortcutCapture())
    await act(async () => {
      await result.current.handleTap(movieShortcut)
    })
    expect(mockNavigate).toHaveBeenCalledWith(
      '/d/media/movie/review',
      expect.objectContaining({
        state: expect.objectContaining({ draft: expect.anything() }),
      }),
    )
    expect(await entriesRepository.list()).toHaveLength(0)
    expect(result.current.toastEntryId).toBeNull()
    expect(result.current.sheetState).toBeNull()
  })

  // ── confirm:false + zero holes → direct save + toast ─────────────────────

  it('zero-hole confirm:false shortcut saves immediately and exposes toast id', async () => {
    const { result } = renderHook(() => useShortcutCapture())
    await act(async () => {
      await result.current.handleTap(coffeeShortcut)
    })
    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(1)
    expect(result.current.toastEntryId).toBe(entries[0].id)
    expect(result.current.sheetState).toBeNull()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  // ── confirm:false + holes → sheet open, no save ───────────────────────────

  it('holed confirm:false shortcut opens sheet without saving', async () => {
    const { result } = renderHook(() => useShortcutCapture())
    await act(async () => {
      await result.current.handleTap(groceriesShortcut)
    })
    expect(result.current.sheetState).not.toBeNull()
    expect(result.current.sheetState?.type).toBe('expense')
    expect(result.current.sheetState?.holeMap.positional).toContain('amount')
    expect(result.current.sheetState?.holeMap.hasHoles).toBe(true)
    expect(await entriesRepository.list()).toHaveLength(0)
    expect(result.current.toastEntryId).toBeNull()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  // ── handleSheetSave → merged save + toast ─────────────────────────────────

  it('handleSheetSave merges fills, persists entry, clears sheet, shows toast', async () => {
    const { result } = renderHook(() => useShortcutCapture())
    // Open the sheet
    await act(async () => {
      await result.current.handleTap(groceriesShortcut)
    })
    expect(result.current.sheetState).not.toBeNull()

    // Fill and save
    await act(async () => {
      await result.current.handleSheetSave({ amount: '25' })
    })
    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(1)
    expect(entries[0].amount).toBe(25)
    expect(result.current.sheetState).toBeNull()
    expect(result.current.toastEntryId).toBe(entries[0].id)
  })

  // ── handleUndo → delete entry, clear toast ────────────────────────────────

  it('handleUndo deletes the saved entry and clears the toast', async () => {
    const { result } = renderHook(() => useShortcutCapture())
    await act(async () => {
      await result.current.handleTap(coffeeShortcut)
    })
    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(1)
    const savedId = entries[0].id
    expect(result.current.toastEntryId).toBe(savedId)

    await act(async () => {
      await result.current.handleUndo()
    })
    expect(result.current.toastEntryId).toBeNull()
    expect(await entriesRepository.get(savedId)).toBeUndefined()
  })

  // ── {} named-hole → sheet with named holes ────────────────────────────────

  it('{} named-hole template opens sheet with merchant as named hole', async () => {
    const { result } = renderHook(() => useShortcutCapture())
    await act(async () => {
      await result.current.handleTap(merchantHole)
    })
    expect(result.current.sheetState).not.toBeNull()
    expect(result.current.sheetState?.holeMap.named).toContain('merchant')
    // amount=5 and category=food are filled → no positional holes
    expect(result.current.sheetState?.holeMap.positional).toHaveLength(0)
  })

  // ── DATE-01: one-tap paths default occurredAt to today ────────────────────
  //
  // Fake only Date (not setTimeout) so Dexie's timer-based scheduler still runs
  // and the direct-save await resolves; setSystemTime makes "today" deterministic.

  describe('DATE-01 default date on one-tap paths', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('confirm:false direct-save defaults occurredAt to today local-midnight when template has no date', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-06-18T14:00:00'))
      const { result } = renderHook(() => useShortcutCapture())
      await act(async () => {
        await result.current.handleTap(coffeeShortcut)
      })
      const entries = await entriesRepository.list()
      expect(entries).toHaveLength(1)
      expect(entries[0].occurredAt).toBe(Date.parse('2026-06-18T00:00:00'))
    })

    it('handleSheetSave defaults occurredAt to today local-midnight after merging fills', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-06-18T14:00:00'))
      const { result } = renderHook(() => useShortcutCapture())
      await act(async () => {
        await result.current.handleTap(groceriesShortcut)
      })
      await act(async () => {
        await result.current.handleSheetSave({ amount: '25' })
      })
      const entries = await entriesRepository.list()
      expect(entries).toHaveLength(1)
      expect(entries[0].amount).toBe(25)
      expect(entries[0].occurredAt).toBe(Date.parse('2026-06-18T00:00:00'))
    })

    it('a template that specifies a date keeps it (withDefaultOccurredAt leaves it untouched)', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-06-18T14:00:00'))
      const { result } = renderHook(() => useShortcutCapture())
      await act(async () => {
        await result.current.handleTap(datedShortcut)
      })
      const entries = await entriesRepository.list()
      expect(entries).toHaveLength(1)
      expect(entries[0].occurredAt).toBe(Date.parse('2024-01-15T00:00:00'))
    })

    it('confirm:true branch does NOT default the date in the hook (ReviewPage defaults it)', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-06-18T14:00:00'))
      const { result } = renderHook(() => useShortcutCapture())
      await act(async () => {
        await result.current.handleTap(movieShortcut)
      })
      expect(mockNavigate).toHaveBeenCalledTimes(1)
      const navState = mockNavigate.mock.calls[0][1] as { state: { draft: { occurredAt?: number } } }
      expect(navState.state.draft.occurredAt).toBeUndefined()
      expect(await entriesRepository.list()).toHaveLength(0)
    })
  })

  // ── STAMP-01: active-mode stamping on one-tap paths ───────────────────────

  describe('STAMP-01 active-mode stamping', () => {
    it('direct-save (confirm:false zero-hole) stamps metadata.mode/modeLabel when a mode is active', async () => {
      await activeModeRepository.put({ mode: 'Travel', label: 'Oregon' })
      const { result } = renderHook(() => useShortcutCapture())
      // Wait for the useActiveMode useLiveQuery to resolve: handleTap is a useCallback
      // with activeMode in its deps, so its reference changes once the mode loads.
      const initialTap = result.current.handleTap
      await waitFor(() => expect(result.current.handleTap).not.toBe(initialTap))
      await act(async () => {
        await result.current.handleTap(coffeeShortcut)
      })
      const entries = await entriesRepository.list()
      expect(entries).toHaveLength(1)
      expect(entries[0].metadata.mode).toBe('Travel')
      expect(entries[0].metadata.modeLabel).toBe('Oregon')
    })

    it('handleSheetSave stamps metadata.mode/modeLabel when a mode is active', async () => {
      await activeModeRepository.put({ mode: 'Travel', label: 'Oregon' })
      const { result } = renderHook(() => useShortcutCapture())
      // Wait for the useActiveMode useLiveQuery to resolve (handleSheetSave dep updates).
      const initialSave = result.current.handleSheetSave
      await waitFor(() => expect(result.current.handleSheetSave).not.toBe(initialSave))
      await act(async () => {
        await result.current.handleTap(groceriesShortcut)
      })
      await act(async () => {
        await result.current.handleSheetSave({ amount: '25' })
      })
      const entries = await entriesRepository.list()
      expect(entries).toHaveLength(1)
      expect(entries[0].metadata.mode).toBe('Travel')
      expect(entries[0].metadata.modeLabel).toBe('Oregon')
    })

    it('does NOT stamp mode/modeLabel when no mode is active (direct save)', async () => {
      const { result } = renderHook(() => useShortcutCapture())
      await act(async () => {
        await result.current.handleTap(coffeeShortcut)
      })
      const entries = await entriesRepository.list()
      expect(entries).toHaveLength(1)
      expect('mode' in entries[0].metadata).toBe(false)
      expect('modeLabel' in entries[0].metadata).toBe(false)
    })
  })

  // ── 4-second auto-dismiss ─────────────────────────────────────────────────
  //
  // Deviation [Rule 3 - Blocking]: Dexie uses setTimeout internally for its
  // promise scheduler. When vi.useFakeTimers() freezes setTimeout, awaiting
  // entriesRepository.create() hangs. Fix: mock create with mockResolvedValue
  // (pure microtask, not setTimeout) so the async chain completes while fake
  // timers are active. The mock is restored in afterEach.

  describe('toast auto-dismiss', () => {
    // Only fake setTimeout/clearTimeout so Dexie (uses setImmediate) and
    // React's scheduler (uses MessageChannel) continue to work.
    beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }))
    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    it('toast dismisses automatically after 4 seconds', async () => {
      // Mock create to resolve via microtask instead of Dexie's timer-based scheduler
      vi.spyOn(entriesRepository, 'create').mockResolvedValue({
        id: 'mock-timer-id',
        domain: 'expenditures',
        type: 'expense',
        title: 'Coffee',
        recordedAt: 0,
        tags: [],
        metadata: {},
        syncedAt: null,
        amount: 5,
      })

      const { result } = renderHook(() => useShortcutCapture())
      await act(async () => {
        await result.current.handleTap(coffeeShortcut)
      })
      expect(result.current.toastEntryId).toBe('mock-timer-id')
      act(() => {
        vi.advanceTimersByTime(4000)
      })
      expect(result.current.toastEntryId).toBeNull()
    })
  })
})

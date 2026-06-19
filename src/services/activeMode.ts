import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { ShortcutConfig } from '../config/shortcutConfig'

// ─── Active mode persistence (MODE-01, MODE-02) ───────────────────────────────
//
// Stores the active mode (a layout name) plus a free-text instance label in the
// same Dexie settings table under a dedicated key. No schema version bump — the
// settings table accepts arbitrary keys. Pattern mirrors activeLayoutRepository
// in configRepository.ts EXACTLY (undefined-loading semantics, no default value
// in useLiveQuery).
//
// "Mode" is the user-facing concept layered over the existing ShortcutConfig
// layouts — existing layouts ARE the modes. There is NO Layout→Mode rename.

/** A user-facing entry in the active-mode list: a layout name + an instance label. */
export interface ActiveMode {
  mode: string
  label: string
  tripId?: string   // NEW: the LifeLogEntry UUID of the active trip (ENG-02)
}

/** Fixed key under which the active mode is stored in the Dexie settings table. */
const ACTIVE_MODE_KEY = 'activeMode'

export const activeModeRepository = {
  /** Returns the persisted active mode, or undefined if none has been saved. */
  async get(): Promise<ActiveMode | undefined> {
    const row = await db.settings.get(ACTIVE_MODE_KEY)
    return row?.value as ActiveMode | undefined
  },

  /** Upserts the active mode. */
  async put(active: ActiveMode): Promise<void> {
    await db.settings.put({ key: ACTIVE_MODE_KEY, value: active })
  },
}

// ─── Reactive hook (MODE-02) ──────────────────────────────────────────────────

/**
 * Reactive hook: returns the persisted active mode, or undefined while Dexie is
 * opening or no mode has been activated yet.
 *
 * Callers MUST handle undefined — undefined means "loading or no mode active".
 * Do NOT provide a default value (same rule as useActiveLayoutName).
 *
 * @example
 *   const activeMode = useActiveMode()
 *   const entry = draftToEntry(draft, type, domain, activeMode)
 */
export function useActiveMode(): ActiveMode | undefined {
  return useLiveQuery(
    () => activeModeRepository.get(),
    [],
    // No default: undefined = Dexie opening or no mode activated
  )
}

// ─── Helpers (MODE-01, MODE-02) ───────────────────────────────────────────────

/**
 * Builds the default instance label for a mode: `<Mode>-<Mon>-<Year>`, e.g.
 * `Travel-Jun-2026`. Short month via toLocaleString('en-US', { month: 'short' }),
 * full numeric year.
 */
export function defaultInstanceLabel(mode: string, now: Date = new Date()): string {
  const month = now.toLocaleString('en-US', { month: 'short' })
  return `${mode}-${month}-${now.getFullYear()}`
}

/**
 * Activates a mode, persisting `{ mode, label }`. A blank/whitespace label (or
 * none) falls back to defaultInstanceLabel(mode); a provided label is trimmed.
 *
 * The optional `tripId` param (ENG-02) persists the trip UUID when activating a
 * trip mode. All existing two-arg callers remain unchanged and unaffected.
 */
export async function activateMode(
  mode: string,
  label?: string,
  tripId?: string,  // NEW optional param — all existing two-arg callers unchanged
): Promise<void> {
  const trimmed = label?.trim()
  await activeModeRepository.put({
    mode,
    label: trimmed || defaultInstanceLabel(mode),
    ...(tripId ? { tripId } : {}),
  })
}

/** Lists the available mode names — the layout names of the shortcut config, in order. */
export function listModes(config: ShortcutConfig): string[] {
  return config.layouts.map((l) => l.name)
}

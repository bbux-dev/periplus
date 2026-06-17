import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { ShortcutConfig } from '../config/shortcutConfig'

// ─── Repository (CFG-01) ──────────────────────────────────────────────────────
//
// All component access to the shortcut config goes through this module.
// Components MUST NOT import `db` directly — use configRepository or useShortcutConfig.

/** Fixed key under which the config is stored in the Dexie settings table. */
const CONFIG_KEY = 'shortcutConfig'

export const configRepository = {
  /**
   * Returns the stored config, or undefined if none has been saved yet.
   *
   * NOTE: returns the raw stored value cast to ShortcutConfig — NO runtime
   * validation on read. Treat the result as trusted only because every write
   * path (Phase 14 import) MUST run migrateConfig/validateShortcutConfig before
   * calling put(). Read-time re-validation would couple this data-only repository
   * to the validator and is deliberately deferred (see Phase 11 REVIEW WR-03).
   */
  async get(): Promise<ShortcutConfig | undefined> {
    const row = await db.settings.get(CONFIG_KEY)
    return row?.value as ShortcutConfig | undefined
  },

  /** Replaces (upserts) the entire config atomically. */
  async put(config: ShortcutConfig): Promise<void> {
    await db.settings.put({ key: CONFIG_KEY, value: config })
  },
}

// ─── Reactive hook (CFG-01) ───────────────────────────────────────────────────

/**
 * Reactive hook: returns the ShortcutConfig from Dexie, or undefined while
 * Dexie is opening or no config has been saved yet.
 *
 * Callers MUST handle `undefined` to distinguish "loading" from "no config saved".
 * Phase 12 (Dashboard seeding) writes a default config on first render if
 * useShortcutConfig() returns undefined after Dexie has opened.
 *
 * Do NOT provide a default value — losing the undefined loading state breaks
 * skeleton UI and causes Phase 12 to double-seed.
 *
 * @example
 *   const config = useShortcutConfig()
 *   if (config === undefined) return <p>Loading...</p>
 *   return <ul>{config.layouts.map(l => <li key={l.name}>{l.name}</li>)}</ul>
 */
export function useShortcutConfig(): ShortcutConfig | undefined {
  return useLiveQuery(
    () => configRepository.get(),
    [],
    // No default: undefined = Dexie opening or no config saved
  )
}

// ─── Active layout persistence (DASH-02) ──────────────────────────────────────
//
// Stores the active layout name in the same Dexie settings table under a
// separate key. No schema version bump required — db.settings accepts arbitrary
// keys. Pattern mirrors configRepository exactly.

const ACTIVE_LAYOUT_KEY = 'activeLayoutName'

export const activeLayoutRepository = {
  /** Returns the persisted active layout name, or undefined if none has been saved. */
  async get(): Promise<string | undefined> {
    const row = await db.settings.get(ACTIVE_LAYOUT_KEY)
    return row?.value as string | undefined
  },

  /** Upserts the active layout name. */
  async put(name: string): Promise<void> {
    await db.settings.put({ key: ACTIVE_LAYOUT_KEY, value: name })
  },
}

/**
 * Reactive hook: returns the persisted active layout name, or undefined while
 * Dexie is opening or no selection has been saved yet.
 *
 * Callers MUST handle undefined — fall back to the first layout in the config.
 * Do NOT provide a default value (same rule as useShortcutConfig).
 *
 * @example
 *   const persistedLayoutName = useActiveLayoutName()
 *   const activeLayout = layouts.find(l => l.name === persistedLayoutName) ?? layouts[0]
 */
export function useActiveLayoutName(): string | undefined {
  return useLiveQuery(
    () => activeLayoutRepository.get(),
    [],
    // No default: undefined = Dexie opening or no layout selection saved
  )
}

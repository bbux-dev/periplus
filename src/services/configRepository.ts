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

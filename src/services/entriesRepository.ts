import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { LifeLogEntry } from './db'

// ─── Repository (DATA-03, DATA-04) ───────────────────────────────────────────
//
// All component access to IndexedDB entries goes through this module.
// Components MUST NOT import `db` directly — use entriesRepository or useEntries.

export const entriesRepository = {
  /**
   * Creates a new LifeLogEntry, generating a UUID primary key.
   * Uses crypto.randomUUID() (not auto-increment) for sync-safety across devices (T-02-DATA-03).
   */
  async create(entry: Omit<LifeLogEntry, 'id'>): Promise<LifeLogEntry> {
    const id = crypto.randomUUID()
    const full: LifeLogEntry = { ...entry, id }
    await db.entries.add(full)
    return full
  },

  /** Returns the entry with the given id, or undefined if not found. */
  async get(id: string): Promise<LifeLogEntry | undefined> {
    return db.entries.get(id)
  },

  /** Returns all entries ordered by recordedAt descending (newest first). */
  async list(): Promise<LifeLogEntry[]> {
    return db.entries.orderBy('recordedAt').reverse().toArray()
  },

  /**
   * Returns entries where syncedAt is null (DATA-04 sync seam).
   *
   * Uses a full filter scan — NOT an index — because IndexedDB cannot index null values.
   * This is intentional and correct at local-app scale; see RESEARCH Anti-Patterns.
   */
  async listUnsynced(): Promise<LifeLogEntry[]> {
    return db.entries.filter((e) => e.syncedAt == null).toArray()
  },

  /**
   * Applies partial changes to an existing entry by id.
   * Returns the Dexie update count: 1 if the entry was found and updated,
   * 0 if the id did not exist (e.g. concurrent delete from another tab).
   * Callers should check the count when data integrity matters.
   */
  async update(id: string, changes: Partial<Omit<LifeLogEntry, 'id'>>): Promise<number> {
    return db.entries.update(id, changes)
  },

  /** Permanently removes the entry with the given id. */
  async delete(id: string): Promise<void> {
    await db.entries.delete(id)
  },
}

// ─── Reactive hooks (DATA-05) ────────────────────────────────────────────────

/**
 * Reactive hook for components: returns all entries ordered by recordedAt descending.
 *
 * Returns `undefined` while Dexie is opening (first render), then `LifeLogEntry[]`.
 * Callers MUST handle `undefined` to distinguish "loading" from "empty array".
 * Do NOT provide a default [] — losing the loading state breaks skeleton UI.
 *
 * @example
 *   const entries = useEntries()
 *   if (!entries) return <p>Loading...</p>
 *   return <ul>{entries.map(e => <li key={e.id}>{e.title}</li>)}</ul>
 */
export function useEntries(): LifeLogEntry[] | undefined {
  return useLiveQuery(
    () => db.entries.orderBy('recordedAt').reverse().toArray(),
    [],
    // No default value: callers distinguish undefined (loading) from [] (empty)
  )
}

/**
 * Reactive hook for a single entry by id. Returns a tri-state value:
 *
 * - `undefined` — Dexie is still opening (loading state; show a spinner/skeleton)
 * - `null`      — Dexie is open but no entry matches `id` (not found; show a guard)
 * - `LifeLogEntry` — entry found; render the full entry
 *
 * Callers MUST handle both `undefined` and `null` explicitly.
 * Do NOT default to null — losing the loading state breaks skeleton UI.
 *
 * The `.then(e => e ?? null)` transform converts Dexie's `undefined` (not-found)
 * to `null`, freeing `undefined` to mean "Dexie is still opening" exclusively.
 *
 * Any string id is safe to pass (including '' from a missing route param) —
 * Dexie returns undefined for a non-matching key, which becomes null here.
 *
 * @example
 *   const id = useParams<{ id: string }>().id ?? ''
 *   const entry = useEntry(id)
 *   if (entry === undefined) return <p>Loading...</p>
 *   if (entry === null) return <p>Entry not found.</p>
 *   return <h1>{entry.title}</h1>
 */
export function useEntry(id: string): LifeLogEntry | null | undefined {
  return useLiveQuery(
    () => db.entries.get(id).then((e) => e ?? null),
    [id],
    // No default value: callers distinguish undefined (loading) from null (not found)
  )
}

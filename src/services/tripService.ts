import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { LifeLogEntry } from './db'
import { activateMode } from './activeMode'
import { entriesRepository } from './entriesRepository'

// ─── Pure stat helpers (ENG-04) ───────────────────────────────────────────────
//
// These functions operate on in-memory LifeLogEntry[] and make ZERO Dexie calls.
// They are fully unit-testable without IndexedDB. See PITFALLS Pitfall 4 (float
// money) and Pitfall 6 (single-pass / no N+1).

/**
 * Sums the `amount` field of all `type === 'expense'` entries.
 *
 * Raw float returned — callers round via `Math.round(x * 100) / 100` before display.
 * (See PITFALLS Pitfall 4: floating-point money. No integer-cent storage in v0.5.0
 * to avoid a Dexie migration; rounding is the UI's responsibility.)
 */
export function tripExpenseTotal(entries: LifeLogEntry[]): number {
  return entries
    .filter((e) => e.type === 'expense')
    .reduce((acc, e) => acc + (e.amount ?? 0), 0)
}

/**
 * Groups expense amounts by `metadata.category`.
 * Non-string or missing category keys fall under `'Uncategorized'`.
 * Only `type === 'expense'` entries are counted.
 *
 * Mirrors the `bump()` string-guard in `entriesRepository.listDistinctValues`.
 */
export function tripExpensesByCategory(entries: LifeLogEntry[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const e of entries) {
    if (e.type !== 'expense') continue
    const cat =
      typeof e.metadata.category === 'string' ? e.metadata.category : 'Uncategorized'
    map.set(cat, (map.get(cat) ?? 0) + (e.amount ?? 0))
  }
  return map
}

/**
 * Returns the date range `{ start, end }` (epoch ms) across all entries with a
 * defined `occurredAt`. Returns `null` when `entries` is empty or no entry has
 * an `occurredAt` value.
 */
export function tripDateRange(
  entries: LifeLogEntry[],
): { start: number; end: number } | null {
  const dates = entries
    .map((e) => e.occurredAt)
    .filter((d): d is number => d != null)
  if (dates.length === 0) return null
  return { start: Math.min(...dates), end: Math.max(...dates) }
}

/**
 * Counts entries with `type === 'activity'`.
 */
export function tripActivityCount(entries: LifeLogEntry[]): number {
  return entries.filter((e) => e.type === 'activity').length
}

// ─── Async repository (ENG-04) ────────────────────────────────────────────────

/**
 * Creates a new `type='trip'` entry and immediately activates trip mode with the
 * entry's UUID as `tripId`. Two sequential writes: entriesRepository.create then
 * activateMode (both await before returning).
 *
 * Duplicate names are acceptable — the UUID (`entry.id`) is the stable join key.
 * A blank/whitespace name falls back to 'Untitled Trip'.
 */
export async function createAndActivateTrip(name: string): Promise<LifeLogEntry> {
  const entry = await entriesRepository.create({
    type: 'trip',
    domain: 'trips',
    title: name.trim() || 'Untitled Trip',
    recordedAt: Date.now(),
    tags: [],
    metadata: {},
    syncedAt: null,
  })
  await activateMode('trip', name, entry.id)
  return entry
}

/**
 * Returns all `type === 'trip'` entries, newest-first by `recordedAt`.
 * Uses the `domain` index to narrow the scan to the 'trips' domain, then
 * applies a client-side type filter and sorts by `recordedAt` descending.
 *
 * Note: `.reverse()` on a domain-indexed query orders by primary key (UUID),
 * not `recordedAt`. We use `orderBy('recordedAt').reverse()` to ensure
 * newest-first semantics (Rule 1: auto-fix correct ordering).
 */
export async function listTrips(): Promise<LifeLogEntry[]> {
  return db.entries
    .orderBy('recordedAt')
    .reverse()
    .filter((e) => e.domain === 'trips' && e.type === 'trip')
    .toArray()
}

/**
 * Returns all entries whose `metadata.tripId` matches the given `tripId`.
 * Single full-table filter scan — `metadata` is unindexed (no N+1 per-trip loop).
 * See PITFALLS Pitfall 6 (single-pass / no N+1). Correct at personal-app scale.
 */
export async function listTripEntries(tripId: string): Promise<LifeLogEntry[]> {
  return db.entries.filter((e) => e.metadata.tripId === tripId).toArray()
}

// ─── Reactive hooks (ENG-04) ──────────────────────────────────────────────────

/**
 * Reactive hook: returns all trip entries (`type === 'trip'`), newest-first.
 * Returns `undefined` while Dexie is opening (first render).
 * Callers MUST handle `undefined` to distinguish "loading" from "empty array".
 */
export function useTrips(): LifeLogEntry[] | undefined {
  return useLiveQuery(
    () => listTrips(),
    [],
    // No default value: undefined = Dexie opening (same rule as useEntries)
  )
}

/**
 * Reactive hook: returns entries for a specific trip (by `metadata.tripId`).
 * Returns `undefined` while Dexie is opening (first render).
 * `tripId` is in the dependency array so the query re-runs when it changes.
 */
export function useTripEntries(tripId: string): LifeLogEntry[] | undefined {
  return useLiveQuery(
    () => listTripEntries(tripId),
    [tripId],
    // tripId in dep array: query re-runs when tripId changes (PITFALLS integration gotcha)
  )
}

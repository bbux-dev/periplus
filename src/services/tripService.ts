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
 * Raw floats accumulated — callers round each value via `Math.round(x * 100) / 100`
 * before display (see PITFALLS Pitfall 4).
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
  return {
    start: dates.reduce((min, d) => (d < min ? d : min), dates[0]),
    end:   dates.reduce((max, d) => (d > max ? d : max), dates[0]),
  }
}

/**
 * Counts entries with `type === 'activity'`.
 */
export function tripActivityCount(entries: LifeLogEntry[]): number {
  return entries.filter((e) => e.type === 'activity').length
}

// ─── Single-pass trip summaries (PREV-01..04) ────────────────────────────────

/**
 * Per-trip summary derived from a single flat array of all entries.
 * Callers pass `db.entries.toArray()` output; this helper performs ZERO db calls.
 */
export interface TripSummary {
  trip: LifeLogEntry                            // the type='trip' record
  entries: LifeLogEntry[]                       // non-trip child entries for this trip
  total: number                                 // raw float from tripExpenseTotal
  dateRange: { start: number; end: number } | null
  activityCount: number
}

/**
 * Derives per-trip summaries from a single flat array of all entries.
 *
 * PURE — takes NO Dexie handle, makes ZERO db calls.
 * Callers own the single `db.entries.toArray()` pass (see PITFALLS Pitfall 6).
 *
 * Algorithm:
 *  1. Partition into trip records and child entries.
 *  2. Group child entries by metadata.tripId in ONE loop (Map accumulator).
 *     Entries whose metadata.tripId is not a string are silently skipped.
 *  3. For each trip record compute total/dateRange/activityCount from its slice.
 *  4. Sort newest-first by trip.recordedAt descending.
 */
export function summarizeTrips(allEntries: LifeLogEntry[]): TripSummary[] {
  // Step 1: separate trip records from child entries
  const tripRecords = allEntries.filter((e) => e.type === 'trip')
  const childEntries = allEntries.filter((e) => e.type !== 'trip')

  // Step 2: group child entries by metadata.tripId — ONE pass, no per-trip filter
  const byTripId = new Map<string, LifeLogEntry[]>()
  for (const e of childEntries) {
    const tid = typeof e.metadata.tripId === 'string' ? e.metadata.tripId : null
    if (!tid) continue
    const bucket = byTripId.get(tid)
    if (bucket) bucket.push(e)
    else byTripId.set(tid, [e])
  }

  // Step 3: compute per-trip stats using existing pure helpers
  const summaries: TripSummary[] = tripRecords.map((trip) => {
    const entries = byTripId.get(trip.id) ?? []
    return {
      trip,
      entries,
      total: tripExpenseTotal(entries),
      dateRange: tripDateRange(entries),
      activityCount: tripActivityCount(entries),
    }
  })

  // Step 4: sort newest-first by the trip record's recordedAt
  return summaries.sort((a, b) => b.trip.recordedAt - a.trip.recordedAt)
}

// ─── Async repository (ENG-04) ────────────────────────────────────────────────

/**
 * Creates a new `type='trip'` entry and immediately activates trip mode with the
 * entry's UUID as `tripId`. Both writes are wrapped in a single Dexie transaction
 * (db.entries + db.settings) so a quota or write failure on activateMode cannot
 * leave an orphaned trip entry in db.entries.
 *
 * Duplicate names are acceptable — the UUID (`entry.id`) is the stable join key.
 * A blank/whitespace name falls back to 'Untitled Trip'.
 */
export async function createAndActivateTrip(name: string): Promise<LifeLogEntry> {
  const trimmedName = name.trim() || 'Untitled Trip'
  let created: LifeLogEntry | undefined
  await db.transaction('rw', db.entries, db.settings, async () => {
    created = await entriesRepository.create({
      type: 'trip',
      domain: 'trips',
      title: trimmedName,
      recordedAt: Date.now(),
      tags: [],
      metadata: {},
      syncedAt: null,
    })
    await activateMode('trip', trimmedName, created.id)
  })
  return created!
}

/**
 * Returns all `type === 'trip'` entries, newest-first by `recordedAt`.
 * Scans all entries ordered by the `recordedAt` index (newest-first), applies a
 * JS-side filter for `domain === 'trips' && type === 'trip'`.
 * O(n) over all entries — acceptable at personal-app scale.
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

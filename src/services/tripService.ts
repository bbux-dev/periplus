import type { LifeLogEntry } from './db'

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

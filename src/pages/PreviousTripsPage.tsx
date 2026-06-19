import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/db'
import { summarizeTrips } from '../services/tripService'
import { formatUSD } from '../config/money'

/**
 * Formats a date-range pair as a human-readable string.
 * Uses toLocaleDateString (never toISOString) — local-date safe (CONTEXT.md Dates decision).
 * Returns a placeholder when range is null (no dated entries).
 * Collapses to a single date string when start === end.
 */
function formatDateRange(range: { start: number; end: number } | null): string {
  if (!range) return 'No dates'
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  return range.start === range.end
    ? fmt(range.start)
    : `${fmt(range.start)} – ${fmt(range.end)}`
}

/**
 * PreviousTripsPage — lists all trips newest-first at /trips.
 *
 * Single db read: ONE useLiveQuery(() => db.entries.toArray().then(summarizeTrips))
 * No per-trip filter loop (Pitfall 6 / PREV-04).
 * Row navigates to /trips/<trip.id> by UUID (PREV-02).
 */
export function PreviousTripsPage() {
  const navigate = useNavigate()

  // Single pass: one db.entries.toArray() — NO per-trip filter loop (Pitfall 6)
  const summaries = useLiveQuery(
    () => db.entries.toArray().then(summarizeTrips),
    [],
    // No default: undefined = Dexie opening (same convention as useTrips/useEntries)
  )

  if (summaries === undefined) {
    // Dexie still opening — neutral loading skeleton (mirrors TripHomePage lines 54-61)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Previous Trips</h1>

        {summaries.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)] mt-4">No trips yet</p>
        ) : (
          <ul className="flex flex-col gap-2 mt-2">
            {summaries.map(({ trip, total, dateRange, activityCount }) => (
              <li
                key={trip.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/trips/${trip.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/trips/${trip.id}`)
                }}
                aria-label={trip.title}
                className="flex flex-col py-3 border-b border-[var(--color-border)] cursor-pointer"
              >
                <span className="font-medium">{trip.title}</span>
                <span className="text-sm text-[var(--color-muted)]">
                  {formatDateRange(dateRange)}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{formatUSD(total)}</span>
                  <span className="text-[var(--color-muted)]">·</span>
                  <span>{activityCount} {activityCount === 1 ? 'activity' : 'activities'}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

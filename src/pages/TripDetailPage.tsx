import { useParams } from 'react-router-dom'
import { useTripEntries } from '../services/tripService'
import { ExpenseReport } from '../components/ExpenseReport'
import { formatUSD } from '../config/money'
import type { LifeLogEntry } from '../services/db'

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()

  // useTripEntries has tripId in dep array — query re-runs when tripId changes.
  // UUID-based isolation: two trips with the same name resolve independently (Pitfall 5).
  const entries = useTripEntries(tripId ?? '')

  if (entries === undefined) {
    // Dexie still opening — neutral centered loading skeleton (mirrors TripHomePage)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    )
  }

  // Timeline: ALL entries sorted ascending by occurredAt (fallback to recordedAt)
  const timeline = [...entries].sort((a, b) => {
    const aTime = a.occurredAt ?? a.recordedAt
    const bTime = b.occurredAt ?? b.recordedAt
    return aTime - bTime
  })

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-6">

        {/* Page title */}
        <h1 className="text-2xl font-bold tracking-tight">Trip Report</h1>

        {/* Category-grouped expense report with expandable rows + grand total */}
        <section aria-label="Expenses">
          <h2 className="text-base font-semibold mb-2">Expenses</h2>
          <ExpenseReport entries={entries} />
        </section>

        {/* Chronological timeline of all entries (expenses AND activities) */}
        <section aria-label="Timeline">
          <h2 className="text-base font-semibold mb-2">Timeline</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No entries yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {timeline.map((e) => (
                <TimelineRow key={e.id} entry={e} />
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  )
}

// ─── Private sub-component ────────────────────────────────────────────────────
// Read-only timeline row — 24-03 will attach Edit/Delete buttons here.

interface TimelineRowProps {
  entry: LifeLogEntry
}

function TimelineRow({ entry: e }: TimelineRowProps) {
  const label =
    e.type === 'expense'
      ? (typeof e.metadata.category === 'string' ? e.metadata.category : 'Expense')
      : e.title

  const detail =
    e.type === 'expense'
      ? formatUSD(e.amount ?? 0)
      : typeof e.metadata.rating === 'number'
        ? `★ ${e.metadata.rating}`
        : ''

  return (
    <li className="flex justify-between text-sm py-2 border-b border-[var(--color-border)]">
      <span>{label}</span>
      {detail && <span className="font-medium">{detail}</span>}
    </li>
  )
}

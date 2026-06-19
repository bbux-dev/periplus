import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTripEntries } from '../services/tripService'
import { entriesRepository } from '../services/entriesRepository'
import { ExpenseReport } from '../components/ExpenseReport'
import { EditEntryModal } from '../components/EditEntryModal'
import { Button } from '../components/ui/Button'
import { formatUSD } from '../config/money'
import type { LifeLogEntry } from '../services/db'

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()

  // useTripEntries has tripId in dep array — query re-runs when tripId changes.
  // UUID-based isolation: two trips with the same name resolve independently (Pitfall 5).
  const entries = useTripEntries(tripId ?? '')

  // Track which entry is being edited; null = modal closed
  const [editingEntry, setEditingEntry] = useState<LifeLogEntry | null>(null)

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

  // Confirm-gated delete — useTripEntries is reactive so the list/report update automatically
  async function handleDelete(id: string) {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    await entriesRepository.delete(id)
    // useLiveQuery in useTripEntries re-renders automatically; no manual refresh needed
  }

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
                <TimelineRow
                  key={e.id}
                  entry={e}
                  onEdit={() => setEditingEntry(e)}
                  onDelete={() => void handleDelete(e.id)}
                />
              ))}
            </ul>
          )}
        </section>

      </div>

      {/* Edit modal — mounted when an entry is selected; closes itself after save/delete */}
      {editingEntry !== null && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  )
}

// ─── Private sub-component ────────────────────────────────────────────────────

interface TimelineRowProps {
  entry: LifeLogEntry
  onEdit: () => void
  onDelete: () => void
}

function TimelineRow({ entry: e, onEdit, onDelete }: TimelineRowProps) {
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
    <li className="flex items-center justify-between text-sm py-2 border-b border-[var(--color-border)]">
      <div className="flex flex-col flex-1 min-w-0">
        <span className="truncate">{label}</span>
        {detail && <span className="font-medium text-xs">{detail}</span>}
      </div>
      <div className="flex gap-1 ml-2 shrink-0">
        <Button size="sm" variant="secondary" type="button" onClick={onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="secondary" type="button" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </li>
  )
}

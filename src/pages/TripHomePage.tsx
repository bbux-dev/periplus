import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { activeModeRepository } from '../services/activeMode'
import type { ActiveMode } from '../services/activeMode'
import { useTripEntries, tripExpenseTotal } from '../services/tripService'
import { entriesRepository } from '../services/entriesRepository'
import type { LifeLogEntry } from '../services/db'
import { Button } from '../components/ui/Button'
import { ExpenseSheet } from '../components/dashboard/ExpenseSheet'
import { SavedToast } from '../components/dashboard/SavedToast'
import { formatUSD } from '../config/money'

export function TripHomePage() {
  // Single query: returns { ready, mode } so both fields resolve atomically.
  // Default `{ ready: false, mode: undefined }` fires synchronously — no flash
  // of the redirect path while Dexie is still opening (CR-01).
  const result = useLiveQuery<
    { ready: true; mode: ActiveMode | null },
    { ready: false; mode: undefined }
  >(
    async () => {
      const mode = await activeModeRepository.get()
      return { ready: true, mode: mode ?? null }
    },
    [],
    { ready: false, mode: undefined },
  )

  // All hooks declared before early returns to maintain stable hook order.
  // useTripEntries called defensively — returns undefined/[] when tripId is ''.
  const tripEntries = useTripEntries(result.mode?.tripId ?? '')

  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [savedEntry, setSavedEntry] = useState<LifeLogEntry | null>(null)

  // SavedToast auto-dismiss after 4 s
  useEffect(() => {
    if (!savedEntry) return
    const timer = setTimeout(() => setSavedEntry(null), 4000)
    return () => clearTimeout(timer)
  }, [savedEntry])

  // Derived values — safe whether or not the guard has passed yet
  const recentEntries = [...(tripEntries ?? [])]
    .sort((a, b) => b.recordedAt - a.recordedAt)
    .slice(0, 10)

  const total = formatUSD(tripExpenseTotal(tripEntries ?? []))

  // ── Guard: early returns AFTER all hooks ─────────────────────────────────

  if (!result.ready) {
    // Dexie still opening — neutral loading skeleton (no flash of empty state)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    )
  }

  if (!result.mode || result.mode.mode !== 'trip') {
    // Dexie is open, confirmed no active trip → declarative redirect (no imperative
    // navigate() during render — that triggers React "cannot update during render" warning)
    return <Navigate to="/create-trip" replace />
  }

  const activeMode = result.mode

  async function handleUndo() {
    if (!savedEntry) return
    try {
      await entriesRepository.delete(savedEntry.id)
      setSavedEntry(null)
    } catch (err) {
      console.error('ExpenseSheet undo failed:', err)
      // Keep savedEntry visible so the user can retry or dismiss manually
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">

        {/* Trip name (HOME-01) */}
        <h1 className="text-2xl font-bold tracking-tight">{activeMode.label}</h1>

        {/* Running total (HOME-03) — always via formatUSD(tripExpenseTotal(...)) */}
        <p className="text-3xl font-bold text-[var(--color-primary)]">{total}</p>

        {/* CTA buttons (HOME-02) */}
        <div className="flex gap-3">
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={() => setSheetOpen(true)}
          >
            Expense
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => navigate('/activity')}
          >
            Activity
          </Button>
        </div>

        {/* Recent entries list — last 10, most-recent-first (HOME-04) */}
        {recentEntries.length > 0 && (
          <ul className="flex flex-col gap-2 mt-2">
            {recentEntries.map((e) => (
              <li
                key={e.id}
                className="flex justify-between text-sm py-2 border-b border-[var(--color-border)]"
              >
                <span>
                  {e.type === 'expense'
                    ? (typeof e.metadata.category === 'string' ? e.metadata.category : 'Expense')
                    : e.title}
                </span>
                {e.type === 'expense' && e.amount != null && (
                  <span className="font-medium">{formatUSD(e.amount)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Expense sheet */}
      <ExpenseSheet
        isOpen={sheetOpen}
        activeMode={activeMode}
        onSave={(entry) => {
          setSavedEntry(entry)
          setSheetOpen(false)
        }}
        onCancel={() => setSheetOpen(false)}
      />

      {/* Saved toast with undo */}
      {savedEntry && <SavedToast onUndo={() => void handleUndo()} />}
    </div>
  )
}

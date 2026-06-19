import { Navigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useActiveMode } from '../services/activeMode'
import { db } from '../services/db'

export function TripHomePage() {
  const activeMode = useActiveMode()

  // Settled signal: false until Dexie opens and the query resolves to true.
  // The `false` default means "not yet loaded" — safe to show the loading skeleton.
  // useLiveQuery with a default: returns the default synchronously, then the
  // query result once Dexie fires. (See PITFALLS Pitfall 2.)
  const dbReady = useLiveQuery(
    () => db.settings.count().then(() => true as const),
    [],
    false as const,
  )

  if (!dbReady) {
    // Dexie still opening — neutral loading skeleton (no flash of empty state)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    )
  }

  if (!activeMode || activeMode.mode !== 'trip') {
    // Dexie is open, confirmed no active trip → declarative redirect (no imperative
    // navigate() during render — that triggers React "cannot update during render" warning)
    return <Navigate to="/create-trip" replace />
  }

  // STUB: Phase 22 fills this in with expense total, recent entries, CTAs
  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{activeMode.label}</h1>
        <p className="text-sm text-[var(--color-muted)]">Trip home — coming in Phase 22.</p>
      </div>
    </div>
  )
}

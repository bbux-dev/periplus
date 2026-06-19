import { Navigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { activeModeRepository } from '../services/activeMode'
import type { ActiveMode } from '../services/activeMode'

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

  // STUB: Phase 22 fills this in with expense total, recent entries, CTAs
  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{result.mode.label}</h1>
        <p className="text-sm text-[var(--color-muted)]">Trip home — coming in Phase 22.</p>
      </div>
    </div>
  )
}

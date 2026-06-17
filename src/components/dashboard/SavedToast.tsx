/**
 * SavedToast — presentational "Saved · Undo" toast notification.
 *
 * Purely presentational: owns NO timer, NO entry state. The auto-dismiss
 * timer and saved entry id live in DashboardPage (wired in 13-03).
 *
 * CAP-03: Saved affordance with Undo button (wired to delete in 13-03).
 * RESEARCH §5 authoritative spec; no codebase analog (net-new construct).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

interface SavedToastProps {
  onUndo: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SavedToast({ onUndo }: SavedToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                 flex items-center gap-3 px-4 py-3 rounded-xl
                 bg-[var(--color-foreground)] text-[var(--color-background)]
                 shadow-lg text-sm font-medium"
    >
      <span>Saved</span>
      <button
        type="button"
        onClick={onUndo}
        className="underline underline-offset-2 font-semibold
                   hover:opacity-80 active:opacity-60 transition-opacity"
      >
        Undo
      </button>
    </div>
  )
}

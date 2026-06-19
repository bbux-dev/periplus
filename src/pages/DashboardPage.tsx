import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { QueueListIcon, BoltIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { NAVIGATION } from '../config/navigation'
import { cn } from '../components/ui/cn'
import {
  configRepository,
  useShortcutConfig,
} from '../services/configRepository'
import {
  useActiveMode,
  activateMode,
  activeModeRepository,
} from '../services/activeMode'
import { DEFAULT_SHORTCUT_CONFIG } from '../config/shortcutConfig'
import { ShortcutRow } from '../components/dashboard/ShortcutRow'
import { useShortcutCapture } from '../hooks/useShortcutCapture'
import { HoleSheet } from '../components/dashboard/HoleSheet'
import { SavedToast } from '../components/dashboard/SavedToast'

export function DashboardPage() {
  // ─── One-shot seeding + first-run mode activation (DASH-03 / DASH-04) ──────────
  // Uses the awaited configRepository.get() — NOT the hook — to distinguish
  // "Dexie still opening" from "no config stored". Runs once on mount.
  // First-run activation is idempotent: it only activates a default mode when no
  // active mode has been persisted yet — it never overwrites an existing selection.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let existing = await configRepository.get()
        if (existing === undefined) {
          await configRepository.put(DEFAULT_SHORTCUT_CONFIG)
          existing = DEFAULT_SHORTCUT_CONFIG
        }
        if (cancelled) return
        const active = await activeModeRepository.get()
        if (active === undefined && existing.layouts.length > 0) {
          await activateMode(existing.layouts[0].name)
        }
      } catch (err) {
        console.error('[DashboardPage] Failed to seed default config/mode:', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ─── Reactive config + active-mode-driven layout derivation (DASH-04) ─────────
  // The dashboard renders ONLY the active mode's buttons. The active MODE drives
  // which layout is shown; while it loads we fall back to the first layout.
  const config = useShortcutConfig()
  const activeMode = useActiveMode()
  const layouts = config?.layouts ?? []
  const activeLayout = layouts.find((l) => l.name === activeMode?.mode) ?? layouts[0]

  // ─── Capture orchestrator (Phase 13 CAP-01/02/03/04) ─────────────────────────
  const {
    handleTap,
    toastEntryId,
    handleUndo,
    sheetState,
    handleSheetSave,
    handleSheetCancel,
  } = useShortcutCapture()

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Life Log</h1>

        {/* Active mode's shortcut rows — null while config loads to avoid layout shift */}
        {config !== undefined && (
          <>
            {activeLayout?.shortcuts.map((s) => (
              <ShortcutRow
                key={s.name}
                shortcut={s}
                onClick={() => handleTap(s)}
              />
            ))}
          </>
        )}

        {/* Existing nav — always reachable */}
        <Link
          to="/capture"
          className={cn(
            'flex items-center gap-4 min-h-[64px] px-4 rounded-lg',
            'border border-[var(--color-primary)] bg-[var(--color-primary)]',
            'text-[var(--color-primary-foreground)] hover:opacity-90 active:opacity-75',
            'transition-opacity',
          )}
        >
          <BoltIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
          <span className="text-lg font-medium">Quick Capture</span>
        </Link>
        {NAVIGATION.map(({ domain, label, icon: Icon }) => (
          <Link
            key={domain}
            to={`/d/${domain}`}
            className={cn(
              'flex items-center gap-4 min-h-[64px] px-4 rounded-lg',
              'border border-[var(--color-border)] bg-[var(--color-muted)]',
              'hover:bg-[var(--color-border)] active:opacity-75',
              'transition-colors',
            )}
          >
            <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
            <span className="text-lg font-medium">{label}</span>
          </Link>
        ))}
        <Link
          to="/entries"
          className={cn(
            'flex items-center gap-4 min-h-[64px] px-4 rounded-lg',
            'border border-[var(--color-border)] bg-[var(--color-muted)]',
            'hover:bg-[var(--color-border)] active:opacity-75',
            'transition-colors',
          )}
        >
          <QueueListIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
          <span className="text-lg font-medium">View All Entries</span>
        </Link>
        <Link
          to="/settings"
          className={cn(
            'flex items-center gap-4 min-h-[64px] px-4 rounded-lg',
            'border border-[var(--color-border)] bg-[var(--color-muted)]',
            'hover:bg-[var(--color-border)] active:opacity-75',
            'transition-colors',
          )}
        >
          <Cog6ToothIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
          <span className="text-lg font-medium">Shortcuts Config</span>
        </Link>
      </div>

      {/* ── Capture affordances (Phase 13) ──────────────────────────────── */}
      {toastEntryId && <SavedToast onUndo={handleUndo} />}
      {sheetState && (
        <HoleSheet
          isOpen
          type={sheetState.type}
          baseValues={sheetState.baseValues}
          holeMap={sheetState.holeMap}
          onSave={handleSheetSave}
          onCancel={handleSheetCancel}
        />
      )}
    </div>
  )
}

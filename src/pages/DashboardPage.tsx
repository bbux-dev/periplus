import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { QueueListIcon, BoltIcon } from '@heroicons/react/24/outline'
import { NAVIGATION } from '../config/navigation'
import { cn } from '../components/ui/cn'
import {
  configRepository,
  useShortcutConfig,
  activeLayoutRepository,
  useActiveLayoutName,
} from '../services/configRepository'
import { DEFAULT_SHORTCUT_CONFIG } from '../config/shortcutConfig'
import { LayoutChips } from '../components/dashboard/LayoutChips'
import { ShortcutRow } from '../components/dashboard/ShortcutRow'
import { useShortcutCapture } from '../hooks/useShortcutCapture'
import { HoleSheet } from '../components/dashboard/HoleSheet'
import { SavedToast } from '../components/dashboard/SavedToast'

export function DashboardPage() {
  // ─── One-shot seeding effect (DASH-03) ────────────────────────────────────────
  // Uses the awaited configRepository.get() — NOT the hook — to distinguish
  // "Dexie still opening" from "no config stored". Runs once on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const existing = await configRepository.get()
        if (existing === undefined && !cancelled) {
          await configRepository.put(DEFAULT_SHORTCUT_CONFIG)
        }
      } catch (err) {
        console.error('[DashboardPage] Failed to seed default config:', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ─── Reactive config + active layout derivation (DASH-01/02) ─────────────────
  const config = useShortcutConfig()
  const persistedLayoutName = useActiveLayoutName()
  const layouts = config?.layouts ?? []
  const activeLayout = layouts.find((l) => l.name === persistedLayoutName) ?? layouts[0]

  function handleLayoutSelect(name: string) {
    activeLayoutRepository.put(name).catch((err) => {
      console.error('[DashboardPage] Failed to persist active layout:', err)
    })
  }

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

        {/* Shortcut section — null while config loads to avoid layout shift */}
        {config !== undefined && (
          <>
            <LayoutChips
              layouts={layouts}
              activeLayoutName={activeLayout?.name}
              onSelect={handleLayoutSelect}
            />
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
      </div>

      {/* ── Capture affordances (Phase 13) ──────────────────────────────── */}
      {toastEntryId && <SavedToast onUndo={handleUndo} />}
      {sheetState && (
        <HoleSheet
          isOpen
          type={sheetState.type}
          domain={sheetState.domain}
          baseValues={sheetState.baseValues}
          holeMap={sheetState.holeMap}
          onSave={handleSheetSave}
          onCancel={handleSheetCancel}
        />
      )}
    </div>
  )
}

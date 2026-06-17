import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
import {
  useShortcutConfig,
  useActiveLayoutName,
  configRepository,
} from '../services/configRepository'
import { validateShortcutConfig } from '../services/configValidator'
import {
  addLayout,
  renameLayout,
  deleteLayout,
  deleteShortcut,
  moveShortcut,
} from '../services/shortcutMutations'
import { LayoutChips } from '../components/dashboard/LayoutChips'
import { Button } from '../components/ui/Button'
import { cn } from '../components/ui/cn'
import { resolveShortcutIcon } from '../config/shortcutConfig'

// ─── ManageShortcutsPage ──────────────────────────────────────────────────────
//
// Layout CRUD (create / rename / delete) + shortcut list (delete + reorder).
// All mutations follow the read-fresh → helper → validate → put write path.
//
// Threat mitigations:
//   T-15-02  every handler calls validateShortcutConfig before configRepository.put
//   T-15-04  config strings rendered as React text nodes (no dangerouslySetInnerHTML)
//   T-15-05  handlers read FRESH via configRepository.get() — not the hook closure

export function ManageShortcutsPage() {
  const goBack = useBackOrHome('/')
  const navigate = useNavigate()
  const config = useShortcutConfig()
  const persistedLayoutName = useActiveLayoutName()

  // Local manage-view selected layout — undefined until user picks or config loads.
  // Does NOT write to activeLayoutRepository (that is DashboardPage's concern).
  const [selectedLayoutName, setSelectedLayoutName] = useState<string | undefined>(
    undefined,
  )

  // Inline rename state: which layout is being renamed + current edit value
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState<string>('')

  // New-layout form
  const [newLayoutName, setNewLayoutName] = useState<string>('')

  // Error display (role="alert")
  const [error, setError] = useState<string | null>(null)

  // Gate: undefined = Dexie still opening
  if (config === undefined) return <p>Loading...</p>

  const currentConfig = config // narrowed — TypeScript does not narrow across closures
  const layouts = currentConfig.layouts

  // Derive effective selected layout (falls back to persisted/first when no
  // explicit selection, or when the selected layout was deleted/renamed away).
  const effectiveSelectedName =
    selectedLayoutName && layouts.find((l) => l.name === selectedLayoutName)
      ? selectedLayoutName
      : (layouts.find((l) => l.name === persistedLayoutName) ?? layouts[0])?.name ?? ''

  const selectedLayout = layouts.find((l) => l.name === effectiveSelectedName) ?? layouts[0]
  const shortcuts = selectedLayout?.shortcuts ?? []

  // ─── Write path helpers ─────────────────────────────────────────────────────

  // IN-03 (deferred): shortcut deletion is intentionally immediate for v1 with no
  // confirmation prompt, to keep the implementation simple and tests free of
  // window.confirm mocking. A confirmation dialog is a UX enhancement for a future
  // iteration.
  async function handleDeleteShortcut(shortcutName: string) {
    setError(null)
    try {
      const current = await configRepository.get()
      if (!current) return
      const next = deleteShortcut(current, effectiveSelectedName, shortcutName)
      const vr = validateShortcutConfig(next)
      if (!vr.ok) { setError(vr.reason); return }
      await configRepository.put(vr.config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  async function handleMoveShortcut(shortcutName: string, direction: 'up' | 'down') {
    setError(null)
    try {
      const current = await configRepository.get()
      if (!current) return
      const next = moveShortcut(current, effectiveSelectedName, shortcutName, direction)
      const vr = validateShortcutConfig(next)
      if (!vr.ok) { setError(vr.reason); return }
      await configRepository.put(vr.config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  async function handleCreateLayout() {
    const name = newLayoutName.trim()
    if (!name) return
    setError(null)
    try {
      const current = await configRepository.get()
      if (!current) return
      const next = addLayout(current, { name, shortcuts: [] })
      const vr = validateShortcutConfig(next)
      if (!vr.ok) { setError(vr.reason); return }
      await configRepository.put(vr.config)
      setNewLayoutName('')
      setSelectedLayoutName(name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  async function handleRenameLayout(oldName: string) {
    const name = renameValue.trim()
    if (!name) return
    setError(null)
    try {
      const current = await configRepository.get()
      if (!current) return
      const next = renameLayout(current, oldName, name)
      const vr = validateShortcutConfig(next)
      if (!vr.ok) { setError(vr.reason); return }
      await configRepository.put(vr.config)
      // Keep local selection in sync if the renamed layout was selected
      if (effectiveSelectedName === oldName) setSelectedLayoutName(name)
      setRenameTarget(null)
      setRenameValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  async function handleDeleteLayout(layoutName: string) {
    setError(null)
    try {
      const current = await configRepository.get()
      if (!current) return
      const next = deleteLayout(current, layoutName)
      const vr = validateShortcutConfig(next)
      if (!vr.ok) { setError(vr.reason); return }
      await configRepository.put(vr.config)
      // Switch selection to first remaining layout if the deleted one was selected
      if (effectiveSelectedName === layoutName) {
        setSelectedLayoutName(vr.config.layouts[0]?.name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // ─── Input class helper ─────────────────────────────────────────────────────

  const inputClass = cn(
    'flex-1 border border-[var(--color-border)] rounded px-2 py-1 text-sm',
    'bg-[var(--color-background)] text-[var(--color-foreground)]',
    'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
  )

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">

        {/* Back button */}
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <h1 className="text-2xl font-bold tracking-tight">Manage Shortcuts</h1>

        {/* Error alert — surfaced from thrown helpers (duplicate name, last layout, etc.) */}
        {error && (
          <p role="alert" className="text-sm text-[var(--color-destructive)]">
            {error}
          </p>
        )}

        {/* Layout chip tab switcher — local selection, does NOT update activeLayoutRepository */}
        <LayoutChips
          layouts={layouts}
          activeLayoutName={effectiveSelectedName}
          onSelect={setSelectedLayoutName}
        />

        {/* ─── Shortcut list for the selected layout ──────────────────────── */}
        <section>
          <h2 className="text-base font-semibold mb-2">
            {selectedLayout?.name ?? ''} — Shortcuts
          </h2>

          {shortcuts.length === 0 && (
            <p className="text-sm opacity-60">No shortcuts yet.</p>
          )}

          {shortcuts.map((shortcut, index) => {
            const Icon = resolveShortcutIcon(shortcut.icon)
            return (
              <div
                key={shortcut.name}
                className="flex items-center gap-1 py-2 border-b border-[var(--color-border)]"
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {/* Config strings rendered as React text nodes — T-15-04 mitigated */}
                <span className="flex-1 text-sm">{shortcut.name}</span>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${shortcut.name} up`}
                  disabled={index === 0}
                  onClick={() => handleMoveShortcut(shortcut.name, 'up')}
                >
                  <ChevronUpIcon className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${shortcut.name} down`}
                  disabled={index === shortcuts.length - 1}
                  onClick={() => handleMoveShortcut(shortcut.name, 'down')}
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${shortcut.name}`}
                  onClick={() =>
                    navigate('/manage/shortcut', {
                      state: { layoutName: effectiveSelectedName, shortcut },
                    })
                  }
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${shortcut.name}`}
                  onClick={() => handleDeleteShortcut(shortcut.name)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            )
          })}

          <div className="mt-3">
            <Button
              variant="secondary"
              onClick={() =>
                navigate('/manage/shortcut', {
                  state: { layoutName: effectiveSelectedName },
                })
              }
            >
              Add Shortcut
            </Button>
          </div>
        </section>

        {/* ─── Layout management section ──────────────────────────────────── */}
        <section>
          <h2 className="text-base font-semibold mb-2">Layouts</h2>

          {layouts.map((layout) => (
            <div
              key={layout.name}
              className="flex items-center gap-2 py-2 border-b border-[var(--color-border)]"
            >
              {renameTarget === layout.name ? (
                /* Inline rename form */
                <>
                  <input
                    className={inputClass}
                    aria-label={`Rename ${layout.name}`}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameLayout(layout.name)
                      if (e.key === 'Escape') {
                        setRenameTarget(null)
                        setRenameValue('')
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRenameLayout(layout.name)}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRenameTarget(null)
                      setRenameValue('')
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                /* Default layout row */
                <>
                  {/* Layout name rendered as text node — T-15-04 mitigated */}
                  <span className="flex-1 text-sm">{layout.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Rename ${layout.name}`}
                    onClick={() => {
                      setRenameTarget(layout.name)
                      setRenameValue(layout.name)
                    }}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete layout ${layout.name}`}
                    disabled={currentConfig.layouts.length === 1}
                    onClick={() => handleDeleteLayout(layout.name)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}

          {/* New layout form */}
          <div className="flex items-center gap-2 mt-3">
            <input
              className={inputClass}
              placeholder="New layout name"
              aria-label="New layout name"
              value={newLayoutName}
              onChange={(e) => setNewLayoutName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateLayout()
              }}
            />
            <Button variant="secondary" size="sm" onClick={handleCreateLayout}>
              Create
            </Button>
          </div>
        </section>

      </div>
    </div>
  )
}

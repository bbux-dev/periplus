import { useRef, useState } from 'react'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { useShortcutConfig } from '../services/configRepository'
import {
  buildConfigExportJson,
  importConfig,
  triggerDownload,
} from '../services/configPort'
import type { ImportResult } from '../services/configPort'

// ─── activeLayoutName decision ────────────────────────────────────────────────
//
// No explicit activeLayoutName reset on import. Phase 12 derives the active
// layout as: layouts.find(l => l.name === persisted) ?? layouts[0]
// A stale persisted name harmlessly falls back to the first layout of the new
// config — writing activeLayoutRepository here is unnecessary and deliberately
// avoided (see Phase 14 plan comment on PORT-02 reactive reflect).

export function SettingsPage() {
  const goBack = useBackOrHome('/')
  const config = useShortcutConfig()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<ImportResult | null>(null)

  // Gate: undefined = Dexie still opening
  if (config === undefined) return <p>Loading...</p>

  // Capture narrowed config for closures — TypeScript control flow narrows
  // `config` here but does not propagate into nested function declarations,
  // mirroring EntryListPage.tsx line 69 (`const allEntries = entries`).
  const currentConfig = config

  function handleExport() {
    triggerDownload(
      buildConfigExportJson(currentConfig, Date.now()),
      'life-log-shortcuts.json',
    )
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await importConfig(file)
    setImportStatus(result)
    // Reset so re-picking the same file fires onChange again
    e.target.value = ''
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <h1 className="text-2xl font-bold tracking-tight">Shortcuts Config</h1>

        {/* Export — downloads the current config as a versioned JSON envelope */}
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-md border border-[var(--color-border)]
                     text-sm font-medium hover:bg-[var(--color-muted)] transition-colors"
        >
          Export JSON
        </button>

        {/* Import — hidden file input triggered by a visible button.
            Security: raw File is passed straight to importConfig; the UI
            performs NO parsing of its own (T-14-05 mitigated). */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          aria-label="Choose config file"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-md border border-[var(--color-border)]
                     text-sm font-medium hover:bg-[var(--color-muted)] transition-colors"
        >
          Import JSON
        </button>

        {/* Import status messages */}
        {importStatus?.ok === true && (
          <p className="text-sm text-[var(--color-foreground)]">Config imported.</p>
        )}
        {/* Error rendered via React-escaped text node — no dangerouslySetInnerHTML (T-14-07) */}
        {importStatus?.ok === false && (
          <p role="alert" className="text-sm text-[var(--color-destructive)]">
            {importStatus.reason}
          </p>
        )}
      </div>
    </div>
  )
}

import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { entriesRepository } from '../services/entriesRepository'
import { buildExportJson, triggerDownload } from '../services/exportEntries'

export function SettingsPage() {
  const goBack = useBackOrHome('/')

  async function handleExport() {
    const entries = await entriesRepository.list()
    triggerDownload(buildExportJson(entries, Date.now()), 'life-log.json')
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

        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

        <button
          onClick={() => { void handleExport() }}
          className="px-4 py-2 rounded-md border border-[var(--color-border)]
                     text-sm font-medium hover:bg-[var(--color-muted)] transition-colors"
        >
          Export JSON
        </button>
      </div>
    </div>
  )
}

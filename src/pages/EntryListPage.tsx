import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEntries } from '../services/entriesRepository'
import { NAVIGATION, getDomainConfig } from '../config/navigation'
import { buildExportJson, triggerDownload } from '../services/exportEntries'
import { cn } from '../components/ui/cn'
import type { EntryDomain, EntryType, LifeLogEntry } from '../services/db'

// ─── Filter options (derived from NAVIGATION — single source of truth) ────────

type FilterKey = 'all' | EntryDomain

const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: 'all', label: 'All' },
  ...NAVIGATION.map((d) => ({ value: d.domain as FilterKey, label: d.label })),
]

// ─── Domain-scoped type label lookup ─────────────────────────────────────────
//
// CRITICAL: 'expense' exists in both 'trips' and 'expenditures'.
// MUST scope by domain — never flat-map across all domains.

function getTypeLabel(domain: EntryDomain, type: EntryType): string {
  return getDomainConfig(domain)?.types.find((t) => t.type === type)?.label ?? type
}

// ─── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({ entry }: { entry: LifeLogEntry }) {
  const dateMs = entry.occurredAt ?? entry.recordedAt
  const typeLabel = getTypeLabel(entry.domain, entry.type)

  return (
    <li>
      <Link
        to={`/entries/${entry.id}`}
        className="flex items-center justify-between min-h-[56px] px-4 py-3 rounded-lg
                   border border-[var(--color-border)] bg-[var(--color-muted)]
                   hover:bg-[var(--color-border)] active:opacity-75 transition-colors"
      >
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{entry.title}</span>
          <span className="text-xs opacity-60" data-testid="entry-date">
            {typeLabel} · {new Date(dateMs).toLocaleDateString()}
          </span>
        </div>
        {entry.amount != null && (
          <span className="text-sm font-medium shrink-0 ml-4">
            ${entry.amount.toFixed(2)}
          </span>
        )}
      </Link>
    </li>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function EntryListPage() {
  const entries = useEntries()
  const [filter, setFilter] = useState<FilterKey>('all')

  // Gate: undefined = Dexie still opening; callers MUST NOT skip this check
  if (entries === undefined) return <p>Loading...</p>

  // Capture the narrowed LifeLogEntry[] so closures retain the exact type.
  // TypeScript control flow narrows `entries` here but does not propagate into
  // nested function declarations — capturing it explicitly avoids a TS2345 error.
  const allEntries = entries

  const filtered =
    filter === 'all' ? allEntries : allEntries.filter((e) => e.domain === filter)

  function handleExport() {
    // Export operates on the full unfiltered entries array
    triggerDownload(buildExportJson(allEntries, Date.now()), 'life-log-export.json')
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Entries</h1>

        {/* Filter group */}
        <div role="group" aria-label="Filter entries" className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              aria-pressed={filter === opt.value}
              className={cn(
                'px-3 py-1 rounded-md text-sm font-medium border transition-colors',
                filter === opt.value
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)]'
                  : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Entry list or empty state */}
        {filtered.length === 0 ? (
          <p className="text-center opacity-60 text-sm py-8">No entries yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}

        {/* Export button — operates on full unfiltered entries */}
        <button
          onClick={handleExport}
          className="mt-2 px-4 py-2 rounded-md border border-[var(--color-border)]
                     text-sm font-medium hover:bg-[var(--color-muted)] transition-colors"
        >
          Export JSON
        </button>
      </div>
    </div>
  )
}

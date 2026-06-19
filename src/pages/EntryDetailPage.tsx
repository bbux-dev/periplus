import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useEntry, entriesRepository } from '../services/entriesRepository'
import { isSafeUrl } from '../services/urlUtils'
import { getDomainConfig } from '../config/navigation'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { Button } from '../components/ui/Button'

// ─── Back button (shared layout) ─────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1"
      aria-label="Go back"
    >
      <ChevronLeftIcon className="h-5 w-5" />
      <span className="text-sm font-medium">Back</span>
    </button>
  )
}

// ─── Field label helper ───────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-1">
      {children}
    </p>
  )
}

// ─── EntryDetailPage (VIEW-03) ────────────────────────────────────────────────

/**
 * Displays the full detail view for a single entry identified by the `:id`
 * route parameter. Implements three render states:
 *
 * - `undefined` (Dexie loading) → loading paragraph
 * - `null`      (not found)     → graceful guard with Back affordance
 * - `LifeLogEntry`              → full entry detail
 *
 * Security mitigations (T-06-01, T-06-02, T-06-04):
 *   - sourceUrl only rendered as `<a>` when `isSafeUrl()` passes (http/https).
 *     An unsafe scheme (e.g. javascript:) renders as plain `<span>` text.
 *   - metadata rendered via `JSON.stringify` in a `<pre>` text node — React
 *     auto-escapes; no `dangerouslySetInnerHTML` used anywhere.
 *   - Route :id coerced to '' when missing (Pitfall 4) — db.get('') returns
 *     null via useEntry, displaying the not-found guard gracefully.
 */
export function EntryDetailPage() {
  // Pitfall 4: useParams may return undefined for :id; coerce to '' so
  // useEntry never receives undefined (Dexie throws on undefined key).
  const id = useParams<{ id: string }>().id ?? ''
  const entry = useEntry(id)
  const goBack = useBackOrHome('/entries')
  const navigate = useNavigate()
  // Inline two-step delete confirm (no window.confirm — keeps it testable)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const handleConfirmDelete = async () => {
    await entriesRepository.delete(id)
    navigate('/entries')
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (entry === undefined) {
    return <p>Loading...</p>
  }

  // ── Not-found guard ────────────────────────────────────────────────────────
  if (entry === null) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
          <BackButton onClick={goBack} />
          <p>Entry not found.</p>
        </div>
      </div>
    )
  }

  // ── Domain-scoped type label (Pitfall 2: never use flat cross-domain find) ──
  // 'expense' appears in both 'trips' and 'expenditures'; always scope by domain.
  const typeLabel =
    getDomainConfig(entry.domain)?.types.find((t) => t.type === entry.type)?.label ??
    entry.type

  // ── Full entry render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <BackButton onClick={goBack} />

        <h1 className="text-2xl font-bold tracking-tight">{entry.title}</h1>
        <p className="text-sm opacity-60">{typeLabel}</p>

        {/* Edit + Delete affordances (Phase 17) */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate(`/entries/${id}/edit`)}>
            Edit
          </Button>
          {!confirmingDelete && (
            <Button
              variant="secondary"
              className="text-red-500"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </Button>
          )}
        </div>

        {confirmingDelete && (
          <div className="flex flex-col gap-2 p-3 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]">
            <p className="text-sm">Delete this entry?</p>
            <div className="flex items-center gap-2">
              <Button variant="primary" className="text-red-500" onClick={handleConfirmDelete}>
                Confirm
              </Button>
              <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Description */}
        {entry.description && (
          <div>
            <FieldLabel>Description</FieldLabel>
            <p>{entry.description}</p>
          </div>
        )}

        {/* sourceUrl — T-06-01: only render as <a> when isSafeUrl passes */}
        {entry.sourceUrl && (
          <div>
            <FieldLabel>Source</FieldLabel>
            {isSafeUrl(entry.sourceUrl) ? (
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary)] underline break-all"
              >
                {entry.sourceUrl}
              </a>
            ) : (
              <span className="break-all">{entry.sourceUrl}</span>
            )}
          </div>
        )}

        {/* Amount — only when present (not zero-check; null/undefined check) */}
        {entry.amount != null && (
          <div>
            <FieldLabel>Amount</FieldLabel>
            <p>${entry.amount.toFixed(2)}</p>
          </div>
        )}

        {/* Location */}
        {entry.location && (
          <div>
            <FieldLabel>Location</FieldLabel>
            <p>{entry.location}</p>
          </div>
        )}

        {/* Tags — deduplicated at render site so duplicate stored strings don't
            produce React key collisions or render the same chip twice. */}
        {entry.tags.length > 0 && (
          <div>
            <FieldLabel>Tags</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {[...new Set(entry.tags)].map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-muted)] border border-[var(--color-border)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata JSON preview — T-06-02: JSON.stringify in <pre> text node;
            React auto-escapes; do NOT use dangerouslySetInnerHTML */}
        <div>
          <FieldLabel>Metadata</FieldLabel>
          <pre
            className="text-xs overflow-auto bg-[var(--color-muted)] p-3 rounded-md whitespace-pre-wrap break-all"
            data-testid="metadata-json"
          >
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

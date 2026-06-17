import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ENTRY_FIELDS, buildReviewDraft, POSITIONAL_SCHEMA } from '../config/entryFields'
import { defaultDomainForType } from '../config/navigation'
import { parseDSL } from '../services/dsl/parser'
import {
  suggestionContext,
  typeMatches,
  applyValueSuggestion,
} from '../services/dsl/suggest'
import { useDistinctValues } from '../services/entriesRepository'

const STATUS_STYLES = {
  ok:        'bg-green-500/15 text-green-600 dark:text-green-400',
  ambiguous: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  error:     'bg-red-500/15 text-red-500',
} as const

/**
 * Quick-Capture omnibar (OMNI-01..04). Parses a DSL string live, suggests type
 * tokens and history-backed values, and pre-fills the existing Review screen on
 * confirm — never saves directly (the Review screen is the single save path).
 */
export function QuickCapturePage() {
  const navigate = useNavigate()
  const goBack = useBackOrHome('/')
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')

  const parsed = parseDSL(text)
  const ctx = suggestionContext(text, parsed.type)

  // Hooks must run unconditionally — query is cheap; we only render results in value mode.
  const valueField = ctx.kind === 'value' ? ctx.field : 'category'
  const valuePrefix = ctx.kind === 'value' ? ctx.prefix : ''
  const valueSuggestions = useDistinctValues(valueField, valuePrefix)
  const typeSuggestions = ctx.kind === 'type' ? typeMatches(ctx.prefix) : []

  const canConfirm = parsed.status === 'ok' && parsed.type != null
  // EDIT-03: allow saving as a shortcut template when the line is parseable + typed
  // Broader than canConfirm: allows status='ok' OR 'ambiguous' as long as type is resolved
  const canSaveAsShortcut = parsed.type !== null && parsed.status !== 'error'

  const handleSaveAsShortcut = () => {
    navigate('/manage/shortcut', { state: { dslTemplate: text } })
  }

  const refocus = () => inputRef.current?.focus()

  const acceptType = (type: string) => {
    setText(`${type} `)
    refocus()
  }
  const acceptValue = (value: string) => {
    setText(applyValueSuggestion(text, value))
    refocus()
  }

  const handleConfirm = () => {
    if (parsed.status !== 'ok' || !parsed.type) return
    const draft = buildReviewDraft(ENTRY_FIELDS[parsed.type], parsed.values)
    const domain = defaultDomainForType(parsed.type)
    navigate(`/d/${domain}/${parsed.type}/review`, { state: { draft } })
  }

  const valueEntries = Object.entries(parsed.values)

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

        <h1 className="text-2xl font-bold tracking-tight">Quick Capture</h1>
        <p className="text-sm text-[var(--color-foreground)] opacity-60">
          Shorthand: <code>type slot1:slot2 ?key=value</code> — e.g.{' '}
          <code>expense 12.50:food?merchant=Blue Bottle</code>
        </p>

        <Input
          ref={inputRef}
          aria-label="Quick capture shorthand"
          placeholder="expense 12.50:food"
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canConfirm) handleConfirm()
          }}
        />

        {/* ── Suggestions ───────────────────────────────────────────── */}
        {typeSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2" role="listbox" aria-label="Type suggestions">
            {typeSuggestions.map((t) => (
              <button
                key={t}
                role="option"
                aria-selected={false}
                onClick={() => acceptType(t)}
                className="px-3 py-1 rounded-full text-sm border border-[var(--color-border)]
                           bg-[var(--color-muted)] hover:bg-[var(--color-border)]"
              >
                {t}{' '}
                <span className="text-[var(--color-foreground)] opacity-60">
                  {POSITIONAL_SCHEMA[t].join(':')}
                </span>
              </button>
            ))}
          </div>
        )}
        {ctx.kind === 'value' && valueSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2" role="listbox" aria-label="Value suggestions">
            {valueSuggestions.slice(0, 8).map((s) => (
              <button
                key={s.value}
                role="option"
                aria-selected={false}
                onClick={() => acceptValue(s.value)}
                className="px-3 py-1 rounded-full text-sm border border-[var(--color-border)]
                           bg-[var(--color-muted)] hover:bg-[var(--color-border)]"
              >
                {s.value}{' '}
                <span className="text-[var(--color-foreground)] opacity-60">×{s.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Live preview ──────────────────────────────────────────── */}
        {text.trim() !== '' && (
          <div className="rounded-lg border border-[var(--color-border)] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${STATUS_STYLES[parsed.status]}`}>
                {parsed.status}
              </span>
              {parsed.type && (
                <span className="font-mono text-sm text-[var(--color-primary)]">▸ {parsed.type}</span>
              )}
            </div>

            {valueEntries.length > 0 ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm font-mono">
                {valueEntries.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-[var(--color-foreground)] opacity-60">{k}</dt>
                    <dd className="break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-[var(--color-foreground)] opacity-60 italic">no fields parsed yet</p>
            )}

            {parsed.issues.map((m) => (
              <p key={m} role="alert" className="text-sm text-red-500">✗ {m}</p>
            ))}
            {parsed.warnings.map((m) => (
              <p key={m} className="text-sm text-amber-600 dark:text-amber-400">⚠ {m}</p>
            ))}
          </div>
        )}

        <Button variant="primary" onClick={handleConfirm} disabled={!canConfirm}>
          Review &amp; Save
        </Button>
        {/* EDIT-03: Save current DSL line as shortcut template */}
        <Button variant="secondary" onClick={handleSaveAsShortcut} disabled={!canSaveAsShortcut}>
          Save as Shortcut
        </Button>
        <Button variant="secondary" onClick={goBack}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { FormField } from '../components/ui/FormField'
import { Button } from '../components/ui/Button'
import { useEntry, entriesRepository } from '../services/entriesRepository'
import {
  ENTRY_FIELDS,
  formValuesFromEntry,
  buildEntryUpdate,
} from '../config/entryFields'
import type { LifeLogEntry } from '../services/db'

// ─── Back button (shared layout, mirrors EntryDetailPage) ─────────────────────

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

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">{children}</div>
    </div>
  )
}

// ─── Edit form (receives a resolved entry) ────────────────────────────────────

/**
 * Inner form rendered once the entry is loaded. State is lazy-initialized from
 * the entry so the form is pre-populated; `recordedAt` is never surfaced as a
 * field. Metadata keys NOT covered by the type's ENTRY_FIELDS are rendered in an
 * "Other metadata" section so arbitrary stamps (mode/modeLabel, DSL/URL capture)
 * stay editable. Save merges via buildEntryUpdate → entriesRepository.update.
 */
function EntryEditForm({ entry }: { entry: LifeLogEntry }) {
  const navigate = useNavigate()
  const fields = ENTRY_FIELDS[entry.type] ?? []

  // Metadata keys already covered by a typed field — everything else is "extra".
  const knownMetaKeys = new Set(
    fields
      .filter((f) => f.mapTo.kind === 'metadata')
      .map((f) => (f.mapTo as { kind: 'metadata'; key: string }).key),
  )
  const extraKeys = Object.keys(entry.metadata).filter((k) => !knownMetaKeys.has(k))

  const [formValues, setFormValues] = useState<Record<string, string>>(() =>
    formValuesFromEntry(fields, entry),
  )
  const [extraMetadata, setExtraMetadata] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      extraKeys.map((k) => {
        const raw = entry.metadata[k]
        const value =
          typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : ''
        return [k, value]
      }),
    ),
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleChange = (key: string, value: string) =>
    setFormValues((prev) => ({ ...prev, [key]: value }))

  const handleExtraChange = (key: string, value: string) =>
    setExtraMetadata((prev) => ({ ...prev, [key]: value }))

  const goDetail = () => navigate(`/entries/${entry.id}`)

  const handleSave = async () => {
    // Required pre-flight check, mirroring ManualEntryPage.
    const missingFields = fields.filter((f) => f.required && !formValues[f.key]?.trim())
    if (missingFields.length > 0) {
      setValidationError(`Required: ${missingFields.map((f) => f.label).join(', ')}`)
      return
    }
    setValidationError(null)
    const changes = buildEntryUpdate(fields, entry, formValues, extraMetadata)
    await entriesRepository.update(entry.id, changes)
    navigate(`/entries/${entry.id}`)
  }

  return (
    <PageShell>
      <BackButton onClick={goDetail} />
      <h1 className="text-2xl font-bold tracking-tight">Edit Entry</h1>

      {fields.map((field) => (
        <FormField
          key={field.key}
          id={`edit-${field.key}`}
          label={field.label}
          // 'tags' is a semantic inputType, not an HTML attribute; map to 'text'.
          type={field.inputType === 'tags' ? 'text' : field.inputType}
          placeholder={field.placeholder}
          required={field.required}
          min={field.min}
          max={field.max}
          value={formValues[field.key] ?? ''}
          onChange={(e) => handleChange(field.key, e.target.value)}
        />
      ))}

      {extraKeys.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-50">
            Other metadata
          </p>
          {extraKeys.map((key) => (
            <FormField
              key={key}
              id={`edit-extra-${key}`}
              label={key}
              type="text"
              value={extraMetadata[key] ?? ''}
              onChange={(e) => handleExtraChange(key, e.target.value)}
            />
          ))}
        </div>
      )}

      {validationError && (
        <p role="alert" className="text-sm text-red-500">
          {validationError}
        </p>
      )}

      <Button variant="primary" onClick={handleSave}>
        Save
      </Button>
      <Button variant="secondary" onClick={goDetail}>
        Cancel
      </Button>
    </PageShell>
  )
}

// ─── EntryEditPage (tri-state loader) ─────────────────────────────────────────

/**
 * Loads the entry identified by the `:id` route param and delegates rendering of
 * the pre-populated edit form to EntryEditForm. Tri-state per useEntry:
 *   - undefined → Dexie still opening (loading)
 *   - null      → no matching entry (not-found guard with Back)
 *   - entry     → render the edit form
 */
export function EntryEditPage() {
  const id = useParams<{ id: string }>().id ?? ''
  const entry = useEntry(id)
  const navigate = useNavigate()

  if (entry === undefined) {
    return <p>Loading...</p>
  }

  if (entry === null) {
    return (
      <PageShell>
        <BackButton onClick={() => navigate('/entries')} />
        <p>Entry not found.</p>
      </PageShell>
    )
  }

  return <EntryEditForm entry={entry} />
}

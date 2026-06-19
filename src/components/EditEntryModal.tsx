import { useState, useRef, useEffect } from 'react'
import { ENTRY_FIELDS, formValuesFromEntry, buildEntryUpdate } from '../config/entryFields'
import { entriesRepository } from '../services/entriesRepository'
import { FormField } from './ui/FormField'
import { Button } from './ui/Button'
import type { LifeLogEntry } from '../services/db'

interface EditEntryModalProps {
  entry: LifeLogEntry
  onClose: () => void
}

export function EditEntryModal({ entry, onClose }: EditEntryModalProps) {
  const fields = ENTRY_FIELDS[entry.type]
  // Seed form state from existing entry — handles occurredAt local-date round-trip
  const [formValues, setFormValues] = useState<Record<string, string>>(
    () => formValuesFromEntry(fields, entry),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Synchronous double-submit guard for save — checked before any async await
  const savingRef = useRef(false)
  // IN-02: synchronous double-submit guard for delete
  const deletingRef = useRef(false)
  // WR-01: dialog container ref for focus management
  const dialogRef = useRef<HTMLDivElement>(null)

  // WR-01: Move focus into the dialog on mount so the Escape onKeyDown handler
  // is reachable via keyboard (key events bubble to the focused element's ancestors,
  // not to sibling/cousin subtrees like the button that opened the modal).
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  // WR-02: Body scroll lock — prevent background page scrolling while modal is open.
  // Mirrors the pattern used in ExpenseSheet.tsx.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  async function handleSave() {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      // buildEntryUpdate merges — NEVER replaces — metadata.
      // metadata.tripId / mode / modeLabel survive untouched (T-24-07).
      // Do NOT hand-roll any metadata merge; buildEntryUpdate is the authoritative path.
      const changes = buildEntryUpdate(fields, entry, formValues, {})
      await entriesRepository.update(entry.id, changes)
      onClose()
    } catch (_err) {
      setError('Could not save. Please try again.')
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  // WR-03: try/catch surfaces delete failures; IN-02: deletingRef prevents double-submit
  async function handleDelete() {
    if (deletingRef.current) return
    if (!confirm('Delete this entry? This cannot be undone.')) return
    deletingRef.current = true
    try {
      await entriesRepository.delete(entry.id)
      onClose()
    } catch (_err) {
      setError('Could not delete. Please try again.')
    } finally {
      deletingRef.current = false
    }
  }

  return (
    <>
      {/* Backdrop — dismisses on tap (mirrors ExpenseSheet.tsx pattern) */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Dialog panel — ref + tabIndex={-1} allow programmatic focus (WR-01) */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${entry.type}`}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
        className="fixed bottom-0 left-0 right-0 z-50
                   bg-[var(--color-background)] rounded-t-2xl
                   px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]
                   max-h-[90vh] overflow-y-auto outline-none"
      >
        {/* One FormField per ENTRY_FIELDS[entry.type] descriptor.
            currency is excluded: never populated by the trip Expense flow. */}
        <div className="flex flex-col gap-4 mb-4">
          {fields
            .filter((field) => field.key !== 'currency')
            .map((field) => (
              <FormField
                key={field.key}
                id={`edit-${field.key}`}
                label={field.label}
                required={field.required}
                value={formValues[field.key] ?? ''}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.placeholder}
                type={field.inputType === 'tags' ? 'text' : field.inputType}
                min={field.min}
                max={field.max}
              />
            ))}
        </div>

        {/* Save error */}
        {error && (
          <p role="alert" className="text-sm text-red-500 mb-3">
            {error}
          </p>
        )}

        {/* Cancel + Save */}
        <div className="flex gap-3">
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="flex-1"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>

        {/* Delete — separated below Cancel/Save for safety */}
        <Button
          variant="secondary"
          type="button"
          onClick={() => void handleDelete()}
          className="w-full mt-2"
        >
          Delete
        </Button>
      </div>
    </>
  )
}

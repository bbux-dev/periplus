/**
 * ExpenseSheet — fast expense-logging bottom sheet for trip captures.
 *
 * Cloned from HoleSheet's modal shell (backdrop, dialog panel, focus management,
 * body scroll lock, Cancel/Save buttons). Internals replaced with Amount input,
 * 8-button Category grid, optional Vendor, optional Notes.
 *
 * Save path: draftToEntry(draft, 'expense', 'trips', activeMode) → entriesRepository.create
 * Domain is the literal 'trips' — always hardcoded, never derived from a helper.
 * The trip UUID is auto-stamped by draftToEntry from activeMode — do NOT set it by hand.
 * occurredAt uses the LOCAL midnight helper — never UTC-based date strings.
 */

import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { cn } from '../ui/cn'
import { draftToEntry, todayLocalMidnightEpoch } from '../../services/captureService'
import type { ReviewDraft } from '../../services/captureService'
import { entriesRepository } from '../../services/entriesRepository'
import type { ActiveMode } from '../../services/activeMode'
import type { LifeLogEntry } from '../../services/db'
import { EXPENSE_CATEGORIES } from '../../config/expenseCategories'

// ── Props ──────────────────────────────────────────────────────────────────────

interface ExpenseSheetProps {
  isOpen: boolean
  activeMode: ActiveMode | null | undefined
  onSave: (entry: LifeLogEntry) => void
  onCancel: () => void
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ExpenseSheet({
  isOpen,
  activeMode,
  onSave,
  onCancel,
}: ExpenseSheetProps) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Move focus into the sheet on open (WCAG 2.1 SC 4.1.2)
  // The amount input has autoFocus, so this serves as a panelRef fallback.
  useEffect(() => {
    if (isOpen) {
      panelRef.current?.focus()
    }
  }, [isOpen])

  // Reset all form fields when the sheet opens so stale values don't carry over
  useEffect(() => {
    if (isOpen) {
      setAmount('')
      setCategory('')
      setVendor('')
      setNotes('')
      setError('')
    }
  }, [isOpen])

  // Body scroll lock: prevent background scroll while the modal is open
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // ── Validation ───────────────────────────────────────────────────────────────

  // Save gated: amount must be a positive number AND a category must be selected
  const parsedAmount = parseFloat(amount)
  const canSave =
    amount.trim() !== '' &&
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    category !== ''

  // ── Save handler ─────────────────────────────────────────────────────────────

  async function handleSave() {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0 || !category) {
      setError('Amount and category are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const draft: ReviewDraft = {
        amount: amt,
        // LOCAL midnight epoch — avoids UTC date off-by-one in negative UTC-offset zones
        occurredAt: todayLocalMidnightEpoch(),
        ...(notes.trim() ? { description: notes.trim() } : {}),
        metadata: {
          category,
          ...(vendor.trim() ? { merchant: vendor.trim() } : {}),
        },
      }
      // domain is the literal 'trips' — always hardcoded in the trip expense flow.
      // The trip UUID is auto-stamped by draftToEntry from activeMode (STAMP-02).
      const entryData = draftToEntry(draft, 'expense', 'trips', activeMode)
      const saved = await entriesRepository.create(entryData)
      onSave(saved)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop overlay — dismisses the sheet on tap */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Log expense"
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
        }}
        className="fixed bottom-0 left-0 right-0 z-50
                   bg-[var(--color-background)] rounded-t-2xl
                   px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]
                   max-h-[90vh] overflow-y-auto outline-none"
      >
        {/* Amount field — inputMode="decimal" gives numeric keyboard on mobile without
            type="number" stepper-arrow quirks */}
        <div className="mb-4">
          <label
            htmlFor="expense-amount"
            className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
          >
            Amount <span aria-hidden="true">*</span>
          </label>
          <input
            id="expense-amount"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]+"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            className={cn(
              'w-full rounded-md border px-3 py-2 text-2xl font-bold',
              'bg-[var(--color-background)] text-[var(--color-foreground)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
              !canSave && amount !== '' ? 'border-red-500' : 'border-[var(--color-border)]',
            )}
          />
        </div>

        {/* Category grid — large tap targets, toggle selection */}
        <div className="mb-4">
          <p className="text-sm font-medium text-[var(--color-foreground)] mb-2">
            Category <span aria-hidden="true">*</span>
          </p>
          <div className="grid grid-cols-4 gap-2">
            {EXPENSE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={category === cat}
                onClick={() => setCategory((prev) => (prev === cat ? '' : cat))}
                className={cn(
                  'h-14 rounded-lg text-sm font-medium transition-colors',
                  'active:opacity-75',
                  category === cat
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                    : 'bg-[var(--color-muted)] hover:bg-[var(--color-border)] text-[var(--color-foreground)]',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Vendor (optional) */}
        <div className="mb-4">
          <label
            htmlFor="expense-vendor"
            className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
          >
            Vendor
          </label>
          <input
            id="expense-vendor"
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Optional"
            className={cn(
              'w-full rounded-md border border-[var(--color-border)]',
              'bg-[var(--color-background)] text-[var(--color-foreground)]',
              'px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
            )}
          />
        </div>

        {/* Notes (optional) */}
        <div className="mb-4">
          <label
            htmlFor="expense-notes"
            className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
          >
            Notes
          </label>
          <input
            id="expense-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className={cn(
              'w-full rounded-md border border-[var(--color-border)]',
              'bg-[var(--color-background)] text-[var(--color-foreground)]',
              'px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
            )}
          />
        </div>

        {/* Validation error */}
        {error && (
          <p role="alert" className="text-sm text-red-500 mb-3">
            {error}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button variant="secondary" type="button" onClick={onCancel} className="flex-1">
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
      </div>
    </>
  )
}

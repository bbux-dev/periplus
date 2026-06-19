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

// Strict amount pattern — rejects "12.5.0", "1,500", "1abc", "1e2".
// Only plain decimal numbers are accepted (e.g. "42", "42.50", ".5").
const AMOUNT_RE = /^\d*\.?\d+$/

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
  const amountRef = useRef<HTMLInputElement>(null)
  // WR-02: synchronous double-submit guard — checked before async state re-render
  const savingRef = useRef(false)

  // Move focus to the amount input when the sheet opens (WCAG 2.1 SC 4.1.2).
  // Using a ref+effect instead of autoFocus so focus reliably lands on the
  // amount field even when the component is conditionally mounted.
  useEffect(() => {
    if (isOpen) {
      amountRef.current?.focus()
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

  // Save gated: amount must pass strict regex AND be positive; category must be selected.
  // parseFloat is only called after the regex ensures a parseable decimal string.
  const trimmedAmount = amount.trim()
  const canSave =
    trimmedAmount !== '' &&
    AMOUNT_RE.test(trimmedAmount) &&
    parseFloat(trimmedAmount) > 0 &&
    category !== ''

  // ── Save handler ─────────────────────────────────────────────────────────────

  async function handleSave() {
    // WR-02: synchronous double-submit guard before the async state re-render
    if (savingRef.current) return

    // CR-01: strict regex validation — rejects "12.5.0", "1,500", "1abc", "1e2"
    const trimmedAmt = amount.trim()
    if (!AMOUNT_RE.test(trimmedAmt) || parseFloat(trimmedAmt) <= 0 || !category) {
      setError('Amount and category are required.')
      return
    }

    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const amt = parseFloat(trimmedAmt)
      const draft: ReviewDraft = {
        // IN-02: title from category so entries are named in exports/timeline
        title: category,
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
    } catch (err) {
      // WR-01: surface save errors to the user
      console.error('ExpenseSheet save failed:', err)
      setError('Could not save. Please try again.')
    } finally {
      setSaving(false)
      savingRef.current = false
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
            type="number" stepper-arrow quirks. No pattern attribute — JS regex is
            the real validation (WR-05). */}
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
            ref={amountRef}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={cn(
              'w-full rounded-md border px-3 py-2 text-2xl font-bold',
              'bg-[var(--color-background)] text-[var(--color-foreground)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
              !canSave && amount !== '' ? 'border-red-500' : 'border-[var(--color-border)]',
            )}
          />
        </div>

        {/* Category grid — large tap targets, toggle selection.
            WR-06: role="group" + aria-labelledby for accessible grouping. */}
        <div className="mb-4">
          <p
            id="category-label"
            className="text-sm font-medium text-[var(--color-foreground)] mb-2"
          >
            Category <span aria-hidden="true">*</span>
          </p>
          <div role="group" aria-labelledby="category-label" className="grid grid-cols-4 gap-2">
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

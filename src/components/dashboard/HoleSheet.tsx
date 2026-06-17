/**
 * HoleSheet — fill-the-hole bottom sheet for shortcut captures.
 *
 * Presentational component driven by props. Owns fills state and live DSL
 * preview. Does NOT touch router, IndexedDB, or external services.
 *
 * CAP-02: keypad + presets + live DSL preview; Save gated until all holes filled.
 * RESEARCH §4 authoritative spec; no codebase analog (net-new construct).
 */

import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { cn } from '../ui/cn'
import { applyFills, buildDSLPreview } from '../../services/captureService'
import type { HoleMap } from '../../services/captureService'
import type { EntryType } from '../../services/db'

// ── Types ─────────────────────────────────────────────────────────────────────

interface HoleSheetProps {
  isOpen: boolean
  type: EntryType
  /** Forwarded to the parent's capture orchestrator; not used in rendering. */
  domain: string
  /** Clean template values (HOLE_TOKEN already stripped). */
  baseValues: Record<string, string>
  holeMap: HoleMap
  onSave: (filledValues: Record<string, string>) => void
  onCancel: () => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']
const AMOUNT_PRESETS = ['5', '10', '20', '50']

// ── Component ─────────────────────────────────────────────────────────────────

export function HoleSheet({
  isOpen,
  type,
  baseValues,
  holeMap,
  onSave,
  onCancel,
}: HoleSheetProps) {
  const [fills, setFills] = useState<Record<string, string>>({})
  const panelRef = useRef<HTMLDivElement>(null)

  // Move focus into the sheet on open (WCAG 2.1 SC 4.1.2)
  useEffect(() => {
    if (isOpen) {
      panelRef.current?.focus()
    }
  }, [isOpen])

  // Reset fills when the sheet opens so stale values don't carry over
  useEffect(() => {
    if (isOpen) setFills({})
  }, [isOpen])

  // Derive ordered holes: POSITIONAL_SCHEMA order first, then named (RESEARCH §4 ordering)
  const orderedHoles = [
    ...holeMap.positional.map((k) => ({ key: k, isAmount: k === 'amount' })),
    ...holeMap.named.map((k) => ({ key: k, isAmount: false })),
  ]

  // Live DSL preview — synchronous, no debounce (pure computation)
  const merged = applyFills(baseValues, fills)
  const preview = buildDSLPreview(type, merged)

  // Save gate: non-empty fill required for all holes; amount holes must parse as a
  // finite number (rejects lone '.', empty string, non-numeric input).
  const isValidFill = (hole: { key: string; isAmount: boolean }) => {
    const v = (fills[hole.key] ?? '').trim()
    if (!v) return false
    if (hole.isAmount) {
      const n = parseFloat(v)
      return !isNaN(n) && isFinite(n)
    }
    return true
  }
  const allFilled = orderedHoles.every(isValidFill)

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleKeypad = (key: string) => {
    setFills((prev) => {
      const current = prev['amount'] ?? ''
      if (key === '⌫') {
        return { ...prev, amount: current.slice(0, -1) }
      }
      if (key === '.') {
        // Prevent multiple decimal points
        if (current.includes('.')) return prev
        return { ...prev, amount: current + '.' }
      }
      return { ...prev, amount: current + key }
    })
  }

  const handlePreset = (amount: string) => {
    setFills((prev) => ({ ...prev, amount }))
  }

  const handleTextChange = (key: string, value: string) => {
    setFills((prev) => ({ ...prev, [key]: value }))
  }

  if (!isOpen) return null

  // ── Render ─────────────────────────────────────────────────────────────────

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
        aria-label="Fill in required fields"
        ref={panelRef}
        tabIndex={-1}
        className="fixed bottom-0 left-0 right-0 z-50
                   bg-[var(--color-background)] rounded-t-2xl
                   px-6 pt-6 pb-8 max-h-[85vh] overflow-y-auto outline-none"
      >
        {/* ── Per-hole inputs ──────────────────────────────────────────────── */}
        {orderedHoles.map((hole) =>
          hole.isAmount ? (
            <div key={hole.key} className="mb-4">
              {/* Big right-aligned amount display */}
              <div className="text-right text-4xl font-bold text-[var(--color-foreground)] mb-4 min-h-[2.5rem]">
                {fills['amount'] ?? ''}
              </div>

              {/* Quick-amount preset buttons */}
              <div className="flex gap-2 mb-4">
                {AMOUNT_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePreset(p)}
                    className={cn(
                      'flex-1 h-10 rounded-lg text-sm font-medium',
                      'bg-[var(--color-muted)] hover:bg-[var(--color-border)]',
                      'active:opacity-75 transition-colors',
                    )}
                  >
                    ${p}
                  </button>
                ))}
              </div>

              {/* 3-col × 4-row numeric keypad */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {KEYPAD_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-label={k === '⌫' ? 'Backspace' : k}
                    onClick={() => handleKeypad(k)}
                    className={cn(
                      'h-14 rounded-lg text-xl font-medium',
                      'bg-[var(--color-muted)] hover:bg-[var(--color-border)]',
                      'active:opacity-75 transition-colors',
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div key={hole.key} className="mb-4">
              <label
                htmlFor={`hole-${hole.key}`}
                className="block text-sm font-medium text-[var(--color-foreground)] mb-1 capitalize"
              >
                {hole.key}
              </label>
              <input
                id={`hole-${hole.key}`}
                type="text"
                value={fills[hole.key] ?? ''}
                onChange={(e) => handleTextChange(hole.key, e.target.value)}
                className={cn(
                  'w-full rounded-md border border-[var(--color-border)]',
                  'bg-[var(--color-background)] text-[var(--color-foreground)]',
                  'px-3 py-2 text-sm focus:outline-none',
                  'focus:ring-2 focus:ring-[var(--color-primary)]',
                )}
              />
            </div>
          ),
        )}

        {/* ── Live DSL preview ─────────────────────────────────────────────── */}
        <div className="font-mono text-sm text-[var(--color-primary)] mb-6 break-all">
          {preview}
        </div>

        {/* ── Action buttons ───────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            type="button"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            disabled={!allFilled}
            onClick={() => onSave(fills)}
            className="flex-1"
          >
            Save
          </Button>
        </div>
      </div>
    </>
  )
}

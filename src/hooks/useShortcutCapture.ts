/**
 * useShortcutCapture — capture decision tree for DashboardPage shortcut taps.
 *
 * Decision tree (RESEARCH §Capture Decision Flow — PITFALL 5: check confirm BEFORE holes):
 *   parseDSL(template)
 *     status !== 'ok' || !type → silent no-op
 *     shortcut.confirm → buildReviewDraft → navigate review (no IndexedDB write)
 *     !holeMap.hasHoles → draftToEntry → create → showToast(id)
 *     holeMap.hasHoles → setSheetState (HoleSheet fills; handleSheetSave saves)
 *
 * Toast lifecycle: auto-dismiss after 4000ms via timerRef (useRef avoids stale closure).
 * Undo: entriesRepository.delete(toastEntryId) + clearTimeout + setToastEntryId(null).
 * Unmount cleanup: clears any pending timer (RESEARCH Pitfall 4).
 *
 * No new dependencies — all imports are existing codebase modules.
 *
 * Single named export, no default export (PATTERNS.md shared convention).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ENTRY_FIELDS, buildReviewDraft } from '../config/entryFields'
import { defaultDomainForType } from '../config/navigation'
import { parseDSL } from '../services/dsl/parser'
import {
  detectHoles,
  cleanValues,
  applyFills,
  draftToEntry,
} from '../services/captureService'
import type { HoleMap } from '../services/captureService'
import { entriesRepository } from '../services/entriesRepository'
import type { EntryDomain, EntryType } from '../services/db'
import type { Shortcut } from '../config/shortcutConfig'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SheetState {
  type: EntryType
  domain: EntryDomain
  /** Clean template values — HOLE_TOKEN already stripped (Pitfall 1). */
  baseValues: Record<string, string>
  holeMap: HoleMap
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useShortcutCapture() {
  const navigate = useNavigate()
  const [toastEntryId, setToastEntryId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sheetState, setSheetState] = useState<SheetState | null>(null)

  // ── Toast helpers ──────────────────────────────────────────────────────────

  const showToast = useCallback((entryId: string) => {
    // Clear any prior timer before setting a new one (rapid-tap protection)
    if (timerRef.current) clearTimeout(timerRef.current)
    setToastEntryId(entryId)
    timerRef.current = setTimeout(() => setToastEntryId(null), 4000)
  }, [])

  // Clear timer on unmount to prevent state update on an unmounted component
  // (RESEARCH Pitfall 4).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // ── handleUndo ─────────────────────────────────────────────────────────────

  const handleUndo = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const id = toastEntryId
    // Guard: no-op if toast already dismissed (double-undo / undo-after-dismiss)
    if (!id) return
    try {
      await entriesRepository.delete(id)
      // Dismiss toast only after successful delete — avoids orphaned entry with
      // no retry path if IndexedDB write fails.
      setToastEntryId(null)
    } catch (err) {
      console.error('[useShortcutCapture] Failed to delete entry on undo:', err)
      // Toast intentionally kept visible so the user can retry.
    }
  }, [toastEntryId])

  // ── handleTap ─────────────────────────────────────────────────────────────

  const handleTap = useCallback(
    async (shortcut: Shortcut) => {
      const parsed = parseDSL(shortcut.dslTemplate)

      // Guard: bad template is a silent no-op (PATTERNS.md "Error guard: silent no-op")
      if (parsed.status !== 'ok' || !parsed.type) return

      const type = parsed.type
      const domain = defaultDomainForType(type)

      // PITFALL 5: check confirm BEFORE holes — ReviewPage is the hole-filler for confirm:true.
      if (shortcut.confirm) {
        const clean = cleanValues(parsed.values)
        const draft = buildReviewDraft(ENTRY_FIELDS[type], clean)
        navigate(`/d/${domain}/${type}/review`, { state: { draft } })
        return
      }

      // confirm:false — detect holes to decide: direct save vs sheet.
      // Compute clean once and reuse; detectHoles also cleans internally but
      // needs raw values for named-hole (HOLE_TOKEN) detection.
      const clean = cleanValues(parsed.values)
      const holeMap = detectHoles(type, parsed.values)

      if (!holeMap.hasHoles) {
        // Direct save path
        const draft = buildReviewDraft(ENTRY_FIELDS[type], clean)
        const entry = draftToEntry(draft, type, domain)
        try {
          const saved = await entriesRepository.create(entry)
          showToast(saved.id)
        } catch (err) {
          console.error('[useShortcutCapture] Failed to create entry:', err)
          // WR-05 (deferred): no user-visible error — see handleSheetSave comment.
        }
        return
      }

      // Fill-the-hole sheet path
      setSheetState({ type, domain, baseValues: clean, holeMap })
    },
    [navigate, showToast],
  )

  // ── handleSheetSave ───────────────────────────────────────────────────────

  const handleSheetSave = useCallback(
    async (fills: Record<string, string>) => {
      if (!sheetState) return
      const { type, domain, baseValues } = sheetState
      const merged = applyFills(baseValues, fills)
      const draft = buildReviewDraft(ENTRY_FIELDS[type], merged)
      const entry = draftToEntry(draft, type, domain)
      try {
        const saved = await entriesRepository.create(entry)
        setSheetState(null)
        showToast(saved.id)
      } catch (err) {
        console.error('[useShortcutCapture] Failed to save sheet entry:', err)
        // WR-05 (deferred): no user-visible error on create failure — needs a
        // new error affordance (saveError state + HoleSheet banner). Deferred
        // as out-of-scope for this polish pass; sheet stays open for retry.
      }
    },
    [sheetState, showToast],
  )

  // ── handleSheetCancel ─────────────────────────────────────────────────────

  const handleSheetCancel = useCallback(() => setSheetState(null), [])

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    handleTap,
    toastEntryId,
    handleUndo,
    sheetState,
    handleSheetSave,
    handleSheetCancel,
  }
}

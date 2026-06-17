/**
 * ShortcutFormPage — create or edit a shortcut (EDIT-01, EDIT-03, EDIT-04).
 *
 * Prefill sources (priority order):
 *   1. location.state.shortcut  → edit mode (all four fields)
 *   2. location.state.dslTemplate → omnibar "Save as Shortcut" (EDIT-03)
 *   3. empty → new shortcut form (direct navigation — Pitfall 4 null guard)
 *
 * Write path (T-15-05 fresh-read, T-15-01 validate gate):
 *   configRepository.get() → addShortcut/updateShortcut → validateShortcutConfig → put
 *
 * Threat mitigations:
 *   T-15-01  validateTemplate gates Save; validateShortcutConfig before every put
 *   T-15-03  icon constrained to SHORTCUT_ICON_MAP keys via IconPicker
 *   T-15-04  all config strings rendered as React text nodes (no dangerouslySetInnerHTML)
 *   T-15-05  handleSave reads FRESH via configRepository.get()
 */

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
import {
  useShortcutConfig,
  useActiveLayoutName,
  configRepository,
} from '../services/configRepository'
import { validateShortcutConfig } from '../services/configValidator'
import { addShortcut, updateShortcut } from '../services/shortcutMutations'
import { validateTemplate } from '../services/templateValidator'
import type { Shortcut } from '../config/shortcutConfig'
import { FormField } from '../components/ui/FormField'
import { Button } from '../components/ui/Button'
import { IconPicker } from '../components/dashboard/IconPicker'
import { cn } from '../components/ui/cn'

// ─── Status badge styles (mirrors QuickCapturePage) ──────────────────────────

const STATUS_STYLES = {
  valid:   'bg-green-500/15 text-green-600 dark:text-green-400',
  invalid: 'bg-red-500/15 text-red-500',
} as const

// ─── ShortcutFormPage ─────────────────────────────────────────────────────────

export function ShortcutFormPage() {
  const navigate = useNavigate()
  const goBack = useBackOrHome('/manage')

  // ── Config hooks (always called unconditionally) ──────────────────────────
  const config = useShortcutConfig()
  const activeLayoutName = useActiveLayoutName()

  // ── Location state — guard null (Pitfall 4: direct navigation / refresh) ─
  const { state } = useLocation() as {
    state?: { dslTemplate?: string; layoutName?: string; shortcut?: Shortcut } | null
  }
  const prefill = state ?? {}

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName] = useState(prefill.shortcut?.name ?? '')
  const [icon, setIcon] = useState<string | undefined>(prefill.shortcut?.icon)
  const [dslTemplate, setDslTemplate] = useState(
    prefill.shortcut?.dslTemplate ?? prefill.dslTemplate ?? '',
  )
  const [confirm, setConfirm] = useState(prefill.shortcut?.confirm ?? false)
  // Initialize layout selection from prefill; fall back after config loads
  const [selectedLayout, setSelectedLayout] = useState(prefill.layoutName ?? '')
  const [saveError, setSaveError] = useState<string | null>(null)

  const isEditing = !!prefill.shortcut

  // ── Loading gate ──────────────────────────────────────────────────────────
  if (config === undefined) return <p>Loading...</p>

  const layouts = config.layouts

  // Effective layout: explicit user choice → active layout → first layout
  const effectiveSelectedLayout =
    selectedLayout || activeLayoutName || layouts[0]?.name || ''

  // ── Live parse validation — computed inline (not state) ───────────────────
  // T-15-01: validateTemplate(parseDSL) — no eval, no Function ctor
  const templateResult = validateTemplate(dslTemplate)

  // ── Save gate ─────────────────────────────────────────────────────────────
  const canSave =
    name.trim() !== '' && dslTemplate.trim() !== '' && templateResult.valid

  // ── Save handler ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!canSave) return
    setSaveError(null)
    try {
      // T-15-05: read FRESH config — not the hook closure
      const current = await configRepository.get()
      if (!current) return

      // Config strings rendered as React text nodes — T-15-04
      const shortcut: Shortcut = {
        name: name.trim(),
        icon,
        dslTemplate: dslTemplate.trim(),
        confirm,
      }

      const next = isEditing
        ? updateShortcut(current, effectiveSelectedLayout, prefill.shortcut!.name, shortcut)
        : addShortcut(current, effectiveSelectedLayout, shortcut)

      // T-15-01: defense-in-depth validation before every put
      const vr = validateShortcutConfig(next)
      if (!vr.ok) {
        setSaveError(vr.reason)
        return
      }

      await configRepository.put(vr.config)
      navigate('/manage')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">

        {/* Back button */}
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditing ? 'Edit Shortcut' : 'New Shortcut'}
        </h1>

        {/* Save error (e.g. duplicate name thrown by helper) */}
        {saveError && (
          <p role="alert" className="text-sm text-red-500">
            {saveError}
          </p>
        )}

        {/* Name field */}
        <FormField
          id="shortcut-name"
          label="Name"
          placeholder="e.g. Coffee"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Icon picker (allow-list grid — T-15-03) */}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--color-foreground)]">Icon</span>
          <IconPicker value={icon} onChange={setIcon} />
        </div>

        {/* DSL Template field with live EDIT-04 error */}
        <FormField
          id="shortcut-template"
          label="DSL Template"
          placeholder="expense :food"
          value={dslTemplate}
          onChange={(e) => setDslTemplate(e.target.value)}
          error={
            dslTemplate.trim() !== '' && !templateResult.valid
              ? templateResult.error
              : undefined
          }
          helpText="e.g. expense :food  or  movie :  or  expense 5:coffee"
        />

        {/* Live valid/invalid badge — shown only when template is non-empty */}
        {dslTemplate.trim() !== '' && (
          <span
            className={cn(
              'self-start text-xs font-semibold uppercase px-2 py-0.5 rounded',
              templateResult.valid ? STATUS_STYLES.valid : STATUS_STYLES.invalid,
            )}
          >
            {templateResult.valid ? 'valid' : 'invalid'}
          </span>
        )}

        {/* Confirm toggle */}
        <div className="flex items-center gap-2">
          <input
            id="shortcut-confirm"
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          <label
            htmlFor="shortcut-confirm"
            className="text-sm font-medium text-[var(--color-foreground)]"
          >
            Show review screen before saving
          </label>
        </div>

        {/* Layout chooser */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="shortcut-layout"
            className="text-sm font-medium text-[var(--color-foreground)]"
          >
            Layout
          </label>
          <select
            id="shortcut-layout"
            value={effectiveSelectedLayout}
            onChange={(e) => setSelectedLayout(e.target.value)}
            className="border border-[var(--color-border)] rounded px-2 py-1 text-sm
                       bg-[var(--color-background)] text-[var(--color-foreground)]
                       focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            {layouts.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Save / Cancel */}
        <Button variant="primary" onClick={handleSave} disabled={!canSave}>
          {isEditing ? 'Update Shortcut' : 'Save Shortcut'}
        </Button>
        <Button variant="secondary" onClick={goBack}>
          Cancel
        </Button>

      </div>
    </div>
  )
}

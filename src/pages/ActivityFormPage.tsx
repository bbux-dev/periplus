import { useState, useRef } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { activeModeRepository } from '../services/activeMode'
import type { ActiveMode } from '../services/activeMode'
import { draftToEntry, todayLocalMidnightEpoch } from '../services/captureService'
import type { ReviewDraft } from '../services/captureService'
import { entriesRepository } from '../services/entriesRepository'
import { ACTIVITY_TYPES } from '../config/activityTypes'
import { FormField } from '../components/ui/FormField'
import { Button } from '../components/ui/Button'
import { StarRating } from '../components/ui/StarRating'

export function ActivityFormPage() {
  const { type } = useParams<{ type: string }>()

  // Recover canonical label: 'hike' → 'Hike', unknown slug → 'Other'
  const canonicalType = ACTIVITY_TYPES.find(
    (t) => t.toLowerCase() === type,
  ) ?? 'Other'
  const isOther = canonicalType === 'Other'

  // Settled-signal guard — mirrors TripHomePage lines 18-28.
  // Returns { ready: false, mode: undefined } synchronously until Dexie resolves.
  const result = useLiveQuery<
    { ready: true; mode: ActiveMode | null },
    { ready: false; mode: undefined }
  >(
    async () => {
      const mode = await activeModeRepository.get()
      return { ready: true, mode: mode ?? null }
    },
    [],
    { ready: false, mode: undefined },
  )

  // ALL hooks declared before early returns to keep React hook order stable.
  const navigate = useNavigate()
  const goBack = useBackOrHome('/')

  const [name, setName] = useState('')
  // Use locationValue to avoid shadowing the global window.location
  const [locationValue, setLocationValue] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState(0)
  // activityTypeField: only meaningful when isOther
  const [activityTypeField, setActivityTypeField] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  // WR-02: synchronous double-submit guard — checked before any async re-render
  const savingRef = useRef(false)

  // ── Guard: early returns AFTER all hooks ────────────────────────────────────

  if (!result.ready) {
    // Dexie still opening — neutral loading element; do NOT redirect yet
    return (
      <p className="text-sm text-[var(--color-muted)] p-8">Loading…</p>
    )
  }

  if (!result.mode || result.mode.mode !== 'trip') {
    // Confirmed no active trip → redirect straight to create-trip (mirrors TripHomePage)
    return <Navigate to="/create-trip" replace />
  }

  // result.mode is ActiveMode — safe to pass to draftToEntry
  const activeMode = result.mode

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Name is required.'
    if (isOther && !activityTypeField.trim()) errs.activityType = 'Type is required.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Save handler ────────────────────────────────────────────────────────────

  async function handleSave() {
    // Synchronous double-submit guard — must run before any await
    if (savingRef.current) return
    if (!validate()) return

    savingRef.current = true
    setSaving(true)
    try {
      const draft: ReviewDraft = {
        // Name → core.title (ENTRY_FIELDS.activity 'name' key)
        title: name.trim(),
        // Location → core.location (optional — omit when blank)
        ...(locationValue.trim() ? { location: locationValue.trim() } : {}),
        // Notes → core.description (optional — omit when blank)
        ...(notes.trim() ? { description: notes.trim() } : {}),
        // occurredAt: LOCAL midnight epoch — NEVER new Date().toISOString() or UTC
        occurredAt: todayLocalMidnightEpoch(),
        metadata: {
          // Rating → metadata.rating (optional — omit when unset)
          ...(rating > 0 ? { rating } : {}),
          // activityType: canonical label for preset types; user free-text for Other
          // (ENTRY_FIELDS.activity 'activityType' key → metadata.activityType)
          // tripId is AUTO-STAMPED by draftToEntry from activeMode — do NOT set it here
          activityType: isOther ? activityTypeField.trim() : canonicalType,
        },
      }
      // domain is the literal 'trips' — never derived from a helper
      const entryData = draftToEntry(draft, 'activity', 'trips', activeMode)
      await entriesRepository.create(entryData)
      navigate('/')
    } catch (err) {
      console.error('ActivityFormPage save failed:', err)
      setErrors({ _form: 'Could not save. Please try again.' })
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

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

        <h1 className="text-2xl font-bold tracking-tight">{canonicalType}</h1>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void handleSave()
          }}
          className="flex flex-col gap-4"
        >
          <FormField
            id="activity-name"
            label="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            placeholder="Activity name"
          />

          {/* Type field — only rendered when slug resolves to 'Other' */}
          {isOther && (
            <FormField
              id="activity-type"
              label="Type"
              required
              value={activityTypeField}
              onChange={(e) => setActivityTypeField(e.target.value)}
              error={errors.activityType}
              placeholder="Describe the activity"
            />
          )}

          <FormField
            id="activity-location"
            label="Location"
            value={locationValue}
            onChange={(e) => setLocationValue(e.target.value)}
            placeholder="Optional"
          />

          {/* Rating — optional StarRating (0 = unset) */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="activity-rating"
              className="text-sm font-medium text-[var(--color-foreground)]"
            >
              Rating
            </label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <FormField
            id="activity-notes"
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />

          {/* Form-level save error */}
          {errors._form && (
            <p role="alert" className="text-sm text-red-500">
              {errors._form}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={goBack}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

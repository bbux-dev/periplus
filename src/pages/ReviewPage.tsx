import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { getDomainConfig } from '../config/navigation'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { FormField } from '../components/ui/FormField'
import { Button } from '../components/ui/Button'
import { entriesRepository } from '../services/entriesRepository'
import { isSafeUrl } from '../services/urlUtils'
import { draftToEntry, todayLocalDate, typeHasDateField } from '../services/captureService'
import type { ReviewDraft } from '../services/extractMetadataFromUrl'
import type { EntryDomain, EntryType } from '../services/db'

export function ReviewPage() {
  const { domain = '', type = '' } = useParams<{ domain: string; type: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = useBackOrHome(`/d/${domain}`)
  const config = getDomainConfig(domain)
  const typeConfig = config?.types.find((t) => t.type === type)

  const initialDraft = (location.state as { draft?: ReviewDraft } | null)?.draft

  // Guard: no draft (direct navigation / refresh) — Pitfall 3 / T-04-09
  useEffect(() => {
    if (!initialDraft) {
      navigate(`/d/${domain}/${type}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Return null while guard redirect fires — hooks-safe (useState called unconditionally below)
  const [title, setTitle] = useState(initialDraft?.title ?? '')
  const [location_, setLocation_] = useState(initialDraft?.location ?? '')
  const [description, setDescription] = useState(initialDraft?.description ?? '')
  const [sourceUrl, setSourceUrl] = useState(initialDraft?.sourceUrl ?? '')
  const [saveError, setSaveError] = useState<string | null>(null)
  // WR-02: synchronous in-flight guard (ref) + UI disabled state (useState)
  const savingRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)

  // NEW: Manual-entry fields threaded from ReviewDraft → LifeLogEntry
  // WR-03: use toLocaleDateString('en-CA') → 'YYYY-MM-DD' in local tz (toISOString is UTC)
  // DATE-01: when the draft carries no date and the type has a date field, default
  // to today's local date — a DEFAULT the user sees and can still clear, not a lock.
  const [occurredAt, setOccurredAt] = useState(
    initialDraft?.occurredAt
      ? new Date(initialDraft.occurredAt).toLocaleDateString('en-CA')
      : typeHasDateField(type as EntryType)
        ? todayLocalDate()
        : '',
  )
  const [amount, setAmount] = useState(
    initialDraft?.amount != null ? String(initialDraft.amount) : '',
  )
  const [tags, setTags] = useState(initialDraft?.tags?.join(', ') ?? '')

  // Guard: unknown domain — IN-02: full layout + Back button (mirrors ManualEntryPage)
  if (!config) {
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
          <p>Unknown domain: <strong>{domain}</strong></p>
        </div>
      </div>
    )
  }

  // Guard: unknown type — IN-02: full layout + Back button (mirrors ManualEntryPage)
  if (!typeConfig) {
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
          <p>Unknown type: <strong>{type}</strong> in domain <strong>{domain}</strong></p>
        </div>
      </div>
    )
  }

  if (!initialDraft) {
    return null
  }

  const handleSave = async () => {
    // WR-02: prevent duplicate saves from rapid double-clicks
    if (savingRef.current) return
    savingRef.current = true
    setIsSaving(true)
    setSaveError(null)
    // Validate sourceUrl scheme — never persist javascript: or other unsafe protocols (T-13-04)
    const safeSourceUrl = sourceUrl && isSafeUrl(sourceUrl) ? sourceUrl : undefined
    // Parse manual-entry numeric + date fields
    const parsedAmount = parseFloat(amount)
    // WR-03: local midnight — appending T00:00:00 makes the spec parse as local, not UTC
    const parsedDate   = occurredAt ? Date.parse(`${occurredAt}T00:00:00`) : NaN
    const parsedTags   = tags.split(',').map((t) => t.trim()).filter(Boolean)
    // Assemble ReviewDraft from form state; draftToEntry is the single construction site.
    // See: src/services/captureService.ts draftToEntry (shared contract — RESEARCH Pitfall 3).
    const formDraft: ReviewDraft = {
      title,
      location:    location_    || undefined,
      description: description  || undefined,
      sourceUrl:   safeSourceUrl,                                         // isSafeUrl gate above
      amount:      !isNaN(parsedAmount) ? parsedAmount : undefined,
      occurredAt:  !isNaN(parsedDate)   ? parsedDate   : undefined,
      tags:        parsedTags,
      metadata:    initialDraft.metadata ?? {},
    }
    try {
      await entriesRepository.create(draftToEntry(formDraft, type as EntryType, domain as EntryDomain))
      navigate(`/d/${domain}`)
    } catch (err) {
      setSaveError('Save failed. Please try again.')
      console.error('[ReviewPage] save failed:', err)
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

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
        <h1 className="text-2xl font-bold tracking-tight">
          Review {typeConfig?.label ?? type}
        </h1>
        <FormField
          id="review-title"
          label="Title"
          placeholder="Enter a title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <FormField
          id="review-location"
          label="Location"
          placeholder="Enter a location..."
          value={location_}
          onChange={(e) => setLocation_(e.target.value)}
        />
        <FormField
          id="review-description"
          label="Description"
          placeholder="Add a description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <FormField
          id="review-source-url"
          label="Source URL"
          placeholder="https://..."
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
        {/* Always shown — useful for all types */}
        <FormField
          id="review-occurred-at"
          label="Date"
          type="date"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
        />
        {/* Shown only when this is an expense or the draft already carries an amount */}
        {(type === 'expense' || initialDraft.amount != null) && (
          <FormField
            id="review-amount"
            label="Amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        )}
        {/* Always shown — useful for all types */}
        <FormField
          id="review-tags"
          label="Tags"
          placeholder="tag1, tag2"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        {saveError && (
          <p role="alert" className="text-sm text-red-500">{saveError}</p>
        )}
        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

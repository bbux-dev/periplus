import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { getDomainConfig } from '../config/navigation'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { FormField } from '../components/ui/FormField'
import { Button } from '../components/ui/Button'
import { entriesRepository } from '../services/entriesRepository'
import type { ExtractedDraft } from '../services/extractMetadataFromUrl'
import type { EntryDomain, EntryType } from '../services/db'

export function ReviewPage() {
  const { domain = '', type = '' } = useParams<{ domain: string; type: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = useBackOrHome(`/d/${domain}`)
  const config = getDomainConfig(domain)
  const typeConfig = config?.types.find((t) => t.type === type)

  const initialDraft = (location.state as { draft?: ExtractedDraft } | null)?.draft

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
  const [description, setDescription] = useState('')
  const [sourceUrl, setSourceUrl] = useState(initialDraft?.sourceUrl ?? '')
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!initialDraft) {
    return null
  }

  const handleSave = async () => {
    setSaveError(null)
    // Build the full Omit<LifeLogEntry, 'id'> — every required field present (Pitfall 5)
    const entry = {
      domain: domain as EntryDomain,
      type: type as EntryType,
      title: title.trim() || 'Untitled',
      recordedAt: Date.now(),
      tags: [] as string[],
      metadata: initialDraft.metadata ?? {},
      syncedAt: null as number | null,
      // Optional fields — omit when empty
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(location_ ? { location: location_ } : {}),
      ...(description ? { description } : {}),
    }
    try {
      await entriesRepository.create(entry)
      navigate(`/d/${domain}`)
    } catch (err) {
      setSaveError('Save failed. Please try again.')
      console.error('[ReviewPage] save failed:', err)
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
        {saveError && (
          <p role="alert" className="text-sm text-red-500">{saveError}</p>
        )}
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { getDomainConfig } from '../config/navigation'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { FormField } from '../components/ui/FormField'
import { Button } from '../components/ui/Button'
import { extractMetadataFromUrl } from '../services/extractMetadataFromUrl'
import type { EntryType } from '../services/db'

export function CaptureUrlPage() {
  const { domain = '', type = '' } = useParams<{ domain: string; type: string }>()
  const navigate = useNavigate()
  const goBack = useBackOrHome(`/d/${domain}`)
  const config = getDomainConfig(domain)
  const typeConfig = config?.types.find((t) => t.type === type)

  const [url, setUrl] = useState('')

  const handleImport = () => {
    const draft = extractMetadataFromUrl(url.trim(), type as EntryType)
    navigate(`/d/${domain}/${type}/review`, { state: { draft } })
  }

  const handleManual = () => {
    navigate(`/d/${domain}/${type}/manual`)
  }

  // Guard: unknown domain — mirrors EntryTypePage behavior
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
          <p>
            Unknown domain: <strong>{domain}</strong>
          </p>
        </div>
      </div>
    )
  }

  // Guard: unknown type within the domain — prevents persisting an invalid EntryType
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
          <p>
            Unknown type: <strong>{type}</strong> in domain <strong>{domain}</strong>
          </p>
        </div>
      </div>
    )
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
          Add {typeConfig?.label ?? type}
        </h1>
        <FormField
          id="capture-url"
          label="URL"
          placeholder="Paste a URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          variant="primary"
          onClick={handleImport}
          disabled={!url.trim()}
        >
          Import from URL
        </Button>
        <Button variant="secondary" onClick={handleManual}>
          Enter Manually
        </Button>
      </div>
    </div>
  )
}

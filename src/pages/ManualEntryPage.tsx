import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { getDomainConfig } from '../config/navigation'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { FormField } from '../components/ui/FormField'
import { Button } from '../components/ui/Button'
import { ENTRY_FIELDS, buildReviewDraft } from '../config/entryFields'
import type { EntryType } from '../services/db'

export function ManualEntryPage() {
  const { domain = '', type = '' } = useParams<{ domain: string; type: string }>()
  const navigate = useNavigate()
  const goBack = useBackOrHome(`/d/${domain}`)
  const config = getDomainConfig(domain)
  const typeConfig = config?.types.find((t) => t.type === type)
  const fields = ENTRY_FIELDS[type as EntryType] ?? []

  // Form state: one string value per field key, lazy-initialized to ''
  // Lazy initializer runs once on mount — params don't change after mount in this app
  const [formValues, setFormValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.key, ''])),
  )
  // WR-01: validation error shown when required fields are empty on Review click
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleChange = (key: string, value: string) =>
    setFormValues((prev) => ({ ...prev, [key]: value }))

  const handleReview = () => {
    // WR-01: pre-flight check — block Review when required fields are empty
    const missingFields = fields.filter((f) => f.required && !formValues[f.key]?.trim())
    if (missingFields.length > 0) {
      setValidationError(`Required: ${missingFields.map((f) => f.label).join(', ')}`)
      return
    }
    setValidationError(null)
    const draft = buildReviewDraft(fields, formValues)
    navigate(`/d/${domain}/${type}/review`, { state: { draft } })
  }

  // Guard: unknown domain — mirrors CaptureUrlPage behavior (T-05-04)
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

  // Guard: unknown type within the domain — prevents persisting an invalid EntryType (T-05-04)
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
          Add {typeConfig.label}
        </h1>
        {fields.map((field) => (
          <FormField
            key={field.key}
            id={`manual-${field.key}`}
            label={field.label}
            // 'tags' is a semantic inputType label, not an HTML attribute; map to 'text' (Pitfall 7)
            type={field.inputType === 'tags' ? 'text' : field.inputType}
            placeholder={field.placeholder}
            required={field.required}  // WR-01: wire through so HTML required attr is set
            value={formValues[field.key] ?? ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
          />
        ))}
        {/* WR-01: show validation error when required fields are empty */}
        {validationError && (
          <p role="alert" className="text-sm text-red-500">{validationError}</p>
        )}
        <Button variant="primary" onClick={handleReview}>
          Review
        </Button>
        <Button variant="secondary" onClick={goBack}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

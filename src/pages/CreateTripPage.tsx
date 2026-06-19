import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { createAndActivateTrip } from '../services/tripService'

export function CreateTripPage() {
  const goBack = useBackOrHome('/')
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await createAndActivateTrip(name.trim())
      navigate('/')
    } finally {
      setSaving(false)
    }
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
        <h1 className="text-2xl font-bold tracking-tight">Create a Trip</h1>
        <form
          onSubmit={(e) => { e.preventDefault(); void handleSave() }}
          className="flex flex-col gap-4"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Trip name"
            className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] text-sm"
            aria-label="Trip name"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            aria-disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-md border border-[var(--color-border)]
                       text-sm font-medium hover:bg-[var(--color-muted)] transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}

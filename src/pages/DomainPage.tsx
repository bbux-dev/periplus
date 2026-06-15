import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { getDomainConfig } from '../config/navigation'

export function DomainPage() {
  const { domain = '' } = useParams<{ domain: string }>()
  const navigate = useNavigate()
  const config = getDomainConfig(domain)

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-[var(--color-foreground)]">
        <p>Unknown domain: {domain}</p>
      </div>
    )
  }

  const { label, types } = config

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-2xl font-bold tracking-tight">{label}</h1>
        {types.map(({ type, label: typeLabel, icon: Icon }) => (
          <Link
            key={type}
            to={`/d/${domain}/${type}`}
            className="flex items-center gap-4 min-h-[64px] px-4 rounded-lg
                       border border-[var(--color-border)] bg-[var(--color-muted)]
                       hover:bg-[var(--color-border)] active:opacity-75
                       transition-colors"
          >
            <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
            <span className="text-lg font-medium">{typeLabel}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

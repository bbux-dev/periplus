import { Link } from 'react-router-dom'
import { QueueListIcon, BoltIcon } from '@heroicons/react/24/outline'
import { NAVIGATION } from '../config/navigation'

export function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Life Log</h1>
        <Link
          to="/capture"
          className="flex items-center gap-4 min-h-[64px] px-4 rounded-lg
                     border border-[var(--color-primary)] bg-[var(--color-primary)]
                     text-[var(--color-primary-foreground)] hover:opacity-90 active:opacity-75
                     transition-opacity"
        >
          <BoltIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
          <span className="text-lg font-medium">Quick Capture</span>
        </Link>
        {NAVIGATION.map(({ domain, label, icon: Icon }) => (
          <Link
            key={domain}
            to={`/d/${domain}`}
            className="flex items-center gap-4 min-h-[64px] px-4 rounded-lg
                       border border-[var(--color-border)] bg-[var(--color-muted)]
                       hover:bg-[var(--color-border)] active:opacity-75
                       transition-colors"
          >
            <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
            <span className="text-lg font-medium">{label}</span>
          </Link>
        ))}
        <Link
          to="/entries"
          className="flex items-center gap-4 min-h-[64px] px-4 rounded-lg
                     border border-[var(--color-border)] bg-[var(--color-muted)]
                     hover:bg-[var(--color-border)] active:opacity-75
                     transition-colors"
        >
          <QueueListIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
          <span className="text-lg font-medium">View All Entries</span>
        </Link>
      </div>
    </div>
  )
}

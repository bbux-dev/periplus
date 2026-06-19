import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { ACTIVITY_TYPES } from '../config/activityTypes'
import { cn } from '../components/ui/cn'

export function ActivityTypePage() {
  const goBack = useBackOrHome('/')
  const navigate = useNavigate()

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

        <h1 className="text-2xl font-bold tracking-tight">Log Activity</h1>

        <div className="grid grid-cols-2 gap-3">
          {ACTIVITY_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => navigate(`/activity/${type.toLowerCase()}`)}
              className={cn(
                'h-20 rounded-xl text-base font-semibold transition-colors',
                'bg-[var(--color-muted)] hover:bg-[var(--color-border)]',
                'text-[var(--color-foreground)] active:opacity-75',
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

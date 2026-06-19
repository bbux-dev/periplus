import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline'
import { cn } from './cn'

const STARS = [1, 2, 3, 4, 5] as const

interface StarRatingProps {
  value: number // 0 = unset/cleared
  onChange: (n: number) => void
}

export function StarRating({ value, onChange }: StarRatingProps) {
  function handleKeyDown(e: React.KeyboardEvent, n: number) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      onChange(Math.min(5, n + 1))
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onChange(Math.max(0, n - 1))
    }
  }

  return (
    <div role="group" aria-label="Rating" className="flex gap-1">
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={value === n}
          onClick={() => onChange(value === n ? 0 : n)}
          onKeyDown={(e) => handleKeyDown(e, n)}
          className={cn(
            'h-11 w-11 flex items-center justify-center rounded-full',
            'transition-colors active:opacity-75',
            n <= value ? 'text-amber-400' : 'text-[var(--color-border)]',
          )}
        >
          {n <= value ? (
            <StarIcon className="h-7 w-7" aria-hidden="true" />
          ) : (
            <StarIconOutline className="h-7 w-7" aria-hidden="true" />
          )}
        </button>
      ))}
    </div>
  )
}

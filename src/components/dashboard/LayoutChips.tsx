import { cn } from '../ui/cn'
import type { Layout } from '../../config/shortcutConfig'

interface LayoutChipsProps {
  layouts: Layout[]
  activeLayoutName: string | undefined
  onSelect: (name: string) => void
}

export function LayoutChips({ layouts, activeLayoutName, onSelect }: LayoutChipsProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
      aria-label="Layout switcher"
    >
      {layouts.map((layout) => (
        <button
          key={layout.name}
          type="button"
          aria-pressed={activeLayoutName === layout.name}
          onClick={() => onSelect(layout.name)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold',
            'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
            activeLayoutName === layout.name
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)]'
              : 'bg-[var(--color-background)] text-[var(--color-foreground)] border-[var(--color-border)] hover:bg-[var(--color-muted)]',
          )}
        >
          {layout.name}
        </button>
      ))}
      {/* TODO Phase 15: authoring tool entry point — disabled placeholder */}
      <button
        type="button"
        disabled
        className="shrink-0 cursor-default whitespace-nowrap rounded-full border border-dashed
                   px-4 py-1.5 text-sm font-semibold text-[var(--color-border)]"
      >
        + New
      </button>
    </div>
  )
}

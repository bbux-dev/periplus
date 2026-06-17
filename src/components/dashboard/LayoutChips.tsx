import { cn } from '../ui/cn'
import type { Layout } from '../../config/shortcutConfig'

// ─── LayoutChips ──────────────────────────────────────────────────────────────
//
// Horizontal scrollable chip row for layout selection + "+ New" entry point.
// onManage is optional: when provided, the "+ New" chip is shown as an active
// button that calls onManage; when omitted (e.g. ManageShortcutsPage), the
// chip is hidden (the manage page has its own "Add Shortcut" button).

interface LayoutChipsProps {
  layouts: Layout[]
  activeLayoutName: string | undefined
  onSelect: (name: string) => void
  /** When provided, activates the "+ New" chip to call this handler. */
  onManage?: () => void
}

export function LayoutChips({ layouts, activeLayoutName, onSelect, onManage }: LayoutChipsProps) {
  return (
    <div
      role="group"
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
      {/* Phase 15: authoring tool entry point — shown only when onManage is wired */}
      {onManage !== undefined && (
        <button
          type="button"
          onClick={onManage}
          className="shrink-0 whitespace-nowrap rounded-full border border-dashed
                     px-4 py-1.5 text-sm font-semibold text-[var(--color-foreground)]
                     hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          + New
        </button>
      )}
    </div>
  )
}

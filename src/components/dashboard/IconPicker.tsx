import { cn } from '../ui/cn'
import { SHORTCUT_ICON_MAP, resolveShortcutIcon } from '../../config/shortcutConfig'

// ─── IconPicker ──────────────────────────────────────────────────────────────
//
// Accessible grid picker constrained to SHORTCUT_ICON_MAP keys.
// Each button renders the corresponding Heroicon with aria-pressed reflecting
// selection state. No free-form icon input — allow-list only.
//
// Threat mitigation T-15-03: only Object.keys(SHORTCUT_ICON_MAP) are
// selectable; resolveShortcutIcon falls back to BoltIcon for unknown keys.

interface IconPickerProps {
  value: string | undefined
  onChange: (key: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div role="group" aria-label="Icon" className="flex flex-wrap gap-2">
      {Object.keys(SHORTCUT_ICON_MAP).map((key) => {
        const Icon = resolveShortcutIcon(key)
        const isSelected = value === key
        return (
          <button
            key={key}
            type="button"
            aria-label={key.replace('Icon', '')}
            aria-pressed={isSelected}
            onClick={() => onChange(key)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md border',
              'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
              isSelected
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

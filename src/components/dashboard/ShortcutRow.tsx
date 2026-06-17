import { resolveShortcutIcon } from '../../config/shortcutConfig'
import type { Shortcut } from '../../config/shortcutConfig'

interface ShortcutRowProps {
  shortcut: Shortcut
  onClick: () => void
}

export function ShortcutRow({ shortcut, onClick }: ShortcutRowProps) {
  const Icon = resolveShortcutIcon(shortcut.icon)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 min-h-[64px] px-4 rounded-lg
                 border border-[var(--color-border)] bg-[var(--color-background)]
                 hover:bg-[var(--color-muted)] active:opacity-75 transition-colors text-left"
    >
      <span className="flex w-7 shrink-0 justify-center text-[var(--color-primary)]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-base font-semibold">{shortcut.name}</span>
        <span className="font-mono text-xs text-[var(--color-border)]">{shortcut.dslTemplate}</span>
      </span>
    </button>
  )
}

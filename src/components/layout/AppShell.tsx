import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  HomeIcon,
  Bars3Icon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { NAVIGATION } from '../../config/navigation'
import { cn } from '../ui/cn'
import { Input } from '../ui/Input'
import { useShortcutConfig } from '../../services/configRepository'
import {
  useActiveMode,
  activateMode,
  defaultInstanceLabel,
  listModes,
} from '../../services/activeMode'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const wrapperRef = useRef<HTMLDivElement>(null)

  // ─── Active mode (MODE-03 / MODE-04) ──────────────────────────────────────
  const activeMode = useActiveMode()
  const config = useShortcutConfig()
  const modes = config ? listModes(config) : []
  const [modeSubmenuOpen, setModeSubmenuOpen] = useState(false)
  const [pendingMode, setPendingMode] = useState<string | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')

  function resetModeMenu() {
    setModeSubmenuOpen(false)
    setPendingMode(null)
    setPendingLabel('')
  }

  function selectPendingMode(mode: string) {
    setPendingMode(mode)
    setPendingLabel(defaultInstanceLabel(mode))
  }

  async function confirmPendingMode() {
    if (pendingMode === null) return
    await activateMode(pendingMode, pendingLabel)
    resetModeMenu()
    setOpen(false)
  }

  // Close on Escape while menu is open
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  // Close on outside mousedown while menu is open
  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  // Reset the Active Mode submenu whenever the dropdown closes.
  useEffect(() => {
    if (!open) {
      setModeSubmenuOpen(false)
      setPendingMode(null)
      setPendingLabel('')
    }
  }, [open])

  function toggleDomain(domain: string) {
    setExpanded((prev) => ({ ...prev, [domain]: !prev[domain] }))
  }

  return (
    <div>
      <header
        className={cn(
          'sticky top-0 z-50',
          'bg-[var(--color-background)] border-b border-[var(--color-border)]',
        )}
      >
        {/* wrapperRef covers the hamburger button AND the dropdown panel */}
        <div ref={wrapperRef} className="relative">
          {/* Top bar row */}
          <div className="w-full max-w-sm mx-auto flex items-center justify-between px-6 h-14">
            {/* LEFT — home button (hidden at '/') */}
            <div className="flex-1 flex justify-start">
              {pathname !== '/' && (
                <button
                  aria-label="Go home"
                  onClick={() => navigate('/')}
                  className="text-[var(--color-primary)]"
                >
                  <HomeIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* CENTER — active mode · label (MODE-04) */}
            <div className="flex-1 min-w-0 px-2 text-center">
              {activeMode && (
                <span className="block truncate text-sm font-medium text-[var(--color-foreground)]">
                  {activeMode.mode} · {activeMode.label}
                </span>
              )}
            </div>

            {/* RIGHT — hamburger */}
            <div className="flex-1 flex justify-end">
              <button
                aria-label="Toggle navigation menu"
                aria-expanded={open}
                aria-controls="app-nav-menu"
                onClick={() => setOpen((v) => !v)}
                className="text-[var(--color-foreground)]"
              >
                <Bars3Icon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* DROPDOWN — visible when open */}
          {open && (
            <nav
              id="app-nav-menu"
              className={cn(
                'absolute left-0 right-0 z-40',
                'bg-[var(--color-background)] border-b border-[var(--color-border)]',
                'w-full max-w-sm mx-auto',
                'px-6 py-3 flex flex-col gap-1',
              )}
            >
              {/* Top-level links */}
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="py-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
              >
                Dashboard
              </Link>
              <Link
                to="/entries"
                onClick={() => setOpen(false)}
                className="py-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
              >
                Entries
              </Link>
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="py-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
              >
                Settings
              </Link>
              <Link
                to="/manage"
                onClick={() => setOpen(false)}
                className="py-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
              >
                Manage Shortcuts
              </Link>

              {/* Active Mode switcher (MODE-03) */}
              <div className="flex flex-col border-t border-[var(--color-border)] mt-1 pt-1">
                <button
                  type="button"
                  aria-expanded={modeSubmenuOpen}
                  onClick={() => setModeSubmenuOpen((v) => !v)}
                  className="flex items-center justify-between py-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
                >
                  <span>Active Mode</span>
                  <ChevronDownIcon
                    className={cn(
                      'h-4 w-4 transition-transform',
                      modeSubmenuOpen ? 'rotate-180' : '',
                    )}
                    aria-hidden="true"
                  />
                </button>

                {modeSubmenuOpen && (
                  <div className="pl-4 flex flex-col gap-0.5">
                    {pendingMode === null ? (
                      modes.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => selectPendingMode(mode)}
                          className="py-1.5 text-left text-sm text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
                        >
                          {mode}
                        </button>
                      ))
                    ) : (
                      <div className="flex flex-col gap-2 py-1.5">
                        <label
                          htmlFor="active-mode-label"
                          className="text-xs font-medium text-[var(--color-muted)]"
                        >
                          Instance label for {pendingMode}
                        </label>
                        <Input
                          id="active-mode-label"
                          value={pendingLabel}
                          onChange={(e) => setPendingLabel(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { void confirmPendingMode() }}
                            className="rounded-md px-3 py-1.5 text-sm font-semibold bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => { setPendingMode(null); setPendingLabel('') }}
                            className="rounded-md px-3 py-1.5 text-sm font-semibold border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Nav tree from NAVIGATION (single source of truth) */}
              {NAVIGATION.map(({ domain, label, types }) => (
                <div key={domain} className="flex flex-col">
                  {/* Domain row: label link + expander button */}
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/d/${domain}`}
                      onClick={() => setOpen(false)}
                      className="py-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
                    >
                      {label}
                    </Link>
                    <button
                      aria-label={`Expand ${label}`}
                      aria-expanded={!!expanded[domain]}
                      onClick={() => toggleDomain(domain)}
                      className="p-1 text-[var(--color-muted)]"
                    >
                      <ChevronDownIcon
                        className={cn(
                          'h-4 w-4 transition-transform',
                          expanded[domain] ? 'rotate-180' : '',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  {/* Entry type links (visible when domain is expanded) */}
                  {expanded[domain] && (
                    <div className="pl-4 flex flex-col gap-0.5">
                      {types.map(({ type, label: typeLabel }) => (
                        <Link
                          key={type}
                          to={`/d/${domain}/${type}`}
                          onClick={() => setOpen(false)}
                          className="py-1.5 text-sm text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
                        >
                          {typeLabel}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Routed page content flows below the sticky bar */}
      {children}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  HomeIcon,
  Bars3Icon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { NAVIGATION } from '../../config/navigation'
import { cn } from '../ui/cn'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const wrapperRef = useRef<HTMLDivElement>(null)

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
            <div>
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

            {/* RIGHT — hamburger */}
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

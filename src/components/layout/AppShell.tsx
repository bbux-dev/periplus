import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  HomeIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import { cn } from '../ui/cn'
import { useActiveMode } from '../../services/activeMode'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const activeMode = useActiveMode()

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

            {/* CENTER — active trip name (shown only when mode === 'trip') */}
            <div className="flex-1 min-w-0 px-2 text-center">
              {activeMode?.mode === 'trip' && (
                <span className="block truncate text-sm font-medium text-[var(--color-foreground)]">
                  {activeMode.label}
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
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="py-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
              >
                Home
              </Link>
              <Link
                to="/trips"
                onClick={() => setOpen(false)}
                className="py-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
              >
                Previous Trips
              </Link>
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="py-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
              >
                Settings
              </Link>
            </nav>
          )}
        </div>
      </header>

      {/* Routed page content flows below the sticky bar */}
      {children}
    </div>
  )
}

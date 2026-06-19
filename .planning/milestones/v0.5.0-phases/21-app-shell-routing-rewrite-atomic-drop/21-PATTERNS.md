# Phase 21: App Shell + Routing Rewrite + Atomic Drop - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 10 (5 rewrites/new pages + 2 new tests + 3 import-site changes)
**Analogs found:** 10 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/App.tsx` | route-config | request-response | `src/App.tsx` (itself) | exact |
| `src/components/layout/AppShell.tsx` | layout-component | request-response | `src/components/layout/AppShell.tsx` (itself) | exact |
| `src/pages/SettingsPage.tsx` | page | request-response | `src/pages/SettingsPage.tsx` (itself) | exact |
| `src/pages/CreateTripPage.tsx` | page | request-response | `src/pages/ManualEntryPage.tsx` + `PlaceholderPage.tsx` | role-match |
| `src/pages/CreateTripPage.test.tsx` | test | — | `src/services/tripService.test.tsx` | role-match |
| `src/pages/TripHomePage.tsx` | page | CRUD | `src/services/activeMode.test.tsx` (hook pattern) | role-match |
| `src/pages/TripHomePage.test.tsx` | test | — | `src/services/tripService.test.tsx` | role-match |
| `src/services/captureService.ts` (import change) | service | — | itself | exact |
| `src/config/entryFields.ts` (import change) | config | — | itself | exact |
| `src/services/activeMode.ts` (remove `listModes`) | service | — | itself | exact |

---

## Pattern Assignments

### `src/App.tsx` (route-config, rewrite)

**Analog:** itself — keep the `<AppShell>` wrapper + `<Routes>/<Route>` structure exactly; replace all 13 route elements.

**Imports pattern to keep** (lines 1–14 of current file, trimmed):
```tsx
import { Routes, Route } from 'react-router-dom'
import { AppShell }        from './components/layout/AppShell'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SettingsPage }    from './pages/SettingsPage'
// + new page imports: TripHomePage, CreateTripPage
// (stubs for later phases: PlaceholderPage reused with descriptive title)
```

**Core route structure to keep** (lines 17–52):
```tsx
function App() {
  return (
    <AppShell>
      <Routes>
        {/* trip routes */}
        <Route path="/" element={<TripHomePage />} />
        <Route path="/create-trip" element={<CreateTripPage />} />
        {/* Phase 22-23 placeholders — reuse PlaceholderPage with title */}
        <Route path="/expense"           element={<PlaceholderPage title="Log Expense" />} />
        <Route path="/activity"          element={<PlaceholderPage title="Log Activity" />} />
        <Route path="/activity/:type"    element={<PlaceholderPage title="Activity Form" />} />
        <Route path="/trips"             element={<PlaceholderPage title="Previous Trips" />} />
        <Route path="/trips/:tripId"     element={<PlaceholderPage title="Trip Detail" />} />
        <Route path="/settings"          element={<SettingsPage />} />
        {/* Catch-all: unknown paths show a graceful not-found page */}
        <Route path="*" element={<PlaceholderPage title="Page Not Found" />} />
      </Routes>
    </AppShell>
  )
}
export default App
```

**Catch-all pattern** (line 48 of current file):
```tsx
<Route path="*" element={<PlaceholderPage title="Page Not Found" />} />
```
Copy verbatim — this pattern is tested in `App.test.tsx` lines 57–68.

---

### `src/components/layout/AppShell.tsx` (layout-component, rewrite)

**Analog:** itself — keep the sticky-header skeleton, hamburger toggle, Escape/outside-click handlers, and the `useActiveMode()` center display. Strip all `NAVIGATION`, `useShortcutConfig`, `listModes`, `LayoutChips`, mode-switcher, and domain-tree sections.

**Imports pattern — KEEP these, DROP the rest** (lines 1–17 of current file):
```tsx
// KEEP:
import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { HomeIcon, Bars3Icon } from '@heroicons/react/24/outline'
import { cn } from '../ui/cn'
import { useActiveMode } from '../../services/activeMode'

// DROP (these imports vanish):
// import { NAVIGATION }          from '../../config/navigation'
// import { Input }               from '../ui/Input'
// import { useShortcutConfig }   from '../../services/configRepository'
// import { activateMode, defaultInstanceLabel, listModes } from '../../services/activeMode'
```

**State — KEEP these, DROP the rest** (lines 22–31):
```tsx
// KEEP:
const { pathname } = useLocation()
const navigate = useNavigate()
const [open, setOpen] = useState(false)
const wrapperRef = useRef<HTMLDivElement>(null)
const activeMode = useActiveMode()

// DROP: expanded, modeSubmenuOpen, pendingMode, pendingLabel
// DROP: toggleDomain, selectPendingMode, confirmPendingMode, resetModeMenu
```

**Escape + outside-click handlers — KEEP verbatim** (lines 53–72):
```tsx
useEffect(() => {
  if (!open) return
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false)
  }
  document.addEventListener('keydown', handleKey)
  return () => document.removeEventListener('keydown', handleKey)
}, [open])

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
```

**App bar + hamburger — KEEP this structure** (lines 88–134):
```tsx
<header className={cn('sticky top-0 z-50', 'bg-[var(--color-background)] border-b border-[var(--color-border)]')}>
  <div ref={wrapperRef} className="relative">
    <div className="w-full max-w-sm mx-auto flex items-center justify-between px-6 h-14">
      {/* LEFT — home button (hidden at '/') */}
      <div className="flex-1 flex justify-start">
        {pathname !== '/' && (
          <button aria-label="Go home" onClick={() => navigate('/')} className="text-[var(--color-primary)]">
            <HomeIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
      {/* CENTER — active trip name (replaces "mode · label") */}
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

    {/* DROPDOWN */}
    {open && (
      <nav id="app-nav-menu" className={cn(
        'absolute left-0 right-0 z-40',
        'bg-[var(--color-background)] border-b border-[var(--color-border)]',
        'w-full max-w-sm mx-auto',
        'px-6 py-3 flex flex-col gap-1',
      )}>
        <Link to="/"        onClick={() => setOpen(false)} className="py-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)]">Home</Link>
        <Link to="/trips"   onClick={() => setOpen(false)} className="py-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)]">Previous Trips</Link>
        <Link to="/settings" onClick={() => setOpen(false)} className="py-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)]">Settings</Link>
      </nav>
    )}
  </div>
</header>
```

**Children slot — KEEP verbatim** (lines 292–296):
```tsx
{/* Routed page content flows below the sticky bar */}
{children}
```

---

### `src/pages/SettingsPage.tsx` (page, rewrite to export-only)

**Analog:** itself — keep the page scaffold, Back button, and export-button pattern. Drop all import/config-port logic.

**Page scaffold pattern** (lines 56–60 of current file):
```tsx
<div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
  <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
```
Copy verbatim — used by all pages in the project.

**Back button pattern** (lines 59–67 of current file):
```tsx
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'

const goBack = useBackOrHome('/')
// ...
<button onClick={goBack} className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1" aria-label="Go back">
  <ChevronLeftIcon className="h-5 w-5" />
  <span className="text-sm font-medium">Back</span>
</button>
```

**Export button pattern — REPOINT to `exportEntries.ts`** (lines 33–39 of current file, adapted):
```tsx
// OLD (drops configPort):
// import { buildConfigExportJson, triggerDownload } from '../services/configPort'
// function handleExport() { triggerDownload(buildConfigExportJson(currentConfig, Date.now()), 'life-log-shortcuts.json') }

// NEW:
import { entriesRepository } from '../services/entriesRepository'
import { buildExportJson, triggerDownload } from '../services/exportEntries'

async function handleExport() {
  const entries = await entriesRepository.list()
  triggerDownload(buildExportJson(entries, Date.now()), 'life-log.json')
}
```

**Export button element** (lines 70–78 of current file, keep the CSS verbatim):
```tsx
<button
  onClick={() => { void handleExport() }}
  className="px-4 py-2 rounded-md border border-[var(--color-border)]
             text-sm font-medium hover:bg-[var(--color-muted)] transition-colors"
>
  Export JSON
</button>
```

**Imports to DROP:**
```
useShortcutConfig, buildConfigExportJson, importConfig, triggerDownload from configPort,
ImportResult type, fileInputRef, importStatus state, handleFileChange, file input element,
Import JSON button, import status messages
```

---

### `src/pages/CreateTripPage.tsx` (page, new, request-response)

**Analog:** `src/pages/PlaceholderPage.tsx` for page scaffold + Back button; `src/services/tripService.ts` `createAndActivateTrip` for the save call; `src/App.test.tsx` for the `navigate('/')` pattern.

**Imports pattern:**
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { createAndActivateTrip } from '../services/tripService'
```

**Page scaffold** — copy verbatim from `PlaceholderPage.tsx` lines 11–22:
```tsx
<div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
  <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
    <button onClick={goBack} className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1" aria-label="Go back">
      <ChevronLeftIcon className="h-5 w-5" />
      <span className="text-sm font-medium">Back</span>
    </button>
    <h1 className="text-2xl font-bold tracking-tight">Create a Trip</h1>
    {/* name input + Save */}
  </div>
</div>
```

**Save-and-navigate pattern** — derived from `tripService.createAndActivateTrip` + `useNavigate`:
```tsx
const navigate = useNavigate()
const [name, setName] = useState('')

async function handleSave() {
  if (!name.trim()) return
  await createAndActivateTrip(name)
  navigate('/')
}
```

**Button CSS** — copy the outline-button style from `SettingsPage.tsx` lines 70–78:
```tsx
<button
  onClick={() => { void handleSave() }}
  className="px-4 py-2 rounded-md border border-[var(--color-border)]
             text-sm font-medium hover:bg-[var(--color-muted)] transition-colors"
>
  Save
</button>
```

---

### `src/pages/CreateTripPage.test.tsx` (test, new)

**Analog:** `src/services/tripService.test.tsx` for Dexie setup + `act()` pattern; `src/pages/ManualEntryPage.test.tsx` for MemoryRouter + probe-route navigation assertion.

**Test file structure** (from `tripService.test.tsx` lines 1–19 + `ManualEntryPage.test.tsx` lines 1–4):
```tsx
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { activeModeRepository } from '../services/activeMode'
import { CreateTripPage } from './CreateTripPage'
```

**Dexie reset pattern** (from `tripService.test.tsx` lines 176–183 — copy verbatim):
```tsx
beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})
```

**Navigation assertion pattern** (from `ManualEntryPage.test.tsx` lines 12–28, adapted):
```tsx
it('fills name + saves → navigates to /', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/create-trip']}>
      <Routes>
        <Route path="/create-trip" element={<CreateTripPage />} />
        <Route path="/" element={<div data-testid="home-probe">Home</div>} />
      </Routes>
    </MemoryRouter>
  )
  const input = await screen.findByRole('textbox')   // trip name input
  await user.type(input, 'Paris')
  await user.click(screen.getByRole('button', { name: /save/i }))
  expect(await screen.findByTestId('home-probe')).toBeInTheDocument()
})
```

**Active mode assertion after save** — use `activeModeRepository.get()` inside `act()`:
```tsx
it('persists activeMode with mode=trip after save', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/create-trip']}>
      <Routes>
        <Route path="/create-trip" element={<CreateTripPage />} />
        <Route path="/" element={<div data-testid="home-probe" />} />
      </Routes>
    </MemoryRouter>
  )
  await user.type(await screen.findByRole('textbox'), 'Tokyo')
  await user.click(screen.getByRole('button', { name: /save/i }))
  await screen.findByTestId('home-probe')
  const stored = await activeModeRepository.get()
  expect(stored?.mode).toBe('trip')
  expect(stored?.label).toBe('Tokyo')
})
```

**Fake-timers guard** (from `tripService.test.tsx` line 210 — ONLY `toFake: ['Date']`):
```tsx
vi.useFakeTimers({ toFake: ['Date'] })
// NEVER vi.useFakeTimers() without toFake — full fake timers stall Dexie IndexedDB writes
```

---

### `src/pages/TripHomePage.tsx` (page, new, STUB)

**Analog:** `src/services/activeMode.test.tsx` for the `useActiveMode()` undefined-loading-vs-empty pattern (lines 146–156); `src/services/tripService.test.tsx` lines 293–312 for the `useTrips()` loading guard.

**Critical: loading-vs-no-trip guard pattern.**

`useActiveMode()` returns `undefined` for BOTH "Dexie loading" and "no trip set". To distinguish them, use a second `useLiveQuery` call that resolves to `true` once the DB is open (uses a default value of `false`):

```tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { useActiveMode } from '../services/activeMode'
import { db } from '../services/db'

export function TripHomePage() {
  const navigate = useNavigate()
  const activeMode = useActiveMode()

  // Settled signal: false until Dexie opens and the query resolves to true.
  // The `false` default means "not yet loaded" — safe to show the loading skeleton.
  // useLiveQuery with a default: returns the default synchronously, then the
  // query result once Dexie fires. (See PITFALLS Pitfall 2.)
  const dbReady = useLiveQuery(
    () => db.settings.count().then(() => true as const),
    [],
    false as const,
  )

  if (!dbReady) {
    // Dexie still opening — neutral loading skeleton (no flash of empty state)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    )
  }

  if (!activeMode || activeMode.mode !== 'trip') {
    // Dexie is open, confirmed no active trip → redirect
    navigate('/create-trip', { replace: true })
    return null
  }

  // STUB: Phase 22 fills this in with expense total, recent entries, CTAs
  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{activeMode.label}</h1>
        <p className="text-sm text-[var(--color-muted)]">Trip home — coming in Phase 22.</p>
      </div>
    </div>
  )
}
```

**Why `db.settings.count()` as the settled signal:** it is the cheapest possible read on the same DB instance that `useActiveMode` reads from. Once this resolves, Dexie is fully open and `useActiveMode()` will have received its first value.

---

### `src/pages/TripHomePage.test.tsx` (test, new)

**Analog:** `src/services/tripService.test.tsx` (hook rendering pattern, lines 293–312); `src/services/activeMode.test.tsx` (act + put pattern, lines 152–178).

**Structure:**
```tsx
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { activeModeRepository } from '../services/activeMode'
import { TripHomePage } from './TripHomePage'

beforeEach(async () => {
  await db.delete()
  await db.open()
})
afterEach(() => { vi.useRealTimers() })
```

**Loading skeleton test** (mirrors `tripService.test.tsx` line 300–303):
```tsx
it('shows loading state before Dexie resolves', async () => {
  // Re-delete DB so Dexie is "closed" — not awaiting open
  await db.delete()
  render(<MemoryRouter><TripHomePage /></MemoryRouter>)
  // Skeleton renders synchronously
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
})
```

**Redirect test** (mirrors `activeMode.test.tsx` lines 152–157):
```tsx
it('redirects to /create-trip when no active trip', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<TripHomePage />} />
        <Route path="/create-trip" element={<div data-testid="create-probe" />} />
      </Routes>
    </MemoryRouter>
  )
  expect(await screen.findByTestId('create-probe')).toBeInTheDocument()
})
```

**Active trip test** (mirrors `activeMode.test.tsx` lines 158–166 act+put pattern):
```tsx
it('shows trip name when active trip exists', async () => {
  await act(async () => {
    await activeModeRepository.put({ mode: 'trip', label: 'Paris', tripId: 'uuid-1' })
  })
  render(<MemoryRouter><TripHomePage /></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: 'Paris' })).toBeInTheDocument()
})
```

---

### `src/services/captureService.ts` — import-site change for `ReviewDraft`

**Change:** Line 15 of `captureService.ts` currently reads:
```typescript
import type { ReviewDraft } from './extractMetadataFromUrl'
```
After moving the `ReviewDraft` interface into `captureService.ts`, this import disappears. The interface is declared directly in the file (no import needed — it's now defined here):
```typescript
// Add this block at the top of captureService.ts, replacing the import:
export interface ReviewDraft {
  sourceUrl?: string
  title?: string
  location?: string
  description?: string
  occurredAt?: number
  amount?: number
  tags?: string[]
  metadata: Record<string, unknown>
}
```
(Copy the interface verbatim from `extractMetadataFromUrl.ts` lines 19–28.)

**`captureService.test.ts` import-site change** — line 15 of `captureService.test.ts`:
```typescript
// OLD:
import type { ReviewDraft } from './extractMetadataFromUrl'
// NEW:
import type { ReviewDraft } from './captureService'
```

---

### `src/config/entryFields.ts` — import-site change for `ReviewDraft`

**Change:** Line 3 of `entryFields.ts` currently reads:
```typescript
import type { ReviewDraft } from '../services/extractMetadataFromUrl'
```
After the move, this becomes:
```typescript
import type { ReviewDraft } from '../services/captureService'
```
No other changes to `entryFields.ts` in this phase.

---

### `src/services/activeMode.ts` — remove `listModes` and `ShortcutConfig` import

**Lines to remove:**
```typescript
// Line 3 — DROP:
import type { ShortcutConfig } from '../config/shortcutConfig'

// Lines 92–95 — DROP the entire listModes function:
/** Lists the available mode names — the layout names of the shortcut config, in order. */
export function listModes(config: ShortcutConfig): string[] {
  return config.layouts.map((l) => l.name)
}
```

**Lines to keep:** Everything else in `activeMode.ts` (lines 1–90): the `ActiveMode` interface with `tripId?`, `activeModeRepository`, `useActiveMode`, `defaultInstanceLabel`, and `activateMode` with the optional `tripId` param.

**Verify no remaining callers before deleting:** The only callers of `listModes` are `AppShell.tsx` (line 29: `const modes = config ? listModes(config) : []`) and `activeMode.test.tsx` (line 9: import + lines 134–142 tests). The AppShell rewrite removes the call; `activeMode.test.tsx` must have those test cases deleted simultaneously. All other callers (`NAVIGATION`, shortcut pages) are in the DROP list.

---

## Shared Patterns

### Dexie test setup
**Source:** `src/services/tripService.test.tsx` lines 176–183
**Apply to:** All new test files that touch Dexie (`CreateTripPage.test.tsx`, `TripHomePage.test.tsx`)
```typescript
beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})
```

### Fake timers — ONLY `toFake: ['Date']`
**Source:** `src/services/activeMode.test.tsx` line 70; `src/services/tripService.test.tsx` line 210
**Apply to:** Any test that needs to control `Date.now()` or `new Date()`
```typescript
vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(new Date('2026-06-19T10:00:00'))
// NEVER: vi.useFakeTimers() — full fake timers stall awaited IndexedDB writes
```

### MemoryRouter page test scaffold
**Source:** `src/pages/ManualEntryPage.test.tsx` lines 12–29; `src/App.test.tsx` lines 9–16
**Apply to:** `CreateTripPage.test.tsx`, `TripHomePage.test.tsx`
```tsx
render(
  <MemoryRouter initialEntries={['/target-path']}>
    <Routes>
      <Route path="/target-path" element={<PageUnderTest />} />
      <Route path="/destination" element={<div data-testid="probe" />} />
    </Routes>
  </MemoryRouter>
)
```

### Page scaffold (layout)
**Source:** `src/pages/PlaceholderPage.tsx` lines 11–27; `src/pages/SettingsPage.tsx` lines 56–60
**Apply to:** `CreateTripPage.tsx`, `TripHomePage.tsx`, new `SettingsPage.tsx`
```tsx
<div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
  <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
    {/* back button, heading, content */}
  </div>
</div>
```

### useLiveQuery undefined loading guard
**Source:** `src/services/activeMode.test.tsx` `ActiveModeTest` component (lines 146–150); `src/services/tripService.test.tsx` `TripsTest` (lines 293–296)
**Apply to:** Any component reading a `useLiveQuery` hook that has no default value
```tsx
const value = useSomeHook()  // undefined = Dexie opening
if (value === undefined) return <p>Loading</p>
// array hooks: [] is resolved-and-empty, distinct from undefined
// ActiveMode hook: both loading and no-mode return undefined → use dbReady signal (see TripHomePage)
```

### Back-button pattern
**Source:** `src/pages/PlaceholderPage.tsx` lines 1–2, 9, 13–19
**Apply to:** All new pages that are not the root `/` page
```tsx
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'

const goBack = useBackOrHome('/')
// ...
<button onClick={goBack} className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1" aria-label="Go back">
  <ChevronLeftIcon className="h-5 w-5" />
  <span className="text-sm font-medium">Back</span>
</button>
```

---

## No Analog Found

No files in this phase lack analogs. All patterns are derivable from existing code.

---

## Import-Site Change Summary

| File | Line | Old import | New import |
|------|------|-----------|-----------|
| `src/services/captureService.ts` | 15 | `from './extractMetadataFromUrl'` | (removed — interface declared here) |
| `src/services/captureService.test.ts` | 15 | `from './extractMetadataFromUrl'` | `from './captureService'` |
| `src/config/entryFields.ts` | 3 | `from '../services/extractMetadataFromUrl'` | `from '../services/captureService'` |
| `src/components/layout/AppShell.tsx` | 8 | `from '../../config/navigation'` | (removed — no navigation config) |
| `src/components/layout/AppShell.tsx` | 11 | `from '../../services/configRepository'` | (removed) |
| `src/components/layout/AppShell.tsx` | 16–17 | `activateMode, defaultInstanceLabel, listModes` from activeMode | keep only `useActiveMode` |
| `src/services/activeMode.ts` | 3 | `import type { ShortcutConfig }` | (removed) |

---

## Metadata

**Analog search scope:** `src/pages/`, `src/services/`, `src/components/layout/`, `src/App.tsx`
**Files scanned:** 10 source files + 6 test files
**Pattern extraction date:** 2026-06-19

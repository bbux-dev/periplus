# Phase 3: Navigation & Dashboard — Research

**Researched:** 2026-06-15
**Domain:** react-router-dom v7 (Declarative Mode), navigation config pattern, RTL routing tests, Tailwind v4 mobile-first layout
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

All implementation choices are at Claude's discretion — discuss skipped per `workflow.skip_discuss=true`.
Use ROADMAP goal/criteria, the LifeLogEntry taxonomy already in `src/services/db.ts`
(EntryDomain / EntryType), the LOCKED stack, and Phase 1/2 conventions.

Stack LOCKED: React + react-router-dom, Tailwind v4 CSS-first, heroicons, mobile-first.

Navigation taxonomy (from success criteria — must match `EntryDomain`/`EntryType` model from Phase 2):
- Media → Show, Movie, Book, Podcast
- Trips → Place, Event, Expense
- Expenditures → Expense

Pages live under `src/pages/`; routing wired in `App.tsx`/`main.tsx` (react-router-dom).
Mirror the WelcomePage pattern from Phase 1.

Phone-sized layout; every screen reachable via the router; browser Back returns up
the navigation tree.

### Claude's Discretion

All implementation choices are at Claude's discretion — discuss skipped per
`workflow.skip_discuss=true`. Use ROADMAP goal/criteria, the LifeLogEntry taxonomy already in
`src/services/db.ts` (EntryDomain / EntryType), the LOCKED stack, and Phase 1/2 conventions.

### Deferred Ideas (OUT OF SCOPE)

None — discuss skipped. Capture forms and entry detail are later phases.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | Home Dashboard shows three root nodes — Media, Trips, Expenditures | DashboardPage at `/` renders one tile per `NAVIGATION` config entry; 3 entries drive 3 tiles |
| NAV-02 | Category screen shows the entry types for the selected root (Media: Show/Movie/Book/Podcast; Trips: Place/Event/Expense; Expenditures: Expense) | DomainPage at `/d/:domain` reads `useParams().domain`, looks up `NAVIGATION` config, renders that domain's `types[]` list |
| NAV-03 | react-router-dom v7 route table covers all 7 screens (Dashboard, Category, URL Capture, Manual Entry, Review, Entry List, Entry Detail) | App.tsx wires 7 routes; only Dashboard and Category get real content in Phase 3; the remaining 5 are minimal placeholder pages |
| NAV-04 | Layout is mobile-first and usable on phone-sized screens | Match WelcomePage container pattern: `w-full max-w-sm mx-auto` with `px-6 py-8`; touch targets ≥ 48px via `min-h-12` on tiles |
</phase_requirements>

---

## Summary

Phase 3 adds the navigation spine of Life Log: a Home Dashboard listing three domains,
a Category screen that shows each domain's entry types, and a complete route table covering
all 7 screens named in NAV-03. Screens 3–7 are stubs in this phase — reachable and labeled
but with no capture logic.

The project already has react-router-dom v7.17.0 installed and running in **Declarative Mode**
(`BrowserRouter` + `Routes` + `Route` in `main.tsx`/`App.tsx`). No migration to
`createBrowserRouter` or `RouterProvider` is needed — Declarative Mode is the explicit
react-router v7 recommendation for SPAs that do not use loaders or actions.
[VERIFIED: reactrouter.com/start/modes]

The navigation tree is derived from a single `src/config/navigation.ts` module that maps each
`EntryDomain` to its label, heroicon, and ordered `EntryType[]`. This keeps the dashboard,
domain screens, and all future capture phases reading from one config rather than duplicating
the taxonomy from `src/services/db.ts`.

RTL routing tests use `MemoryRouter` + `Routes` + `Route` wrapping (the pattern already
established in `WelcomePage.test.tsx`). Full-app navigation tests render `<App />` inside
`MemoryRouter` with `initialEntries`. Back navigation is tested by asserting the previous
screen renders after a back-button click that calls `navigate(-1)`.

**Primary recommendation:** Keep Declarative Mode. Create `src/config/navigation.ts` as the
single nav-tree source of truth. Wire all 7 routes in `App.tsx`. Replace the `/` route with
`DashboardPage`; leave `WelcomePage.tsx` and `Counter.tsx` in place (removed in Phase 4).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Route matching & history | Browser (react-router-dom) | — | Client-side SPA; BrowserRouter wraps the whole app in main.tsx |
| Dashboard domain tiles | Browser (React component) | — | DashboardPage reads NAVIGATION config and renders links |
| Domain → entry-type list | Browser (React component) | — | DomainPage reads useParams().domain, looks up NAVIGATION config |
| Navigation config | Config module (src/config/) | — | navigation.ts is a pure JS/TS constant; no runtime or network calls |
| Back navigation | Browser (History API) | react-router-dom | navigate(-1) calls History API; browser manages the stack |
| PWA offline routing | CDN/Static (Workbox SW) | Browser (react-router-dom) | navigateFallback serves /index.html for cold navigations; RR handles the rest |
| Layout / touch targets | Browser (Tailwind v4 CSS) | — | CSS custom properties + utility classes; no runtime JS styling |

---

## Standard Stack

No new packages are required for Phase 3. All dependencies are already installed.

### Already Installed (confirmed from package.json)

| Library | Installed Version | Purpose | Notes |
|---------|------------------|---------|-------|
| react-router-dom | ^7.17.0 (resolves to 7.17.0) | Client-side routing | Already wired in main.tsx |
| @heroicons/react | ^2.2.0 | Navigation icons | Already installed; icon names confirmed in node_modules |
| @testing-library/user-event | ^14.6.1 | Simulate clicks in routing tests | Already installed |
| @testing-library/react | ^16.3.2 | RTL render + screen | Already installed |

**No new npm install step is needed for Phase 3.** [VERIFIED: package.json]

### Package Legitimacy Audit

> No new packages are introduced in Phase 3. All packages were audited in Phase 1 research.
> See `01-RESEARCH.md § Package Legitimacy Audit`.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (phone-sized viewport)
        │
        ▼
  index.html → main.tsx
  (BrowserRouter wraps everything)
        │
      App.tsx
   (Routes table)
        │
   ┌────┴────────────────────────────────────┐
   │                │                        │
   path="/"   path="/d/:domain"   path="/d/:domain/:type"
   │                │                        │
DashboardPage  DomainPage          EntryTypePage (stub)
(3 domain tiles)  (entry-type list)     (Phase 4 fills)
   │                │
   │   reads from   │
   └──→ src/config/navigation.ts ←──────────┘
           │
           └── imports EntryDomain/EntryType types
               from src/services/db.ts
               (single source of truth)

Additional stub routes (Phase 4-6 content):
   path="/d/:domain/:type/capture"  → URLCapturePage (stub)
   path="/d/:domain/:type/manual"   → ManualEntryPage (stub)
   path="/d/:domain/:type/review"   → ReviewPage (stub)
   path="/entries"                  → EntryListPage (stub)
   path="/entries/:id"              → EntryDetailPage (stub)

PWA (production only, SW disabled in dev):
   All navigation requests → Workbox SW → serves /index.html
   BrowserRouter then matches client-side routes as normal
```

### Recommended Project Structure (Phase 3 additions)

```
src/
├── App.tsx                        # MODIFIED: wires all 7 routes; / → DashboardPage
├── config/
│   └── navigation.ts              # NEW: NAVIGATION constant (domain→label+icon+types[])
├── pages/
│   ├── WelcomePage.tsx            # UNCHANGED (kept; removed in Phase 4)
│   ├── DashboardPage.tsx          # NEW: home, 3 domain tiles
│   ├── DomainPage.tsx             # NEW: category screen, reads :domain param
│   ├── EntryTypePage.tsx          # NEW: placeholder, reads :domain + :type
│   └── PlaceholderPage.tsx        # NEW: reusable stub for routes 4-7 (or 5 individual files)
└── components/
    └── Counter.tsx                # UNCHANGED (kept; removed in Phase 4)
```

**Note on WelcomePage and Counter:** The `/` route is re-pointed to `DashboardPage`.
`WelcomePage.tsx` and `Counter.tsx` become unreachable but must NOT be deleted in Phase 3
(they exist as Phase 1 artifacts and are removed together in Phase 4 per ROADMAP). Leave
both files and their tests untouched.

---

### Pattern 1: Declarative Mode Route Table (react-router-dom v7)

**What:** Keep `BrowserRouter` in `main.tsx` (already present). Extend `App.tsx` with all 7
routes using the `<Routes>` + `<Route>` declarative API.

**When to use:** Declarative Mode is the react-router v7 recommendation when: you do not need
route-level loaders or actions, you are not migrating to a framework/SSR setup, and you want
minimal configuration. This project qualifies on all three counts.
[VERIFIED: reactrouter.com/start/modes]

```tsx
// src/App.tsx
import { Routes, Route } from 'react-router-dom'
import { DashboardPage }    from './pages/DashboardPage'
import { DomainPage }       from './pages/DomainPage'
import { EntryTypePage }    from './pages/EntryTypePage'
import { PlaceholderPage }  from './pages/PlaceholderPage'

function App() {
  return (
    <Routes>
      {/* Phase 3 — real content */}
      <Route path="/"                          element={<DashboardPage />} />
      <Route path="/d/:domain"                 element={<DomainPage />} />
      <Route path="/d/:domain/:type"           element={<EntryTypePage />} />

      {/* Phase 4 stubs — URL Capture + Review */}
      <Route path="/d/:domain/:type/capture"  element={<PlaceholderPage title="URL Capture" />} />
      <Route path="/d/:domain/:type/review"   element={<PlaceholderPage title="Review" />} />

      {/* Phase 5 stub — Manual Entry */}
      <Route path="/d/:domain/:type/manual"   element={<PlaceholderPage title="Manual Entry" />} />

      {/* Phase 6 stubs — Entry List + Detail */}
      <Route path="/entries"                   element={<PlaceholderPage title="Entry List" />} />
      <Route path="/entries/:id"               element={<PlaceholderPage title="Entry Detail" />} />
    </Routes>
  )
}

export default App
```

**Source:** [VERIFIED: reactrouter.com/start/modes — Declarative Mode section]

---

### Pattern 2: Navigation Config Module

**What:** A single `src/config/navigation.ts` file that maps each `EntryDomain` to its
display label, heroicon component, and an ordered list of `EntryType` configs. All screens
(dashboard, domain, capture) read from this one module instead of duplicating the taxonomy.

**Why needed:** `EntryType` alone is ambiguous — `'expense'` belongs to both `'trips'` and
`'expenditures'`. A domain→types map resolves this and is the single source of truth for the
nav tree, keeping it in sync with `src/services/db.ts`.

```typescript
// src/config/navigation.ts
// Source: [CITED: src/services/db.ts — EntryDomain / EntryType types]

import type { ComponentType, SVGProps } from 'react'
import type { EntryDomain, EntryType } from '../services/db'

// Heroicons are React components; they accept standard SVG props
type HeroIcon = ComponentType<SVGProps<SVGSVGElement> & { title?: string }>

export interface EntryTypeConfig {
  type: EntryType
  label: string
  icon: HeroIcon
}

export interface DomainConfig {
  domain: EntryDomain
  label: string
  icon: HeroIcon
  types: EntryTypeConfig[]
}

// Heroicons confirmed present in node_modules/@heroicons/react/24/outline/
// [VERIFIED: ls node_modules/@heroicons/react/24/outline/]
import {
  FilmIcon,
  TvIcon,
  BookOpenIcon,
  MicrophoneIcon,
  MapPinIcon,
  CalendarDaysIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'

export const NAVIGATION: DomainConfig[] = [
  {
    domain: 'media',
    label: 'Media',
    icon: FilmIcon,
    types: [
      { type: 'show',    label: 'Show',    icon: TvIcon },
      { type: 'movie',   label: 'Movie',   icon: FilmIcon },
      { type: 'book',    label: 'Book',    icon: BookOpenIcon },
      { type: 'podcast', label: 'Podcast', icon: MicrophoneIcon },
    ],
  },
  {
    domain: 'trips',
    label: 'Trips',
    icon: MapPinIcon,
    types: [
      { type: 'place',   label: 'Place',   icon: MapPinIcon },
      { type: 'event',   label: 'Event',   icon: CalendarDaysIcon },
      { type: 'expense', label: 'Expense', icon: BanknotesIcon },
    ],
  },
  {
    domain: 'expenditures',
    label: 'Expenditures',
    icon: BanknotesIcon,
    types: [
      { type: 'expense', label: 'Expense', icon: BanknotesIcon },
    ],
  },
]

/** Look up a DomainConfig by its domain key. Returns undefined for unknown strings. */
export function getDomainConfig(domain: string): DomainConfig | undefined {
  return NAVIGATION.find((d) => d.domain === domain)
}
```

**Icon rationale (all confirmed installed):**
- `FilmIcon` — generic media / movies [VERIFIED]
- `TvIcon` — shows / television [VERIFIED]
- `BookOpenIcon` — books [VERIFIED]
- `MicrophoneIcon` — podcasts [VERIFIED]
- `MapPinIcon` — places / trips [VERIFIED]
- `CalendarDaysIcon` — events [VERIFIED]
- `BanknotesIcon` — expenses / expenditures [VERIFIED]

---

### Pattern 3: DashboardPage — Home Screen

**What:** Renders one tile per `NAVIGATION` entry; each tile is a `<Link>` to `/d/:domain`
using the domain's label and icon.

```tsx
// src/pages/DashboardPage.tsx
import { Link } from 'react-router-dom'
import { NAVIGATION } from '../config/navigation'

export function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Life Log</h1>
        {NAVIGATION.map(({ domain, label, icon: Icon }) => (
          <Link
            key={domain}
            to={`/d/${domain}`}
            className="flex items-center gap-4 min-h-[64px] px-4 rounded-lg
                       border border-[var(--color-border)] bg-[var(--color-muted)]
                       hover:bg-[var(--color-border)] active:opacity-75
                       transition-colors"
          >
            <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
            <span className="text-lg font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

**Touch target:** `min-h-[64px]` exceeds the 48px minimum for comfortable mobile tap targets.
[ASSUMED: 48px is the widely-cited mobile touch target guideline (Material Design, Apple HIG)]

---

### Pattern 4: DomainPage — Category Screen

**What:** Reads `:domain` from URL params, looks up its `DomainConfig`, renders entry-type
tiles each linking to `/d/:domain/:type`.

```tsx
// src/pages/DomainPage.tsx
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { getDomainConfig } from '../config/navigation'

export function DomainPage() {
  const { domain = '' } = useParams<{ domain: string }>()
  const navigate = useNavigate()
  const config = getDomainConfig(domain)

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-[var(--color-foreground)]">
        <p>Unknown domain: {domain}</p>
      </div>
    )
  }

  const { label, types } = config

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-2xl font-bold tracking-tight">{label}</h1>
        {types.map(({ type, label: typeLabel, icon: Icon }) => (
          <Link
            key={type}
            to={`/d/${domain}/${type}`}
            className="flex items-center gap-4 min-h-[64px] px-4 rounded-lg
                       border border-[var(--color-border)] bg-[var(--color-muted)]
                       hover:bg-[var(--color-border)] active:opacity-75
                       transition-colors"
          >
            <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
            <span className="text-lg font-medium">{typeLabel}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

---

### Pattern 5: EntryTypePage — Phase 4 Landing Placeholder

**What:** Reads `:domain` and `:type`; shows a labeled placeholder; back button. Becomes the
URL Capture entry point in Phase 4.

```tsx
// src/pages/EntryTypePage.tsx
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { getDomainConfig } from '../config/navigation'

export function EntryTypePage() {
  const { domain = '', type = '' } = useParams<{ domain: string; type: string }>()
  const navigate = useNavigate()
  const config = getDomainConfig(domain)
  const typeConfig = config?.types.find((t) => t.type === type)

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-2xl font-bold tracking-tight">
          Add {typeConfig?.label ?? type}
        </h1>
        <p className="text-[var(--color-foreground)] opacity-60 text-sm">
          URL capture coming in Phase 4.
        </p>
      </div>
    </div>
  )
}
```

---

### Pattern 6: PlaceholderPage — Reusable Stub for Routes 4–7

**What:** A single component re-used for URL Capture, Manual Entry, Review, Entry List, and
Entry Detail stubs. Accepts a `title` prop. Has a back button.

```tsx
// src/pages/PlaceholderPage.tsx
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'

interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-[var(--color-foreground)] opacity-60 text-sm">
          Coming soon.
        </p>
      </div>
    </div>
  )
}
```

---

### Pattern 7: RTL Routing Tests with MemoryRouter

**What:** Test navigation by wrapping `<App />` (which contains `<Routes>`) inside
`<MemoryRouter initialEntries={[startRoute]}>`. For page-level unit tests, wrap the page
component in `<MemoryRouter><Routes><Route path="..." element={<Page />} /></Routes></MemoryRouter>`.

**Critical gotcha:** Components that call `useNavigate()` or `useParams()` MUST be rendered
inside a `<Routes>` + `<Route>` context, not just `<MemoryRouter>`. Rendering only with
`<MemoryRouter>` causes `useNavigate()` to fail in react-router v7.
[CITED: github.com/remix-run/react-router/issues/12368]

The existing `WelcomePage.test.tsx` uses `<MemoryRouter>` without `<Routes>` — this works
because `WelcomePage` does NOT call `useNavigate` or `useParams`. New pages DO call these
hooks, so must use the full wrapping pattern.

```tsx
// src/pages/DomainPage.test.tsx — example test structure
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { DomainPage } from './DomainPage'
import { DashboardPage } from './DashboardPage'

describe('DomainPage — media', () => {
  function renderMediaDomain() {
    return render(
      <MemoryRouter initialEntries={['/d/media']}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/d/:domain" element={<DomainPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('shows the four media entry types', async () => {
    renderMediaDomain()
    expect(await screen.findByText('Show')).toBeInTheDocument()
    expect(screen.getByText('Movie')).toBeInTheDocument()
    expect(screen.getByText('Book')).toBeInTheDocument()
    expect(screen.getByText('Podcast')).toBeInTheDocument()
  })

  it('clicking Back returns to Dashboard', async () => {
    const user = userEvent.setup()
    renderMediaDomain()
    await screen.findByText('Show')  // wait for domain page to render
    await user.click(screen.getByRole('button', { name: /go back/i }))
    // After navigate(-1), DashboardPage renders (it's the root of initialEntries)
    expect(await screen.findByText('Media')).toBeInTheDocument()
    expect(screen.getByText('Trips')).toBeInTheDocument()
    expect(screen.getByText('Expenditures')).toBeInTheDocument()
  })
})
```

**Full-app navigation test (dashboard → domain screen):**

```tsx
// src/App.test.tsx — full navigation test
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

// No need to wrap App in <Routes> — App already contains <Routes>
describe('App routing — navigation flow', () => {
  it('renders dashboard with three domain tiles', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(await screen.findByText('Media')).toBeInTheDocument()
    expect(screen.getByText('Trips')).toBeInTheDocument()
    expect(screen.getByText('Expenditures')).toBeInTheDocument()
  })

  it('clicking Media tile shows media entry types', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    const mediaLink = await screen.findByRole('link', { name: /media/i })
    await user.click(mediaLink)
    expect(await screen.findByText('Show')).toBeInTheDocument()
    expect(screen.getByText('Movie')).toBeInTheDocument()
    expect(screen.getByText('Book')).toBeInTheDocument()
    expect(screen.getByText('Podcast')).toBeInTheDocument()
  })
})
```

**Note on `initialEntries` for back navigation:** When testing `navigate(-1)` from
`DomainPage`, you can start at `/d/media` with `initialEntries={['/d/media']}` ONLY IF the
history already has a previous entry. In MemoryRouter, the history stack starts at position 0
of `initialEntries`. The MemoryRouter approach that works best is to set
`initialEntries={['/', '/d/media']}` (two entries) so position 1 (`/d/media`) can navigate
back to position 0 (`/`). Alternatively, render from `/` and navigate via a click — then
`navigate(-1)` from the domain page works because the stack was built by real navigation.
[CITED: reactrouter.com/6.30.3/routers/create-memory-router — initialEntries doc]

---

### Anti-Patterns to Avoid

- **Using `createBrowserRouter` + `RouterProvider`:** This project uses Declarative Mode.
  Adding Data Mode would require restructuring `main.tsx`, removing `BrowserRouter`, and
  rebuilding tests. The official docs confirm Declarative Mode is appropriate for this stack.
  [CITED: reactrouter.com/start/modes]

- **Hardcoding the taxonomy in page components:** The nav tree (Media → Show/Movie/Book/Podcast
  etc.) must come from `NAVIGATION` in `src/config/navigation.ts`, never hardcoded in JSX.
  Hardcoding means any change requires touching multiple files.

- **Rendering `useNavigate`/`useParams` components without `<Routes><Route>`:** Components that
  call routing hooks need a `<Routes>` ancestor in tests. `<MemoryRouter>` alone is not enough
  for hooks. `<MemoryRouter><WelcomePage /></MemoryRouter>` works for WelcomePage (no hooks).
  `<MemoryRouter><DomainPage /></MemoryRouter>` does NOT work (calls `useParams`).

- **Deleting `WelcomePage.tsx` or `Counter.tsx` in Phase 3:** These are removed in Phase 4.
  Remove them then, not now. Removing early breaks Phase 1/2 tests and the existing git
  history of what was the tracer bullet.

- **Using `<a href="/d/media">` instead of `<Link>`:** Hard navigation reloads the page in
  development and breaks the SPA routing model. Always use `<Link>` from react-router-dom.

- **Using `window.history.back()` in tests:** jsdom does not implement a real History API.
  Use `navigate(-1)` via a button click and assert the previous route's content renders.
  The react-router MemoryRouter manages its own internal stack; jsdom's `window.history` is
  a stub. [ASSUMED — standard jsdom limitation; consistent with existing WelcomePage.test.tsx
  pattern which uses RTL assertions, not DOM history APIs]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| In-memory history stack for tests | Custom history mock | `MemoryRouter` from react-router-dom | MemoryRouter manages the history stack correctly; custom mocks miss route matching |
| Domain→types mapping | Switch/if-else in every page | `src/config/navigation.ts` NAVIGATION constant | Central config is the single source of truth; pages are dumb consumers |
| URL param → domain lookup | Direct string comparison in JSX | `getDomainConfig(domain)` helper from navigation.ts | Handles unknown domains gracefully; returns undefined for invalid params |
| Touch-target sizing | Custom CSS pixel math | `min-h-[64px]` Tailwind utility | One-line, consistent across tiles; easy to adjust globally |
| Back button | `window.history.back()` call | `navigate(-1)` from `useNavigate()` | react-router's navigate(-1) is testable via RTL; `window.history.back()` is not |

**Key insight:** The navigation config module pattern prevents "taxonomy drift" — if a new
EntryType is added to `db.ts`, there is exactly one file (`navigation.ts`) to update, and
all screens automatically reflect the change.

---

## Common Pitfalls

### Pitfall 1: `useParams` / `useNavigate` Outside `<Routes>` Context in Tests

**What goes wrong:** `Error: useParams() may be used only in the context of a <Router>
component` or `useNavigate() may be used only in the context of a <Router> component`.

**Why it happens:** Pages that call routing hooks need a `<Routes><Route>` ancestor in tests,
not just `<MemoryRouter>`. react-router v7 is stricter about this than v6.
[CITED: github.com/remix-run/react-router/issues/12368]

**How to avoid:** Always wrap page-level tests as:
```tsx
<MemoryRouter initialEntries={['/d/media']}>
  <Routes>
    <Route path="/d/:domain" element={<DomainPage />} />
  </Routes>
</MemoryRouter>
```
OR render the full `<App />` (which already has `<Routes>`) inside `<MemoryRouter>`.

**Warning signs:** Test error message mentions "may be used only in the context of a Router".

---

### Pitfall 2: `navigate(-1)` at History Stack Bottom Silently Does Nothing

**What goes wrong:** In tests with `initialEntries={['/d/media']}` (single entry), clicking
the Back button calls `navigate(-1)` but nothing happens — there is no previous entry in the
stack.

**Why it happens:** MemoryRouter's history stack only contains what you put in `initialEntries`.
If there's one entry, `navigate(-1)` is a no-op.

**How to avoid:** For back navigation tests, either:
(a) Use `initialEntries={['/', '/d/media']}` so back from position 1 reaches position 0, or
(b) Navigate forward from `/` in the test, then test back.

**Warning signs:** Back button click has no visible effect on the rendered screen; no error
is thrown.

---

### Pitfall 3: PWA navigateFallback Intercepting Parameterized Routes

**What goes wrong:** In a production PWA install, navigating to `/d/trips` via an in-app
link works fine, but sharing the URL or typing it in the browser address bar shows a blank
page or 404.

**Why it happens:** The service worker's `navigateFallback: '/index.html'` kicks in for
navigation requests where the URL is not in the precache. Workbox's default behavior for
`navigateFallback` only applies to navigation requests that don't match `navigateFallbackDenylist`.

**Status for Phase 3:** `pwaConfig.ts` already sets `navigateFallback: '/index.html'` with
no denylist — this is the correct SPA configuration and should work for all routes including
parameterized ones. No action needed.

**Warning signs:** Only appears in production PWA (`vite build && vite preview`). Dev mode
has SW disabled (`devOptions.enabled: false`). If a deep link fails in a PWA context, add
`navigateFallbackAllowlist: [/^\/d\/.*/]` to scope the fallback.
[CITED: pwaConfig.ts — navigateFallback: '/index.html' confirmed]

---

### Pitfall 4: Missing `react-router-dom` Import in `App.tsx` Test

**What goes wrong:** `App.test.tsx` renders `<MemoryRouter><App /></MemoryRouter>` but
App's existing integration with `main.tsx` assumes `BrowserRouter` is the outer wrapper.
In tests, `MemoryRouter` replaces `BrowserRouter`.

**Why it happens:** `main.tsx` wraps `<App />` in `<BrowserRouter>`. `App.tsx` itself only
contains `<Routes>`. When tests render `<App />` directly (without `main.tsx`), they must
supply their own router wrapper.

**How to avoid:** Tests of `App.tsx` always render:
```tsx
<MemoryRouter initialEntries={[startPath]}>
  <App />
</MemoryRouter>
```
**Never** import or render `main.tsx` in tests. This is already the pattern in
`WelcomePage.test.tsx`.
[CITED: src/pages/WelcomePage.test.tsx — confirmed existing pattern]

---

### Pitfall 5: Dashboard Showing WelcomePage Counter Instead of Domain Tiles

**What goes wrong:** After wiring `/` to `DashboardPage`, the counter from Phase 1 still
appears because `App.tsx` was not updated, or `WelcomePage` was kept at the `/` route.

**Why it happens:** Forgetting to change the `Route path="/"` in `App.tsx` from
`element={<WelcomePage />}` to `element={<DashboardPage />}`.

**How to avoid:** As the first edit in Phase 3, update `App.tsx`'s root route. The existing
`WelcomePage.test.tsx` will still pass because it tests `WelcomePage` directly (not via the
`/` route).

**Warning signs:** SC1 test (dashboard shows 3 domains) fails; "Life Log" heading + counter
appears instead of domain tiles.

---

## Dashboard vs. WelcomePage: The Clean Approach

The dashboard **replaces** WelcomePage at `/`. The recommendation:

1. Change `App.tsx` root route from `<WelcomePage />` to `<DashboardPage />`
2. Leave `WelcomePage.tsx` and `Counter.tsx` files intact (removed in Phase 4)
3. Leave `WelcomePage.test.tsx` and `Counter.test.tsx` intact (they test the component
   directly, not via the route, so they continue to pass)

WelcomePage becomes unreachable via the router but is not deleted. This is intentional —
it is Phase 4's job to clean up the tracer demo.

**Do NOT coexist** (e.g., showing the counter on the dashboard as a widget). The dashboard
is a clean new page that reads from `NAVIGATION` and renders domain tiles. The counter is
purely the Phase 1 tracer demo.

---

## Open Questions (RESOLVED)

1. **Should the project migrate from `BrowserRouter` (Declarative) to `createBrowserRouter` (Data Mode) for Phase 3?**
   - What we know: The app uses `BrowserRouter` + `Routes` in `main.tsx`/`App.tsx`; react-router v7.17.0 installed
   - What was unclear: Whether Data Mode is the v7 "correct" approach
   - RESOLVED: No migration. React Router v7's official docs describe three modes. Declarative Mode (`BrowserRouter` + `Routes`) is explicitly recommended for "simple SPAs coming from v6" and apps without loaders/actions. This project qualifies on both counts. Migration would require restructuring `main.tsx`, `App.tsx`, and all tests with no benefit for Phase 3.
   [CITED: reactrouter.com/start/modes]

2. **Should the dashboard replace WelcomePage at `/` or coexist?**
   - What we know: WelcomePage is at `/`; Counter is a "throwaway tracer demo"; CONTEXT.md says "relocated/removed if it conflicts"
   - What was unclear: Whether the counter should be visible on the dashboard
   - RESOLVED: Replace. The dashboard is a clean `/` route pointing to `DashboardPage`. WelcomePage becomes unreachable but is NOT deleted (Phase 4 removes it). The counter does not appear on the dashboard.

3. **Does `navigate(-1)` work in RTL tests with MemoryRouter, or is `window.history.back()` needed?**
   - What we know: `window.history.back()` is a jsdom stub; MemoryRouter manages its own internal stack
   - What was unclear: Which API to call in a Back button
   - RESOLVED: Use `navigate(-1)` from `useNavigate()` in the Back button component. MemoryRouter's router intercepts this and navigates within its internal stack. This is testable by asserting the previous screen's content renders after a click. `window.history.back()` is a jsdom stub that does not interact with MemoryRouter's stack.

4. **Does `navigateFallback: '/index.html'` in the PWA config conflict with parameterized routes like `/d/:domain`?**
   - What we know: `pwaConfig.ts` already sets `navigateFallback: '/index.html'`; SW is disabled in dev
   - What was unclear: Whether the SW intercepts in-app link clicks on parameterized routes
   - RESOLVED: No conflict. Workbox's `navigateFallback` only applies to **navigation requests** (full-page loads / hard refreshes), not to History API pushState calls made by react-router `<Link>` clicks. In-app navigation never triggers the SW fallback. The existing config is correct for the SPA.
   [CITED: src/pwa/pwaConfig.ts — navigateFallback confirmed; vite-plugin-pwa docs]

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.9 |
| Config file | `vite.config.ts` — `test:` block (import from `vitest/config`) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run && tsc -b && vite build` |

### Success Criteria → Test Map

| SC / Req | Behavior | Test Type | Automated Command | Notes |
|----------|----------|-----------|-------------------|-------|
| SC1 / NAV-01 | Dashboard renders Media, Trips, Expenditures domain tiles | RTL unit | `npx vitest run src/pages/DashboardPage.test.tsx` | Assert 3 domain labels present |
| SC2 / NAV-02 | Media domain screen shows Show/Movie/Book/Podcast | RTL unit | `npx vitest run src/pages/DomainPage.test.tsx` | Render at `/d/media`; assert 4 type labels |
| SC2 / NAV-02 | Trips domain screen shows Place/Event/Expense | RTL unit | `npx vitest run src/pages/DomainPage.test.tsx` | Render at `/d/trips`; assert 3 type labels |
| SC2 / NAV-02 | Expenditures domain screen shows Expense | RTL unit | `npx vitest run src/pages/DomainPage.test.tsx` | Render at `/d/expenditures`; assert 1 type label |
| SC3 / NAV-03 | All 7 routes render without throwing | RTL unit | `npx vitest run src/App.test.tsx` | Render App at each route path; assert no crash + heading present |
| SC4 / NAV-04 | Browser Back from domain page returns to Dashboard | RTL + userEvent | `npx vitest run src/App.test.tsx` | Click Back button; assert Dashboard tiles render |
| SC4 / NAV-04 | Browser Back from entry-type page returns to domain page | RTL + userEvent | `npx vitest run src/App.test.tsx` | Click Back button; assert domain-page types render |
| NAV-04 | Phone-sized layout — tiles are tappable, content fits max-w-sm | Manual visual check | `npx vite dev` + Chrome DevTools mobile view | Not automatable with jsdom (CSS computed layout) |
| NAV-03 (full) | TypeScript compiles without errors across all 7 new pages | Build gate | `tsc -b` | Type errors in useParams / navigation config caught here |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | Dashboard shows 3 domain root nodes | RTL unit | `npx vitest run src/pages/DashboardPage.test.tsx` | No — Wave 0 |
| NAV-02 | Category screen shows entry types by domain | RTL unit | `npx vitest run src/pages/DomainPage.test.tsx` | No — Wave 0 |
| NAV-03 | All 7 routes render | RTL + build gate | `npx vitest run src/App.test.tsx && tsc -b` | No — Wave 0 |
| NAV-04 | Mobile layout | Manual + build gate | `npx vite dev` + visual check | No automated |

### Sampling Rate

- **Per task commit:** `npx vitest run` (all unit tests; seconds)
- **Per wave merge:** `npx vitest run && tsc -b && vite build` (full gate)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/config/navigation.ts` — the module itself (not a test file, but must exist before tests can import it)
- [ ] `src/pages/DashboardPage.test.tsx` — covers NAV-01 (3 domains visible)
- [ ] `src/pages/DomainPage.test.tsx` — covers NAV-02 (entry types for each domain) + back nav SC4
- [ ] `src/App.test.tsx` — covers NAV-03 (all 7 routes reachable) + SC3 + SC4 (full-app navigation flow)
- [ ] `src/pages/DashboardPage.tsx`, `DomainPage.tsx`, `EntryTypePage.tsx`, `PlaceholderPage.tsx` — implementation files

---

## Security Domain

> Phase 3 introduces navigation and UI layout only — no user input, no data writes, no auth.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in this prototype |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | Single-user, local only |
| V5 Input Validation | Minimal | URL params `:domain` and `:type` are read via `useParams` and looked up in `getDomainConfig()`; unknown values return `undefined` and render a graceful "Unknown domain" message — no eval, no DB write |
| V6 Cryptography | No | No secrets |

**Note:** The `domain` and `type` URL params are untrusted strings (user can type anything).
`getDomainConfig(domain)` uses `Array.find` with strict equality — no eval, no injection risk.
The graceful unknown-domain branch handles invalid paths safely.

---

## Environment Availability

> Step 2.6: No new external dependencies for Phase 3 (no new tools, services, runtimes).

All tooling from Phase 1/2 (Node.js, npm, Vite, Vitest, react-router-dom) remains in place.
Phase 3 is purely code changes.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| react-router-dom | Routing | ✓ | 7.17.0 | — |
| @heroicons/react | Navigation icons | ✓ | ^2.2.0 | — |
| @testing-library/user-event | Click simulation in routing tests | ✓ | ^14.6.1 | — |
| Vite dev server | Manual layout verification (NAV-04) | ✓ | ^7.1.7 | — |

**Missing dependencies with no fallback:** None.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 48px is the appropriate minimum touch target for mobile tiles | Pattern 3 / Pattern 4 | Low — the 64px `min-h` used in examples exceeds any standard; risk is cosmetic only |
| A2 | `window.history.back()` in jsdom does not interact with MemoryRouter's history stack | Pitfall 5 / Pattern 7 | Low — consistent with documented jsdom limitations; worst case: use a different back-nav test strategy |
| A3 | `navigate(-1)` within MemoryRouter correctly navigates to the previous `initialEntries` entry | Pattern 7 | Low — documented createMemoryRouter behavior; initialEntries/initialIndex is the official test API |

---

## Sources

### Primary (HIGH confidence)
- [reactrouter.com/start/modes](https://reactrouter.com/start/modes) — Three modes (Declarative/Data/Framework); confirmed Declarative is appropriate for this SPA
- [reactrouter.com/6.30.3/routers/create-memory-router](https://reactrouter.com/6.30.3/routers/create-memory-router) — `initialEntries` / `initialIndex` for test setup
- [testing-library.com/docs/example-react-router/](https://testing-library.com/docs/example-react-router/) — RTL + MemoryRouter wrapping pattern; userEvent.click navigation
- [reactrouter.com/upgrading/v6](https://reactrouter.com/upgrading/v6) — confirmed `BrowserRouter` + `Routes` is still fully supported in v7
- `src/pages/WelcomePage.test.tsx` (codebase) — confirmed MemoryRouter pattern used in this project
- `src/pwa/pwaConfig.ts` (codebase) — confirmed `navigateFallback: '/index.html'` and `devOptions.enabled: false`
- `package.json` (codebase) — confirmed all dependency versions
- `node_modules/@heroicons/react/24/outline/` (codebase) — confirmed FilmIcon, TvIcon, BookOpenIcon, MicrophoneIcon, MapPinIcon, CalendarDaysIcon, BanknotesIcon, ChevronLeftIcon all installed

### Secondary (MEDIUM confidence)
- [github.com/remix-run/react-router/issues/12368](https://github.com/remix-run/react-router/issues/12368) — `useNavigate` context error in react-router v7 tests; confirms `<Routes>` wrapper needed

### Tertiary (LOW confidence)
- None — all material claims verified via official docs or codebase inspection.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Routing approach (Declarative Mode) | HIGH | Verified via reactrouter.com/start/modes official docs |
| Route table structure (7 routes) | HIGH | Derived from NAV-03 requirements text + ROADMAP |
| Navigation config pattern | HIGH | Derived from db.ts taxonomy (codebase) + standard module pattern |
| Icon names | HIGH | Verified via `ls node_modules/@heroicons/react/24/outline/` |
| RTL test patterns | HIGH | Verified via testing-library.com docs + existing WelcomePage.test.tsx |
| MemoryRouter + navigate(-1) back-nav | MEDIUM | Documented behavior; not directly run in this session |
| Touch target sizing | MEDIUM | 48px is widely documented guideline; exact pixel behavior not verified in this jsdom context |

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (react-router-dom v7 and heroicons v2 are stable; patterns are unlikely to shift)

---

## RESEARCH COMPLETE

**Phase:** 3 — Navigation & Dashboard
**Confidence:** HIGH

### Key Findings

- react-router-dom v7.17.0 is already installed. **Keep Declarative Mode** (`BrowserRouter` + `Routes`). No migration to `createBrowserRouter`.
- Create **`src/config/navigation.ts`** as a single `NAVIGATION: DomainConfig[]` constant. All pages read from it. This is the nav-tree source of truth derived from (but not duplicating) `db.ts`.
- **All 7 routes** (NAV-03) must be wired in `App.tsx` in Phase 3; only Dashboard (`/`) and Category (`/d/:domain`) get real content; the remaining 5 get `PlaceholderPage` stubs.
- **Replace `/` with `DashboardPage`**, leave `WelcomePage.tsx` and `Counter.tsx` untouched until Phase 4.
- RTL tests with `MemoryRouter` + `<Routes><Route>` wrapping work for `useParams`/`useNavigate` components. **Critical**: `<MemoryRouter>` alone is insufficient for hooks — must include `<Routes><Route path="..." element={<Page/>}/>`.
- Back navigation uses **`navigate(-1)`** in a Back button; MemoryRouter manages the stack correctly in tests. `window.history.back()` is not usable in jsdom.
- The existing `navigateFallback: '/index.html'` PWA config is correct for the SPA. No changes needed.

### File Created

`.planning/phases/03-navigation-dashboard/03-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Routing approach | HIGH | Official react-router v7 docs verified |
| Navigation config shape | HIGH | Derived from codebase (db.ts) + standard TS module pattern |
| RTL testing patterns | HIGH | Official testing-library docs + existing project test pattern |
| Icon availability | HIGH | Verified in installed node_modules |

### Open Questions

All open questions are RESOLVED. No blockers for planning.

### Ready for Planning

Research complete. Planner can now create PLAN.md files for Phase 3.

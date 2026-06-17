# Phase 12: Dashboard Rendering & Layout Switcher — Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 9 (5 source, 3 test, 1 CSS)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/config/shortcutConfig.ts` (ADD `DEFAULT_SHORTCUT_CONFIG`) | config | transform | `src/config/navigation.ts` | role-match |
| `src/services/configRepository.ts` (ADD `activeLayoutRepository` + `useActiveLayoutName`) | service | CRUD | `src/services/configRepository.ts` (existing) | exact |
| `src/pages/DashboardPage.tsx` (EXTEND seeding + chips + rows) | page/component | event-driven + CRUD | `src/pages/EntryListPage.tsx` | exact |
| `src/components/dashboard/LayoutChips.tsx` (optional extract) | component | event-driven | `src/pages/EntryListPage.tsx` lines 85–101 | exact |
| `src/components/dashboard/ShortcutRow.tsx` (optional extract) | component | event-driven | `src/pages/DashboardPage.tsx` lines 10–19 + `src/pages/EntryListPage.tsx` lines 29–55 | role-match |
| `src/index.css` (ADD `.no-scrollbar` utility) | config | — | `src/index.css` (existing) | exact |
| `src/config/shortcutConfig.test.ts` (EXTEND) | test | unit | `src/config/shortcutConfig.test.ts` (existing) | exact |
| `src/services/configRepository.test.tsx` (EXTEND) | test | integration (Dexie) | `src/services/configRepository.test.tsx` (existing) | exact |
| `src/pages/DashboardPage.test.tsx` (EXTEND) | test | integration (RTL + Dexie) | `src/pages/DashboardPage.test.tsx` + `src/services/configRepository.test.tsx` | role-match |

---

## Pattern Assignments

### `src/config/shortcutConfig.ts` — ADD `DEFAULT_SHORTCUT_CONFIG`

**Analog:** `src/config/navigation.ts`

**Pattern — typed constant export** (`src/config/navigation.ts` lines 35–65):
```typescript
// Append AFTER the existing resolveShortcutIcon function.
// Follow the file's existing section-divider style:
// ─── Section name ─────────────────────────────────────────────────────────────

export const DEFAULT_SHORTCUT_CONFIG: ShortcutConfig = {
  version: 1,
  layouts: [ /* ... */ ],
}
```

**Section divider convention** (`src/config/navigation.ts` line 35 / `src/services/configRepository.ts` lines 5, 34):
```typescript
// ─── Section name ─────────────────────────────────────────────────────────────
```

**Type reference** — `ShortcutConfig`, `Layout`, `Shortcut` are already defined in `src/config/shortcutConfig.ts` lines 30–46; the constant is plain data, no extra imports needed.

---

### `src/services/configRepository.ts` — ADD `activeLayoutRepository` + `useActiveLayoutName`

**Analog:** `src/services/configRepository.ts` lines 10–58 (itself — exactly duplicate the existing pattern with a different key)

**Imports pattern** (lines 1–3) — already present; no new imports needed:
```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { ShortcutConfig } from '../config/shortcutConfig'
```

**Repository key pattern** (lines 10–31):
```typescript
const CONFIG_KEY = 'shortcutConfig'

export const configRepository = {
  async get(): Promise<ShortcutConfig | undefined> {
    const row = await db.settings.get(CONFIG_KEY)
    return row?.value as ShortcutConfig | undefined
  },
  async put(config: ShortcutConfig): Promise<void> {
    await db.settings.put({ key: CONFIG_KEY, value: config })
  },
}
```
Mirror exactly for `activeLayoutRepository`:
- Key constant: `const ACTIVE_LAYOUT_KEY = 'activeLayoutName'`
- `get()` returns `Promise<string | undefined>` — cast `row?.value as string | undefined`
- `put(name: string)` writes `{ key: ACTIVE_LAYOUT_KEY, value: name }`

**Reactive hook pattern** (lines 52–58):
```typescript
export function useShortcutConfig(): ShortcutConfig | undefined {
  return useLiveQuery(
    () => configRepository.get(),
    [],
    // No default: undefined = Dexie opening or no config saved
  )
}
```
Mirror for `useActiveLayoutName(): string | undefined` — same structure, same no-default rule.

**Section separator** — append after line 58 with a new section comment:
```typescript
// ─── Active layout persistence (DASH-02) ──────────────────────────────────────
```

---

### `src/pages/DashboardPage.tsx` — EXTEND with seeding + chips + rows

**Analog:** `src/pages/EntryListPage.tsx` (loading guard + filter chip group + list rows)

**Imports pattern** — current file (`src/pages/DashboardPage.tsx` lines 1–3):
```typescript
import { Link } from 'react-router-dom'
import { QueueListIcon, BoltIcon } from '@heroicons/react/24/outline'
import { NAVIGATION } from '../config/navigation'
```
Add to the existing imports:
```typescript
import { useEffect } from 'react'
import { cn } from '../components/ui/cn'
import { configRepository, useShortcutConfig, activeLayoutRepository, useActiveLayoutName } from '../services/configRepository'
import { DEFAULT_SHORTCUT_CONFIG, resolveShortcutIcon } from '../config/shortcutConfig'
```

**Loading guard pattern** (`src/pages/EntryListPage.tsx` line 64):
```typescript
if (entries === undefined) return <p>Loading...</p>
```
Apply as: `if (config === undefined) return null` for the shortcut section, OR gate the entire return on config loading. RESEARCH.md recommends `return null` for the shortcut section to avoid layout shift.

**Filter chip group / aria-pressed pattern** (`src/pages/EntryListPage.tsx` lines 85–101) — THE canonical pattern for layout chips:
```tsx
<div role="group" aria-label="Filter entries" className="flex gap-2 flex-wrap">
  {FILTER_OPTIONS.map((opt) => (
    <button
      key={opt.value}
      onClick={() => setFilter(opt.value)}
      aria-pressed={filter === opt.value}
      className={cn(
        'px-3 py-1 rounded-md text-sm font-medium border transition-colors',
        filter === opt.value
          ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]',
      )}
    >
      {opt.label}
    </button>
  ))}
</div>
```
Adapt for layout chips: replace `role="group"` div with a scrollable `aria-label="Layout switcher"` div, add `overflow-x-auto no-scrollbar shrink-0 whitespace-nowrap` per chip (RESEARCH.md Q4). Active state classes are identical to `EntryListPage`.

**Tappable row pattern** (`src/pages/DashboardPage.tsx` lines 10–19) — use for shortcut rows:
```tsx
<Link
  to="/capture"
  className="flex items-center gap-4 min-h-[64px] px-4 rounded-lg
             border border-[var(--color-primary)] bg-[var(--color-primary)]
             text-[var(--color-primary-foreground)] hover:opacity-90 active:opacity-75
             transition-opacity"
>
  <BoltIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
  <span className="text-lg font-medium">Quick Capture</span>
</Link>
```
Shortcut rows are `<button type="button">` (not `<Link>`) with the muted border variant (like domain tiles, lines 20–32):
```tsx
className="flex items-center gap-4 min-h-[64px] px-4 rounded-lg
           border border-[var(--color-border)] bg-[var(--color-background)]
           hover:bg-[var(--color-muted)] active:opacity-75 transition-colors"
```

**EntryRow secondary-line pattern** (`src/pages/EntryListPage.tsx` lines 40–54) — use for DSL template secondary line:
```tsx
<div className="flex flex-col gap-0.5">
  <span className="font-medium">{entry.title}</span>
  <span className="text-xs opacity-60" data-testid="entry-date">
    {typeLabel} · {new Date(dateMs).toLocaleDateString()}
  </span>
</div>
```
Adapt as:
```tsx
<span className="flex flex-1 flex-col gap-0.5">
  <span className="text-base font-semibold">{shortcut.name}</span>
  <span className="font-mono text-xs text-[var(--color-border)]">{shortcut.dslTemplate}</span>
</span>
```

**Page outer wrapper** — match `DashboardPage.tsx` lines 7–8 exactly:
```tsx
<div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
  <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
```

**One-shot seeding effect** — no codebase analog; derived pattern from RESEARCH.md Q1:
```typescript
useEffect(() => {
  let cancelled = false
  configRepository.get().then((existing) => {
    if (existing === undefined && !cancelled) {
      configRepository.put(DEFAULT_SHORTCUT_CONFIG)
    }
  })
  return () => { cancelled = true }
}, [])  // empty deps: runs once on mount
```

**Active layout derivation** — no codebase analog; from RESEARCH.md Q2:
```typescript
const config = useShortcutConfig()
const persistedLayoutName = useActiveLayoutName()
const layouts = config?.layouts ?? []
const activeLayout = layouts.find((l) => l.name === persistedLayoutName) ?? layouts[0]
```

---

### `src/components/dashboard/LayoutChips.tsx` (optional extract)

**Analog:** `src/pages/EntryListPage.tsx` lines 85–101 (filter chip group)

This is a direct extraction of the chip group pattern into a prop-driven component. Copy the `cn()` active/inactive class branching pattern exactly. Props shape:
```typescript
interface LayoutChipsProps {
  layouts: Layout[]
  activeLayoutName: string | undefined
  onSelect: (name: string) => void
}
```

**cn import** (`src/components/ui/cn.ts` lines 1–6):
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```
Import: `import { cn } from '../ui/cn'` (adjust path from `src/components/dashboard/`).

---

### `src/components/dashboard/ShortcutRow.tsx` (optional extract)

**Analog:** `src/pages/DashboardPage.tsx` lines 10–19 (icon + label row, min-h-[64px]) + `src/pages/EntryListPage.tsx` lines 29–55 (two-line row body)

Props shape:
```typescript
interface ShortcutRowProps {
  shortcut: Shortcut
  onClick: () => void
}
```

**Icon rendering pattern** (`src/pages/DashboardPage.tsx` lines 2, 17):
```tsx
import { BoltIcon } from '@heroicons/react/24/outline'
// ...
<BoltIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
```
In `ShortcutRow`, resolve dynamically:
```tsx
import { resolveShortcutIcon } from '../../config/shortcutConfig'
const Icon = resolveShortcutIcon(shortcut.icon)
// <Icon className="h-5 w-5" aria-hidden="true" />
```

---

### `src/index.css` — ADD `.no-scrollbar`

**Analog:** `src/index.css` lines 1–15 (append after `@theme` block)

Current file ends at line 15. Append:
```css
/* Utility: hide scrollbar while keeping scroll behavior (chip switcher) */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { scrollbar-width: none; }
```

---

### `src/config/shortcutConfig.test.ts` — EXTEND with DEFAULT_SHORTCUT_CONFIG tests

**Analog:** `src/config/shortcutConfig.test.ts` lines 1–63 (same file to extend)

**Imports pattern** (lines 1–8) — add imports to the existing block:
```typescript
import { describe, it, expect } from 'vitest'
import {
  resolveShortcutIcon,
  SHORTCUT_ICON_MAP,
  DEFAULT_SHORTCUT_ICON,
  DEFAULT_SHORTCUT_CONFIG,    // ADD
} from './shortcutConfig'
import { BanknotesIcon, BoltIcon } from '@heroicons/react/24/outline'
```
Also add: `import { parseDSL } from '../services/dsl/parser'` and `import { validateShortcutConfig } from '../services/configValidator'`

**Describe block structure** (lines 11–14) — extend with three new `describe` blocks after line 63:
```typescript
describe('DEFAULT_SHORTCUT_CONFIG DSL validity', () => {
  it('every default dslTemplate parses without error', () => { /* loop */ })
  it('every default icon key is present in SHORTCUT_ICON_MAP', () => { /* loop */ })
  it('passes validateShortcutConfig (structural schema)', () => { /* ... */ })
})
```

**Inner loop test pattern** (lines 22–36 — `every map value is a React component`):
```typescript
for (const [key, value] of Object.entries(SHORTCUT_ICON_MAP)) {
  expect(
    t === 'function' || (t === 'object' && value !== null),
    `SHORTCUT_ICON_MAP["${key}"] is not a React component (got ${t})`,
  ).toBe(true)
}
```
Mirror this nested-loop + custom message style for the DSL validity test.

---

### `src/services/configRepository.test.tsx` — EXTEND with `activeLayoutRepository` + `useActiveLayoutName`

**Analog:** `src/services/configRepository.test.tsx` lines 1–116 (same file to extend)

**Dexie reset pattern** (lines 9–12) — already present; no change:
```typescript
beforeEach(async () => {
  await db.delete()
  await db.open()
})
```

**Repository get/put test pattern** (lines 46–81) — mirror for `activeLayoutRepository`:
```typescript
describe('activeLayoutRepository: get', () => {
  it('returns undefined before any write', async () => {
    const result = await activeLayoutRepository.get()
    expect(result).toBeUndefined()
  })
})

describe('activeLayoutRepository: put and get round-trip', () => {
  it('stores a name and returns it', async () => {
    await activeLayoutRepository.put('Travel')
    expect(await activeLayoutRepository.get()).toBe('Travel')
  })
  it('put is an upsert — overwrites existing name', async () => {
    await activeLayoutRepository.put('DayToDay')
    await activeLayoutRepository.put('Travel')
    expect(await activeLayoutRepository.get()).toBe('Travel')
  })
})
```

**Reactive hook test component pattern** (lines 86–90) — mirror for `useActiveLayoutName`:
```typescript
function ActiveLayoutTest() {
  const name = useActiveLayoutName()
  if (name === undefined) return <p>Loading</p>
  return <p>{name}</p>
}
```

**act() + findByText pattern** (lines 98–105) — exact pattern for reactive hook assertion:
```typescript
render(<ActiveLayoutTest />)
await screen.findByText('Loading')
await act(async () => {
  await activeLayoutRepository.put('Travel')
})
expect(await screen.findByText('Travel')).toBeInTheDocument()
```

**Import additions** — add `activeLayoutRepository, useActiveLayoutName` to the import from `./configRepository`.

---

### `src/pages/DashboardPage.test.tsx` — EXTEND with seeding + chips + rows

**Analog (primary):** `src/pages/DashboardPage.test.tsx` lines 1–55 (existing; extend in place)
**Analog (Dexie patterns):** `src/services/configRepository.test.tsx` lines 1–12, 98–105

**Existing test structure** (lines 1–13):
```typescript
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { DashboardPage } from './DashboardPage'

describe('DashboardPage', () => {
  function renderDashboard() {
    return render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
  }
  // ...
})
```

**Add these imports** to the existing import block:
```typescript
import { act } from '@testing-library/react'
import { beforeEach } from 'vitest'
import { db } from '../services/db'
import { configRepository } from '../services/configRepository'
import type { ShortcutConfig } from '../config/shortcutConfig'
```

**Add Dexie reset** — add `beforeEach` after the `describe` opening (mirrors `configRepository.test.tsx` lines 9–12):
```typescript
beforeEach(async () => {
  await db.delete()
  await db.open()
})
```

**Seeding test pattern** (mirrors RESEARCH.md Q1 test examples):
```typescript
it('seeds DEFAULT_SHORTCUT_CONFIG on fresh install', async () => {
  renderDashboard()
  expect(await screen.findByRole('button', { name: 'DayToDay' })).toBeInTheDocument()
})

it('does NOT overwrite an existing config on remount', async () => {
  const customConfig: ShortcutConfig = {
    version: 1,
    layouts: [{ name: 'MyLayout', shortcuts: [], icon: 'HomeIcon' }],
  }
  await configRepository.put(customConfig)
  renderDashboard()
  await screen.findByRole('button', { name: 'MyLayout' })
  const stored = await configRepository.get()
  expect(stored?.layouts[0].name).toBe('MyLayout')
})
```

**Update existing link-count test** (line 31 — currently asserts 5 links) — after Phase 12 adds shortcut rows (which are `<button>`, not `<Link>`), the link count does NOT change. The test must still account for the Dexie-dependent async render; add `await screen.findByRole('button', { name: /DayToDay/i })` as a wait sentinel before the link assertion.

**aria-pressed chip test pattern** (mirrors `EntryListPage.tsx` aria-pressed usage):
```typescript
it('active chip has aria-pressed="true"', async () => {
  renderDashboard()
  const chip = await screen.findByRole('button', { name: 'DayToDay' })
  expect(chip).toHaveAttribute('aria-pressed', 'true')
})
```

**+ New disabled chip test**:
```typescript
it('renders + New chip as disabled', async () => {
  renderDashboard()
  await screen.findByRole('button', { name: 'DayToDay' })
  expect(screen.getByRole('button', { name: '+ New' })).toBeDisabled()
})
```

---

## Shared Patterns

### `useLiveQuery` hook with no default
**Source:** `src/services/configRepository.ts` lines 52–58; `src/services/entriesRepository.ts` lines 129–135
**Apply to:** `useActiveLayoutName` in `configRepository.ts`; any new reactive hook added in Phase 12
```typescript
export function useShortcutConfig(): ShortcutConfig | undefined {
  return useLiveQuery(
    () => configRepository.get(),
    [],
    // No default: undefined = Dexie opening or no config saved
  )
}
```

### Loading guard
**Source:** `src/pages/EntryListPage.tsx` line 64; `src/services/configRepository.test.tsx` line 88
**Apply to:** `DashboardPage.tsx` shortcut section render path
```typescript
if (entries === undefined) return <p>Loading...</p>
```

### Conditional class merging with `cn()`
**Source:** `src/pages/EntryListPage.tsx` lines 91–98; `src/components/ui/cn.ts` lines 1–6
**Apply to:** `LayoutChips` chip active/inactive styling
```typescript
className={cn(
  'px-3 py-1 rounded-md text-sm font-medium border transition-colors',
  filter === opt.value
    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)]'
    : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]',
)}
```

### CSS custom property tokens
**Source:** `src/index.css` lines 4–11
**Apply to:** All new JSX in DashboardPage, LayoutChips, ShortcutRow — use only these tokens:
```
--color-primary               (active chip bg, icon tint)
--color-primary-foreground    (active chip text)
--color-background            (page/card bg)
--color-foreground            (primary text)
--color-muted                 (hover state)
--color-border                (inactive chip border, secondary text, row border)
```

### Section divider comment style
**Source:** `src/services/configRepository.ts` lines 5, 34; `src/services/entriesRepository.ts` lines 4, 105, 115
**Apply to:** All additions to existing files
```typescript
// ─── Section name (REQ-ID) ────────────────────────────────────────────────────
```

### Dexie test reset
**Source:** `src/services/configRepository.test.tsx` lines 9–12
**Apply to:** `DashboardPage.test.tsx` (add `beforeEach`) and new `configRepository.test.tsx` blocks (already present)
```typescript
beforeEach(async () => {
  await db.delete()
  await db.open()
})
```

### act() + findByText reactive assertion
**Source:** `src/services/configRepository.test.tsx` lines 98–105
**Apply to:** All new reactive hook tests in `configRepository.test.tsx`
```typescript
render(<TestComponent />)
await screen.findByText('Loading')
await act(async () => {
  await repository.put(value)
})
expect(await screen.findByText('expected')).toBeInTheDocument()
```

### RTL + MemoryRouter render helper
**Source:** `src/pages/DashboardPage.test.tsx` lines 7–13
**Apply to:** All new `DashboardPage.test.tsx` tests (reuse existing `renderDashboard()` helper)
```typescript
function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}
```

---

## No Analog Found

All Phase 12 files have close analogs. The only genuinely novel pattern is the **one-shot seeding `useEffect`** — no existing file in the codebase does a "run once, check DB, conditionally write" effect. The planner should use the RESEARCH.md Q1 code example as the authoritative pattern for this.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (one-shot seeding useEffect inside DashboardPage) | effect | CRUD | No existing first-run seeding pattern in codebase |

---

## Metadata

**Analog search scope:** `src/config/`, `src/services/`, `src/pages/`, `src/components/`, `src/index.css`
**Files scanned:** 12 source files read in full
**Pattern extraction date:** 2026-06-17

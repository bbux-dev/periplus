# Phase 12: Dashboard Rendering & Layout Switcher — Research

**Researched:** 2026-06-17
**Domain:** React/Dexie dashboard UI — reactive config rendering, first-run seeding, persisted UI state
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
_None explicitly locked; all implementation choices are at Claude's discretion guided by the
sketch (Variant B) and codebase conventions._

### Claude's Discretion
Implementation guided by:
- Sketch 001 Variant B (chips + rows) — the design contract
- ROADMAP goal / success criteria for DASH-01..03
- Existing codebase conventions (Tailwind v4, Heroicons, `useLiveQuery`, MemoryRouter RTL tests)

### Deferred Ideas (OUT OF SCOPE)
- Tap-to-capture (fill-the-hole sheet, one-tap save + undo, ReviewPage routing) — Phase 13
- Import / export config — Phase 14
- Authoring tool (create/edit/reorder, "+ New" chip behavior) — Phase 15
- `parseDSL` capture wiring — Phase 13 (onClick on shortcut rows is a placeholder seam only)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Dashboard renders the active layout's shortcuts as full-width tappable rows (Variant B chips+rows), each showing its name and assigned `@heroicons/react` icon. | Sketch HTML extracted; row/chip structure documented in §Architecture Patterns; resolveShortcutIcon already in Phase 11. |
| DASH-02 | User can switch between layouts via horizontally-scrollable layout chips; active-layout choice persists across reloads. | Separate `'activeLayoutName'` settings key recommended; hook shape defined in §Question 2; fallback-to-first logic documented. |
| DASH-03 | A fresh install is useful with zero setup — sensible default layouts (DayToDay / Travel / WorkTrip) are seeded into the config. | `DEFAULT_SHORTCUT_CONFIG` content verified against `parseDSL`/`POSITIONAL_SCHEMA` in §Question 3; seeding strategy documented in §Question 1. |
</phase_requirements>

---

## Summary

Phase 12 extends `DashboardPage` with three capabilities that compose on top of the Phase 11
config infrastructure: (1) rendering the active layout's shortcuts as tappable list rows with
Heroicons icons, (2) a horizontally-scrollable chip bar for switching layouts with the selection
persisted in Dexie, and (3) seeding `DEFAULT_SHORTCUT_CONFIG` into a fresh Dexie `settings`
store exactly once.

All three capabilities reuse the Phase 11 repository pattern (`configRepository`, `useLiveQuery`,
`db.settings`) without any modifications to `db.ts`. The trickiest part is the seeding strategy:
`useShortcutConfig()` returns `undefined` for both "Dexie still opening" and "no config stored,"
so the seeder must use the awaited `configRepository.get()` (not the hook) inside a `useEffect`
to get the true database state, then conditionally write `DEFAULT_SHORTCUT_CONFIG`.

The active-layout selection is stored as a separate `'activeLayoutName'` key in the same Dexie
`settings` store — a clean separation from the config object itself that requires no schema version
bump. The chip UI uses plain `<button>` elements with `aria-pressed`, consistent with the app's
existing interaction patterns.

**Primary recommendation:** Implement seeding with a one-shot `useEffect` + `configRepository.get()`
check; persist active layout as a separate Dexie settings key; extract layout chips and shortcut
rows as small components within `DashboardPage.tsx` or a `src/components/dashboard/` subfolder.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Render shortcut rows | Browser / Client (React) | — | Pure rendering from reactive config; no server involvement in a PWA |
| Layout chip switcher | Browser / Client (React) | — | UI state + Dexie write on selection; fully client-side |
| Active layout persistence | Database / Storage (Dexie `settings`) | Browser / Client (hook) | `'activeLayoutName'` key in `db.settings`; read reactively via `useLiveQuery` |
| First-run seeding | Browser / Client (useEffect) | Database / Storage (Dexie) | One-shot async check + conditional write on mount; no server |
| Default config definition | Config / Code constant | — | `DEFAULT_SHORTCUT_CONFIG` is a code constant, not runtime-computed |
| Icon resolution | Browser / Client (resolveShortcutIcon) | — | Already implemented in Phase 11; called at render time |

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `dexie` | `^4.4.3` | IndexedDB persistence for config + active layout | Already in use; settings store exists |
| `dexie-react-hooks` | `^4.4.0` | `useLiveQuery` for reactive Dexie reads | Phase 11 pattern; `useShortcutConfig` already uses this |
| `@heroicons/react` | `^2.2.0` | Icon components for shortcut rows and layout chips | Phase 11 `SHORTCUT_ICON_MAP` already references these |
| `react` | `^19.1.1` | Component model | Project stack |
| `tailwindcss` | `^4.3.1` | Styling with v4 utility classes | Project stack |

### No New Packages

This phase introduces zero new npm dependencies. Every capability is delivered through
existing dependencies. The `## Package Legitimacy Audit` section is therefore N/A.

---

## Answered Questions

### Question 1: First-run seeding (DASH-03) without double-seeding

**Root problem:** `useShortcutConfig()` (a `useLiveQuery` hook) returns `undefined` for two
distinct states — Dexie is still opening, and no config has ever been saved. The hook cannot
distinguish them. A naive "seed if hook returns undefined" would re-seed on every render until
Dexie opens, and would incorrectly seed over a user's existing config if the store is empty for
any other reason.

**Recommended approach: one-shot `useEffect` + `configRepository.get()`**

`configRepository.get()` is the *awaited async* version — it blocks until Dexie opens internally,
then returns the true database state. It returns `undefined` if and only if no row exists under
`'shortcutConfig'`. This is the discriminating signal the hook cannot provide.

```tsx
// In DashboardPage (or a custom useInitConfig hook):
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

**Why this is safe:**

- `configRepository.get()` awaits Dexie's internal open — no race with the DB initialization.
- The `cancelled` guard handles unmount-before-resolve (e.g., user navigates away during open).
- The check is idempotent: if a config already exists, `existing !== undefined`, so no write occurs.
- `useLiveQuery` fires reactively after `put()` completes — the component re-renders automatically
  with the seeded config.
- React StrictMode double-invoke: the first effect's promise is cancelled before it can write; the
  second effect runs the same logic and seeds correctly. [VERIFIED: behavior derived from cancellation
  flag + StrictMode semantics documented in react.dev]

**What NOT to do:**

- Do NOT use `useShortcutConfig() === undefined` as the seed trigger — undefined means loading,
  not "no config." This would seed on every render until Dexie opens.
- Do NOT use Dexie `on('ready')` populate — that is a one-time database setup hook (runs only on
  schema version change) and cannot be used for conditional application-level seeding.
- Do NOT add a `putIfAbsent` to `configRepository` — it provides no additional atomicity over
  `get()` + conditional `put()` at the IDB level, and adds complexity to the repository.

**How to test:**

```tsx
// In DashboardPage.test.tsx:
it('seeds DEFAULT_SHORTCUT_CONFIG on fresh install', async () => {
  // DB is empty (db.delete()/db.open() in beforeEach)
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  // After seeding, the layout chip for 'DayToDay' should appear
  expect(await screen.findByRole('button', { name: 'DayToDay' })).toBeInTheDocument()
})

it('does NOT overwrite an existing config on remount', async () => {
  const customConfig = { version: 1 as const, layouts: [{ name: 'MyLayout', shortcuts: [] }] }
  await configRepository.put(customConfig)
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  await screen.findByRole('button', { name: 'MyLayout' })
  // After a re-render, the original config is intact
  const stored = await configRepository.get()
  expect(stored?.layouts[0].name).toBe('MyLayout')
})
```

---

### Question 2: Active-layout persistence (DASH-02)

**Recommended storage: separate `'activeLayoutName'` key in `db.settings`**

A field on the `ShortcutConfig` object would require a schema version bump, a validator change,
and a migration step. A separate settings key is the minimal approach and matches the existing
`'shortcutConfig'` key pattern.

**Repository shape (add to `configRepository.ts`):**

```ts
// ─── Active layout persistence (DASH-02) ───────────────────────────────────

const ACTIVE_LAYOUT_KEY = 'activeLayoutName'

export const activeLayoutRepository = {
  async get(): Promise<string | undefined> {
    const row = await db.settings.get(ACTIVE_LAYOUT_KEY)
    return row?.value as string | undefined
  },
  async put(name: string): Promise<void> {
    await db.settings.put({ key: ACTIVE_LAYOUT_KEY, value: name })
  },
}

/**
 * Reactive hook: returns the persisted active layout name, or undefined
 * while Dexie is opening or no selection has been saved.
 * Callers must handle undefined (fall back to first layout).
 */
export function useActiveLayoutName(): string | undefined {
  return useLiveQuery(() => activeLayoutRepository.get(), [])
}
```

**Fallback logic (in the component):**

```tsx
const config = useShortcutConfig()
const persistedLayoutName = useActiveLayoutName()

// Derive the active layout:
// 1. If persistedLayoutName matches a layout in the current config, use it.
// 2. Otherwise fall back to the first layout.
// 3. If config has no layouts, activeLayout is undefined.
const layouts = config?.layouts ?? []
const activeLayout =
  layouts.find((l) => l.name === persistedLayoutName) ?? layouts[0]

// On chip click:
async function handleLayoutSelect(name: string) {
  await activeLayoutRepository.put(name)
  // useLiveQuery fires → useActiveLayoutName updates → re-renders with new active layout
}
```

**Why this is correct:**

- `persistedLayoutName` is the stored string. If the config is later edited to remove that layout
  (Phase 15), `layouts.find()` returns `undefined` and the fallback to `layouts[0]` prevents a
  broken state.
- Both `useShortcutConfig()` and `useActiveLayoutName()` are `useLiveQuery` subscriptions — they
  update reactively together when either key changes in Dexie.
- No modification to `db.ts` — `db.settings` (key/value store) already supports arbitrary keys.

---

### Question 3: DEFAULT_SHORTCUT_CONFIG content

**Where it lives:** Export as `DEFAULT_SHORTCUT_CONFIG: ShortcutConfig` from
`src/config/shortcutConfig.ts`, alongside the types it depends on. No DSL imports needed —
the constant is plain data; DSL validity is checked in tests only.

**DSL grammar constraints (verified against `src/services/dsl/parser.ts`):**

- Positional schema for `expense`: `['amount', 'category']` — so `expense 5:coffee` gives
  `{ amount: '5', category: 'coffee' }`, status `'ok'`.
- An empty amount slot (`expense :groceries`) gives status `'ok'` with a warning — valid for a
  template where the amount is the "hole" to fill at capture time (Phase 13).
- Named param `?tags="work"` — `tags` IS a valid field key for `expense` (confirmed in
  `ENTRY_FIELDS.expense`); must be quoted because commas are DSL param separators.
  `?tags="work"` parses as `{ tags: 'work' }`, status `'ok'`. [VERIFIED: parser.test.ts line 81]
- `movie :` — parses as status `'ok'` with warnings for both empty positional slots
  ('title' and 'creator'). Valid template. [VERIFIED: traced through parseDSL logic]
- `place :` — same pattern as `movie :`; positionals are 'name' and 'address'. [VERIFIED]
- ALL icon keys must be present in `SHORTCUT_ICON_MAP`. The sketch used custom icons (`cup`,
  `fork`, `fuel`) that DO NOT exist in the map — use only keys present in `shortcutConfig.ts`.
  [VERIFIED: read SHORTCUT_ICON_MAP in full]

**Proposed DEFAULT_SHORTCUT_CONFIG:**

```ts
export const DEFAULT_SHORTCUT_CONFIG: ShortcutConfig = {
  version: 1,
  layouts: [
    {
      name: 'DayToDay',
      icon: 'HomeIcon',
      shortcuts: [
        // Zero holes — one-tap (Phase 13: direct save)
        { name: 'Coffee',    icon: 'BoltIcon',         dslTemplate: 'expense 5:coffee',    confirm: false },
        // Amount hole — fill sheet (Phase 13)
        { name: 'Groceries', icon: 'ShoppingCartIcon', dslTemplate: 'expense :groceries',  confirm: false },
        { name: 'Lunch',     icon: 'BanknotesIcon',    dslTemplate: 'expense :food',       confirm: false },
        // Text hole — ReviewPage (Phase 13)
        { name: 'New Movie', icon: 'FilmIcon',         dslTemplate: 'movie :',             confirm: true  },
      ],
    },
    {
      name: 'Travel',
      icon: 'GlobeAltIcon',
      shortcuts: [
        { name: 'Trip Expense',  icon: 'BanknotesIcon', dslTemplate: 'expense :food',    confirm: false },
        { name: 'Taxi',          icon: 'TruckIcon',     dslTemplate: 'expense :transit', confirm: false },
        { name: 'Place Visited', icon: 'MapPinIcon',   dslTemplate: 'place :',          confirm: true  },
      ],
    },
    {
      name: 'WorkTrip',
      icon: 'BriefcaseIcon',
      shortcuts: [
        { name: 'Work Meal',     icon: 'BanknotesIcon', dslTemplate: 'expense :meals?tags="work"',   confirm: false },
        { name: 'Work Taxi',     icon: 'TruckIcon',     dslTemplate: 'expense :transit?tags="work"', confirm: false },
        { name: 'Client Dinner', icon: 'BriefcaseIcon', dslTemplate: 'expense :dining?tags="work"',  confirm: true  },
      ],
    },
  ],
}
```

**DSL validity proof for each template:**

| Template | parseDSL status | Notes |
|----------|-----------------|-------|
| `expense 5:coffee` | `ok` | amount=5, category=coffee; no holes |
| `expense :groceries` | `ok` + warning | empty amount slot; category=groceries |
| `expense :food` | `ok` + warning | empty amount slot; category=food |
| `movie :` | `ok` + warnings | empty title and creator slots |
| `expense :transit` | `ok` + warning | empty amount slot; category=transit |
| `place :` | `ok` + warnings | empty name and address slots |
| `expense :meals?tags="work"` | `ok` + warning | empty amount; category=meals; tags=work |
| `expense :transit?tags="work"` | `ok` + warning | same pattern |
| `expense :dining?tags="work"` | `ok` + warning | same pattern |

**Test to assert all default templates parse (add to `shortcutConfig.test.ts`):**

```ts
import { parseDSL } from '../services/dsl/parser'
import { DEFAULT_SHORTCUT_CONFIG } from './shortcutConfig'

describe('DEFAULT_SHORTCUT_CONFIG DSL validity', () => {
  it('every default dslTemplate parses without error', () => {
    for (const layout of DEFAULT_SHORTCUT_CONFIG.layouts) {
      for (const shortcut of layout.shortcuts) {
        const result = parseDSL(shortcut.dslTemplate)
        expect(
          result.status,
          `layout "${layout.name}" shortcut "${shortcut.name}": ` +
          `template "${shortcut.dslTemplate}" has issues: ${result.issues.join('; ')}`,
        ).not.toBe('error')
      }
    }
  })

  it('every default icon key is present in SHORTCUT_ICON_MAP', () => {
    for (const layout of DEFAULT_SHORTCUT_CONFIG.layouts) {
      if (layout.icon) {
        expect(SHORTCUT_ICON_MAP, `layout icon: ${layout.icon}`).toHaveProperty(layout.icon)
      }
      for (const shortcut of layout.shortcuts) {
        if (shortcut.icon) {
          expect(SHORTCUT_ICON_MAP, `shortcut icon: ${shortcut.icon}`).toHaveProperty(shortcut.icon)
        }
      }
    }
  })

  it('passes validateShortcutConfig (structural schema)', () => {
    const result = validateShortcutConfig(DEFAULT_SHORTCUT_CONFIG)
    expect(result.ok).toBe(true)
  })
})
```

---

### Question 4: Accessible, horizontally-scrollable chips (DASH-01/02)

**ARIA pattern — use plain `<button>` with `aria-pressed`, NOT `role="tablist"`**

The WAI-ARIA `tablist` pattern requires arrow-key navigation handling. Adding `role="tablist"` +
`role="tab"` without implementing the keyboard handler is a WCAG 2.1 failure (4.1.2 Name, Role,
Value). For a phone-first app with a simple chip switcher, `aria-pressed` on plain buttons is
compliant, simpler, and matches the existing app's button/link patterns. [ASSUMED: WCAG 2.1
Section 4.1.2 interpretation; no official RTL-specific guidance found that contradicts this]

**Chip switcher JSX pattern:**

```tsx
{/* Chips container */}
<div
  className="flex gap-2 overflow-x-auto pb-1 no-scrollbar [-webkit-overflow-scrolling:touch]"
  aria-label="Layout switcher"
>
  {config.layouts.map((layout) => (
    <button
      key={layout.name}
      type="button"
      aria-pressed={activeLayout?.name === layout.name}
      onClick={() => handleLayoutSelect(layout.name)}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold',
        'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
        activeLayout?.name === layout.name
          ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)]'
          : 'bg-[var(--color-background)] text-[var(--color-foreground)] border-[var(--color-border)]'
      )}
    >
      {layout.name}
    </button>
  ))}
  {/* Phase 15 placeholder — disabled, not interactive */}
  <button
    type="button"
    disabled
    className="shrink-0 cursor-default whitespace-nowrap rounded-full border border-dashed
               px-4 py-1.5 text-sm font-semibold text-[var(--color-border)]"
  >
    + New
  </button>
</div>
```

**Scrollbar hiding — add to `src/index.css`:**

```css
/* Utility: hide scrollbar while keeping scroll behavior (used by chip switcher) */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { scrollbar-width: none; }
```

Tailwind v4 does not ship a built-in `scrollbar-none` utility (that was a v3 plugin). Adding two
CSS lines to `index.css` is cleaner than obscure arbitrary variant syntax. [ASSUMED: Tailwind v4
does not include scrollbar-none; based on reading Tailwind v4 release notes and `index.css`
structure]

**Scroll snap (optional enhancement):** Adding `scroll-snap-type-x-mandatory` on the container
and `scroll-snap-align-start` on each chip makes fast flicking feel more native on iOS. Include
if the snap behavior feels natural during manual testing; omit if it creates jank on Android.

---

## Architecture Patterns

### System Architecture Diagram

```
Mount (DashboardPage)
  │
  ├─► useEffect [once] ──► configRepository.get() ──► Dexie settings
  │                              │ undefined?
  │                              └── YES ──► configRepository.put(DEFAULT)
  │
  ├─► useShortcutConfig() ──► useLiveQuery(configRepository.get)
  │        │ ShortcutConfig | undefined
  │        └─ undefined ──► render skeleton / Loading
  │        └─ config ──► layouts array
  │
  ├─► useActiveLayoutName() ──► useLiveQuery(activeLayoutRepository.get)
  │        │ string | undefined
  │        └─ derive activeLayout = find(persistedName) ?? layouts[0]
  │
  └─► Render
        ├─ Chip bar (chips per layout, active highlighted, + New disabled)
        │     onClick ──► activeLayoutRepository.put(name)
        │
        └─ Shortcut rows (for activeLayout.shortcuts)
              Icon (resolveShortcutIcon(shortcut.icon))
              Name (shortcut.name)
              Template (shortcut.dslTemplate, secondary line)
              onClick ──► TODO: Phase 13 placeholder (console.log or no-op)
```

### Recommended Project Structure

New files for Phase 12:

```
src/
├── config/
│   └── shortcutConfig.ts        # ADD: DEFAULT_SHORTCUT_CONFIG constant
├── services/
│   └── configRepository.ts      # ADD: activeLayoutRepository + useActiveLayoutName
├── pages/
│   └── DashboardPage.tsx        # EXTEND: seeding effect + chips + rows
└── components/
    └── dashboard/               # OPTIONAL: extract these if DashboardPage grows large
        ├── LayoutChips.tsx      # chip bar component
        └── ShortcutRow.tsx      # single shortcut row
```

The extraction into `src/components/dashboard/` is optional but recommended if
`DashboardPage.tsx` exceeds ~120 lines. The planner should include extraction as a task if it
judges the component will be large.

### Pattern 1: Loading → Seeded → Rendered state machine

The component has three observable states:

```
undefined (Dexie opening OR no config yet)
    │
    ├── seeding effect fires → configRepository.get() → undefined → put(DEFAULT)
    │                                                  → existing → no-op
    │
    ↓ (useLiveQuery fires after put)
ShortcutConfig { layouts: [...] }   ← render chips + rows
    │
    └── layouts: []   ← render empty state ("No shortcuts yet")
```

In the loading/seeding window, render a lightweight skeleton or `null` — do NOT render the
existing DashboardPage content without the shortcut section, because re-ordering elements on
config load creates layout shift. A brief "Loading..." or blank area above the existing nav
tiles is acceptable.

### Pattern 2: Shortcut row

```tsx
<button
  type="button"
  onClick={() => { /* Phase 13 placeholder */ }}
  className="flex w-full items-center gap-3.5 rounded-lg border border-[var(--color-border)]
             bg-[var(--color-background)] px-4 min-h-[64px]
             hover:bg-[var(--color-muted)] active:opacity-75 transition-colors text-left"
>
  {/* Icon */}
  <span className="flex w-7 shrink-0 justify-center text-[var(--color-primary)]">
    <Icon className="h-5 w-5" aria-hidden="true" />
  </span>
  {/* Body */}
  <span className="flex flex-1 flex-col gap-0.5">
    <span className="text-base font-semibold">{shortcut.name}</span>
    <span className="font-mono text-xs text-[var(--color-border)]">{shortcut.dslTemplate}</span>
  </span>
</button>
```

The secondary DSL template line is shown dimly per the sketch. It can be toggled off in a
later phase if users find it noisy.

### Anti-Patterns to Avoid

- **Seeding via `useShortcutConfig() === undefined`:** The hook can't distinguish loading from
  empty. Always use `configRepository.get()` (awaited async) for the seed check.
- **Storing activeLayout in React state only:** State does not persist across reloads. Must go
  through `activeLayoutRepository.put()` + `useLiveQuery`.
- **Modifying `db.ts`:** Do not add new stores or schema versions. The existing `settings` key/value
  store handles arbitrary keys including `'activeLayoutName'`.
- **DSL templates with unquoted tags:** `?tags=work,fun` is parsed as two comma-separated params and
  produces a parse error. Always use `?tags="work, fun"` (quoted). Verified by parser.test.ts.
- **role="tablist" without keyboard handling:** Incomplete ARIA that fails WCAG 4.1.2. Use plain
  buttons with `aria-pressed` instead.
- **Icon keys not in SHORTCUT_ICON_MAP:** The sketch used `cup`, `fork`, `fuel` — these don't
  exist in the Phase 11 `SHORTCUT_ICON_MAP`. Using them would silently fall back to `BoltIcon`
  for all three shortcuts. Only use keys verified in `SHORTCUT_ICON_MAP`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reactive Dexie reads | Manual `useEffect` + `useState` polling | `useLiveQuery` (dexie-react-hooks) | Already used in Phase 11; auto-unsubscribes; handles Dexie's async open |
| Icon resolution | Switch statement over icon strings | `resolveShortcutIcon(key)` from Phase 11 | Already handles unknown keys with fallback; tested |
| Idempotent DB write | Complex locking/flag in IDB | `configRepository.get()` → conditional `put()` | Sufficient for single-user PWA; no multi-tab race risk in practice |
| CSS scrollbar hiding | JS scroll event hacks | `.no-scrollbar` CSS utility | Two lines in index.css; stable cross-browser |

**Key insight:** Every custom primitive for this phase already exists from Phase 11. The planner
should frame Phase 12 tasks as *wiring existing primitives together*, not building new
infrastructure.

---

## Common Pitfalls

### Pitfall 1: Double-seeding with StrictMode
**What goes wrong:** React StrictMode (active in development) double-invokes effects. Without
the `cancelled` flag, two `configRepository.put(DEFAULT)` calls can race.
**Why it happens:** StrictMode mounts → unmounts → remounts to detect side effect leaks.
**How to avoid:** The `cancelled = true` cleanup in the effect's return function cancels the
first invocation's promise resolution. Only the second invocation's promise completes and writes.
**Warning signs:** In dev, you see the seeded config appear twice in Dexie (the upsert `put`
means the second write is identical, so it's harmless — but the intent is one write).

### Pitfall 2: Stale active layout name after layout deletion
**What goes wrong:** If a user deletes the "Travel" layout (Phase 15), but `'activeLayoutName'`
still holds `'Travel'`, the component would show no shortcuts (no match in `layouts.find()`).
**Why it happens:** Dexie has no foreign-key integrity between the two settings keys.
**How to avoid:** Always use the `?? layouts[0]` fallback in the activeLayout derivation. This
is documented in the hook shape in §Question 2.

### Pitfall 3: `useShortcutConfig()` undefined during loading renders empty chip bar
**What goes wrong:** Rendering chips before the config resolves results in a flash of empty
content, then the chips appear — visible layout shift.
**Why it happens:** `useLiveQuery` returns `undefined` while Dexie is opening.
**How to avoid:** Guard with `if (config === undefined) return <LoadingSkeleton />`. Even a
plain `return null` avoids the shift. Don't render the chip bar with `config?.layouts ?? []`.

### Pitfall 4: Chip switcher missing `shrink-0` causes text wrap
**What goes wrong:** Without `shrink-0` on chips, long layout names wrap to two lines inside
the flex container, breaking the single-row chip appearance.
**Why it happens:** `flex` children shrink by default.
**How to avoid:** `shrink-0 whitespace-nowrap` on every chip button. Confirmed from sketch CSS:
`.chips button { white-space: nowrap; }`.

### Pitfall 5: DashboardPage test count regression
**What goes wrong:** Existing test `'renders Quick Capture + 3 domain links + View All Entries
(5 total)'` asserts `getAllByRole('link')).toHaveLength(5)`. After Phase 12 adds shortcut rows
(which are `<button>`, not `<link>`), this test still passes — but if shortcut rows were ever
changed to `<Link>`, the count would change.
**Why it happens:** The test is count-based, not content-based.
**How to avoid:** Update the existing count test in the plan to account for the new UI surface.
Shortcut rows MUST be `<button>` (not `<Link>`), consistent with their role as action triggers,
not navigation targets.

---

## Code Examples

### Seeding effect (DashboardPage.tsx)

```tsx
// Source: derived from configRepository.ts API (Phase 11) + React useEffect docs
import { useEffect } from 'react'
import { configRepository } from '../services/configRepository'
import { DEFAULT_SHORTCUT_CONFIG } from '../config/shortcutConfig'

// Inside DashboardPage:
useEffect(() => {
  let cancelled = false
  configRepository.get().then((existing) => {
    if (existing === undefined && !cancelled) {
      configRepository.put(DEFAULT_SHORTCUT_CONFIG)
    }
  })
  return () => { cancelled = true }
}, [])
```

### Active layout resolution (DashboardPage.tsx)

```tsx
// Source: derived from configRepository pattern (Phase 11)
const config = useShortcutConfig()          // ShortcutConfig | undefined
const persistedLayoutName = useActiveLayoutName() // string | undefined

const layouts = config?.layouts ?? []
const activeLayout =
  layouts.find((l) => l.name === persistedLayoutName) ?? layouts[0]
```

### Resolving and rendering the shortcut icon (Phase 11 API)

```tsx
// Source: src/config/shortcutConfig.ts (Phase 11)
import { resolveShortcutIcon } from '../config/shortcutConfig'

// Inside a shortcut row:
const Icon = resolveShortcutIcon(shortcut.icon) // HeroIcon component; never throws
// <Icon className="h-5 w-5" aria-hidden="true" />
```

---

## Package Legitimacy Audit

No new packages are installed in Phase 12. All required capabilities are covered by packages
already in `package.json`.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + @testing-library/react 16.x |
| Config file | `vite.config.ts` (`test:` block, `environment: 'jsdom'`) |
| Setup | `src/test-setup.ts` (imports `fake-indexeddb/auto` + jest-dom) |
| Quick run command | `pnpm vitest run src/config/shortcutConfig.test.ts src/services/configRepository.test.tsx src/pages/DashboardPage.test.tsx` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| DASH-03 | Default config is seeded on fresh install | integration (Dexie + RTL) | `pnpm vitest run src/pages/DashboardPage.test.tsx` | Wave 0 gap |
| DASH-03 | Existing config is NOT overwritten on remount | integration (Dexie + RTL) | same | Wave 0 gap |
| DASH-03 | All DEFAULT_SHORTCUT_CONFIG templates parse without error | unit | `pnpm vitest run src/config/shortcutConfig.test.ts` | Wave 0 gap |
| DASH-03 | All default icon keys exist in SHORTCUT_ICON_MAP | unit | `pnpm vitest run src/config/shortcutConfig.test.ts` | Wave 0 gap |
| DASH-03 | DEFAULT_SHORTCUT_CONFIG passes validateShortcutConfig | unit | `pnpm vitest run src/config/shortcutConfig.test.ts` | Wave 0 gap |
| DASH-02 | useActiveLayoutName returns undefined before any write | unit (Dexie) | `pnpm vitest run src/services/configRepository.test.tsx` | Wave 0 gap |
| DASH-02 | useActiveLayoutName returns the persisted name after put | unit (Dexie) | same | Wave 0 gap |
| DASH-02 | Active chip has aria-pressed=true on the active layout | unit (RTL) | `pnpm vitest run src/pages/DashboardPage.test.tsx` | Wave 0 gap |
| DASH-02 | Clicking a chip calls activeLayoutRepository.put | unit (RTL + userEvent) | same | Wave 0 gap |
| DASH-02 | Fallback to first layout when persisted name not in config | unit | same | Wave 0 gap |
| DASH-01 | Shortcut rows render with shortcut names | unit (RTL) | same | Wave 0 gap |
| DASH-01 | Each shortcut row has a button role | unit (RTL) | same | Wave 0 gap |
| DASH-01 | Existing links (Quick Capture, domain tiles, entries) still render | regression (RTL) | same | Existing — update count |
| DASH-01 | + New chip renders as disabled | unit (RTL) | same | Wave 0 gap |

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/pages/DashboardPage.test.tsx src/config/shortcutConfig.test.ts src/services/configRepository.test.tsx`
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

The following test infrastructure already exists and requires no new setup:
- `fake-indexeddb/auto` hoisted in `src/test-setup.ts`
- `db.delete() / db.open()` reset pattern in `configRepository.test.tsx`
- RTL + `MemoryRouter` pattern in `DashboardPage.test.tsx`

New test cases needed (Wave 0 task — write before implementation):
- [ ] `src/config/shortcutConfig.test.ts` — 3 new `describe` blocks for `DEFAULT_SHORTCUT_CONFIG`
- [ ] `src/services/configRepository.test.tsx` — 2 new describe blocks for `useActiveLayoutName` and `activeLayoutRepository`
- [ ] `src/pages/DashboardPage.test.tsx` — expand with seeding + chips + rows tests; update link-count assertion

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user PWA, no auth surface |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | No multi-user, no roles |
| V5 Input Validation | partial | DSL templates from `DEFAULT_SHORTCUT_CONFIG` are code constants, not user input. Active layout name is selected from the stored config's own layout names — no free-form user input in this phase. |
| V6 Cryptography | no | No encryption/decryption |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DSL template injection | Tampering | `parseDSL` is a pure string parser with no `eval` or DOM injection; template is displayed as a text node, not `innerHTML`. Zero injection risk in this phase. |
| IndexedDB data tampering | Tampering | Read-only in this phase (except seeding); active layout name is a string written from the UI's own layout list, not free-form user input. |

**Phase 12 security posture:** Minimal risk. No user-supplied templates are processed in this
phase (authoring is Phase 15). The only writes to Dexie are: (a) `DEFAULT_SHORTCUT_CONFIG` from
a code constant, and (b) the active layout name from the stored config's own layout names. Neither
is a user-controlled injection surface.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Seeding via `useLiveQuery` default value | Seeding via one-shot `useEffect` + `configRepository.get()` | Avoids the loading/empty ambiguity; is truly idempotent |
| `role="tablist"` chip switcher | Plain `<button aria-pressed>` chip switcher | Skips mandatory keyboard handler; correct for mobile-first toggle group |

**Deprecated / not applicable:**
- Dexie `on('ready')` populate hook: designed for schema-version-change setup, not conditional
  app-level seeding. Do not use.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tailwind v4 does not include a `scrollbar-none` utility out of the box | Question 4 / chips | If it does, the `index.css` addition is redundant but harmless |
| A2 | Using `aria-pressed` on plain buttons (vs `role="tablist"`) is WCAG-compliant for a chip switcher | Question 4 / a11y | If the project ever needs formal WCAG audit, the tablist pattern with keyboard handling may be required |
| A3 | StrictMode is active in development (double-invoke); the `cancelled` flag is sufficient protection | Question 1 / seeding | If Strict Mode is disabled, the flag is still harmless; no risk |

---

## Open Questions

1. **Skeleton vs null during loading**
   - What we know: `config === undefined` during Dexie open; brief.
   - What's unclear: Should the shortcut section render a skeleton (e.g., 3 grey pill placeholders)
     or simply `null` (the existing dashboard nav renders immediately below)?
   - Recommendation: `null` for the shortcut section during loading is simplest; add a skeleton
     in a later pass if the blank space is visually jarring during manual testing.

2. **Show DSL template as secondary line — or not?**
   - The sketch shows `tmpl` as a secondary dim line on each row. The design note questions
     whether it adds noise.
   - Recommendation: render it in Phase 12 (it's directional from the sketch); the authoring
     phase (15) can add a setting to hide it.

3. **Where to place the shortcut section relative to existing nav**
   - CONTEXT.md says "keep the existing nav reachable." The sketch places the shortcut section
     as the primary surface with a footer "Type a shorthand instead..." link to Quick Capture.
   - Recommendation: Place the chips+rows section first (primary action), then the existing Quick
     Capture button and domain tiles below it. The existing `<Link to="/capture">` Quick Capture
     is kept; no removal.

---

## Environment Availability

Step 2.6: No external tools, services, or CLIs beyond what is already installed are required for
this phase. All dependencies are in `node_modules`.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pnpm | Build/test scripts | yes | 11.1.2 | — |
| Node.js / jsdom | Vitest test env | yes | in use | — |
| fake-indexeddb | Dexie tests | yes | ^6.2.5 in package.json | — |
| @heroicons/react | Shortcut icon rendering | yes | ^2.2.0 in package.json | — |

**Missing dependencies with no fallback:** none.

---

## Sources

### Primary (HIGH confidence)
- `src/services/configRepository.ts` — Phase 11 repository + hook contract (undefined = loading rule)
- `src/services/configRepository.test.tsx` — Dexie test reset pattern (`db.delete()/db.open()`), `act()` + `findByText` pattern for reactive tests
- `src/services/dsl/parser.ts` — DSL grammar, `POSITIONAL_SCHEMA`, `parseDSL` behavior verified by tracing code
- `src/services/dsl/parser.test.ts` — `?tags="work"` quoting verified at line 81; empty slot warning behavior confirmed
- `src/config/entryFields.ts` — `POSITIONAL_SCHEMA`, field keys per type (expense has `tags` field)
- `src/config/shortcutConfig.ts` — `SHORTCUT_ICON_MAP` keys verified; `resolveShortcutIcon` API
- `src/pages/DashboardPage.tsx` — existing link/button patterns, `min-h-[64px]`, `max-w-sm`, CSS token usage
- `src/index.css` — complete token list (`var(--color-*)`)
- `src/services/db.ts` — `db.settings` structure (`key`/`value` store); confirmed no modification needed
- `.planning/sketches/001-dashboard-shortcut-layouts/index.html` — chip CSS (`.chips`), row CSS (`.listrow`), Variant B markup structure extracted verbatim

### Secondary (MEDIUM confidence)
- `.planning/notes/dashboard-shortcut-layouts-design.md` — design rationale, layout structure
- `.planning/sketches/001-dashboard-shortcut-layouts/README.md` — Variant B decision + refinements
- `.planning/REQUIREMENTS.md` — DASH-01..03 requirement text

### Tertiary (LOW confidence)
- [A1] Tailwind v4 scrollbar utility availability — based on reading `index.css` structure + training knowledge of Tailwind v4 changelog; not verified against official Tailwind v4 release docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified present in `package.json`
- Seeding strategy: HIGH — traced through actual repository code and React docs
- Active layout persistence: HIGH — mirrors existing Phase 11 repository pattern exactly
- DEFAULT_SHORTCUT_CONFIG DSL validity: HIGH — each template traced through parseDSL logic + test cases
- Chip a11y recommendation: MEDIUM — aria-pressed is well-established; tablist vs toggle-group classification is judgment call
- Tailwind scrollbar hiding: MEDIUM — index.css approach is reliable; Tailwind v4 utility availability is assumed

**Research date:** 2026-06-17
**Valid until:** 2026-08-01 (stable tech; Dexie, React, Tailwind v4 APIs are stable)

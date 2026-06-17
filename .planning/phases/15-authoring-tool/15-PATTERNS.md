# Phase 15: Authoring Tool - Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 13 (9 new, 4 modified)
**Analogs found:** 13 / 13

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/services/shortcutMutations.ts` | service | transform | `src/services/captureService.ts` | exact |
| `src/services/shortcutMutations.test.ts` | test | transform | `src/services/captureService.test.ts` | exact |
| `src/services/templateValidator.ts` | service/utility | transform | `src/services/configValidator.ts` + `src/services/captureService.ts` | role-match |
| `src/services/templateValidator.test.ts` | test | transform | `src/services/captureService.test.ts` | exact |
| `src/pages/ManageShortcutsPage.tsx` | page | CRUD | `src/pages/SettingsPage.tsx` + `src/pages/DashboardPage.tsx` | role-match |
| `src/pages/ManageShortcutsPage.test.tsx` | test | CRUD | `src/pages/SettingsPage.test.tsx` | exact |
| `src/pages/ShortcutFormPage.tsx` | page | request-response | `src/pages/ManualEntryPage.tsx` + `src/pages/ReviewPage.tsx` | exact |
| `src/pages/ShortcutFormPage.test.tsx` | test | request-response | `src/pages/ManualEntryPage.integration.test.tsx` | exact |
| `src/components/dashboard/IconPicker.tsx` | component | event-driven | `src/components/dashboard/LayoutChips.tsx` | role-match |
| `src/pages/QuickCapturePage.tsx` (modified) | page | event-driven | itself (add button mirroring existing Button pair) | self |
| `src/pages/DashboardPage.tsx` (modified) | page | event-driven | itself (add `onManage` prop to LayoutChips call site) | self |
| `src/components/dashboard/LayoutChips.tsx` (modified) | component | event-driven | itself (activate disabled placeholder) | self |
| `src/App.tsx` (modified) | config | request-response | itself (Route registration pattern) | self |

---

## Pattern Assignments

### `src/services/shortcutMutations.ts` (service, transform)

**Analog:** `src/services/captureService.ts`

**Module header pattern** (captureService.ts lines 1-11):
```typescript
/**
 * [Module purpose doc].
 *
 * Pure-function module (named exports only, no class, no default export).
 * Mirror: src/services/exportEntries.ts
 */
```
Apply: same header style, document as "Pure-function module (named exports only, no class, no default export)."

**Imports pattern** (captureService.ts lines 13-16, shortcutConfig.ts lines 28-46):
```typescript
import type { ShortcutConfig, Layout, Shortcut } from '../config/shortcutConfig'
// No runtime imports — pure functions only
```

**Section divider pattern** (captureService.ts lines 17-18, 49-50, etc.):
```typescript
// ─── Shortcut mutations ───────────────────────────────────────────────────────
```
Apply: use the `// ─── Name ───` Unicode box-drawing section dividers throughout.

**Pure-function body pattern** (captureService.ts lines 55-62 `cleanValues`):
```typescript
export function cleanValues(
  values: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== HOLE_TOKEN),
  )
}
```
Apply: each mutation helper is a top-level named export, typed input/output, returns a new object (never mutates). Throws `Error(...)` on invalid preconditions — callers handle thrown errors to show UI messages.

**Immutable array-replace pattern** (RESEARCH.md moveShortcut excerpt):
```typescript
const layouts = config.layouts.map((l) => {
  if (l.name !== layoutName) return l
  // ...compute new shortcuts...
  return { ...l, shortcuts }
})
return { ...config, layouts }
```
Apply to every mutation that touches a layout: `config.layouts.map()` with identity return for non-matching layouts; spread to produce new objects.

**ValidationResult type** reference (configValidator.ts lines 4-7):
```typescript
export type ValidationResult =
  | { ok: true;  config: ShortcutConfig }
  | { ok: false; reason: string }
```
Do NOT re-export this type — import it from `configValidator.ts` in callers. The mutation helpers themselves throw on invalid preconditions and return `ShortcutConfig` directly; they do not use `ValidationResult` themselves.

---

### `src/services/shortcutMutations.test.ts` (test, transform)

**Analog:** `src/services/captureService.test.ts`

**Import + describe block pattern** (captureService.test.ts lines 1-12):
```typescript
import { describe, it, expect } from 'vitest'
import {
  addShortcut,
  updateShortcut,
  deleteShortcut,
  moveShortcut,
  addLayout,
  renameLayout,
  deleteLayout,
} from './shortcutMutations'
```
No Dexie imports, no fake-indexeddb, no `beforeEach`. These are pure function tests.

**Factory helper pattern** (captureService.test.ts lines 13-19):
```typescript
function makeConfig(shortcutNames: string[]): ShortcutConfig {
  return {
    version: 1,
    layouts: [{
      name: 'DayToDay',
      shortcuts: shortcutNames.map((name) => ({
        name,
        dslTemplate: 'expense 5:coffee',
        confirm: false,
      })),
    }],
  }
}
```
Apply: a `makeConfig` factory building minimal `ShortcutConfig` fixtures used across all describe blocks.

**Describe block structure** (captureService.test.ts lines 23-50):
```typescript
describe('moveShortcut', () => {
  it('moves a shortcut up by swapping with the previous', () => {
    const config = makeConfig(['Alpha', 'Beta', 'Gamma'])
    const result = moveShortcut(config, 'DayToDay', 'Beta', 'up')
    expect(result.layouts[0].shortcuts.map(s => s.name)).toEqual(['Beta', 'Alpha', 'Gamma'])
  })
  it('noop when moving first shortcut up', () => {
    const config = makeConfig(['Alpha', 'Beta'])
    const result = moveShortcut(config, 'DayToDay', 'Alpha', 'up')
    expect(result).toEqual(config)
  })
  it('throws when layout not found', () => {
    const config = makeConfig(['Alpha'])
    expect(() => moveShortcut(config, 'NoSuchLayout', 'Alpha', 'up')).toThrow()
  })
})
```

---

### `src/services/templateValidator.ts` (service/utility, transform)

**Analog:** `src/services/configValidator.ts` (ValidationResult type pattern) + `src/services/captureService.ts` (thin wrapper style)

**Import pattern** (configValidator.ts lines 1-2):
```typescript
import { parseDSL } from './dsl/parser'
```

**Result type pattern** (configValidator.ts lines 4-7):
```typescript
export interface TemplateValidationResult {
  valid: boolean
  /** Human-readable parse error; undefined when valid. */
  error?: string
}
```
Note: Use a separate interface (not the existing `ValidationResult`) because the shape differs.

**Pure-function export pattern** (captureService.ts lines 55-62):
```typescript
export function validateTemplate(template: string): TemplateValidationResult {
  const result = parseDSL(template)
  if (result.status === 'error') {
    return { valid: false, error: result.issues[0] ?? 'Invalid DSL template.' }
  }
  if (result.type === null) {
    return {
      valid: false,
      error: result.issues[0] ?? 'Add a type token (e.g. expense, movie, book).',
    }
  }
  return { valid: true }
}

/** Convenience boolean. */
export function isValidTemplate(template: string): boolean {
  return validateTemplate(template).valid
}
```
The full implementation is given in RESEARCH.md §EDIT-04. Copy it exactly.

---

### `src/services/templateValidator.test.ts` (test, transform)

**Analog:** `src/services/captureService.test.ts`

**Structure** (captureService.test.ts lines 1-12):
```typescript
import { describe, it, expect } from 'vitest'
import { validateTemplate, isValidTemplate } from './templateValidator'
```
No Dexie, no `beforeEach`. One `describe` block per exported function.

**Test case pattern** — four canonical cases from RESEARCH.md:
```typescript
describe('validateTemplate', () => {
  it('positional-hole template is valid', () => {
    expect(isValidTemplate('expense :food')).toBe(true)
  })
  it('{} named-hole template is valid', () => {
    expect(isValidTemplate('expense 5:food?merchant={}')).toBe(true)
  })
  it('unknown field is invalid and returns parse error', () => {
    const r = validateTemplate('expense 12:food?colour=blue')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/unknown field/)
  })
  it('no type given returns invalid', () => {
    const r = validateTemplate('12.50:food')
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })
})
```

---

### `src/pages/ManageShortcutsPage.tsx` (page, CRUD)

**Analog:** `src/pages/SettingsPage.tsx` (page shell) + `src/pages/DashboardPage.tsx` (LayoutChips reuse)

**Imports pattern** (SettingsPage.tsx lines 1-10, DashboardPage.tsx lines 1-18):
```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, ChevronUpIcon, ChevronDownIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { useShortcutConfig, useActiveLayoutName, configRepository } from '../services/configRepository'
import { validateShortcutConfig } from '../services/configValidator'
import {
  addLayout, renameLayout, deleteLayout,
  deleteShortcut, moveShortcut,
} from '../services/shortcutMutations'
import { LayoutChips } from '../components/dashboard/LayoutChips'
import { Button } from '../components/ui/Button'
import { cn } from '../components/ui/cn'
```

**Page shell + loading guard** (SettingsPage.tsx lines 20-28, 56-59):
```typescript
export function ManageShortcutsPage() {
  const goBack = useBackOrHome('/')
  const navigate = useNavigate()
  const config = useShortcutConfig()
  const persistedLayoutName = useActiveLayoutName()

  // Gate: undefined = Dexie still opening
  if (config === undefined) return <p>Loading...</p>

  const currentConfig = config  // narrowed for closures
  // ...
  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Manage Shortcuts</h1>
        {/* ... */}
      </div>
    </div>
  )
}
```

**LayoutChips reuse with local manage-view selection** (DashboardPage.tsx lines 39-48, 66-73):
```typescript
const layouts = currentConfig.layouts
const persistedActive = layouts.find(l => l.name === persistedLayoutName) ?? layouts[0]
const [selectedLayoutName, setSelectedLayoutName] = useState(persistedActive?.name ?? '')
const selectedLayout = layouts.find(l => l.name === selectedLayoutName) ?? layouts[0]

// In JSX:
<LayoutChips
  layouts={layouts}
  activeLayoutName={selectedLayoutName}
  onSelect={setSelectedLayoutName}
/>
```
Note: ManageShortcutsPage uses its own local `selectedLayoutName` state for the manage-view tab switcher — it does NOT call `activeLayoutRepository.put`. Only `handleLayoutSelect` in DashboardPage writes to `activeLayoutRepository`.

**Write path pattern** (RESEARCH.md §Write path pattern):
```typescript
async function handleDeleteShortcut(layoutName: string, shortcutName: string) {
  const current = await configRepository.get()
  if (!current) return
  const next = deleteShortcut(current, layoutName, shortcutName)
  const vr = validateShortcutConfig(next)
  if (!vr.ok) { /* surface error — shouldn't happen */ return }
  await configRepository.put(vr.config)
}
```
Apply this read-fresh-from-repo → mutate → validate → put pattern to every async handler.

**Error display pattern** (SettingsPage.tsx lines 100-108, ManualEntryPage.tsx lines 113-116):
```typescript
{errorMessage && (
  <p role="alert" className="text-sm text-[var(--color-destructive)]">
    {errorMessage}
  </p>
)}
```

**Up/Down button pattern** (RESEARCH.md §Reorder Approach):
```tsx
<Button
  variant="ghost"
  size="icon"
  aria-label={`Move ${shortcut.name} up`}
  disabled={index === 0}
  onClick={() => handleMove(selectedLayoutName, shortcut.name, 'up')}
>
  <ChevronUpIcon className="h-4 w-4" />
</Button>
<Button
  variant="ghost"
  size="icon"
  aria-label={`Move ${shortcut.name} down`}
  disabled={index === shortcuts.length - 1}
  onClick={() => handleMove(selectedLayoutName, shortcut.name, 'down')}
>
  <ChevronDownIcon className="h-4 w-4" />
</Button>
```
`Button` variant/size from `src/components/ui/Button.tsx` lines 4-15: `ghost` = transparent hover-muted; `icon` = `h-10 w-10 p-0`.

---

### `src/pages/ManageShortcutsPage.test.tsx` (test, CRUD)

**Analog:** `src/pages/SettingsPage.test.tsx`

**Setup pattern** (SettingsPage.test.tsx lines 1-38):
```typescript
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../services/db'
import { configRepository } from '../services/configRepository'
import type { ShortcutConfig } from '../config/shortcutConfig'
import { ManageShortcutsPage } from './ManageShortcutsPage'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

function makeValidConfig(overrides?: Partial<ShortcutConfig>): ShortcutConfig {
  return {
    version: 1,
    layouts: [{ name: 'TestLayout', shortcuts: [] }],
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ManageShortcutsPage />
    </MemoryRouter>,
  )
}
```

**Routes + probe pattern for navigation tests** (DashboardPage.test.tsx lines 154-169):
```typescript
function ShortcutFormProbe() {
  return <div data-testid="form-probe">Shortcut Form</div>
}

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/manage']}>
      <Routes>
        <Route path="/manage" element={<ManageShortcutsPage />} />
        <Route path="/manage/shortcut" element={<ShortcutFormProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}
```

**Seed before render** (SettingsPage.test.tsx lines 63-68):
```typescript
await act(async () => {
  await configRepository.put(makeValidConfig())
})
renderPage()
await screen.findByRole('heading', { name: /Manage Shortcuts/i })
```

---

### `src/pages/ShortcutFormPage.tsx` (page, request-response)

**Analog:** `src/pages/ManualEntryPage.tsx` (form shell + useState per field) + `src/pages/ReviewPage.tsx` (useLocation().state prefill)

**Imports pattern** (ManualEntryPage.tsx lines 1-9, ReviewPage.tsx lines 1-13):
```typescript
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { useShortcutConfig, useActiveLayoutName, configRepository } from '../services/configRepository'
import { validateShortcutConfig } from '../services/configValidator'
import { addShortcut, updateShortcut } from '../services/shortcutMutations'
import { validateTemplate } from '../services/templateValidator'
import { SHORTCUT_ICON_MAP, resolveShortcutIcon } from '../../config/shortcutConfig'
import type { Shortcut } from '../../config/shortcutConfig'
import { FormField } from '../components/ui/FormField'
import { Button } from '../components/ui/Button'
import { IconPicker } from '../components/dashboard/IconPicker'
import { cn } from '../components/ui/cn'
```

**useLocation state prefill pattern** (ReviewPage.tsx lines 22-23, 33-37):
```typescript
const location = useLocation()
const { state } = useLocation() as {
  state?: { dslTemplate?: string; layoutName?: string; shortcut?: Shortcut } | null
}

// Guard null (direct navigation / refresh — Pitfall 4 in RESEARCH.md):
const prefill = state ?? {}

// useState pre-fill from location state:
const [name, setName] = useState(prefill.shortcut?.name ?? '')
const [icon, setIcon] = useState<string | undefined>(prefill.shortcut?.icon)
const [dslTemplate, setDslTemplate] = useState(
  prefill.shortcut?.dslTemplate ?? prefill.dslTemplate ?? ''
)
const [confirm, setConfirm] = useState(prefill.shortcut?.confirm ?? false)
```

**Default layout selection** (RESEARCH.md §ShortcutFormPage navigation state):
```typescript
const config = useShortcutConfig()
const activeLayoutName = useActiveLayoutName()

const defaultLayout =
  prefill.layoutName ??
  activeLayoutName ??
  config?.layouts[0]?.name ??
  ''
const [selectedLayout, setSelectedLayout] = useState(defaultLayout)
```

**Form field pattern** (ManualEntryPage.tsx lines 98-119):
```typescript
// One FormField per input, id prefixed to the page context:
<FormField
  id="shortcut-name"
  label="Name"
  placeholder="e.g. Coffee"
  required
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
<FormField
  id="shortcut-template"
  label="DSL Template"
  value={dslTemplate}
  onChange={(e) => setDslTemplate(e.target.value)}
  error={dslTemplate.trim() !== '' && !templateResult.valid ? templateResult.error : undefined}
  helpText="e.g. expense :food  or  movie :  or  expense 5:coffee"
  placeholder="expense :food"
/>
```
`error` prop on `FormField` renders `<p id="${id}-error" role="alert" className="text-sm text-red-500">` (FormField.tsx lines 46-50). Pass `undefined` when no error to suppress the node.

**Live parse badge pattern** (QuickCapturePage.tsx lines 17-21, 140-147):
```typescript
const STATUS_STYLES = {
  valid:   'bg-green-500/15 text-green-600 dark:text-green-400',
  invalid: 'bg-red-500/15 text-red-500',
} as const

// In JSX:
{dslTemplate.trim() !== '' && (
  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded
                    ${templateResult.valid ? STATUS_STYLES.valid : STATUS_STYLES.invalid}`}>
    {templateResult.valid ? 'valid' : 'invalid'}
  </span>
)}
```
`templateResult` = `validateTemplate(dslTemplate)` computed inline (not in useState).

**Save-disabled guard** (QuickCapturePage.tsx line 43, ManualEntryPage.tsx lines 31-34):
```typescript
const templateResult = validateTemplate(dslTemplate)
const canSave = name.trim() !== '' && dslTemplate.trim() !== '' && templateResult.valid

// Button:
<Button variant="primary" onClick={handleSave} disabled={!canSave}>
  {isEditing ? 'Update Shortcut' : 'Save Shortcut'}
</Button>
```

**Async save handler with fresh-read** (RESEARCH.md §Write path pattern):
```typescript
const isEditing = !!prefill.shortcut

async function handleSave() {
  if (!canSave) return
  const current = await configRepository.get()
  if (!current) return
  const shortcut: Shortcut = {
    name: name.trim(),
    icon: icon ?? undefined,
    dslTemplate: dslTemplate.trim(),
    confirm,
  }
  const next = isEditing
    ? updateShortcut(current, selectedLayout, prefill.shortcut!.name, shortcut)
    : addShortcut(current, selectedLayout, shortcut)
  const vr = validateShortcutConfig(next)
  if (!vr.ok) { setSaveError(vr.reason); return }
  await configRepository.put(vr.config)
  navigate('/manage')
}
```

**Cancel / back pattern** (ManualEntryPage.tsx lines 117-121):
```typescript
<Button variant="secondary" onClick={goBack}>
  Cancel
</Button>
```

---

### `src/pages/ShortcutFormPage.test.tsx` (test, request-response)

**Analog:** `src/pages/ManualEntryPage.integration.test.tsx` + `src/pages/SettingsPage.test.tsx`

**Setup and render helper** (ManualEntryPage.integration.test.tsx lines 1-48):
```typescript
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../services/db'
import { configRepository } from '../services/configRepository'
import { ShortcutFormPage } from './ShortcutFormPage'
import { ManageShortcutsPage } from './ManageShortcutsPage'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

// Probe component for post-save navigation assert:
function ManageProbe() {
  return <div data-testid="manage-probe">Manage Page</div>
}

function renderFormPage(initialState?: object) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/manage/shortcut', state: initialState ?? null }]}
    >
      <Routes>
        <Route path="/manage/shortcut" element={<ShortcutFormPage />} />
        <Route path="/manage" element={<ManageProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}
```
Pass `initialState` to simulate navigation state from QuickCapturePage (EDIT-03) or ManageShortcutsPage edit (EDIT-01).

**Test for location.state prefill** (pattern from ReviewPage.test.tsx `initialState` approach):
```typescript
it('EDIT-03: omnibar state pre-fills dslTemplate field', async () => {
  await act(async () => {
    await configRepository.put(makeValidConfig())
  })
  renderFormPage({ dslTemplate: 'expense :food' })
  await screen.findByRole('heading', { name: /New Shortcut/i })
  expect(screen.getByLabelText(/DSL Template/i)).toHaveValue('expense :food')
})
```

---

### `src/components/dashboard/IconPicker.tsx` (component, event-driven)

**Analog:** `src/components/dashboard/LayoutChips.tsx`

**Net-new construct notice:** IconPicker is a NEW component pattern (grid of SHORTCUT_ICON_MAP icon buttons). No identical analog exists. The chip selection pattern from LayoutChips is the closest match for the `aria-pressed` toggle idiom. The icon rendering pattern comes from `src/config/shortcutConfig.ts` `resolveShortcutIcon`.

**Imports pattern** (LayoutChips.tsx lines 1-2, shortcutConfig.ts lines 59-90):
```typescript
import { cn } from '../ui/cn'
import { SHORTCUT_ICON_MAP, resolveShortcutIcon } from '../../config/shortcutConfig'
```

**Prop interface pattern** (LayoutChips.tsx lines 4-8):
```typescript
interface IconPickerProps {
  value: string | undefined       // currently selected SHORTCUT_ICON_MAP key
  onChange: (key: string) => void
}
```

**aria-pressed toggle pattern** (LayoutChips.tsx lines 20-31):
```typescript
aria-pressed={value === key}
onClick={() => onChange(key)}
className={cn(
  'flex h-9 w-9 items-center justify-center rounded-md border',
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
  value === key
    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)]'
    : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]',
)}
```
Mirrors LayoutChips.tsx lines 22-28 exactly — selected vs unselected color tokens are identical.

**Icon rendering pattern** (shortcutConfig.ts lines 87-90):
```typescript
// In the map body:
const Icon = resolveShortcutIcon(key)
// In JSX:
<Icon className="h-5 w-5" aria-hidden="true" />
```
`resolveShortcutIcon` never throws (line 87: "Unknown keys and undefined → DEFAULT_SHORTCUT_ICON. Never throws.").

**Full component skeleton** (RESEARCH.md §Icon Picker):
```tsx
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
```
No test file required for IconPicker — it is a pure presentational component covered by ShortcutFormPage.test.tsx interaction tests.

---

### `src/pages/QuickCapturePage.tsx` (modified — add "Save as Shortcut" button)

**Analog:** itself — mirror the existing `canConfirm` / `handleConfirm` / Button pair pattern.

**Existing canConfirm pattern** (QuickCapturePage.tsx line 43):
```typescript
const canConfirm = parsed.status === 'ok' && parsed.type != null
```

**New canSaveAsShortcut** (mirrors RESEARCH.md §EDIT-03):
```typescript
// Add after existing canConfirm line:
const canSaveAsShortcut = parsed.type !== null && parsed.status !== 'error'
```
Note: slightly broader than `canConfirm` — allows `status === 'ambiguous'` when `type !== null`, but in practice the RESEARCH.md §EDIT-04 analysis confirms this never occurs (ambiguous always has `type === null`). Using the broader predicate is correct and matches `validateTemplate`'s predicate.

**Handler pattern** (QuickCapturePage.tsx lines 56-61):
```typescript
const handleSaveAsShortcut = () => {
  navigate('/manage/shortcut', { state: { dslTemplate: text } })
}
```

**New import additions** (QuickCapturePage.tsx lines 1-16 — add these):
```typescript
// Already imported: useNavigate
// No new imports needed — useNavigate is already imported (line 2)
```

**Button placement** (QuickCapturePage.tsx lines 170-175 — add after "Review & Save" button):
```tsx
<Button variant="primary" onClick={handleConfirm} disabled={!canConfirm}>
  Review &amp; Save
</Button>
{/* EDIT-03: Save current DSL line as shortcut template */}
<Button variant="secondary" onClick={handleSaveAsShortcut} disabled={!canSaveAsShortcut}>
  Save as Shortcut
</Button>
<Button variant="secondary" onClick={goBack}>
  Cancel
</Button>
```

---

### `src/pages/DashboardPage.tsx` (modified — pass onManage to LayoutChips)

**Analog:** itself — mirror existing `handleLayoutSelect` prop wiring.

**Import addition** — `useNavigate` not yet imported in DashboardPage.tsx (currently uses `Link` only). Add:
```typescript
import { useNavigate } from 'react-router-dom'
// inside DashboardPage():
const navigate = useNavigate()
```

**Prop addition** (DashboardPage.tsx lines 66-73):
```tsx
// Before (lines 68-72):
<LayoutChips
  layouts={layouts}
  activeLayoutName={activeLayout?.name}
  onSelect={handleLayoutSelect}
/>

// After (add onManage prop):
<LayoutChips
  layouts={layouts}
  activeLayoutName={activeLayout?.name}
  onSelect={handleLayoutSelect}
  onManage={() => navigate('/manage')}
/>
```

---

### `src/components/dashboard/LayoutChips.tsx` (modified — activate + New chip)

**Analog:** itself — lines 33-43 are the disabled placeholder to activate.

**Prop addition** (LayoutChips.tsx lines 4-8):
```typescript
// Add onManage to the existing interface:
interface LayoutChipsProps {
  layouts: Layout[]
  activeLayoutName: string | undefined
  onSelect: (name: string) => void
  onManage: () => void          // NEW
}
```

**Disabled → active pattern** (LayoutChips.tsx lines 33-43):
```tsx
// Before:
<button
  type="button"
  disabled
  className="shrink-0 cursor-default whitespace-nowrap rounded-full border border-dashed
             px-4 py-1.5 text-sm font-semibold text-[var(--color-border)]"
>
  + New
</button>

// After (copy selected=false chip style from lines 22-28 but with dashed border):
<button
  type="button"
  onClick={() => onManage()}
  className="shrink-0 whitespace-nowrap rounded-full border border-dashed
             px-4 py-1.5 text-sm font-semibold text-[var(--color-foreground)]
             hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-offset-2"
>
  + New
</button>
```
Remove `disabled` and `cursor-default`. Keep border-dashed. Color changes from `text-[var(--color-border)]` to `text-[var(--color-foreground)]` to indicate interactable.

---

### `src/App.tsx` (modified — register two new routes)

**Analog:** itself — mirror Phase 14 route registration pattern.

**Import additions** (App.tsx lines 1-12):
```typescript
import { ManageShortcutsPage } from './pages/ManageShortcutsPage'
import { ShortcutFormPage }    from './pages/ShortcutFormPage'
```

**Route insertion** (App.tsx lines 33-35 — insert before catch-all `path="*"`):
```tsx
{/* Phase 15 — Authoring Tool */}
<Route path="/manage"          element={<ManageShortcutsPage />} />
<Route path="/manage/shortcut" element={<ShortcutFormPage />} />
```
Convention: comment with phase number and name mirrors `{/* Phase 14 — Import / Export Config */}` on line 33.

---

## Shared Patterns

### Back navigation
**Source:** `src/hooks/useBackOrHome.ts` (lines 1-23), used in `SettingsPage.tsx` line 21, `ManualEntryPage.tsx` line 14
**Apply to:** `ManageShortcutsPage.tsx`, `ShortcutFormPage.tsx`
```typescript
import { useBackOrHome } from '../hooks/useBackOrHome'
// In component:
const goBack = useBackOrHome('/')   // ManageShortcutsPage → Dashboard
const goBack = useBackOrHome('/manage')  // ShortcutFormPage → ManageShortcutsPage
// In JSX:
<button
  onClick={goBack}
  className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1"
  aria-label="Go back"
>
  <ChevronLeftIcon className="h-5 w-5" />
  <span className="text-sm font-medium">Back</span>
</button>
```
This exact pattern appears verbatim in SettingsPage.tsx (lines 59-66), ManualEntryPage.tsx (lines 87-94), ReviewPage.tsx (lines 143-149). Copy it without modification.

### Page wrapper layout
**Source:** `src/pages/SettingsPage.tsx` (lines 56-58)
**Apply to:** all new page components
```tsx
<div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
  <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
    {/* content */}
  </div>
</div>
```

### Dexie loading guard
**Source:** `src/pages/SettingsPage.tsx` (lines 27-28), `src/pages/DashboardPage.tsx` (lines 66-67)
**Apply to:** `ManageShortcutsPage.tsx`, `ShortcutFormPage.tsx`
```typescript
if (config === undefined) return <p>Loading...</p>
const currentConfig = config  // narrowed type — TypeScript does not narrow across async closures
```

### Error alert display
**Source:** `src/pages/ManualEntryPage.tsx` (lines 113-116), `src/pages/SettingsPage.tsx` (lines 103-108)
**Apply to:** all new page components
```tsx
{errorMessage && (
  <p role="alert" className="text-sm text-[var(--color-destructive)]">
    {errorMessage}
  </p>
)}
```

### Write path (mutation → validate → put)
**Source:** `src/services/configRepository.ts` (lines 28-32), `src/services/configValidator.ts` (lines 26-95)
**Apply to:** all async handlers in `ManageShortcutsPage.tsx`, `ShortcutFormPage.tsx`
```typescript
const current = await configRepository.get()  // fresh read — avoid stale closure (Pitfall 2)
if (!current) return
const next = someMutationHelper(current, ...)  // pure — throws on invalid preconditions
const vr = validateShortcutConfig(next)        // structural defense-in-depth
if (!vr.ok) { setSaveError(vr.reason); return }
await configRepository.put(vr.config)
// useLiveQuery fires automatically — no manual state update needed
```

### cn() for conditional classnames
**Source:** `src/components/ui/cn.ts`, used in `src/components/dashboard/LayoutChips.tsx` (line 1)
**Apply to:** `IconPicker.tsx`, any component with conditional classes
```typescript
import { cn } from '../ui/cn'
// or from dashboard components:
import { cn } from '../ui/cn'
```

### Test DB reset
**Source:** `src/pages/DashboardPage.test.tsx` (lines 13-16), `src/pages/SettingsPage.test.tsx` (lines 22-26)
**Apply to:** all test files that touch Dexie
```typescript
beforeEach(async () => {
  await db.delete()
  await db.open()
})
```
`fake-indexeddb/auto` is hoisted in `src/test-setup.ts` — do NOT re-import it in individual test files.

### makeValidConfig factory
**Source:** `src/services/configValidator.test.ts` (lines 11-17), `src/pages/SettingsPage.test.tsx` (lines 41-52)
**Apply to:** all page test files seeding Dexie
```typescript
function makeValidConfig(overrides?: Partial<ShortcutConfig>): ShortcutConfig {
  return {
    version: 1,
    layouts: [{ name: 'TestLayout', shortcuts: [] }],
    ...overrides,
  }
}
```

---

## No Analog Found

No files in this phase lack an analog. The two net-new constructs (IconPicker grid, up/down reorder buttons) have close partial matches and their full implementations are specified in RESEARCH.md — planners should use those excerpts directly.

| Construct | Closest Analog | Net-New Aspect |
|-----------|----------------|----------------|
| IconPicker grid | `LayoutChips.tsx` (aria-pressed toggle, cn, color tokens) | Iterates `SHORTCUT_ICON_MAP` keys; renders `resolveShortcutIcon` components |
| Up/Down reorder buttons | `Button` component (variant/size props) | `disabled` at boundaries; `aria-label` includes shortcut name |

---

## Metadata

**Analog search scope:** `src/services/`, `src/pages/`, `src/components/dashboard/`, `src/components/ui/`, `src/config/`, `src/hooks/`, `src/App.tsx`
**Files scanned:** 20 source files + 6 test files
**Pattern extraction date:** 2026-06-17

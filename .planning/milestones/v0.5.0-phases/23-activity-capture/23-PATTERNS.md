# Phase 23: Activity Capture - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 7 (3 new pages/components + 2 configs implied + 2 App.tsx route replacements)
**Analogs found:** 5 / 6 (StarRating has no codebase analog — follows STACK.md)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/config/activityTypes.ts` | config | — | `src/config/expenseCategories.ts` | exact |
| `src/pages/ActivityTypePage.tsx` | page/component | request-response | `src/pages/TripHomePage.tsx` (button grid + navigate) | role-match |
| `src/pages/ActivityTypePage.test.tsx` | test | — | `src/pages/TripHomePage.test.tsx` | exact |
| `src/pages/ActivityFormPage.tsx` | page/component | CRUD | `src/pages/CreateTripPage.tsx` (form+navigate) + `src/components/dashboard/ExpenseSheet.tsx` (save path) | role-match (composite) |
| `src/pages/ActivityFormPage.test.tsx` | test | — | `src/pages/CreateTripPage.test.tsx` + `src/pages/TripHomePage.test.tsx` | role-match |
| `src/components/ui/StarRating.tsx` | component | event-driven | none — STACK.md pattern only | no analog |
| `src/components/ui/StarRating.test.tsx` | test | — | `src/components/ui/FormField.test.tsx` (ui component test shape) | partial |
| `src/App.tsx` | config/router | — | existing `src/App.tsx` (replace 2 placeholder routes) | self |

---

## Pattern Assignments

### `src/config/activityTypes.ts` (config, constant)

**Analog:** `src/config/expenseCategories.ts` (lines 1-22)

**Exact pattern to copy:**

```typescript
// src/config/activityTypes.ts
// Single source of truth for activity types — imported by ActivityTypePage and ActivityFormPage.
// No React / component imports — keep it import-light.

/**
 * Ordered list of activity types for the trip activity flow.
 * Route slug is the lowercase form (e.g. 'Hike' → 'hike').
 */
export const ACTIVITY_TYPES = [
  'Hike',
  'Show',
  'Restaurant',
  'Cafe',
  'Other',
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]
```

**Key decisions:**
- `as const` — same as `EXPENSE_CATEGORIES`.
- Export both the array and the derived union type.
- Route slug = `label.toLowerCase()` (e.g. `'Hike'` → `'/activity/hike'`).
- Canonical label recovery in the form: `ACTIVITY_TYPES.find(t => t.toLowerCase() === type)`.

---

### `src/pages/ActivityTypePage.tsx` (page, request-response)

**Analog:** `src/pages/TripHomePage.tsx` for navigate pattern; `src/config/expenseCategories.ts` for constant-driven grid.

**Imports pattern** (model after TripHomePage imports, lines 1-12):

```typescript
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { ACTIVITY_TYPES } from '../config/activityTypes'
import { cn } from '../components/ui/cn'
```

**Back button pattern** (from `src/pages/CreateTripPage.tsx` lines 8-9, 28-34):

```typescript
const goBack = useBackOrHome('/')
// ...
<button
  onClick={goBack}
  className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1"
  aria-label="Go back"
>
  <ChevronLeftIcon className="h-5 w-5" />
  <span className="text-sm font-medium">Back</span>
</button>
```

**Core navigate pattern** (from `src/pages/TripHomePage.tsx` lines 34, 106-109):

```typescript
const navigate = useNavigate()
// ...
onClick={() => navigate('/activity')}
```

**Button grid pattern** (adapt from ExpenseSheet category grid, `src/components/dashboard/ExpenseSheet.tsx` lines 205-223):

```typescript
// Map ACTIVITY_TYPES → large tap-target buttons → navigate('/activity/<slug>')
<div className="grid grid-cols-2 gap-3">
  {ACTIVITY_TYPES.map((type) => (
    <button
      key={type}
      type="button"
      onClick={() => navigate(`/activity/${type.toLowerCase()}`)}
      className={cn(
        'h-20 rounded-xl text-base font-semibold transition-colors',
        'bg-[var(--color-muted)] hover:bg-[var(--color-border)]',
        'text-[var(--color-foreground)] active:opacity-75',
      )}
    >
      {type}
    </button>
  ))}
</div>
```

**Existing route confirmation** (`src/pages/TripHomePage.tsx` lines 103-110):

```typescript
// TripHomePage already navigates to /activity — this is the destination:
<Button
  variant="secondary"
  size="lg"
  className="flex-1"
  onClick={() => navigate('/activity')}
>
  Activity
</Button>
```

---

### `src/pages/ActivityTypePage.test.tsx` (test)

**Analog:** `src/pages/TripHomePage.test.tsx` (Activity CTA describe block, lines 121-138)

**Test shell pattern:**

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { ActivityTypePage } from './ActivityTypePage'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ActivityTypePage', () => {
  it('renders 5 activity type buttons', async () => {
    render(<MemoryRouter><ActivityTypePage /></MemoryRouter>)
    // Hike, Show, Restaurant, Cafe, Other
    expect(await screen.findByRole('button', { name: /hike/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restaurant/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cafe/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /other/i })).toBeInTheDocument()
  })

  it('Hike button navigates to /activity/hike', async () => {
    render(
      <MemoryRouter initialEntries={['/activity']}>
        <Routes>
          <Route path="/activity" element={<ActivityTypePage />} />
          <Route path="/activity/:type" element={<div data-testid="form-probe" />} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole('button', { name: /hike/i }))
    expect(await screen.findByTestId('form-probe')).toBeInTheDocument()
  })
})
```

---

### `src/pages/ActivityFormPage.tsx` (page, CRUD)

**Analog:** `src/pages/CreateTripPage.tsx` (form skeleton + navigate) + `src/components/dashboard/ExpenseSheet.tsx` (save path + double-submit guard).

**Imports pattern:**

```typescript
import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
import { useActiveMode } from '../services/activeMode'
import { draftToEntry, todayLocalMidnightEpoch } from '../services/captureService'
import type { ReviewDraft } from '../services/captureService'
import { entriesRepository } from '../services/entriesRepository'
import { ACTIVITY_TYPES } from '../config/activityTypes'
import { FormField } from '../components/ui/FormField'
import { Button } from '../components/ui/Button'
import { StarRating } from '../components/ui/StarRating'
```

**Route param pattern** — `useParams` (new for this phase; no existing analog):

```typescript
const { type } = useParams<{ type: string }>()
// Recover canonical label: 'hike' → 'Hike'
const canonicalType = ACTIVITY_TYPES.find(
  (t) => t.toLowerCase() === type
) ?? 'Other'
const isOther = canonicalType === 'Other'
```

**Active mode guard pattern** (from `src/pages/TripHomePage.tsx` lines 18-28, 63-67 + CONTEXT.md §"Active trip required"):

```typescript
const activeMode = useActiveMode()

// Guard: no active trip → redirect (after all hooks)
// Use Navigate declaratively to avoid "cannot update during render" warning
// (same pattern as TripHomePage lines 63-67)
if (activeMode === null) {
  return <Navigate to="/" replace />
}
// undefined = still loading — render null or skeleton; do NOT redirect yet
if (activeMode === undefined) {
  return null
}
```

Note: `useActiveMode` returns `undefined` while Dexie is opening, and the actual value (`ActiveMode | null`) once resolved. The guard must distinguish these two states (PITFALLS Pitfall 2).

**Validation pattern** (from `src/components/dashboard/ExpenseSheet.tsx` lines 89-107):

```typescript
// Required: Name always. For 'Other', activityType also required.
const [name, setName] = useState('')
const [activityTypeField, setActivityTypeField] = useState('')  // only for Other
const [errors, setErrors] = useState<Record<string, string>>({})

function validate(): boolean {
  const errs: Record<string, string> = {}
  if (!name.trim()) errs.name = 'Name is required.'
  if (isOther && !activityTypeField.trim()) errs.activityType = 'Type is required.'
  setErrors(errs)
  return Object.keys(errs).length === 0
}
```

**Double-submit guard + save path pattern** (from `src/components/dashboard/ExpenseSheet.tsx` lines 53-54, 98-139):

```typescript
const savingRef = useRef(false)   // WR-02: synchronous double-submit guard
const [saving, setSaving] = useState(false)

async function handleSave() {
  // Synchronous guard — checked before any async re-render
  if (savingRef.current) return
  if (!validate()) return

  savingRef.current = true
  setSaving(true)
  try {
    const draft: ReviewDraft = {
      // Name → core.title (ENTRY_FIELDS.activity key 'name' mapTo core.title)
      title: name.trim(),
      // Location → core.location (ENTRY_FIELDS.activity key 'location')
      ...(location.trim() ? { location: location.trim() } : {}),
      // Notes → core.description (ENTRY_FIELDS.activity key 'description')
      ...(notes.trim() ? { description: notes.trim() } : {}),
      // occurredAt: LOCAL midnight epoch — NEVER new Date().toISOString()
      // (PITFALLS Pitfall 3, captureService.ts lines 253-255)
      occurredAt: todayLocalMidnightEpoch(),
      metadata: {
        // Rating → metadata.rating (ENTRY_FIELDS.activity key 'rating', min:1 max:5)
        ...(rating > 0 ? { rating } : {}),
        // activityType: canonical label for preset types; user text for Other
        // (ENTRY_FIELDS.activity key 'activityType' mapTo metadata.activityType)
        activityType: isOther ? activityTypeField.trim() : canonicalType,
        // tripId is AUTO-STAMPED by draftToEntry from activeMode — do NOT set by hand
        // (CONTEXT.md §"Activity save", captureService.ts draftToEntry lines 196-204)
      },
    }
    // domain is the literal 'trips' — never derived from defaultDomainForType
    // (PITFALLS Pitfall 8, CONTEXT.md §"Activity save")
    const entryData = draftToEntry(draft, 'activity', 'trips', activeMode)
    await entriesRepository.create(entryData)
    navigate('/')
  } catch (err) {
    console.error('ActivityFormPage save failed:', err)
    setErrors({ _form: 'Could not save. Please try again.' })
  } finally {
    setSaving(false)
    savingRef.current = false
  }
}
```

**ENTRY_FIELDS.activity key reference** (`src/config/entryFields.ts` lines 97-105):

```typescript
// key         label      inputType  mapTo
// 'name'    → 'Name'     text       core.title        (required)
// 'location'→ 'Location' text       core.location     (optional)
// 'occurredAt'→'Date'    date       core.occurredAt   (optional — default via todayLocalMidnightEpoch)
// 'rating'  → 'Rating'   number     metadata.rating   (optional, min:1 max:5)
// 'description'→'Notes'  text       core.description  (optional)
// 'activityType'→'Type'  text       metadata.activityType (required for Other only)
```

**FormField usage pattern** (`src/components/ui/FormField.tsx` lines 5-62):

```typescript
// FormField wraps Input with label + error display
<FormField
  id="activity-name"
  label="Name"
  required
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={errors.name}
  placeholder="Activity name"
/>

{/* Conditional Type field — only rendered when type === 'other' */}
{isOther && (
  <FormField
    id="activity-type"
    label="Type"
    required
    value={activityTypeField}
    onChange={(e) => setActivityTypeField(e.target.value)}
    error={errors.activityType}
    placeholder="Describe the activity"
  />
)}
```

**Button row pattern** (`src/pages/CreateTripPage.tsx` lines 48-56; `src/components/ui/Button.tsx` lines 22-41):

```typescript
<div className="flex gap-3">
  <Button variant="secondary" type="button" onClick={goBack} className="flex-1">
    Cancel
  </Button>
  <Button
    variant="primary"
    type="submit"
    disabled={saving}
    className="flex-1"
  >
    {saving ? 'Saving…' : 'Save'}
  </Button>
</div>
```

---

### `src/pages/ActivityFormPage.test.tsx` (test)

**Analog:** `src/pages/CreateTripPage.test.tsx` (full file) + `src/pages/TripHomePage.test.tsx` (Dexie setup pattern).

**Test shell + key assertions:**

```typescript
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { activeModeRepository } from '../services/activeMode'
import { createAndActivateTrip } from '../services/tripService'
import { ActivityFormPage } from './ActivityFormPage'

// fake-indexeddb/auto hoisted in src/test-setup.ts — do NOT re-import

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})

// Helper: render at /activity/:type with a probe destination at /
function renderAtType(type: string) {
  return render(
    <MemoryRouter initialEntries={[`/activity/${type}`]}>
      <Routes>
        <Route path="/activity/:type" element={<ActivityFormPage />} />
        <Route path="/" element={<div data-testid="home-probe" />} />
        <Route path="/create-trip" element={<div data-testid="create-probe" />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ActivityFormPage — save path', () => {
  it('saves entry with type=activity, domain=trips, metadata.activityType, local-date occurredAt', async () => {
    // MEMORY.md: full fake timers stall Dexie — use { toFake: ['Date'] } only
    vi.useFakeTimers({ toFake: ['Date'] })
    const trip = await createAndActivateTrip('Paris')

    renderAtType('hike')
    await userEvent.type(await screen.findByLabelText(/name/i), 'Montmartre walk')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await screen.findByTestId('home-probe')

    const entries = await db.entries.toArray()
    const activity = entries.find((e) => e.type === 'activity')
    expect(activity).toBeDefined()
    expect(activity!.domain).toBe('trips')
    expect(activity!.title).toBe('Montmartre walk')
    expect(activity!.metadata.activityType).toBe('Hike')
    expect(activity!.metadata.tripId).toBe(trip.id)
    // occurredAt must be LOCAL midnight epoch (not UTC — PITFALLS Pitfall 3)
    const localMidnight = Date.parse(
      `${new Date().toLocaleDateString('en-CA')}T00:00:00`
    )
    expect(activity!.occurredAt).toBe(localMidnight)
  })
})

describe('ActivityFormPage — Other type validation', () => {
  it('shows Type field only for other', async () => {
    await createAndActivateTrip('Paris')
    renderAtType('other')
    expect(await screen.findByLabelText(/^type/i)).toBeInTheDocument()
  })

  it('blocks save when Other + Type is empty', async () => {
    await createAndActivateTrip('Paris')
    renderAtType('other')
    await userEvent.type(await screen.findByLabelText(/name/i), 'Mystery thing')
    // Do NOT fill Type field
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    // Still on the form — home-probe absent
    expect(screen.queryByTestId('home-probe')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('saves Other entry with free-text activityType in metadata', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await createAndActivateTrip('Paris')
    renderAtType('other')
    await userEvent.type(await screen.findByLabelText(/name/i), 'Bike ride')
    await userEvent.type(screen.getByLabelText(/^type/i), 'Cycling')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await screen.findByTestId('home-probe')
    const entries = await db.entries.toArray()
    const activity = entries.find((e) => e.type === 'activity')
    expect(activity!.metadata.activityType).toBe('Cycling')
  })
})

describe('ActivityFormPage — redirect when no active trip', () => {
  it('redirects to / when activeMode is null', async () => {
    // No trip created → no active mode persisted
    renderAtType('hike')
    expect(await screen.findByTestId('create-probe')).toBeInTheDocument()
  })
})
```

---

### `src/components/ui/StarRating.tsx` (component, event-driven)

**No codebase analog.** Pattern source: `STACK.md` lines 110-158.

**Icon imports** (STACK.md lines 155-158 — both variants already in `@heroicons/react ^2.2.0`):

```typescript
import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline'
import { cn } from './cn'
```

**Full implementation pattern** (STACK.md lines 111-145):

```typescript
const STARS = [1, 2, 3, 4, 5] as const

interface StarRatingProps {
  value: number      // 0 = unset/cleared
  onChange: (n: number) => void
}

export function StarRating({ value, onChange }: StarRatingProps) {
  function handleKeyDown(e: React.KeyboardEvent, n: number) {
    if (e.key === 'ArrowRight') { e.preventDefault(); onChange(Math.min(5, n + 1)) }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); onChange(Math.max(0, n - 1)) }
  }

  return (
    <div role="group" aria-label="Rating" className="flex gap-1">
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={value === n}
          onClick={() => onChange(value === n ? 0 : n)}   // tap same star = clear
          onKeyDown={(e) => handleKeyDown(e, n)}
          className={cn(
            'h-11 w-11 flex items-center justify-center rounded-full',
            'transition-colors active:opacity-75',
            n <= value
              ? 'text-amber-400'
              : 'text-[var(--color-border)]',
          )}
        >
          {n <= value
            ? <StarIcon className="h-7 w-7" aria-hidden="true" />
            : <StarIconOutline className="h-7 w-7" aria-hidden="true" />
          }
        </button>
      ))}
    </div>
  )
}
```

**Key constraints (PITFALLS lines 206-209, CONTEXT.md lines 58-64):**
- `<button type="button">` — NOT `<div>`/`<span>`; iOS tap events only fire reliably on buttons/links (PITFALLS UX Pitfall, star rating row).
- `h-11 w-11` = 44×44 CSS px — meets WCAG 2.5.5 minimum.
- `aria-hidden="true"` on icon elements — label is on the button wrapper.
- `role="group" aria-label="Rating"` on container (STACK.md line 121).
- Tap currently-selected star → `onChange(0)` to clear.
- Arrow keys: Right = increase, Left = decrease; `preventDefault()` to suppress page scroll.

---

### `src/components/ui/StarRating.test.tsx` (test)

**Analog shape:** `src/components/ui/FormField.test.tsx` (simple render + interaction).

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StarRating } from './StarRating'

describe('StarRating', () => {
  it('renders 5 buttons with aria-labels', () => {
    render(<StarRating value={0} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '1 star' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2 stars' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5 stars' })).toBeInTheDocument()
  })

  it('tap star N calls onChange(N)', async () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '3 stars' }))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('tap currently-selected star calls onChange(0) to clear', async () => {
    const onChange = vi.fn()
    render(<StarRating value={3} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '3 stars' }))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('ArrowRight increases rating', async () => {
    const onChange = vi.fn()
    render(<StarRating value={2} onChange={onChange} />)
    screen.getByRole('button', { name: '2 stars' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('ArrowLeft decreases rating', async () => {
    const onChange = vi.fn()
    render(<StarRating value={4} onChange={onChange} />)
    screen.getByRole('button', { name: '4 stars' }).focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('buttons have aria-pressed reflecting current value', () => {
    render(<StarRating value={3} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '3 stars' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '4 stars' })).toHaveAttribute('aria-pressed', 'false')
  })
})
```

---

### `src/App.tsx` (router modification)

**Self-analog:** existing `src/App.tsx` lines 20-22.

**Replace these two placeholder routes:**

```typescript
// BEFORE (lines 20-22):
<Route path="/activity"        element={<PlaceholderPage title="Log Activity" />} />
<Route path="/activity/:type"  element={<PlaceholderPage title="Activity Form" />} />

// AFTER:
<Route path="/activity"        element={<ActivityTypePage />} />
<Route path="/activity/:type"  element={<ActivityFormPage />} />
```

Add imports:
```typescript
import { ActivityTypePage }  from './pages/ActivityTypePage'
import { ActivityFormPage }  from './pages/ActivityFormPage'
```

---

## Shared Patterns

### Double-Submit Guard (savingRef)
**Source:** `src/components/dashboard/ExpenseSheet.tsx` lines 53-54, 98-100, 109, 135-137
**Apply to:** `ActivityFormPage.tsx` save handler

```typescript
const savingRef = useRef(false)
// In handleSave():
if (savingRef.current) return
savingRef.current = true
// ...
finally { savingRef.current = false }
```

### Domain Literal — Always `'trips'`, Never Derived
**Source:** `src/components/dashboard/ExpenseSheet.tsx` line 128; PITFALLS Pitfall 8
**Apply to:** `ActivityFormPage.tsx` save path

```typescript
// CORRECT — always hardcode:
const entryData = draftToEntry(draft, 'activity', 'trips', activeMode)
// WRONG — never call defaultDomainForType('activity'); it does not exist for 'trips'
```

### Local Midnight Date
**Source:** `src/services/captureService.ts` lines 242-255
**Apply to:** `ActivityFormPage.tsx` draft construction

```typescript
import { todayLocalMidnightEpoch } from '../services/captureService'
// In draft:
occurredAt: todayLocalMidnightEpoch()
// NEVER: new Date().toISOString() or Date.UTC(...)
```

### Dexie Reset in Tests
**Source:** `src/pages/CreateTripPage.test.tsx` lines 11-14; `src/pages/TripHomePage.test.tsx` lines 13-15
**Apply to:** All new test files that touch Dexie

```typescript
beforeEach(async () => {
  await db.delete()
  await db.open()
})
afterEach(() => {
  vi.useRealTimers()
})
```

### Fake Timers — Date Only
**Source:** `src/pages/TripHomePage.test.tsx` line 55; MEMORY.md "Fake timers hang Dexie"
**Apply to:** Any test that seeds entries and checks `occurredAt` or `recordedAt`

```typescript
// CORRECT — only fake Date to avoid stalling Dexie's IndexedDB awaits:
vi.useFakeTimers({ toFake: ['Date'] })
// WRONG — full fake timers stall Dexie:
vi.useFakeTimers()
```

### MemoryRouter + useParams Test Setup
**Source:** `src/pages/CreateTripPage.test.tsx` lines 22-30 (MemoryRouter pattern)
**Apply to:** `ActivityFormPage.test.tsx` (must render at `/activity/:type` path)

```typescript
// Render at a specific route so useParams() resolves :type correctly:
<MemoryRouter initialEntries={['/activity/other']}>
  <Routes>
    <Route path="/activity/:type" element={<ActivityFormPage />} />
    <Route path="/" element={<div data-testid="home-probe" />} />
  </Routes>
</MemoryRouter>
```

### Error Display Pattern
**Source:** `src/components/ui/FormField.tsx` lines 47-50; `src/components/dashboard/ExpenseSheet.tsx` lines 271-275
**Apply to:** `ActivityFormPage.tsx` validation errors

```typescript
// FormField handles per-field errors via error prop → renders <p role="alert">
<FormField id="activity-name" label="Name" error={errors.name} ... />

// Form-level error (save failure):
{errors._form && (
  <p role="alert" className="text-sm text-red-500">{errors._form}</p>
)}
```

### cn Utility
**Source:** `src/components/ui/cn.ts` (used in Button.tsx line 1, Input.tsx line 2, StarRating)

```typescript
import { cn } from '../ui/cn'         // from pages/
import { cn } from './cn'             // from components/ui/
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/components/ui/StarRating.tsx` | component | event-driven | No interactive rating control exists in codebase; STACK.md provides the complete implementation pattern |

---

## Metadata

**Analog search scope:** `src/pages/`, `src/components/dashboard/`, `src/components/ui/`, `src/config/`, `src/services/`
**Files scanned:** 14 (read) + 4 (grep/find)
**Pattern extraction date:** 2026-06-19

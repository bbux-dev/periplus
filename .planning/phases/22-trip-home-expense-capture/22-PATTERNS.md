# Phase 22: Trip Home + Expense Capture - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 4 (ExpenseSheet.tsx, ExpenseSheet.test.tsx, money.ts, TripHomePage.tsx)
**Analogs found:** 3 / 4 (money.ts has no codebase analog — use STACK.md pattern)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/dashboard/ExpenseSheet.tsx` | component/dialog | request-response | `src/components/dashboard/HoleSheet.tsx` | exact (clone + replace internals) |
| `src/components/dashboard/ExpenseSheet.test.tsx` | test | request-response | `src/pages/CreateTripPage.test.tsx` + `src/pages/TripHomePage.test.tsx` | role-match |
| `src/config/money.ts` | utility | transform | none in codebase | no analog — use STACK.md |
| `src/pages/TripHomePage.tsx` | page/container | CRUD + request-response | itself (Phase 21 stub) | self-rewrite |

---

## Pattern Assignments

---

### `src/components/dashboard/ExpenseSheet.tsx` (component, request-response)

**Analog:** `src/components/dashboard/HoleSheet.tsx`

**Rule:** Clone the shell (backdrop + panel + focus management + body scroll lock + action buttons). Replace ALL HoleSheet-specific internals (keypad, presets, orderedHoles, DSL preview, holeMap props) with expense-specific controls.

---

#### KEEP from HoleSheet — imports block (lines 1-16):

```typescript
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { cn } from '../ui/cn'
```

Add these imports that HoleSheet does not have:

```typescript
import { draftToEntry, todayLocalMidnightEpoch } from '../../services/captureService'
import type { ReviewDraft } from '../../services/captureService'
import { entriesRepository } from '../../services/entriesRepository'
import type { ActiveMode } from '../../services/activeMode'
import type { LifeLogEntry } from '../../services/db'
```

Do NOT import `applyFills`, `buildDSLPreview`, `HoleMap`, or `EntryType` — those are HoleSheet-only.

---

#### KEEP — focus management useEffect (HoleSheet lines 49-53):

```typescript
// Move focus into the sheet on open (WCAG 2.1 SC 4.1.2)
useEffect(() => {
  if (isOpen) {
    panelRef.current?.focus()
  }
}, [isOpen])
```

Note: ExpenseSheet uses `autoFocus` on the amount `<input>` instead of `panelRef.focus()`. Keep the panelRef fallback but let the input auto-focus first.

---

#### KEEP — state reset useEffect (HoleSheet lines 55-57):

```typescript
// Reset fills when the sheet opens so stale values don't carry over
useEffect(() => {
  if (isOpen) setFills({})
}, [isOpen])
```

ExpenseSheet equivalent — reset all form fields on open:

```typescript
useEffect(() => {
  if (isOpen) {
    setAmount('')
    setCategory('')
    setVendor('')
    setNotes('')
    setError('')
  }
}, [isOpen])
```

---

#### ADD — body scroll lock useEffect (from STACK.md, no HoleSheet equivalent):

```typescript
useEffect(() => {
  if (!isOpen) return
  document.body.style.overflow = 'hidden'
  return () => { document.body.style.overflow = '' }
}, [isOpen])
```

---

#### KEEP — early return guard (HoleSheet line 108):

```typescript
if (!isOpen) return null
```

---

#### KEEP — backdrop overlay (HoleSheet lines 113-119):

```typescript
{/* Backdrop overlay — dismisses the sheet on tap */}
<div
  className="fixed inset-0 bg-black/40 z-40"
  onClick={onCancel}
  aria-hidden="true"
/>
```

---

#### KEEP — sheet panel wrapper (HoleSheet lines 121-131), with one change:

HoleSheet original:
```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-label="Fill in required fields"
  ref={panelRef}
  tabIndex={-1}
  className="fixed bottom-0 left-0 right-0 z-50
             bg-[var(--color-background)] rounded-t-2xl
             px-6 pt-6 pb-8 max-h-[85vh] overflow-y-auto outline-none"
>
```

ExpenseSheet change — update `aria-label` and `pb` for iPhone safe area:
```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-label="Log expense"
  ref={panelRef}
  tabIndex={-1}
  className="fixed bottom-0 left-0 right-0 z-50
             bg-[var(--color-background)] rounded-t-2xl
             px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]
             max-h-[90vh] overflow-y-auto outline-none"
>
```

---

#### REPLACE — HoleSheet internals with expense fields:

**Remove entirely from HoleSheet (do NOT copy):**
- `KEYPAD_KEYS`, `AMOUNT_PRESETS` constants (lines 32-33)
- `orderedHoles` derivation (lines 61-65)
- `merged` / `preview` DSL logic (lines 67-68)
- `isValidFill` / `allFilled` hole-validation (lines 72-81)
- `handleKeypad`, `handlePreset` handlers (lines 85-104)
- Per-hole render map with keypad (lines 133-200)
- DSL preview `<div>` (lines 202-206)
- `holeMap`, `baseValues`, `type` props

**Replace with expense-specific constants and state:**

```typescript
// ── Constants ─────────────────────────────────────────────────────────────────
// Single source of truth — imported by Phase 24's category report too
export const EXPENSE_CATEGORIES = [
  'Hotel', 'Rental Car', 'Flight', 'Taxi/Uber',
  'Food', 'Gas', 'Parking', 'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

// ── Props ─────────────────────────────────────────────────────────────────────
interface ExpenseSheetProps {
  isOpen: boolean
  activeMode: ActiveMode | null | undefined
  onSave: (entry: LifeLogEntry) => void  // returns saved entry for undo
  onCancel: () => void
}

// ── State ─────────────────────────────────────────────────────────────────────
const [amount, setAmount] = useState('')
const [category, setCategory] = useState('')
const [vendor, setVendor] = useState('')
const [notes, setNotes] = useState('')
const [error, setError] = useState('')
const [saving, setSaving] = useState(false)
const panelRef = useRef<HTMLDivElement>(null)
```

---

#### REPLACE — validation gate (replaces HoleSheet `allFilled` pattern):

```typescript
// Save gated: amount must be a positive number AND a category must be selected
const parsedAmount = parseFloat(amount)
const canSave =
  amount.trim() !== '' &&
  !isNaN(parsedAmount) &&
  parsedAmount > 0 &&
  category !== ''
```

---

#### ADD — amount input with autoFocus (replaces HoleSheet keypad):

```typescript
{/* Amount field — inputMode="decimal" gives numeric keyboard on mobile without
    type="number" stepper-arrow quirks (STACK.md §1, PITFALLS UX) */}
<div className="mb-4">
  <label
    htmlFor="expense-amount"
    className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
  >
    Amount <span aria-hidden="true">*</span>
  </label>
  <input
    id="expense-amount"
    type="text"
    inputMode="decimal"
    pattern="[0-9]*\.?[0-9]+"
    value={amount}
    onChange={(e) => setAmount(e.target.value)}
    placeholder="0.00"
    autoFocus
    className={cn(
      'w-full rounded-md border px-3 py-2 text-2xl font-bold',
      'bg-[var(--color-background)] text-[var(--color-foreground)]',
      'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
      !canSave && amount !== '' ? 'border-red-500' : 'border-[var(--color-border)]',
    )}
  />
</div>
```

---

#### ADD — 8-button category grid (replaces HoleSheet hole inputs):

```typescript
{/* Category grid — large tap targets, toggle selection */}
<div className="mb-4">
  <p className="text-sm font-medium text-[var(--color-foreground)] mb-2">
    Category <span aria-hidden="true">*</span>
  </p>
  <div className="grid grid-cols-4 gap-2">
    {EXPENSE_CATEGORIES.map((cat) => (
      <button
        key={cat}
        type="button"
        aria-pressed={category === cat}
        onClick={() => setCategory((prev) => (prev === cat ? '' : cat))}
        className={cn(
          'h-14 rounded-lg text-sm font-medium transition-colors',
          'active:opacity-75',
          category === cat
            ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
            : 'bg-[var(--color-muted)] hover:bg-[var(--color-border)] text-[var(--color-foreground)]',
        )}
      >
        {cat}
      </button>
    ))}
  </div>
</div>
```

---

#### ADD — vendor + notes text inputs (optional fields):

```typescript
{/* Vendor (optional) */}
<div className="mb-4">
  <label
    htmlFor="expense-vendor"
    className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
  >
    Vendor
  </label>
  <input
    id="expense-vendor"
    type="text"
    value={vendor}
    onChange={(e) => setVendor(e.target.value)}
    placeholder="Optional"
    className={cn(
      'w-full rounded-md border border-[var(--color-border)]',
      'bg-[var(--color-background)] text-[var(--color-foreground)]',
      'px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
    )}
  />
</div>

{/* Notes (optional) */}
<div className="mb-4">
  <label
    htmlFor="expense-notes"
    className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
  >
    Notes
  </label>
  <input
    id="expense-notes"
    type="text"
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    placeholder="Optional"
    className={cn(
      'w-full rounded-md border border-[var(--color-border)]',
      'bg-[var(--color-background)] text-[var(--color-foreground)]',
      'px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
    )}
  />
</div>
```

---

#### ADD — validation error display (above action buttons):

```typescript
{error && (
  <p role="alert" className="text-sm text-red-500 mb-3">
    {error}
  </p>
)}
```

---

#### KEEP — action buttons pattern (HoleSheet lines 208-227), adapted:

HoleSheet original:
```typescript
<div className="flex gap-3">
  <Button variant="secondary" type="button" onClick={onCancel} className="flex-1">
    Cancel
  </Button>
  <Button
    variant="primary"
    type="button"
    disabled={!allFilled}
    onClick={() => onSave(fills)}
    className="flex-1"
  >
    Save
  </Button>
</div>
```

ExpenseSheet version:
```typescript
<div className="flex gap-3">
  <Button variant="secondary" type="button" onClick={onCancel} className="flex-1">
    Cancel
  </Button>
  <Button
    variant="primary"
    type="button"
    disabled={!canSave || saving}
    onClick={() => void handleSave()}
    className="flex-1"
  >
    {saving ? 'Saving…' : 'Save'}
  </Button>
</div>
```

---

### Expense Save Call Site (`handleSave` inside `ExpenseSheet`)

**Field → entry mapping** (from `ENTRY_FIELDS.expense`, `entryFields.ts` lines 80-91):

| Form field | Key in form state | `ENTRY_FIELDS.expense` key | `mapTo` | Entry field |
|------------|-------------------|---------------------------|---------|-------------|
| Amount | `amount` (string) | `'amount'` | `{ kind: 'core', field: 'amount' }` | `entry.amount` (number) |
| Category | `category` (string) | `'category'` | `{ kind: 'metadata', key: 'category' }` | `entry.metadata.category` |
| Vendor | `vendor` (string) | `'merchant'` | `{ kind: 'metadata', key: 'merchant' }` | `entry.metadata.merchant` |
| Notes | `notes` (string) | `'description'` | `{ kind: 'core', field: 'description' }` | `entry.description` |

**Canonical save handler** — build draft directly (no `buildReviewDraft` needed for this simple form):

```typescript
async function handleSave() {
  const parsedAmount = parseFloat(amount)
  if (isNaN(parsedAmount) || parsedAmount <= 0 || !category) {
    setError('Amount and category are required.')
    return
  }
  setSaving(true)
  setError('')
  try {
    const draft: ReviewDraft = {
      amount: parsedAmount,
      // occurredAt: todayLocalMidnightEpoch() — local midnight, NOT new Date().toISOString()
      // (PITFALLS Pitfall 3: UTC off-by-one). captureService.ts lines 253-255.
      occurredAt: todayLocalMidnightEpoch(),
      ...(notes.trim() ? { description: notes.trim() } : {}),
      metadata: {
        category,
        ...(vendor.trim() ? { merchant: vendor.trim() } : {}),
      },
    }
    // domain MUST be 'trips' — NEVER defaultDomainForType('expense') which returns
    // 'expenditures' (PITFALLS Pitfall 8, CONTEXT decisions).
    // metadata.tripId is stamped AUTOMATICALLY by draftToEntry from activeMode.tripId
    // (captureService.ts lines 198-204) — do NOT set it by hand.
    const entryData = draftToEntry(draft, 'expense', 'trips', activeMode)
    const saved = await entriesRepository.create(entryData)
    onSave(saved)  // parent receives entry for undo via entriesRepository.delete(saved.id)
  } finally {
    setSaving(false)
  }
}
```

---

### `src/config/money.ts` (utility, transform)

**No codebase analog.** Use STACK.md §3 pattern directly.

**Pattern from STACK.md lines 196-202:**

```typescript
// src/config/money.ts
// Module-level formatter — construction is cheap; reuse is free (STACK.md §3)
const _fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Formats a number as USD currency string.
 * Rounds at 2dp before formatting to prevent IEEE 754 display artifacts
 * (PITFALLS Pitfall 4: floating-point money).
 *
 * formatUSD(123.4)    // "$123.40"
 * formatUSD(0)        // "$0.00"
 * formatUSD(1234.56)  // "$1,234.56"
 * formatUSD(15.299999999999999)  // "$15.30"  ← rounding guard
 */
export function formatUSD(n: number): string {
  return _fmt.format(Math.round(n * 100) / 100)
}
```

**Usage with `tripExpenseTotal`** (tripService.ts line 20-24):
```typescript
// tripExpenseTotal returns a raw float — always pass through formatUSD at display time
const total = tripExpenseTotal(tripEntries ?? [])
// renders: formatUSD(total)  → e.g. "$1,234.50"
```

---

### `src/pages/TripHomePage.tsx` (page, CRUD + request-response)

**Analog:** itself (Phase 21 stub at lines 1-46)

---

#### KEEP — active-mode guard (current TripHomePage.tsx lines 1-35):

This is the proven Phase-21 single-query pattern. Copy it verbatim; it solves the
loading-vs-empty ambiguity (PITFALLS Pitfall 2).

```typescript
import { Navigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { activeModeRepository } from '../services/activeMode'
import type { ActiveMode } from '../services/activeMode'

// Single query: returns { ready, mode } so both fields resolve atomically.
// Default `{ ready: false, mode: undefined }` fires synchronously — no flash
// of the redirect path while Dexie is still opening (CR-01).
const result = useLiveQuery<
  { ready: true; mode: ActiveMode | null },
  { ready: false; mode: undefined }
>(
  async () => {
    const mode = await activeModeRepository.get()
    return { ready: true, mode: mode ?? null }
  },
  [],
  { ready: false, mode: undefined },
)

if (!result.ready) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
      <p className="text-sm text-[var(--color-muted)]">Loading…</p>
    </div>
  )
}

if (!result.mode || result.mode.mode !== 'trip') {
  return <Navigate to="/create-trip" replace />
}
```

---

#### ADD — trip entries + total after the guard resolves:

```typescript
// After guard: result.mode is the active trip (non-null, mode === 'trip')
const activeMode = result.mode  // ActiveMode with .tripId

// useTripEntries: tripId in dep array so query re-runs when tripId changes
// (PITFALLS integration gotcha for useLiveQuery deps)
// Returns undefined while Dexie opens; [] when empty; entry[] when loaded.
const tripEntries = useTripEntries(activeMode.tripId ?? '')

// Sorted most-recent-first, sliced to 10 for "recent entries" list
const recentEntries = [...(tripEntries ?? [])]
  .sort((a, b) => b.recordedAt - a.recordedAt)
  .slice(0, 10)

// Running total — raw float from tripExpenseTotal, formatted at display time
const total = formatUSD(tripExpenseTotal(tripEntries ?? []))
```

---

#### ADD — sheet + toast state wiring:

```typescript
const navigate = useNavigate()
const [sheetOpen, setSheetOpen] = useState(false)
const [savedEntry, setSavedEntry] = useState<LifeLogEntry | null>(null)

// SavedToast auto-dismiss after 4s
useEffect(() => {
  if (!savedEntry) return
  const timer = setTimeout(() => setSavedEntry(null), 4000)
  return () => clearTimeout(timer)
}, [savedEntry])

async function handleUndo() {
  if (!savedEntry) return
  await entriesRepository.delete(savedEntry.id)
  setSavedEntry(null)
}
```

---

#### ADD — render skeleton for the expanded page:

```typescript
// Expense button → open sheet; Activity button → navigate to /activity (Phase 23 stub)
return (
  <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
    <div className="w-full max-w-sm mx-auto flex flex-col gap-4">

      {/* Trip name */}
      <h1 className="text-2xl font-bold tracking-tight">{activeMode.label}</h1>

      {/* Running total */}
      <p className="text-3xl font-bold text-[var(--color-primary)]">{total}</p>

      {/* CTA buttons */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={() => setSheetOpen(true)}
        >
          Expense
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={() => navigate('/activity')}
        >
          Activity
        </Button>
      </div>

      {/* Recent entries list (last 10, most-recent-first) */}
      {recentEntries.length > 0 && (
        <ul className="flex flex-col gap-2 mt-2">
          {recentEntries.map((e) => (
            <li key={e.id} className="flex justify-between text-sm py-2 border-b border-[var(--color-border)]">
              <span>
                {e.type === 'expense'
                  ? (typeof e.metadata.category === 'string' ? e.metadata.category : 'Expense')
                  : e.title}
              </span>
              {e.type === 'expense' && e.amount != null && (
                <span className="font-medium">{formatUSD(e.amount)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>

    {/* Expense sheet */}
    <ExpenseSheet
      isOpen={sheetOpen}
      activeMode={activeMode}
      onSave={(entry) => {
        setSavedEntry(entry)
        setSheetOpen(false)
      }}
      onCancel={() => setSheetOpen(false)}
    />

    {/* Saved toast with undo */}
    {savedEntry && <SavedToast onUndo={() => void handleUndo()} />}
  </div>
)
```

---

#### ADD — imports for the rewritten TripHomePage:

```typescript
import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { activeModeRepository } from '../services/activeMode'
import type { ActiveMode } from '../services/activeMode'
import { useTripEntries, tripExpenseTotal } from '../services/tripService'
import { entriesRepository } from '../services/entriesRepository'
import type { LifeLogEntry } from '../services/db'
import { Button } from '../components/ui/Button'
import { ExpenseSheet } from '../components/dashboard/ExpenseSheet'
import { SavedToast } from '../components/dashboard/SavedToast'
import { formatUSD } from '../config/money'
```

---

## Shared Patterns

### SavedToast Integration
**Source:** `src/components/dashboard/SavedToast.tsx` (lines 19-39)

Props interface: `{ onUndo: () => void }`. Purely presentational — owns NO timer. Timer lives in the page.

```typescript
// SavedToast.tsx signature (lines 13-15):
interface SavedToastProps {
  onUndo: () => void
}
// Renders: role="status" aria-live="polite" fixed bottom-center toast with Undo button
```

Wire pattern in TripHomePage: `{savedEntry && <SavedToast onUndo={() => void handleUndo()} />}`

Undo handler: `await entriesRepository.delete(savedEntry.id)` — matches the `delete(id)` signature in `entriesRepository.ts` line 53.

---

### Active-Mode Guard
**Source:** `src/pages/TripHomePage.tsx` (current Phase 21 stub, lines 10-35)
**Apply to:** TripHomePage (keep verbatim), ExpenseSheet (receives `activeMode` as a prop — do not call `useActiveMode` inside the sheet)

The guard passes `activeMode` down as a prop to `ExpenseSheet` so the sheet never calls hooks conditionally or outside the resolved guard.

---

### Body Scroll Lock
**Source:** STACK.md §1 (no codebase analog — new pattern)
**Apply to:** `ExpenseSheet`

```typescript
useEffect(() => {
  if (!isOpen) return
  document.body.style.overflow = 'hidden'
  return () => { document.body.style.overflow = '' }
}, [isOpen])
```

---

### Dexie `domain: 'trips'` Discipline
**Source:** PITFALLS Pitfall 8 + CONTEXT decisions
**Apply to:** ExpenseSheet `handleSave`, all tests

Never call `defaultDomainForType('expense')` in the trips flow — it returns `'expenditures'`. Always pass the string literal `'trips'`.

---

### Float Money Display
**Source:** PITFALLS Pitfall 4 + STACK.md §3
**Apply to:** TripHomePage (total, recent-entry amounts)

Always wrap raw floats with `formatUSD(...)` before rendering. Never display `tripExpenseTotal(...)` directly. The `formatUSD` function rounds via `Math.round(n * 100) / 100` internally.

---

## Test Patterns

### `src/components/dashboard/ExpenseSheet.test.tsx`

**Template analogs:** `src/pages/CreateTripPage.test.tsx` + `src/pages/TripHomePage.test.tsx`

#### Boilerplate (from TripHomePage.test.tsx lines 1-17 and CreateTripPage.test.tsx lines 1-18):

```typescript
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { activeModeRepository } from '../services/activeMode'
import { entriesRepository } from '../services/entriesRepository'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})
```

#### Fake timers for date assertions (from tripService.test.tsx lines 210-213):

```typescript
// MEMORY.md: full fake timers stall Dexie — ALWAYS use { toFake: ['Date'] }
vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(new Date('2026-06-19T23:30:00'))  // late local time to catch UTC off-by-one
```

#### Test: saved expense has `domain: 'trips'` + `metadata.tripId` + local-date `occurredAt`:

```typescript
it('saves expense with domain trips, tripId stamped, and local-date occurredAt', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  // 23:30 local on Jun 19 = Jun 20 UTC → catches UTC off-by-one (PITFALLS Pitfall 3)
  vi.setSystemTime(new Date('2026-06-19T23:30:00'))

  const tripEntry = await createAndActivateTrip('Paris')
  const activeMode = await activeModeRepository.get()

  const user = userEvent.setup()
  let savedEntry: LifeLogEntry | undefined
  render(
    <ExpenseSheet
      isOpen={true}
      activeMode={activeMode}
      onSave={(e) => { savedEntry = e }}
      onCancel={() => {}}
    />,
  )

  await user.type(screen.getByLabelText(/amount/i), '42.50')
  await user.click(screen.getByRole('button', { name: 'Food' }))
  await user.click(screen.getByRole('button', { name: /save/i }))

  // Wait for async save
  expect(savedEntry).toBeDefined()
  expect(savedEntry!.domain).toBe('trips')                      // NEVER 'expenditures'
  expect(savedEntry!.metadata.tripId).toBe(tripEntry.id)        // auto-stamped by draftToEntry
  expect(savedEntry!.metadata.category).toBe('Food')
  expect(savedEntry!.amount).toBe(42.5)

  // occurredAt is LOCAL midnight on Jun 19, NOT UTC midnight Jun 20
  // Local midnight Jun 19 = Date.parse('2026-06-19T00:00:00')
  const expectedLocalMidnight = Date.parse('2026-06-19T00:00:00')
  expect(savedEntry!.occurredAt).toBe(expectedLocalMidnight)
})
```

#### Test: save is blocked when amount is missing or category unselected:

```typescript
it('does not call onSave when amount is missing', async () => {
  const onSave = vi.fn()
  const user = userEvent.setup()
  render(<ExpenseSheet isOpen={true} activeMode={null} onSave={onSave} onCancel={() => {}} />)
  await user.click(screen.getByRole('button', { name: 'Food' }))
  await user.click(screen.getByRole('button', { name: /save/i }))
  expect(onSave).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toBeInTheDocument()
})

it('does not call onSave when no category is selected', async () => {
  const onSave = vi.fn()
  const user = userEvent.setup()
  render(<ExpenseSheet isOpen={true} activeMode={null} onSave={onSave} onCancel={() => {}} />)
  await user.type(screen.getByLabelText(/amount/i), '10')
  await user.click(screen.getByRole('button', { name: /save/i }))
  expect(onSave).not.toHaveBeenCalled()
})
```

#### Test: Escape and backdrop dismiss (from HoleSheet pattern):

```typescript
it('calls onCancel when backdrop is clicked', async () => {
  const onCancel = vi.fn()
  render(<ExpenseSheet isOpen={true} activeMode={null} onSave={() => {}} onCancel={onCancel} />)
  // The backdrop has aria-hidden="true" so query by its className role instead
  const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement
  await userEvent.click(backdrop)
  expect(onCancel).toHaveBeenCalledTimes(1)
})
```

#### MemoryRouter probe route pattern (for TripHomePage tests, from TripHomePage.test.tsx lines 28-38):

```typescript
// Navigate-away assertions use a probe <Route> — never check window.location.href
render(
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route path="/" element={<TripHomePage />} />
      <Route path="/activity" element={<div data-testid="activity-probe" />} />
      <Route path="/create-trip" element={<div data-testid="create-probe" />} />
    </Routes>
  </MemoryRouter>,
)
```

---

### `src/pages/TripHomePage.test.tsx` — additional tests for Phase 22

Extend existing file. Key tests to add:

```typescript
it('shows formatted expense total from tripEntries', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  const trip = await createAndActivateTrip('Paris')
  await act(async () => {
    await db.entries.add({
      id: 'e-1', domain: 'trips', type: 'expense', title: 'Dinner',
      amount: 42.5, recordedAt: Date.now(), tags: [],
      metadata: { tripId: trip.id, category: 'Food' }, syncedAt: null,
    })
  })
  render(<MemoryRouter><TripHomePage /></MemoryRouter>)
  expect(await screen.findByText('$42.50')).toBeInTheDocument()
})

it('Activity button navigates to /activity', async () => {
  await act(async () => {
    await activeModeRepository.put({ mode: 'trip', label: 'Paris', tripId: 'uuid-1' })
  })
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<TripHomePage />} />
        <Route path="/activity" element={<div data-testid="activity-probe" />} />
      </Routes>
    </MemoryRouter>,
  )
  const activityBtn = await screen.findByRole('button', { name: /activity/i })
  await userEvent.click(activityBtn)
  expect(await screen.findByTestId('activity-probe')).toBeInTheDocument()
})
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/config/money.ts` | utility | transform | No currency formatting utility exists in the codebase; use STACK.md §3 `Intl.NumberFormat` pattern directly |

---

## Metadata

**Analog search scope:** `src/components/dashboard/`, `src/pages/`, `src/services/`, `src/config/`
**Files scanned:** 12 (HoleSheet, SavedToast, captureService, entryFields, tripService, activeMode, entriesRepository, TripHomePage, CreateTripPage, Button, TripHomePage.test, tripService.test, CreateTripPage.test)
**Pattern extraction date:** 2026-06-19

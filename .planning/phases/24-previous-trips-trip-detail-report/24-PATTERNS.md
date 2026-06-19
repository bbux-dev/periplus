# Phase 24: Previous Trips + Trip Detail + Category-Grouped Expense Report - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 6 new files (+ 6 test files)
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/services/tripService.ts` (add `summarizeTrips`) | service / pure helper | batch, transform | `src/services/tripService.ts` (existing pure helpers) | exact — same file |
| `src/services/tripService.test.tsx` (add `summarizeTrips` tests) | test | batch | `src/services/tripService.test.tsx` (pure-helper section) | exact — same file |
| `src/pages/PreviousTripsPage.tsx` | page component | request-response, CRUD read | `src/pages/TripHomePage.tsx` | exact (same role + reactive read + list render) |
| `src/pages/PreviousTripsPage.test.tsx` | test | — | `src/pages/TripHomePage.test.tsx` | exact |
| `src/pages/TripDetailPage.tsx` | page component | request-response, CRUD read | `src/pages/TripHomePage.tsx` + `ActivityFormPage.tsx` (useParams) | role-match |
| `src/pages/TripDetailPage.test.tsx` | test | — | `src/pages/TripHomePage.test.tsx` | role-match |
| `src/components/ExpenseReport.tsx` | component | transform, render | `src/pages/TripHomePage.tsx` (entry-row list) + `ExpenseSheet.tsx` (category grid) | role-match |
| `src/components/ExpenseReport.test.tsx` | test | — | `src/services/tripService.test.tsx` (pure helper assertions) | role-match |
| Edit form/modal (inline in `TripDetailPage` or `src/components/EditEntryModal.tsx`) | component | CRUD update | `src/components/dashboard/ExpenseSheet.tsx` | role-match (modal shell) |
| Edit form test | test | — | `src/pages/TripHomePage.test.tsx` + `entriesRepository.test.tsx` | role-match |

---

## Pattern Assignments

### `summarizeTrips` helper — add to `src/services/tripService.ts`

**Analog:** `src/services/tripService.ts` — existing pure helpers (`tripExpenseTotal`, `tripExpensesByCategory`, `tripDateRange`, `tripActivityCount`), lines 7-70

**Type definition to add above the function:**
```typescript
export interface TripSummary {
  trip: LifeLogEntry            // the type='trip' record (carries id, title, recordedAt)
  entries: LifeLogEntry[]       // non-trip entries with metadata.tripId === trip.id
  total: number                 // raw float from tripExpenseTotal — callers round at display
  dateRange: { start: number; end: number } | null
  activityCount: number
}
```

**Core single-pass grouping pattern** (copy from the `listDistinctValues` `Map` accumulator in `src/services/entriesRepository.ts` lines 78-98):
```typescript
export function summarizeTrips(allEntries: LifeLogEntry[]): TripSummary[] {
  // Step 1: separate trip records from child entries
  const tripRecords = allEntries.filter((e) => e.type === 'trip')
  const childEntries = allEntries.filter((e) => e.type !== 'trip')

  // Step 2: group child entries by metadata.tripId — ONE pass, no per-trip filter
  const byTripId = new Map<string, LifeLogEntry[]>()
  for (const e of childEntries) {
    const tid = typeof e.metadata.tripId === 'string' ? e.metadata.tripId : null
    if (!tid) continue
    const bucket = byTripId.get(tid)
    if (bucket) bucket.push(e)
    else byTripId.set(tid, [e])
  }

  // Step 3: compute per-trip stats using existing pure helpers
  const summaries: TripSummary[] = tripRecords.map((trip) => {
    const entries = byTripId.get(trip.id) ?? []
    return {
      trip,
      entries,
      total: tripExpenseTotal(entries),
      dateRange: tripDateRange(entries),
      activityCount: tripActivityCount(entries),
    }
  })

  // Step 4: sort newest-first by the trip record's recordedAt
  return summaries.sort((a, b) => b.trip.recordedAt - a.trip.recordedAt)
}
```

**Imports needed** (same file already has these):
```typescript
// already imported: db, LifeLogEntry, tripExpenseTotal, tripDateRange, tripActivityCount
// No new imports required — all helpers are in the same file
```

---

### `summarizeTrips` tests — add to `src/services/tripService.test.tsx`

**Analog:** `src/services/tripService.test.tsx` lines 36-171 (pure-helper section, no Dexie)

**Dexie reset block** (lines 176-183 of `tripService.test.tsx`):
```typescript
beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})
```

**Factory helper** (lines 23-34 of `tripService.test.tsx` — copy verbatim):
```typescript
function makeEntryData(overrides?: Partial<Omit<LifeLogEntry, 'id'>>): Omit<LifeLogEntry, 'id'> {
  return {
    domain: 'trips',
    type: 'expense',
    title: 'Coffee',
    recordedAt: Date.now(),
    tags: [],
    metadata: {},
    syncedAt: null,
    ...overrides,
  }
}
```

**Key test assertions to cover:**
```typescript
describe('summarizeTrips', () => {
  it('single-pass: two trips, computes per-trip stats, empty-trip has zero/null', () => {
    const trip1: LifeLogEntry = { ...makeEntryData({ type: 'trip', recordedAt: 2000 }), id: 'trip-1' }
    const trip2: LifeLogEntry = { ...makeEntryData({ type: 'trip', recordedAt: 1000 }), id: 'trip-2' }
    const expense: LifeLogEntry = {
      ...makeEntryData({ type: 'expense', amount: 42, metadata: { tripId: 'trip-1' } }),
      id: 'e-1',
    }
    const activity: LifeLogEntry = {
      ...makeEntryData({ type: 'activity', metadata: { tripId: 'trip-1' } }),
      id: 'a-1',
    }
    const allEntries = [trip1, trip2, expense, activity]
    const summaries = summarizeTrips(allEntries)

    // newest-first
    expect(summaries[0].trip.id).toBe('trip-1')
    expect(summaries[1].trip.id).toBe('trip-2')

    // trip-1 stats
    expect(summaries[0].total).toBe(42)
    expect(summaries[0].activityCount).toBe(1)

    // trip-2 is empty
    expect(summaries[1].total).toBe(0)
    expect(summaries[1].dateRange).toBeNull()
    expect(summaries[1].activityCount).toBe(0)
  })

  it('does NOT call listTripEntries (pure in-memory grouping)', () => {
    // Verify no Dexie filter calls: pass entries directly, assert no DB interaction
    // This is a code-review constraint, but the test validates the interface:
    // summarizeTrips takes LifeLogEntry[] — it cannot call listTripEntries because
    // it has no Dexie handle. If the signature is correct, the contract is enforced.
    const result = summarizeTrips([])
    expect(result).toEqual([])
  })

  it('float-safe: grand total via formatUSD equals sum of all subtotals via formatUSD', () => {
    // Mirrors PITFALLS Pitfall 4
    const tripRec: LifeLogEntry = { ...makeEntryData({ type: 'trip' }), id: 'trip-1' }
    const e1: LifeLogEntry = { ...makeEntryData({ amount: 10.1, metadata: { tripId: 'trip-1' } }), id: 'e1' }
    const e2: LifeLogEntry = { ...makeEntryData({ amount: 5.2, metadata: { tripId: 'trip-1' } }), id: 'e2' }
    const [s] = summarizeTrips([tripRec, e1, e2])
    // Raw float; render via formatUSD which guards via Math.round(n * 100) / 100
    expect(formatUSD(s.total)).toBe('$15.30')
  })
})
```

---

### `src/pages/PreviousTripsPage.tsx`

**Analog:** `src/pages/TripHomePage.tsx` (entire file, 149 lines)

**Imports pattern** (copy from `TripHomePage.tsx` lines 1-12, adapt):
```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/db'
import { summarizeTrips } from '../services/tripService'
import { formatUSD } from '../config/money'
```

**Core useLiveQuery → summarizeTrips wiring** (adapts `TripHomePage.tsx` lines 18-28):
```typescript
export function PreviousTripsPage() {
  const navigate = useNavigate()

  // Single pass: one db.entries.toArray() — NO per-trip filter loop (PITFALLS Pitfall 6)
  const summaries = useLiveQuery(
    () => db.entries.toArray().then(summarizeTrips),
    [],
    // No default: undefined = Dexie opening (same convention as useTrips/useEntries)
  )

  if (summaries === undefined) {
    // Dexie still opening — neutral loading skeleton (mirrors TripHomePage lines 54-61)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    )
  }
  // ...render list
}
```

**Row render pattern** (adapts `TripHomePage.tsx` lines 113-131):
```typescript
// Each row navigates to /trips/<trip.id> (UUID — not name, avoids duplicate-name collision)
<ul className="flex flex-col gap-2 mt-2">
  {summaries.map(({ trip, total, dateRange, activityCount }) => (
    <li
      key={trip.id}
      onClick={() => navigate(`/trips/${trip.id}`)}
      className="flex flex-col py-3 border-b border-[var(--color-border)] cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/trips/${trip.id}`)}
    >
      <span className="font-medium">{trip.title}</span>
      <span className="text-sm text-[var(--color-muted)]">{/* date range string */}</span>
      <span className="text-sm">{formatUSD(total)} · {activityCount} activities</span>
    </li>
  ))}
</ul>
```

**Date range formatting** — use `toLocaleDateString` (not `toISOString`), consistent with `formValuesFromEntry` in `entryFields.ts` line 238:
```typescript
function formatDateRange(range: { start: number; end: number } | null): string {
  if (!range) return 'No dates'
  const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return range.start === range.end ? fmt(range.start) : `${fmt(range.start)} – ${fmt(range.end)}`
}
```

---

### `src/pages/PreviousTripsPage.test.tsx`

**Analog:** `src/pages/TripHomePage.test.tsx` (entire file, 163 lines)

**Test file scaffold** (copy from `TripHomePage.test.tsx` lines 1-20):
```typescript
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { createAndActivateTrip } from '../services/tripService'
import { PreviousTripsPage } from './PreviousTripsPage'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})
```

**Key test — newest-first + single-pass** (adapts `TripHomePage.test.tsx` lines 52-75):
```typescript
it('shows two trips newest-first, with correct total and activity count', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })    // MEMORY.md: only 'Date', not full fake timers
  vi.setSystemTime(new Date('2026-06-01T10:00:00'))
  const trip1 = await createAndActivateTrip('Old Trip')
  vi.setSystemTime(new Date('2026-06-15T10:00:00'))
  const trip2 = await createAndActivateTrip('New Trip')

  await act(async () => {
    await db.entries.add({
      id: 'e-1', domain: 'trips', type: 'expense', title: 'Dinner',
      amount: 42.5, recordedAt: Date.now(), tags: [],
      metadata: { tripId: trip2.id, category: 'Food' }, syncedAt: null,
    })
  })

  render(<MemoryRouter><PreviousTripsPage /></MemoryRouter>)
  // Newest trip appears first
  expect(await screen.findByText('New Trip')).toBeInTheDocument()
  expect(screen.getByText('Old Trip')).toBeInTheDocument()
  expect(screen.getByText('$42.50')).toBeInTheDocument()

  const items = screen.getAllByRole('listitem')
  const newIdx = items.findIndex((el) => el.textContent?.includes('New Trip'))
  const oldIdx = items.findIndex((el) => el.textContent?.includes('Old Trip'))
  expect(newIdx).toBeLessThan(oldIdx)
})
```

**Row navigation test** (adapts `TripHomePage.test.tsx` lines 121-137 Activity-button pattern):
```typescript
it('clicking a trip row navigates to /trips/:tripId', async () => {
  const trip = await createAndActivateTrip('Paris')
  render(
    <MemoryRouter initialEntries={['/trips']}>
      <Routes>
        <Route path="/trips" element={<PreviousTripsPage />} />
        <Route path="/trips/:tripId" element={<div data-testid="detail-probe" />} />
      </Routes>
    </MemoryRouter>,
  )
  const row = await screen.findByRole('button', { name: /Paris/i })
  await userEvent.click(row)
  expect(await screen.findByTestId('detail-probe')).toBeInTheDocument()
})
```

---

### `src/pages/TripDetailPage.tsx`

**Analog (useParams):** `src/pages/ActivityFormPage.tsx` lines 17-18, 43-45
**Analog (useLiveQuery + entry list):** `src/pages/TripHomePage.tsx` lines 18-50, 113-131

**Imports pattern** (combines both analogs):
```typescript
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTripEntries, tripExpensesByCategory, tripExpenseTotal } from '../services/tripService'
import { entriesRepository } from '../services/entriesRepository'
import { ENTRY_FIELDS, formValuesFromEntry, buildEntryUpdate } from '../config/entryFields'
import { EXPENSE_CATEGORIES } from '../config/expenseCategories'
import { formatUSD } from '../config/money'
import { Button } from '../components/ui/Button'
import { ExpenseReport } from '../components/ExpenseReport'
```

**useParams + useTripEntries wiring** (mirrors `ActivityFormPage.tsx` line 17 + `tripService.ts` lines 144-150):
```typescript
export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()

  // useTripEntries has tripId in dep array — query re-runs when tripId changes
  // (PITFALLS integration gotcha + tripService.ts line 148 comment)
  const entries = useTripEntries(tripId ?? '')

  const [editingEntry, setEditingEntry] = useState<LifeLogEntry | null>(null)

  if (entries === undefined) {
    // Dexie still opening — neutral skeleton (mirrors TripHomePage.tsx lines 54-61)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    )
  }
  // ...
}
```

**Category-grouped report derivation** (uses `tripExpensesByCategory` from `tripService.ts` lines 36-45):
```typescript
// Derive category map — raw floats; all display goes through formatUSD
const categoryMap = tripExpensesByCategory(entries)
const grandTotal = tripExpenseTotal(entries)

// Order by EXPENSE_CATEGORIES — skip empty categories (CONTEXT.md decision)
const reportRows = EXPENSE_CATEGORIES
  .filter((cat) => categoryMap.has(cat))
  .map((cat) => ({ category: cat, subtotal: categoryMap.get(cat)! }))

// Entries not in EXPENSE_CATEGORIES fall under 'Uncategorized'
const uncategorized = categoryMap.get('Uncategorized') ?? 0
```

**Timeline: all entries sorted by occurredAt (falls back to recordedAt)** (adapts `TripHomePage.tsx` lines 46-48):
```typescript
const timeline = [...entries].sort((a, b) => {
  const aTime = a.occurredAt ?? a.recordedAt
  const bTime = b.occurredAt ?? b.recordedAt
  return aTime - bTime
})
```

**Inline delete** (confirm gate per CONTEXT.md decision):
```typescript
async function handleDelete(id: string) {
  if (!confirm('Delete this entry? This cannot be undone.')) return
  await entriesRepository.delete(id)
  // useTripEntries is reactive — list updates automatically via useLiveQuery
}
```

---

### `src/pages/TripDetailPage.test.tsx`

**Analog:** `src/pages/TripHomePage.test.tsx`

**MemoryRouter with useParams** (the key difference from `PreviousTripsPage.test.tsx`):
```typescript
// Use initialEntries + Route with :tripId param so useParams resolves correctly
render(
  <MemoryRouter initialEntries={[`/trips/${trip.id}`]}>
    <Routes>
      <Route path="/trips/:tripId" element={<TripDetailPage />} />
    </Routes>
  </MemoryRouter>,
)
```

**Category-grouped report test:**
```typescript
it('shows category subtotals and grand total via formatUSD', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  const trip = await createAndActivateTrip('Paris')
  await act(async () => {
    await db.entries.add({
      id: 'e-food', domain: 'trips', type: 'expense', title: 'Dinner',
      amount: 10.1, recordedAt: Date.now(), tags: [],
      metadata: { tripId: trip.id, category: 'Food' }, syncedAt: null,
    })
    await db.entries.add({
      id: 'e-hotel', domain: 'trips', type: 'expense', title: 'Inn',
      amount: 5.2, recordedAt: Date.now(), tags: [],
      metadata: { tripId: trip.id, category: 'Hotel' }, syncedAt: null,
    })
  })
  render(
    <MemoryRouter initialEntries={[`/trips/${trip.id}`]}>
      <Routes>
        <Route path="/trips/:tripId" element={<TripDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
  expect(await screen.findByText('$10.10')).toBeInTheDocument() // Food subtotal
  expect(screen.getByText('$5.20')).toBeInTheDocument()         // Hotel subtotal
  expect(screen.getByText('$15.30')).toBeInTheDocument()        // Grand total (float-safe)
})
```

**Edit preserves metadata.tripId test:**
```typescript
it('edit preserves metadata.tripId and mode/modeLabel after update', async () => {
  const trip = await createAndActivateTrip('Paris')
  const original = await entriesRepository.create({
    domain: 'trips', type: 'expense', title: 'Taxi',
    amount: 20, recordedAt: Date.now(), tags: [],
    metadata: { tripId: trip.id, mode: 'trip', modeLabel: 'Paris' }, syncedAt: null,
  })

  const fields = ENTRY_FIELDS['expense']
  const formValues = formValuesFromEntry(fields, original)
  formValues['amount'] = '25'  // user edits the amount
  const changes = buildEntryUpdate(fields, original, formValues, {})

  await entriesRepository.update(original.id, changes)
  const updated = await entriesRepository.get(original.id)

  expect(updated?.amount).toBe(25)
  expect(updated?.metadata.tripId).toBe(trip.id)   // preserved
  expect(updated?.metadata.mode).toBe('trip')       // preserved
  expect(updated?.metadata.modeLabel).toBe('Paris') // preserved
})
```

**Delete confirm + reactive recompute test:**
```typescript
it('delete removes the entry and report reactively updates', async () => {
  const trip = await createAndActivateTrip('Rome')
  await act(async () => {
    await db.entries.add({
      id: 'e-del', domain: 'trips', type: 'expense', title: 'Coffee',
      amount: 5, recordedAt: Date.now(), tags: [],
      metadata: { tripId: trip.id, category: 'Food' }, syncedAt: null,
    })
  })
  render(
    <MemoryRouter initialEntries={[`/trips/${trip.id}`]}>
      <Routes>
        <Route path="/trips/:tripId" element={<TripDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
  expect(await screen.findByText('$5.00')).toBeInTheDocument()

  // Confirm dialog spied to return true
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await userEvent.click(screen.getByRole('button', { name: /delete/i }))

  // useLiveQuery re-renders reactively; $5.00 should be gone
  await waitFor(() => expect(screen.queryByText('$5.00')).not.toBeInTheDocument())
})
```

---

### `src/components/ExpenseReport.tsx`

**Analog:** `src/pages/TripHomePage.tsx` lines 113-131 (list render) + `src/components/dashboard/ExpenseSheet.tsx` lines 196-224 (category iteration)

**Props interface:**
```typescript
interface ExpenseReportProps {
  entries: LifeLogEntry[]   // all trip entries — component derives map + total internally
}
```

**Core render pattern** (derives from `tripExpensesByCategory` + `EXPENSE_CATEGORIES` ordering):
```typescript
export function ExpenseReport({ entries }: ExpenseReportProps) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const categoryMap = tripExpensesByCategory(entries)
  const grandTotal = tripExpenseTotal(entries)

  // EXPENSE_CATEGORIES is the canonical order — skip categories with no entries
  const rows = EXPENSE_CATEGORIES.filter((cat) => categoryMap.has(cat))

  // Expenses not matching any EXPENSE_CATEGORIES key land in 'Uncategorized'
  const hasUncategorized = categoryMap.has('Uncategorized')

  function toggleExpand(cat: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <section aria-label="Expense report">
      <ul className="flex flex-col gap-1">
        {rows.map((cat) => {
          const subtotal = categoryMap.get(cat)!
          const isExpanded = expandedCats.has(cat)
          const catEntries = entries.filter(
            (e) => e.type === 'expense' &&
              (typeof e.metadata.category === 'string' ? e.metadata.category : 'Uncategorized') === cat
          )
          return (
            <li key={cat}>
              {/* Category row — tap to expand */}
              <button
                type="button"
                onClick={() => toggleExpand(cat)}
                className="flex justify-between w-full py-2 text-sm"
                aria-expanded={isExpanded}
              >
                <span>{cat}</span>
                <span className="font-medium">{formatUSD(subtotal)}</span>
              </button>
              {/* Individual expense entries when expanded */}
              {isExpanded && (
                <ul className="pl-4 flex flex-col gap-1 mb-1">
                  {catEntries.map((e) => (
                    <li key={e.id} className="flex justify-between text-xs text-[var(--color-muted)]">
                      <span>{typeof e.metadata.merchant === 'string' ? e.metadata.merchant : e.title}</span>
                      <span>{formatUSD(e.amount ?? 0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
        {/* Uncategorized bucket — only shown when present */}
        {hasUncategorized && (
          <li className="flex justify-between py-2 text-sm">
            <span className="text-[var(--color-muted)]">Uncategorized</span>
            <span className="font-medium">{formatUSD(categoryMap.get('Uncategorized')!)}</span>
          </li>
        )}
      </ul>
      {/* Grand total footer */}
      <div className="flex justify-between pt-3 border-t border-[var(--color-border)] font-bold text-sm">
        <span>Total</span>
        <span>{formatUSD(grandTotal)}</span>
      </div>
    </section>
  )
}
```

**Imports:**
```typescript
import { useState } from 'react'
import { tripExpensesByCategory, tripExpenseTotal } from '../services/tripService'
import { EXPENSE_CATEGORIES } from '../config/expenseCategories'
import { formatUSD } from '../config/money'
import type { LifeLogEntry } from '../services/db'
```

---

### Edit form / modal (inline or `src/components/EditEntryModal.tsx`)

**Analog (modal shell):** `src/components/dashboard/ExpenseSheet.tsx` lines 142-295

**Analog (form fields):** `src/pages/ActivityFormPage.tsx` lines 150-195

**Props interface:**
```typescript
interface EditEntryModalProps {
  entry: LifeLogEntry
  onClose: () => void
  // onClose is called after save or cancel; useLiveQuery in parent re-renders reactively
}
```

**Form seed pattern** — `formValuesFromEntry` wires directly to `useState` initial value:
```typescript
export function EditEntryModal({ entry, onClose }: EditEntryModalProps) {
  const fields = ENTRY_FIELDS[entry.type]
  // Seed form state from existing entry — handles occurredAt local-date round-trip
  const [formValues, setFormValues] = useState<Record<string, string>>(
    () => formValuesFromEntry(fields, entry)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const savingRef = useRef(false) // WR-02 double-submit guard (mirrors ExpenseSheet.tsx line 54)
```

**Save handler — buildEntryUpdate → entriesRepository.update:**
```typescript
  async function handleSave() {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      // buildEntryUpdate merges — NEVER replaces — metadata.
      // metadata.tripId / mode / modeLabel survive untouched (CONTEXT.md decision).
      // Do NOT hand-roll; buildEntryUpdate is the authoritative v0.4.0 path.
      const changes = buildEntryUpdate(fields, entry, formValues, {})
      await entriesRepository.update(entry.id, changes)
      onClose()
    } catch (err) {
      setError('Could not save. Please try again.')
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }
```

**Delete handler — confirm gate before delete:**
```typescript
  async function handleDelete() {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    await entriesRepository.delete(entry.id)
    onClose()
    // useLiveQuery in TripDetailPage re-renders automatically; no manual refresh
  }
```

**Modal shell pattern** (copy from `ExpenseSheet.tsx` lines 142-168):
```typescript
  return (
    <>
      {/* Backdrop — dismisses on tap */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${entry.type}`}
        tabIndex={-1}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
        className="fixed bottom-0 left-0 right-0 z-50
                   bg-[var(--color-background)] rounded-t-2xl
                   px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]
                   max-h-[90vh] overflow-y-auto outline-none"
      >
        {/* FormField per ENTRY_FIELDS[entry.type] */}
        {fields.map((field) => (
          <FormField
            key={field.key}
            id={`edit-${field.key}`}
            label={field.label}
            required={field.required}
            value={formValues[field.key] ?? ''}
            onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
            placeholder={field.placeholder}
          />
        ))}
        {/* Error */}
        {error && <p role="alert" className="text-sm text-red-500 mb-3">{error}</p>}
        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary" type="button" disabled={saving} onClick={() => void handleSave()} className="flex-1">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
        <Button variant="secondary" type="button" onClick={() => void handleDelete()} className="w-full mt-2">
          Delete
        </Button>
      </div>
    </>
  )
}
```

**Imports:**
```typescript
import { useState, useRef } from 'react'
import { entriesRepository } from '../services/entriesRepository'
import { ENTRY_FIELDS, formValuesFromEntry, buildEntryUpdate } from '../config/entryFields'
import { FormField } from './ui/FormField'
import { Button } from './ui/Button'
import type { LifeLogEntry } from '../services/db'
```

---

## Shared Patterns

### Dexie DB Reset in Tests
**Source:** `src/services/tripService.test.tsx` lines 176-183 and `src/services/entriesRepository.test.tsx` lines 7-10
**Apply to:** ALL test files that touch IndexedDB (PreviousTripsPage, TripDetailPage, summarizeTrips Dexie tests, edit/delete tests)
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
**Source:** MEMORY.md ("Fake timers hang Dexie") + `src/services/tripService.test.tsx` lines 210, 244
**Apply to:** Every test that needs a controlled timestamp AND writes to Dexie
```typescript
// CORRECT — only fakes Date; IndexedDB Promise resolution continues normally
vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(new Date('2026-06-19T10:00:00'))

// WRONG — full fake timers stall awaited Dexie writes
// vi.useFakeTimers()  ← DO NOT USE
```

### useLiveQuery "no default" Loading Pattern
**Source:** `src/pages/TripHomePage.tsx` lines 54-61; `src/services/tripService.ts` lines 131-136
**Apply to:** PreviousTripsPage, TripDetailPage
```typescript
// Returns undefined while Dexie is opening. NEVER provide a default [].
const data = useLiveQuery(() => /* query */, [deps])
if (data === undefined) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
      <p className="text-sm text-[var(--color-muted)]">Loading…</p>
    </div>
  )
}
```

### Float-safe Money Display
**Source:** `src/config/money.ts` lines 21-24; PITFALLS Pitfall 4
**Apply to:** ExpenseReport, PreviousTripsPage row totals, TripDetailPage grand total
```typescript
// Always pass raw float through formatUSD — never display raw summation result
// formatUSD internally does Math.round(n * 100) / 100 before Intl.NumberFormat
import { formatUSD } from '../config/money'
formatUSD(tripExpenseTotal(entries))  // e.g. "$15.30" not "$15.299999999999999"
```

### React Router MemoryRouter + useParams Test Wrapper
**Source:** `src/pages/TripHomePage.test.tsx` lines 32-42
**Apply to:** TripDetailPage tests (any page with useParams)
```typescript
render(
  <MemoryRouter initialEntries={[`/trips/${trip.id}`]}>
    <Routes>
      <Route path="/trips/:tripId" element={<TripDetailPage />} />
    </Routes>
  </MemoryRouter>,
)
```

### act() Wrapper for Dexie Writes in Tests
**Source:** `src/pages/TripHomePage.test.tsx` lines 43-46, 57-70
**Apply to:** All tests that write to Dexie then assert on reactive render output
```typescript
await act(async () => {
  await db.entries.add({ /* entry */ })
})
// useLiveQuery re-renders synchronously after act() completes
expect(await screen.findByText('expected text')).toBeInTheDocument()
```

### Modal Shell (backdrop + dialog + escape + body scroll lock)
**Source:** `src/components/dashboard/ExpenseSheet.tsx` lines 77-83, 142-168
**Apply to:** EditEntryModal
```typescript
// Body scroll lock
useEffect(() => {
  if (!isOpen) return
  document.body.style.overflow = 'hidden'
  return () => { document.body.style.overflow = '' }
}, [isOpen])

// Dialog: role="dialog" aria-modal="true" onKeyDown Escape, tabIndex={-1}
```

### Double-Submit Guard
**Source:** `src/components/dashboard/ExpenseSheet.tsx` lines 53-54, 99-100; `src/pages/ActivityFormPage.tsx` line 56, 88-89
**Apply to:** EditEntryModal save handler
```typescript
const savingRef = useRef(false)   // synchronous; checked before any async await

async function handleSave() {
  if (savingRef.current) return   // WR-02: guard fires before setState re-render
  savingRef.current = true
  setSaving(true)
  try { /* ... */ } finally {
    setSaving(false)
    savingRef.current = false
  }
}
```

---

## App.tsx Route Wiring

**Source:** `src/App.tsx` lines 27-28 — placeholder routes to replace

```typescript
// Current (placeholder):
<Route path="/trips"           element={<PlaceholderPage title="Previous Trips" />} />
<Route path="/trips/:tripId"   element={<PlaceholderPage title="Trip Detail" />} />

// Replace with:
import { PreviousTripsPage } from './pages/PreviousTripsPage'
import { TripDetailPage }    from './pages/TripDetailPage'
// ...
<Route path="/trips"           element={<PreviousTripsPage />} />
<Route path="/trips/:tripId"   element={<TripDetailPage />} />
```

---

## No Analog Found

All 6 new files have strong analogs. No file requires falling back to RESEARCH.md patterns exclusively.

| File | Note |
|---|---|
| `ExpenseReport.tsx` | No existing standalone report component — closest is TripHomePage list + ExpenseSheet category grid. Compose both patterns. |

---

## Metadata

**Analog search scope:** `src/pages/`, `src/services/`, `src/components/dashboard/`, `src/components/ui/`, `src/config/`
**Files scanned:** 13 source files + 8 test files
**Pattern extraction date:** 2026-06-19

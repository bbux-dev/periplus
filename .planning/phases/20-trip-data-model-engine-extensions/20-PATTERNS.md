# Phase 20: Trip Data Model + Engine Extensions - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 5 (3 modified, 1 created service, 1 created test)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/services/db.ts` | model/config | N/A (TypeScript union extension) | `src/services/db.ts` (self) | exact |
| `src/services/activeMode.ts` | service + repository + hook | request-response (Dexie settings upsert) | `src/services/activeMode.ts` (self) | exact |
| `src/services/captureService.ts` | utility/transform | transform (pure function) | `src/services/captureService.ts` (self) | exact |
| `src/services/tripService.ts` | service + repository + hooks | CRUD + reactive | `src/services/entriesRepository.ts` + `src/services/activeMode.ts` | role-match |
| `src/services/tripService.test.ts` | test | pure unit + Dexie integration | `src/services/activeMode.test.tsx` + `src/services/captureService.test.ts` | role-match |

---

## Pattern Assignments

### `src/services/db.ts` (model, TypeScript union extension)

**Analog:** `src/services/db.ts` (self — additive change to the union)

**Current EntryType union** (lines 7–15):
```typescript
export type EntryType =
  | 'show'      // media
  | 'movie'     // media
  | 'book'      // media
  | 'podcast'   // media
  | 'place'     // trips
  | 'event'     // trips
  | 'expense'   // trips OR expenditures
```

**Target pattern — append two new members** (no Dexie schema bump; `type` is not indexed):
```typescript
export type EntryType =
  | 'show'      // media
  | 'movie'     // media
  | 'book'      // media
  | 'podcast'   // media
  | 'place'     // trips legacy (kept for data compat)
  | 'event'     // trips legacy (kept for data compat)
  | 'expense'   // trips + expenditures
  | 'trip'      // NEW: trip record
  | 'activity'  // NEW: hike/show/restaurant/cafe/other
```

**Key constraint from db.ts lines 61–65:**
```typescript
// Index string: &id = unique primary key; recordedAt + domain = secondary indexes
// syncedAt/tags/metadata are intentionally NOT indexed (IDB cannot index null; defer arrays)
this.version(2).stores({
  entries: '&id, recordedAt, domain',
  settings: 'key',
})
```
`type` is absent from the index string — adding new union members is purely TypeScript. The Dexie version stays at 2.

---

### `src/services/activeMode.ts` (service + repository + hook, request-response)

**Analog:** `src/services/activeMode.ts` (self — additive interface + param extension)

**Current interface** (lines 17–20):
```typescript
export interface ActiveMode {
  mode: string
  label: string
}
```

**Target — add optional `tripId` field:**
```typescript
export interface ActiveMode {
  mode: string
  label: string
  tripId?: string   // NEW: the LifeLogEntry UUID of the active trip
}
```

**Current `activateMode` function** (lines 75–81):
```typescript
export async function activateMode(mode: string, label?: string): Promise<void> {
  const trimmed = label?.trim()
  await activeModeRepository.put({
    mode,
    label: trimmed || defaultInstanceLabel(mode),
  })
}
```

**Target — add optional `tripId` third parameter:**
```typescript
export async function activateMode(
  mode: string,
  label?: string,
  tripId?: string,  // NEW optional param — all existing two-arg callers unchanged
): Promise<void> {
  const trimmed = label?.trim()
  await activeModeRepository.put({
    mode,
    label: trimmed || defaultInstanceLabel(mode),
    ...(tripId ? { tripId } : {}),
  })
}
```

**Persistence pattern** (`activeModeRepository`, lines 25–36) — unchanged, `ActiveMode` is stored as-is:
```typescript
export const activeModeRepository = {
  async get(): Promise<ActiveMode | undefined> {
    const row = await db.settings.get(ACTIVE_MODE_KEY)
    return row?.value as ActiveMode | undefined
  },
  async put(active: ActiveMode): Promise<void> {
    await db.settings.put({ key: ACTIVE_MODE_KEY, value: active })
  },
}
```

**Reactive hook pattern** (lines 51–57) — unchanged:
```typescript
export function useActiveMode(): ActiveMode | undefined {
  return useLiveQuery(
    () => activeModeRepository.get(),
    [],
    // No default: undefined = Dexie opening or no mode activated
  )
}
```

---

### `src/services/captureService.ts` (utility/transform, pure function)

**Analog:** `src/services/captureService.ts` (self — additive change inside `draftToEntry`)

**Current STAMP-01 block** (lines 177–181):
```typescript
const baseMetadata = draft.metadata ?? {}
const metadata =
  activeMode?.mode
    ? { ...baseMetadata, mode: activeMode.mode, modeLabel: activeMode.label }
    : baseMetadata
```

**Target — spread `tripId` when present:**
```typescript
const baseMetadata = draft.metadata ?? {}
const metadata =
  activeMode?.mode
    ? {
        ...baseMetadata,
        mode: activeMode.mode,
        modeLabel: activeMode.label,
        ...(activeMode.tripId ? { tripId: activeMode.tripId } : {}),  // NEW STAMP-02
      }
    : baseMetadata
```

**Key rule from existing test pattern** (`captureService.test.ts` lines 444–464): when `activeMode` is `undefined`, `null`, or has an empty `mode` string, NEITHER `mode`, `modeLabel`, nor `tripId` should appear in `entry.metadata`. The guard `activeMode?.mode` already handles these three cases; the new `tripId` spread sits inside that branch so it inherits the same guard automatically.

**Import change required** — `ActiveMode` is imported from `./activeMode` (line 17); no new import needed since `ActiveMode` interface will gain `tripId?`. The import of `ReviewDraft` from `./extractMetadataFromUrl` (line 15) will move to `./captureService` itself when `extractMetadataFromUrl.ts` is deleted (per CONTEXT.md deferred note — do NOT do this in Phase 20).

---

### `src/services/tripService.ts` (service + repository + hooks, CRUD + reactive)

**Primary analog:** `src/services/entriesRepository.ts` — async repository pattern + `useLiveQuery` hooks

**Secondary analog:** `src/services/activeMode.ts` — `activeModeRepository` call from a service function

**Imports pattern** (mirror `entriesRepository.ts` lines 1–4 + `activeMode.ts` line 1):
```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { LifeLogEntry } from './db'
import { activateMode } from './activeMode'
import { entriesRepository } from './entriesRepository'
```

**Async repository pattern** (mirror `entriesRepository.ts` lines 10–55):
```typescript
// createAndActivateTrip: two atomic writes (entry + settings)
export async function createAndActivateTrip(name: string): Promise<LifeLogEntry> {
  const entry = await entriesRepository.create({
    type: 'trip',
    domain: 'trips',
    title: name.trim() || 'Untitled Trip',
    recordedAt: Date.now(),
    tags: [],
    metadata: {},
    syncedAt: null,
  })
  await activateMode('trip', name, entry.id)
  return entry
}
```

**Domain-indexed query pattern** (mirror `entriesRepository.ts` line 29 `orderBy('recordedAt')`; uses `domain` index — the only efficient filter available for trips):
```typescript
export async function listTrips(): Promise<LifeLogEntry[]> {
  return db.entries
    .where('domain').equals('trips')
    .filter((e) => e.type === 'trip')
    .reverse()
    .toArray()
}
```

**Full-scan filter pattern** (mirror `entriesRepository.ts` lines 38–40 for `listUnsynced`; `metadata` is unindexed — full scan is correct at personal-app scale):
```typescript
export async function listTripEntries(tripId: string): Promise<LifeLogEntry[]> {
  return db.entries
    .filter((e) => e.metadata.tripId === tripId)
    .toArray()
}
```

**Pure stat helpers** — ZERO Dexie calls, operate on `LifeLogEntry[]` already in memory:
```typescript
// Returns null when the entries array is empty (no date range derivable)
export function tripDateRange(
  entries: LifeLogEntry[],
): { start: number; end: number } | null {
  const dates = entries
    .map((e) => e.occurredAt)
    .filter((d): d is number => d != null)
  if (dates.length === 0) return null
  return { start: Math.min(...dates), end: Math.max(...dates) }
}

// Raw sum — callers round via Math.round(x * 100) / 100 before display
export function tripExpenseTotal(entries: LifeLogEntry[]): number {
  return entries
    .filter((e) => e.type === 'expense')
    .reduce((acc, e) => acc + (e.amount ?? 0), 0)
}

// Groups by metadata.category; string values only (mirror listDistinctValues bump() guard)
export function tripExpensesByCategory(entries: LifeLogEntry[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const e of entries) {
    if (e.type !== 'expense') continue
    const cat = typeof e.metadata.category === 'string' ? e.metadata.category : 'Uncategorized'
    map.set(cat, (map.get(cat) ?? 0) + (e.amount ?? 0))
  }
  return map
}

export function tripActivityCount(entries: LifeLogEntry[]): number {
  return entries.filter((e) => e.type === 'activity').length
}
```

**Reactive hook pattern** (mirror `entriesRepository.ts` lines 129–135 `useEntries` and lines 160–166 `useEntry`):
```typescript
// No default value — undefined means Dexie loading (see useEntries JSDoc rule)
export function useTrips(): LifeLogEntry[] | undefined {
  return useLiveQuery(
    () => listTrips(),
    [],
  )
}

// tripId in dependency array — query re-runs when tripId changes (PITFALLS integration gotcha)
export function useTripEntries(tripId: string): LifeLogEntry[] | undefined {
  return useLiveQuery(
    () => listTripEntries(tripId),
    [tripId],
  )
}
```

---

### `src/services/tripService.test.ts` (test, pure unit + Dexie integration)

**Primary analog:** `src/services/activeMode.test.tsx` — Dexie-touching tests with `beforeEach` open/close + `vi.useFakeTimers({ toFake: ['Date'] })`

**Secondary analog:** `src/services/captureService.test.ts` — pure function tests with factory helpers

**File header / imports** (mirror `activeMode.test.tsx` lines 1–11):
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from './db'
import { entriesRepository } from './entriesRepository'
import {
  createAndActivateTrip,
  listTrips,
  listTripEntries,
  tripDateRange,
  tripExpenseTotal,
  tripExpensesByCategory,
  tripActivityCount,
} from './tripService'
import { activeModeRepository } from './activeMode'
import type { LifeLogEntry } from './db'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it
```

**Dexie lifecycle pattern** (mirror `activeMode.test.tsx` lines 15–18 + `entriesRepository.test.tsx` lines 7–10):
```typescript
beforeEach(async () => {
  await db.delete()
  await db.open()
})
```

**Factory helper pattern** (mirror `entriesRepository.test.tsx` lines 14–25):
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

**Fake timer pattern for Date-dependent tests** (mirror `activeMode.test.tsx` lines 70–77; CRITICAL: use `{ toFake: ['Date'] }` not bare `vi.useFakeTimers()` to avoid stalling Dexie IndexedDB writes):
```typescript
afterEach(() => {
  vi.useRealTimers()
})

it('stamps recordedAt at the faked current time', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })  // MUST use toFake:['Date'] — full fake timers stall Dexie
  vi.setSystemTime(new Date('2026-06-19T10:00:00'))
  const trip = await createAndActivateTrip('Paris')
  expect(trip.recordedAt).toBe(new Date('2026-06-19T10:00:00').getTime())
})
```

**Pure helper test pattern** (mirror `captureService.test.ts` lines 417–471 — no Dexie, direct array inputs):
```typescript
describe('tripExpenseTotal', () => {
  it('sums amount on expense entries only', () => {
    const entries: LifeLogEntry[] = [
      { ...makeEntryData({ type: 'expense', amount: 10.10 }), id: '1' },
      { ...makeEntryData({ type: 'expense', amount: 5.20 }), id: '2' },
      { ...makeEntryData({ type: 'activity' }), id: '3' },  // must be excluded
    ]
    const total = tripExpenseTotal(entries)
    // Raw number: round at display time via Math.round(total * 100) / 100
    expect(Math.round(total * 100) / 100).toBe(15.30)
  })
})
```

**Reactive hook test pattern** (mirror `activeMode.test.tsx` lines 132–165 using `render`, `screen`, `act`):
```typescript
import { render, screen, act } from '@testing-library/react'

function TripsTest() {
  const trips = useTrips()
  if (trips === undefined) return <p>Loading</p>
  return <ul>{trips.map(t => <li key={t.id}>{t.title}</li>)}</ul>
}

describe('useTrips reactive hook', () => {
  it('returns undefined before any write (loading branch)', async () => {
    render(<TripsTest />)
    expect(await screen.findByText('Loading')).toBeInTheDocument()
  })

  it('re-renders after createAndActivateTrip inside act()', async () => {
    render(<TripsTest />)
    await screen.findByText('Loading')
    await act(async () => {
      await createAndActivateTrip('Paris')
    })
    expect(await screen.findByText('Paris')).toBeInTheDocument()
  })
})
```

---

## Shared Patterns

### Dexie db open/delete lifecycle
**Source:** `src/services/activeMode.test.tsx` lines 15–18, `src/services/entriesRepository.test.tsx` lines 7–10
**Apply to:** `tripService.test.ts` (all Dexie-touching describe blocks)
```typescript
beforeEach(async () => {
  await db.delete()
  await db.open()
})
```

### Fake timer pattern (no Dexie stall)
**Source:** `src/services/activeMode.test.tsx` lines 70–77, 87–90
**Apply to:** Any test in `tripService.test.ts` that needs `Date.now()` or `new Date()` to be controlled
```typescript
// ALWAYS use { toFake: ['Date'] } — bare vi.useFakeTimers() stalls awaited IndexedDB writes
vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(new Date('2026-06-19T10:00:00'))
// ... test ...
vi.useRealTimers()  // in afterEach
```

### useLiveQuery hook shape (undefined = loading)
**Source:** `src/services/entriesRepository.ts` lines 129–135, `src/services/activeMode.ts` lines 51–57
**Apply to:** `useTrips()`, `useTripEntries()` in `tripService.ts`
```typescript
// No default value argument to useLiveQuery — callers handle undefined as "loading"
return useLiveQuery(
  () => queryFn(),
  [dependency],
  // No default: undefined = Dexie opening
)
```

### Pure helper: metadata string-guard
**Source:** `src/services/entriesRepository.ts` lines 80–85 (`bump()` in `listDistinctValues`)
**Apply to:** `tripExpensesByCategory()` in `tripService.ts` when reading `metadata.category`
```typescript
// Only treat string metadata values as valid (metadata is Record<string, unknown>)
const cat = typeof e.metadata.category === 'string' ? e.metadata.category : 'Uncategorized'
```

### Conditional spread for optional fields
**Source:** `src/services/captureService.ts` lines 191–206
**Apply to:** `activateMode()` extension in `activeMode.ts`, and `draftToEntry` STAMP-02 in `captureService.ts`
```typescript
// Include key only when value is truthy — never persist undefined/null as explicit key
...(tripId ? { tripId } : {})
```

### entryFields.ts — Record<EntryType, ...> exhaustiveness
**Source:** `src/config/entryFields.ts` lines 28–113
**Apply to:** Any phase that touches `entryFields.ts` — Phase 20 adds `trip` and `activity` entries to both `ENTRY_FIELDS` and `POSITIONAL_SCHEMA` to keep TypeScript satisfied after the `EntryType` union extension. The `POSITIONAL_SCHEMA` record is typed `Record<EntryType, string[]>` so adding new union members without adding entries here causes a compile error.

---

## No Analog Found

All files in Phase 20 have close analogs in the codebase. No entries for this section.

---

## Metadata

**Analog search scope:** `src/services/` (all `.ts` / `.tsx` files read or grepped)
**Files scanned:** `db.ts`, `activeMode.ts`, `activeMode.test.tsx`, `captureService.ts`, `captureService.test.ts`, `entriesRepository.ts`, `entriesRepository.test.tsx`, `extractMetadataFromUrl.ts`, `test-setup.ts`, `config/entryFields.ts`
**Pattern extraction date:** 2026-06-19

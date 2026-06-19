---
phase: 20-trip-data-model-engine-extensions
reviewed: 2026-06-19T00:00:00Z
depth: deep
files_reviewed: 10
files_reviewed_list:
  - src/services/db.ts
  - src/config/entryFields.ts
  - src/config/entryFields.test.ts
  - src/services/activeMode.ts
  - src/services/activeMode.test.tsx
  - src/services/captureService.ts
  - src/services/captureService.test.ts
  - src/services/tripService.ts
  - src/services/tripService.test.tsx
  - src/services/dsl/suggest.test.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-06-19
**Depth:** deep
**Files Reviewed:** 10
**Status:** issues\_found

## Summary

Phase 20 adds `'trip'` and `'activity'` to `EntryType`, extends `ActiveMode` with an optional `tripId`, gates `draftToEntry` tripId stamping on a non-empty mode string, and introduces `tripService.ts` with pure stat helpers, async repository functions, and two `useLiveQuery` reactive hooks.

The `EntryType` union extension, backward-compatible `activateMode` third parameter, `draftToEntry` STAMP-02 guard, `useLiveQuery` dependency arrays, and `POSITIONAL_SCHEMA` additions are all correct. No security vulnerabilities or data-loss paths were found.

Four warnings surfaced: a label normalization mismatch in `createAndActivateTrip` that produces inconsistent `entry.title`/`activeMode.label` for blank-name input; non-atomic sequential writes without a Dexie transaction; a factually wrong comment in `listTrips` about which index is being used; and a stale "7 types" comment in `captureService.ts`.

---

## Warnings

### WR-01: `createAndActivateTrip` passes raw `name` to `activateMode`, not the normalized form

**File:** `src/services/tripService.ts:80,86`

**Issue:** The entry is created with `name.trim() || 'Untitled Trip'` (line 80), but `activateMode` is called with the original raw `name` (line 86). When `name` is blank or all-whitespace the two values diverge:

- `entry.title` = `'Untitled Trip'`
- `activateMode('trip', '   ', entry.id)` → `trimmed = ''` → `label = defaultInstanceLabel('trip')` = `'trip-Jun-2026'`

All entries stamped under this active mode receive `metadata.modeLabel = 'trip-Jun-2026'`, which does not match the trip record's own `title`. Any UI that derives the trip display name from `modeLabel` will show the auto-generated label instead of `'Untitled Trip'`. The `tripService.test.tsx` blank-name test (line 216-219) only asserts `entry.title` and does not catch this divergence.

**Fix:**
```typescript
export async function createAndActivateTrip(name: string): Promise<LifeLogEntry> {
  const trimmedName = name.trim() || 'Untitled Trip'   // normalize once
  const entry = await entriesRepository.create({
    type: 'trip',
    domain: 'trips',
    title: trimmedName,
    recordedAt: Date.now(),
    tags: [],
    metadata: {},
    syncedAt: null,
  })
  await activateMode('trip', trimmedName, entry.id)    // pass normalized name
  return entry
}
```

---

### WR-02: Non-atomic two-write in `createAndActivateTrip` — no Dexie transaction

**File:** `src/services/tripService.ts:77-87`

**Issue:** `entriesRepository.create` (writes to `entries` table) and `activateMode` (writes to `settings` table) are two sequential `await` calls with no wrapping transaction. If `activateMode` throws after the entry is persisted — for example, a quota-exceeded error on the second write — the app lands in a state where a `type='trip'` entry exists in `entries` but no active mode is set in `settings`. The user has no UI path to recover; subsequent `createAndActivateTrip` calls would accumulate orphaned trip entries.

**Fix:** Wrap both writes in a Dexie transaction:
```typescript
export async function createAndActivateTrip(name: string): Promise<LifeLogEntry> {
  const trimmedName = name.trim() || 'Untitled Trip'
  let created: LifeLogEntry | undefined
  await db.transaction('rw', db.entries, db.settings, async () => {
    created = await entriesRepository.create({
      type: 'trip',
      domain: 'trips',
      title: trimmedName,
      recordedAt: Date.now(),
      tags: [],
      metadata: {},
      syncedAt: null,
    })
    await activateMode('trip', trimmedName, created.id)
  })
  return created!
}
```

---

### WR-03: `listTrips` comment claims `domain` index is used — it is not

**File:** `src/services/tripService.ts:92-97`

**Issue:** The JSDoc comment reads:

> Uses the `domain` index to narrow the scan to the 'trips' domain, then applies a client-side type filter and sorts by `recordedAt` descending.

The actual code is:
```typescript
return db.entries
  .orderBy('recordedAt')
  .reverse()
  .filter((e) => e.domain === 'trips' && e.type === 'trip')
  .toArray()
```

`orderBy('recordedAt')` uses the `recordedAt` index. The `domain === 'trips'` predicate is a JavaScript-side filter applied after fetching each row — the `domain` index is not involved. The comment describes a query that was not implemented. A future maintainer relying on this comment for performance reasoning would be misled.

**Fix:** Update the comment to match reality:
```
 * Scans all entries ordered by the `recordedAt` index (newest-first), applies a
 * JS-side filter for `domain === 'trips' && type === 'trip'`.
 * O(n) over all entries — acceptable at personal-app scale.
```

---

### WR-04: Stale "All 7 current types do" comment in `captureService.ts`

**File:** `src/services/captureService.ts:241`

**Issue:** The `typeHasDateField` JSDoc reads:

> All 7 current types do; the gate is kept for correctness/future-proofing so a type without a date field never gets an invented date.

Phase 20 adds two types (`trip`, `activity`), making nine total. More importantly, `trip` does NOT have an `occurredAt` field, so the assertion "all current types do" is now factually wrong. The function logic is correct (optional chaining + `?? false` handles the new types) but the comment contradicts the new behavior and could mislead someone reasoning about which types receive a date default.

**Fix:**
```typescript
/**
 * True iff the type's ENTRY_FIELDS config has a core occurredAt descriptor.
 *
 * Currently: activity, event, expense, place, show, movie, book, podcast (yes);
 * trip (no — trip entries record only a name, no per-entry date).
 * The optional-chain + `?? false` handles any unknown future type safely.
 */
```

---

## Info

### IN-01: Blank-name test missing `activeMode.label` assertion

**File:** `src/services/tripService.test.tsx:216-219`

**Issue:** The test `'falls back to Untitled Trip for a blank/whitespace name'` only asserts `entry.title`:
```typescript
const entry = await createAndActivateTrip('   ')
expect(entry.title).toBe('Untitled Trip')
```
It does not assert `activeMode.label`. This allowed the label normalization mismatch (WR-01) to slip through test coverage.

**Fix:** Add an assertion for the active mode state:
```typescript
expect(entry.title).toBe('Untitled Trip')
const active = await activeModeRepository.get()
expect(active?.label).toBe('Untitled Trip')   // must match entry.title
expect(active?.tripId).toBe(entry.id)
```

---

### IN-02: `tripExpensesByCategory` docstring omits float-rounding responsibility

**File:** `src/services/tripService.ts:27-42`

**Issue:** `tripExpenseTotal` explicitly documents that it returns a raw float and callers must round before display. `tripExpensesByCategory` accumulates floats in the same way but its docstring says nothing about this. Inconsistent documentation creates a trap for callers who read one function's docs but not the other's.

**Fix:** Add a line to the `tripExpensesByCategory` docstring:
```
 * Raw floats accumulated — callers round each value via `Math.round(x * 100) / 100`
 * before display (see PITFALLS Pitfall 4).
```

---

### IN-03: `tripDateRange` spreads an array into `Math.min`/`Math.max`

**File:** `src/services/tripService.ts:56`

**Issue:**
```typescript
return { start: Math.min(...dates), end: Math.max(...dates) }
```
Spreading into a variadic function throws `RangeError: Maximum call stack size exceeded` beyond roughly 100,000 arguments (V8 limit). Extremely unlikely for a personal trip logger, but a `reduce`-based form costs nothing and is future-proof.

**Fix:**
```typescript
return {
  start: dates.reduce((min, d) => (d < min ? d : min), dates[0]),
  end:   dates.reduce((max, d) => (d > max ? d : max), dates[0]),
}
```

---

_Reviewed: 2026-06-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_

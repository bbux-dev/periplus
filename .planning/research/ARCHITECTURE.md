# Architecture Research

**Domain:** Trip-only PWA UI rewrite over a preserved headless engine (v0.5.0)
**Researched:** 2026-06-19
**Confidence:** HIGH — derived entirely from reading actual source files

---

## Trip Data Model Decision

This is the central design question for v0.5.0. Three options were evaluated.

### Option A: activeMode/settings-only (no trip entry)

A trip exists only as `{ mode: "trip", label: "<name>" }` in `settings['activeMode']`. Previous
trips are discovered by scanning all entries for distinct `metadata.modeLabel` values where
`metadata.mode === "trip"`.

**Fatal problems:**
- Only ONE active mode record exists in `settings`. When the user activates a new trip the old
  trip's settings record is overwritten. A trip created but abandoned before any entries are logged
  vanishes permanently with no trace.
- "Previous Trips" list requires scanning all entries' metadata and grouping by label string.
  Two trips named identically (e.g., "Paris") merge into one.
- No stable primary key for a trip; all grouping is by mutable name string.

**Verdict: Rejected.**

### Option B: settings list of trips (separate from entries)

All trips stored as a JSON array in `settings['trips']`. The active trip stored in
`settings['activeMode']` as before.

**Problems:**
- Introduces a second Dexie persistence pattern not used by anything else.
- `settings` is a key-value bag designed for scalar/singleton values, not lists.
- Trips would live outside the `entries` store, breaking the existing export (which only exports
  `entries`).

**Verdict: Rejected.**

### Option C (RECOMMENDED): Trip as LifeLogEntry + activeMode activation

Creating a trip does two things atomically:
1. Writes a `LifeLogEntry { type: 'trip', domain: 'trips', title: tripName }` via the existing
   `entriesRepository.create()`.
2. Calls `activateMode('trip', tripName, tripEntry.id)` — extending the `ActiveMode` interface
   with an optional `tripId` field that holds the entry's UUID.

Subsequent expense and activity entries are stamped via the existing `draftToEntry` path with
`metadata.mode = "trip"`, `metadata.modeLabel = <trip name>`, AND `metadata.tripId = <UUID>`.

**Why this works:**
- Every trip has a UUID primary key (`entriesRepository.create` generates one). Two trips named
  "Paris" are distinct by `id`, not by name.
- "Previous Trips" list: `db.entries.where('domain').equals('trips').filter(e => e.type === 'trip')` —
  the `domain` index makes this efficient; `type` scan over the result set is acceptable at personal-app
  scale (hundreds of entries).
- Date range derivable from `occurredAt` min/max of entries where `metadata.tripId === tripId`.
- Expense total: sum of `amount` on entries where `metadata.tripId === tripId && type === 'expense'`.
- A trip with zero entries is still visible in the Previous Trips list (the trip record itself
  exists as a `LifeLogEntry`).
- Existing `entriesRepository.update/delete` handles trip record mutation/deletion with no new
  plumbing.
- Existing `exportEntries.ts` exports everything including trip records — no changes needed.

**Verdict: RECOMMENDED.**

---

## Engine Extensions Required

The preserved engine needs three small additive changes. Nothing is replaced.

### 1. `src/services/db.ts` — extend EntryType (no schema bump)

```typescript
export type EntryType =
  | 'show' | 'movie' | 'book' | 'podcast'  // media (kept for data compat)
  | 'place' | 'event'                        // trips legacy (kept for data compat)
  | 'expense'                                // trips + expenditures
  | 'trip'                                   // NEW: trip record
  | 'activity'                               // NEW: hike/show/restaurant/cafe/other
```

`type` is NOT indexed in Dexie (schema version 2 indexes only `id`, `recordedAt`, `domain`). Adding
new type string values is a TypeScript-only change; zero Dexie version bump required.

### 2. `src/services/activeMode.ts` — extend ActiveMode + activateMode

```typescript
export interface ActiveMode {
  mode: string
  label: string
  tripId?: string   // NEW: the LifeLogEntry UUID of the active trip
}

export async function activateMode(
  mode: string,
  label?: string,
  tripId?: string,  // NEW optional param
): Promise<void> {
  const trimmed = label?.trim()
  await activeModeRepository.put({
    mode,
    label: trimmed || defaultInstanceLabel(mode),
    ...(tripId ? { tripId } : {}),
  })
}
```

All existing callers (`AppShell.tsx` `confirmPendingMode`) pass `activateMode(mode, label)` with no
`tripId` — the new param is optional so backward compatibility is preserved.

### 3. `src/services/captureService.ts` — extend draftToEntry to stamp tripId

```typescript
// In draftToEntry, inside the STAMP-01 block:
const metadata =
  activeMode?.mode
    ? {
        ...baseMetadata,
        mode: activeMode.mode,
        modeLabel: activeMode.label,
        ...(activeMode.tripId ? { tripId: activeMode.tripId } : {}),  // NEW
      }
    : baseMetadata
```

This is additive to the existing STAMP-01 logic. Entries stamped without a `tripId` (from prior
milestones or non-trip contexts) are unaffected.

---

## New Service: `src/services/tripService.ts`

Encapsulates trip-specific business logic. All data access delegates to the existing
`entriesRepository` and `activeModeRepository`.

```typescript
// Key functions:

async function createAndActivateTrip(name: string): Promise<LifeLogEntry>
// Creates the trip LifeLogEntry, then calls activateMode('trip', name, entry.id)

async function listTrips(): Promise<LifeLogEntry[]>
// db.entries.where('domain').equals('trips').filter(e => e.type === 'trip').reverse().toArray()

async function listTripEntries(tripId: string): Promise<LifeLogEntry[]>
// db.entries.filter(e => e.metadata.tripId === tripId).toArray()

function tripDateRange(entries: LifeLogEntry[]): { start: number; end: number } | null
// min/max of occurredAt from entries

function tripExpenseTotal(entries: LifeLogEntry[]): number
// sum of amount on entries where type === 'expense'

function tripExpensesByCategory(entries: LifeLogEntry[]): Map<string, number>
// group entries by metadata.category; sum amount per group

function tripActivityCount(entries: LifeLogEntry[]): number
// entries.filter(e => e.type === 'activity').length
```

Pure-computation helpers (`tripDateRange`, `tripExpenseTotal`, etc.) are deterministic and easily
unit-tested without Dexie.

Reactive hooks for components:

```typescript
function useTrips(): LifeLogEntry[] | undefined
// useLiveQuery over the trip filter

function useTripEntries(tripId: string): LifeLogEntry[] | undefined
// useLiveQuery over the tripId metadata filter
```

---

## New Entry Fields: `src/config/entryFields.ts`

`ENTRY_FIELDS` is typed `Record<EntryType, FieldDescriptor[]>` — TypeScript enforces that every
new EntryType gets an entry. Add:

```typescript
trip: [
  { key: 'name', label: 'Trip Name', inputType: 'text', required: true,
    mapTo: { kind: 'core', field: 'title' } },
  // occurredAt defaults to today; not shown on form (trip date = creation date)
],

activity: [
  { key: 'name',         label: 'Name',      inputType: 'text',   required: true,
    mapTo: { kind: 'core', field: 'title' } },
  { key: 'location',     label: 'Location',  inputType: 'text',
    mapTo: { kind: 'core', field: 'location' } },
  { key: 'occurredAt',   label: 'Date',      inputType: 'date',
    mapTo: { kind: 'core', field: 'occurredAt' } },
  { key: 'rating',       label: 'Rating',    inputType: 'number',  placeholder: '1–5',
    min: 1, max: 5,   mapTo: { kind: 'metadata', key: 'rating' } },
  { key: 'description',  label: 'Notes',     inputType: 'text',
    mapTo: { kind: 'core', field: 'description' } },
  { key: 'activityType', label: 'Type',      inputType: 'text',
    mapTo: { kind: 'metadata', key: 'activityType' } },
],
```

`POSITIONAL_SCHEMA` also needs entries for both types, even if they never use the DSL:

```typescript
trip:     ['name'],
activity: ['name', 'location'],
```

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          UI Layer (NEW)                              │
│                                                                      │
│  CreateTripPage   TripHomePage   ExpensePage   ActivityTypePage      │
│  ActivityFormPage PreviousTripsPage TripDetailPage SettingsPage      │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  AppShell (REWRITTEN nav: Home / Previous Trips / Settings)  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  UI Primitives (REUSED AS-IS)                                        │
│  Button  FormField  Input  cn  SavedToast  HoleSheet  StarRating(*)  │
├─────────────────────────────────────────────────────────────────────┤
│                     Service Layer (ENGINE — PRESERVED)               │
│                                                                      │
│  tripService.ts (NEW)    activeMode.ts (EXTENDED)                   │
│  entriesRepository.ts (REUSED)  captureService/draftToEntry (EXT.)  │
│  exportEntries.ts (REUSED)                                           │
├─────────────────────────────────────────────────────────────────────┤
│                       Dexie / IndexedDB (UNCHANGED)                  │
│                                                                      │
│  entries store: &id, recordedAt, domain                              │
│  settings store: key  (activeMode + anything else)                   │
└─────────────────────────────────────────────────────────────────────┘
(*) StarRating is a new small component
```

---

## Route Map (New App.tsx)

All 13 existing routes are dropped. New route table:

| Route | Page | Guard / Notes |
|-------|------|---------------|
| `/` | `TripHomePage` | Redirect to `/create-trip` when no active trip |
| `/create-trip` | `CreateTripPage` | First-run + "start a new trip" path |
| `/expense` | `ExpensePage` | Amount (required), Category (required), Vendor, Notes |
| `/activity` | `ActivityTypePage` | Type picker: Hike / Show / Restaurant / Cafe / Other |
| `/activity/:type` | `ActivityFormPage` | Name, Location, Rating, Notes; Other adds free-text Type |
| `/trips` | `PreviousTripsPage` | All trips newest-first; name, date range, total, activity count |
| `/trips/:tripId` | `TripDetailPage` | Category report + timeline; edit/delete entries inline |
| `/settings` | `SettingsPage` (stripped) | Export-only; shortcut import/export removed |
| `*` | `PlaceholderPage` | 404 catch-all (reused) |

The "no active trip" guard lives in `TripHomePage`: if `useActiveMode()` returns `undefined` (still
loading) show a spinner; if it returns a value with `mode !== 'trip'` or returns `null`-equivalent
(no mode set), navigate to `/create-trip`. This keeps `App.tsx` minimal.

---

## Component Responsibilities

| Component | Responsibility | Notes |
|-----------|----------------|-------|
| `AppShell` | Sticky app bar with trip name display; hamburger nav (Home / Previous Trips / Settings); no domain tree, no mode switcher | Rewritten — strip 60% of existing code |
| `TripHomePage` | Show active trip name + total; Expense + Activity CTAs; recent entries (last 5–10) | New |
| `CreateTripPage` | Trip name input + Save; on save: `createAndActivateTrip()` then navigate `/` | New |
| `ExpensePage` | Amount (number input or HoleSheet keypad) + Category select + Vendor + Notes; calls `draftToEntry` + `entriesRepository.create` + `SavedToast` | New |
| `ActivityTypePage` | Six large tap targets (Hike/Show/Restaurant/Cafe/Other); navigates to `/activity/:type` | New |
| `ActivityFormPage` | Name/Location/Rating/Notes form; reads `:type` from route param → stores in `metadata.activityType`; "Other" adds required free-text field | New |
| `PreviousTripsPage` | `useTrips()` live list; each row shows name, date range (from min/max occurredAt of linked entries), total expenses, activity count | New |
| `TripDetailPage` | `useTripEntries(tripId)` live; expense report grouped by category; chronological timeline of all entries; edit/delete inline using `entriesRepository.update/delete` | New |
| `SettingsPage` | Export button only — calls `buildExportJson` + `triggerDownload`; strip all shortcut-config UI | Rewritten |
| `StarRating` | Clickable 1–5 star display; value controlled; accessible (aria) | New small component |
| `ExpenseReport` | Category-grouped table with subtotals + grand total; receives pre-computed `Map<string, number>` from `tripExpensesByCategory()` | New |

---

## Data Flow

### Create Trip Flow

```
CreateTripPage: user types trip name → submit
  ↓
tripService.createAndActivateTrip(name)
  ↓ (1) entriesRepository.create({ type:'trip', domain:'trips', title:name, ... })
  ↓ (2) activateMode('trip', name, entry.id)
       → db.settings.put({ key:'activeMode', value:{ mode:'trip', label:name, tripId:entry.id } })
  ↓
navigate('/')
TripHomePage: useActiveMode() reactive update → shows trip name
```

### Log Expense Flow

```
TripHomePage: tap "Expense" → navigate('/expense')
ExpensePage: fill amount + category (+ optional vendor/notes) → submit
  ↓
const draft: ReviewDraft = {
  amount: parsedAmount,
  occurredAt: todayLocalMidnightEpoch(),
  metadata: { category, merchant: vendor },
  description: notes,
}
const activeMode = useActiveMode()  // { mode:'trip', label:'Paris', tripId:'uuid' }
const entry = draftToEntry(draft, 'expense', 'trips', activeMode)
// entry.metadata = { category, merchant, mode:'trip', modeLabel:'Paris', tripId:'uuid' }
await entriesRepository.create(entry)
  ↓
SavedToast shown → navigate(-1) or navigate('/')
TripHomePage: useTripEntries() / useEntries() reactive update → recent list updated
```

### Log Activity Flow

```
TripHomePage: tap "Activity" → navigate('/activity')
ActivityTypePage: tap type → navigate('/activity/hike')
ActivityFormPage: fill name/location/rating/notes → submit
  ↓
const draft: ReviewDraft = {
  title: name,
  location,
  metadata: { activityType: 'hike', rating },
  description: notes,
  occurredAt: todayLocalMidnightEpoch(),
}
const entry = draftToEntry(draft, 'activity', 'trips', activeMode)
await entriesRepository.create(entry)
  ↓
navigate('/')
```

### Previous Trips + Drill-in Flow

```
PreviousTripsPage: useTrips() → LifeLogEntry[] of type='trip'
For each trip card: call tripService helpers (pure, not DB calls) to derive stats
  from useTripEntries(tripId) or from a pre-loaded entries snapshot

TripDetailPage: useTripEntries(tripId)
  ↓ split into expense entries + activity entries
  → ExpenseReport: tripExpensesByCategory(expenses)
  → Timeline: sort all entries by occurredAt

Edit entry: entriesRepository.update(id, changes)  [existing, no new code]
Delete entry: entriesRepository.delete(id)          [existing, no new code]
```

---

## Component Reuse vs Drop vs New (Explicit Inventory)

### REUSED AS-IS (zero modifications)

| File | Why |
|------|-----|
| `src/services/db.ts` | Only EntryType extends; no Dexie schema change |
| `src/services/entriesRepository.ts` | All CRUD + reactive hooks work for new types |
| `src/services/exportEntries.ts` | Exports all entries including trips/activities |
| `src/components/ui/Button.tsx` | Generic primitive |
| `src/components/ui/FormField.tsx` | Generic primitive |
| `src/components/ui/Input.tsx` | Generic primitive |
| `src/components/ui/cn.ts` | Utility |
| `src/components/dashboard/SavedToast.tsx` | Feedback after save |
| `src/components/dashboard/HoleSheet.tsx` | Amount keypad pattern (optional reuse in ExpensePage) |
| `src/pages/PlaceholderPage.tsx` | 404 catch-all |
| `src/state/common/assertNever.ts` | Utility |
| `src/pwa/pwaConfig.ts` | Unchanged |
| `src/config/appBrand.ts` | Unchanged |

### MODIFIED (additive or partial rewrite)

| File | Change |
|------|--------|
| `src/services/db.ts` | Add `'trip'` and `'activity'` to `EntryType` union |
| `src/services/activeMode.ts` | Extend `ActiveMode` interface with `tripId?`; add `tripId` param to `activateMode()` |
| `src/services/captureService.ts` | Stamp `metadata.tripId` when `activeMode.tripId` is present |
| `src/config/entryFields.ts` | Add `trip` and `activity` field descriptors + positional schema entries |
| `src/components/layout/AppShell.tsx` | Rewrite nav: strip domain tree, mode-switcher, entries/manage links; replace with Home / Previous Trips / Settings; app bar shows active trip name |
| `src/pages/SettingsPage.tsx` | Strip to export-only; remove all shortcut-config UI |

### NEW

| File | Purpose |
|------|---------|
| `src/services/tripService.ts` | `createAndActivateTrip`, `listTrips`, `listTripEntries`, pure stat helpers, reactive hooks |
| `src/pages/CreateTripPage.tsx` | First-run + new trip form |
| `src/pages/TripHomePage.tsx` | Active trip dashboard |
| `src/pages/ExpensePage.tsx` | Expense capture form |
| `src/pages/ActivityTypePage.tsx` | Activity type picker |
| `src/pages/ActivityFormPage.tsx` | Activity capture form |
| `src/pages/PreviousTripsPage.tsx` | Historical trip list |
| `src/pages/TripDetailPage.tsx` | Trip drill-in: expense report + timeline + edit/delete |
| `src/components/trips/StarRating.tsx` | 1–5 star input |
| `src/components/trips/ExpenseReport.tsx` | Category-grouped expense table |
| `src/components/trips/ActivityTimeline.tsx` | Chronological entry list |
| `src/components/trips/TripCard.tsx` | Summary card for PreviousTripsPage |

### DROPPED (delete from repo)

| File | Reason |
|------|--------|
| `src/pages/DashboardPage.tsx` | Replaced by TripHomePage |
| `src/pages/DomainPage.tsx` | No domain navigation in new UI |
| `src/pages/CaptureUrlPage.tsx` | URL-first capture dropped |
| `src/pages/ReviewPage.tsx` | No review step in new UI |
| `src/pages/ManualEntryPage.tsx` | Forms replace generic manual entry |
| `src/pages/EntryListPage.tsx` | No generic entry list |
| `src/pages/EntryDetailPage.tsx` | Inline edit/delete in TripDetailPage |
| `src/pages/EntryEditPage.tsx` | Replaced by inline editing |
| `src/pages/QuickCapturePage.tsx` | DSL omnibar dropped |
| `src/pages/ManageShortcutsPage.tsx` | Shortcut system dropped |
| `src/pages/ShortcutFormPage.tsx` | Shortcut system dropped |
| `src/components/dashboard/IconPicker.tsx` | Shortcut authoring only |
| `src/components/dashboard/LayoutChips.tsx` | Layout switcher only |
| `src/components/dashboard/ShortcutRow.tsx` | Shortcut rendering only |
| `src/hooks/useShortcutCapture.ts` | Shortcut capture hook |
| `src/services/dsl/parser.ts` | DSL not used in new UI |
| `src/services/dsl/suggest.ts` | DSL not used in new UI |
| `src/services/configRepository.ts` | Shortcut config persistence |
| `src/services/configPort.ts` | Shortcut import/export |
| `src/services/configValidator.ts` | Shortcut JSON Schema validation |
| `src/services/shortcutMutations.ts` | Shortcut CRUD |
| `src/services/templateValidator.ts` | DSL template validation |
| `src/services/extractMetadataFromUrl.ts` | URL extraction (type `ReviewDraft` moves to `captureService.ts`) |
| `src/services/urlUtils.ts` | URL safety utils (no URL-first capture) |
| `src/config/navigation.ts` | Domain/type navigation replaced |
| `src/config/shortcutConfig.ts` | Shortcut config schema |
| `src/schemas/shortcut-config.v1.schema.json` | Shortcut JSON Schema |

Note on `ReviewDraft`: it is currently defined in `extractMetadataFromUrl.ts` and imported by
`captureService.ts`. Before deleting `extractMetadataFromUrl.ts`, move the `ReviewDraft` type
declaration into `captureService.ts` (or a dedicated `src/types/draft.ts`). This is a one-line
move; all existing captureService tests continue to pass.

---

## Suggested Phase Build Order

Dependencies flow downward. Each phase must complete before the next begins.

### Phase 1 — Trip Data Model + Engine Extensions
**Goal:** The engine understands trips; all existing tests still pass; new service tests pass.

Deliverables:
- `db.ts`: add `'trip'` and `'activity'` to `EntryType`
- `activeMode.ts`: extend `ActiveMode` with `tripId?`; extend `activateMode()`
- `captureService.ts`: stamp `metadata.tripId` via `draftToEntry`; move `ReviewDraft` type here
- `entryFields.ts`: add `trip` and `activity` field descriptors + positional schema entries
- `tripService.ts`: `createAndActivateTrip`, `listTrips`, `listTripEntries`, stat helpers, reactive hooks
- Delete `extractMetadataFromUrl.ts` (after moving `ReviewDraft`)
- All existing tests update for new EntryType (compile-time, not behavior); new unit tests for
  `tripService` pure helpers

**Why first:** Every subsequent phase depends on the ability to create trips, stamp entries, and
query trip entries. Building the model first means pages can be built independently in any order.

### Phase 2 — App Shell + Routing Rewrite + Empty State
**Goal:** The app has the new route structure; "Create a Trip" works end-to-end; export still works.

Deliverables:
- `App.tsx`: rewrite with new 8-route table
- `AppShell.tsx`: rewrite nav (Home / Previous Trips / Settings; active trip name in app bar)
- `CreateTripPage.tsx`: trip name input → `createAndActivateTrip()` → navigate `/`
- `SettingsPage.tsx`: strip to export-only
- Drop all 10 deleted page files and their tests
- Drop all deleted service/config/component files
- 404 `PlaceholderPage` reused unchanged
- Guard in `TripHomePage` (stub page): redirect to `/create-trip` when no active trip

**Why second:** Establishes the navigational skeleton. All subsequent pages need the shell and
routing to exist. Dropping old files now prevents confusion about which pages are active.

### Phase 3 — Trip Home + Expense Capture
**Goal:** User can see the active trip and log expenses against it.

Deliverables:
- `TripHomePage.tsx`: active trip name, expense total, recent entries list (last 10), Expense +
  Activity buttons; guard redirect to `/create-trip`
- `ExpensePage.tsx`: Amount + Category (enum select) + Vendor + Notes form;
  `draftToEntry` + `entriesRepository.create` + `SavedToast` + navigate back
- `SavedToast` reused; `HoleSheet` optional reuse for amount keypad

**Why third:** The home screen is the steady-state view; expense logging is the primary capture
path. Both depend on the routing + engine from Phases 1–2.

### Phase 4 — Activity Capture
**Goal:** User can log activities (Hike / Show / Restaurant / Cafe / Other).

Deliverables:
- `ActivityTypePage.tsx`: six tap targets; navigates `/activity/:type`
- `ActivityFormPage.tsx`: Name + Location + Rating + Notes; "Other" adds required free-text type
  field; saves via `draftToEntry('activity', 'trips', activeMode)`
- `StarRating.tsx`: clickable 1–5 star input

**Why fourth:** Structurally parallel to expense but separate form flow. Depends on Phase 1
(activity EntryType, tripId stamping) and Phase 2 (routing). Does not depend on Phase 3 — can be
built in parallel with Phase 3 in principle, but sequential is cleaner.

### Phase 5 — Previous Trips + Trip Detail + Expense Report
**Goal:** User can view all trips, drill into one, see a category expense report and timeline,
and edit/delete entries.

Deliverables:
- `PreviousTripsPage.tsx` + `TripCard.tsx`: `useTrips()` list with stats per card (date range,
  total, activity count) via pure `tripService` helpers
- `TripDetailPage.tsx`: `useTripEntries(tripId)` → split into expenses and activities
- `ExpenseReport.tsx`: `tripExpensesByCategory()` → category table with subtotals + total
- `ActivityTimeline.tsx`: chronological list of all entries; edit/delete via
  `entriesRepository.update/delete` (no new plumbing)

**Why last:** Requires that both expense entries (Phase 3) and activity entries (Phase 4) exist in
the data store before the report is meaningful. The pure stat helpers in `tripService` can be
tested immediately from Phase 1; the pages are the final integration.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Name-based trip grouping without tripId

**What people do:** Query `entries.filter(e => e.metadata.modeLabel === trip.title)` using the trip
name string as the join key.

**Why it's wrong:** Two trips named identically ("Paris 2025", "Paris 2025") merge — all entries
from both appear in each other's detail view. On delete/rename the grouping breaks permanently.

**Do this instead:** Query by `metadata.tripId === trip.id` (UUID). Stamp `tripId` at creation via
the extended `draftToEntry`. The UUID never changes even if the trip label is edited.

### Anti-Pattern 2: Adding a new settings key for trip history

**What people do:** `db.settings.put({ key: 'tripHistory', value: [...trips] })` to track all
trips separately from entries.

**Why it's wrong:** The entries store already has the data (trip records with `type='trip'`). A
parallel settings list diverges: entries deleted via `entriesRepository.delete` won't remove from
the settings list; entries modified via `update` won't sync. Two sources of truth for the same
fact.

**Do this instead:** Trip records ARE entries. Query `useTrips()` which reads from `db.entries`.
Single source of truth.

### Anti-Pattern 3: Indexing metadata fields in Dexie

**What people do:** Add `metadata.tripId` or `metadata.category` as Dexie indexes to speed up
queries.

**Why it's wrong:** Dexie cannot index nested object paths (only flat string paths are supported by
IndexedDB). Attempting `'metadata.tripId'` in the schema string silently fails or throws.

**Do this instead:** Keep `metadata` unindexed (as currently). At personal-app scale (hundreds of
entries), a full-scan filter over the `entries` store is imperceptible. The `domain` index narrows
trip-entry scans sufficiently.

### Anti-Pattern 4: Deleting trip entries leaving orphaned expense/activity entries

**What people do:** `entriesRepository.delete(tripId)` on the trip record without cleaning up the
entries stamped with that `tripId`.

**Why it's wrong:** Expenses and activities stamped `metadata.tripId=<uuid>` now belong to a
deleted trip. They appear in no trip's detail view but still count in the export.

**Do this instead:** When deleting a trip from `TripDetailPage`, cascade-delete (or offer the user
a choice): `listTripEntries(tripId)` then delete each entry. Or accept orphan entries as a known
limitation in the v0.5.0 scope and document it.

---

## Integration Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| New pages ↔ `entriesRepository` | Direct import; `useEntries()` / `useEntry()` / `useTripEntries()` reactive hooks | Components MUST NOT import `db` directly (existing rule) |
| New pages ↔ `activeMode.ts` | Direct import; `useActiveMode()` reactive hook | `activateMode()` called only from `CreateTripPage` / `tripService` |
| `draftToEntry` ↔ new entry types | `'trip'` and `'activity'` passed as `type` param | No structural change; types must exist in `EntryType` union |
| `AppShell` ↔ `activeModeRepository` | `useActiveMode()` for app-bar display | Mode switcher replaced by trip name display only |
| `TripDetailPage` ↔ `entriesRepository` | `update()` and `delete()` for inline entry editing | Existing methods; no new plumbing |
| `SettingsPage` ↔ `exportEntries.ts` | `entriesRepository.list()` + `buildExportJson` + `triggerDownload` | Reused pattern; no change |

---

## Sources

- `/home/bbux/git/life-log/src/services/db.ts` — EntryType union, Dexie schema (HIGH confidence)
- `/home/bbux/git/life-log/src/services/activeMode.ts` — ActiveMode interface, activateMode (HIGH)
- `/home/bbux/git/life-log/src/services/captureService.ts` — draftToEntry STAMP-01 logic (HIGH)
- `/home/bbux/git/life-log/src/services/entriesRepository.ts` — CRUD + reactive hooks (HIGH)
- `/home/bbux/git/life-log/src/services/exportEntries.ts` — export pattern (HIGH)
- `/home/bbux/git/life-log/src/components/layout/AppShell.tsx` — existing nav structure (HIGH)
- `/home/bbux/git/life-log/src/App.tsx` — existing route table (HIGH)
- `/home/bbux/git/life-log/src/config/entryFields.ts` — field descriptors + POSITIONAL_SCHEMA (HIGH)
- `/home/bbux/git/life-log/.planning/PROJECT.md` — v0.5.0 goals, constraints, key decisions (HIGH)

---

*Architecture research for: Life Log v0.5.0 Trip-Only UI Rewrite*
*Researched: 2026-06-19*

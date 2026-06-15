# Phase 6: Entry List, Detail & Export — Research

**Researched:** 2026-06-15
**Domain:** React + Dexie read-side (useLiveQuery), client-side JSON export, RTL testing
**Confidence:** HIGH — all findings derived directly from existing codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Entry List at `/entries` (swap PlaceholderPage → EntryListPage). Reactive via `useEntries()`. Each row: title, type, date (occurredAt ?? recordedAt), amount when present. Filter: All / Media / Trips / Expenditures by `entry.domain`. Dashboard must link to `/entries` (currently no link).
- Entry Detail at `/entries/:id` (swap PlaceholderPage → EntryDetailPage). Full entry: title, type, description, sourceUrl, amount, location, tags, metadata JSON preview. Reachable from list row. Guard for unknown id.
- **Security (Phase 4 carry-over):** `sourceUrl` rendered as `<a>` only if `isSafeUrl()` passes (http/https). Otherwise plain text.
- **VIEW-04 persistence:** already guaranteed by Dexie/IndexedDB from Phase 2; automated proxy is that the list reads IndexedDB state. True cross-refresh is manual-only.
- **EXP-01:** `services/exportEntries.ts`. Pure data-shaping function + thin browser download trigger. Keep the data-shaping pure and unit-testable; download trigger is thin and mockable.

### Claude's Discretion
All implementation choices (filter-state pattern, useEntry hook design, isSafeUrl extraction strategy, export envelope shape, download trigger design, test structure, wave/plan breakdown) are at Claude's discretion. CONTEXT.md sets goals and constraints; all tactical decisions are open.

### Deferred Ideas (OUT OF SCOPE)
Edit/delete-from-detail and import are out of scope unless trivially adjacent.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIEW-01 | Entry List screen lists all saved entries with filters All / Media / Trips / Expenditures | useEntries() reactive hook + useState filter + NAVIGATION-derived filter options |
| VIEW-02 | Each list row shows title, type, occurred/recorded date, and amount when present | LifeLogEntry fields; domain-scoped type label lookup via getDomainConfig; date fallback `occurredAt ?? recordedAt` |
| VIEW-03 | Entry Detail screen shows the full entry including metadata JSON preview | new useEntry(id) hook; JSON.stringify(metadata, null, 2) in `<pre>`; isSafeUrl for sourceUrl link |
| VIEW-04 | Saved entries persist after a page refresh | Already guaranteed by Dexie; automated proxy = list reads IndexedDB; manual-only for true refresh |
| EXP-01 | User can export all entries as JSON via `services/exportEntries.ts` | buildExportJson(entries, exportedAt) pure fn + triggerDownload() shim; jsdom mock strategy documented below |
</phase_requirements>

---

## Summary

Phase 6 is the read-side capstone of the v0.1.0 milestone: it turns the append-only event log
into something the user can browse, inspect, and export. All the heavy lifting (Dexie schema,
reactive hooks, routes) was done in Phases 2–3. This phase is pure UI + one new service.

**No new packages are needed.** Every capability is covered by the locked stack: `useLiveQuery`
for reactivity, `react-router-dom` for navigation, `Blob`/`URL.createObjectURL` for download
(browser built-ins), and the existing `fake-indexeddb` + RTL + Vitest for testing.

The three non-trivial design decisions are: (1) how to share `isSafeUrl` between ReviewPage and
EntryDetailPage without duplication, (2) the `useEntry(id)` hook return type that distinguishes
loading from not-found, and (3) the export split between a deterministic pure function and a
thin jsdom-mockable download shim. All three are resolved below.

**Primary recommendation:** 5 plans in 2 waves. Wave 1 builds the three new services/utilities
(isSafeUrl extraction, useEntry hook, exportEntries) in parallel. Wave 2 builds the two pages
and wires them into the app, also in parallel since their file sets don't overlap.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Entry list (reactive read) | Browser / Client | — | useLiveQuery in React; pure local IndexedDB, no server |
| Domain filtering | Browser / Client | — | Derived array from existing in-memory hook result; no query needed |
| Entry detail (reactive read) | Browser / Client | — | Same pattern as list; single entry by id |
| sourceUrl safe link | Browser / Client | — | Input validation at render time, not at write time |
| JSON export data-shaping | Browser / Client (pure fn) | — | No I/O; pure transformation of LifeLogEntry[] |
| JSON export download trigger | Browser / Client (side effect) | — | Blob + URL.createObjectURL + anchor click; browser built-in |
| IndexedDB persistence | Database / Storage | — | Dexie, already implemented in Phase 2 |

---

## Standard Stack

No new packages. Phase 6 consumes only existing dependencies.

### Existing Capabilities Used

| Capability | Source | Version |
|------------|--------|---------|
| Reactive list hook | `dexie-react-hooks` `useLiveQuery` | ^4.4.0 (installed) |
| Route params | `react-router-dom` `useParams` + `useNavigate` | ^7.17.0 (installed) |
| URL validation | `new URL(raw).protocol` (browser built-in) | — |
| JSON export blob | `Blob` + `URL.createObjectURL` (browser built-in) | — |
| Test: fake IndexedDB | `fake-indexeddb/auto` (already in setupFiles) | ^6.2.5 (installed) |
| Test: RTL | `@testing-library/react` + `@testing-library/user-event` | ^16.3.2 / ^14.6.1 (installed) |

[VERIFIED: codebase grep — package.json + test-setup.ts]

### Package Legitimacy Audit

> No new external packages are installed in this phase. This section is N/A.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src/
├── services/
│   ├── urlUtils.ts          # extracted isSafeUrl (was private to ReviewPage)
│   ├── urlUtils.test.ts     # unit tests for isSafeUrl
│   ├── exportEntries.ts     # buildExportJson + triggerDownload
│   └── exportEntries.test.ts
├── pages/
│   ├── EntryListPage.tsx
│   ├── EntryListPage.test.tsx
│   ├── EntryDetailPage.tsx
│   └── EntryDetailPage.test.tsx
```

**Modified files:**
- `src/services/entriesRepository.ts` — add `useEntry(id)` hook
- `src/pages/ReviewPage.tsx` — update isSafeUrl import (remove local def, import from urlUtils)
- `src/pages/DashboardPage.tsx` — add `/entries` link tile
- `src/App.tsx` — swap both PlaceholderPage stubs for real pages

### System Architecture Diagram

```
DashboardPage
    │  (Link to /entries)
    ▼
EntryListPage ──── useEntries() ──── db.entries (IndexedDB)
    │  filter state (useState)            │
    │  derived filtered array             │ (reactive, re-renders on change)
    │                                     │
    │  row click → navigate /entries/:id  │
    ▼                                     │
EntryDetailPage ─── useEntry(id) ─────────┘
    │  renders: title, type, desc, sourceUrl (isSafeUrl gate)
    │           amount, location, tags, <pre>metadata JSON</pre>
    │  not-found guard → Back
    │
    ▼ (export button)
exportEntries.ts
    ├── buildExportJson(entries, exportedAt) → string   [pure, testable]
    └── triggerDownload(json, filename)                  [side effect, mockable]
            │
            ▼  Blob + URL.createObjectURL + <a download>.click() + revokeObjectURL
```

### Pattern 1: EntryListPage — Filter State

**What:** `useState` for filter key; derive the filtered array in render. No `useMemo` needed at local-app data scale.

**When to use:** Whenever filter state is purely local to one component and the source list is already in memory from a reactive hook.

```tsx
// Source: navigation.ts NAVIGATION + db.ts EntryDomain — derived in this phase
import { useState } from 'react'
import { useEntries } from '../services/entriesRepository'
import { NAVIGATION, getDomainConfig } from '../config/navigation'
import type { EntryDomain } from '../services/db'

type FilterKey = 'all' | EntryDomain

// Derive filter options from NAVIGATION — single source of truth for domain order/labels
const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: 'all', label: 'All' },
  ...NAVIGATION.map(d => ({ value: d.domain as FilterKey, label: d.label })),
]
// → [{ value:'all', label:'All' }, { value:'media', label:'Media' },
//    { value:'trips', label:'Trips' }, { value:'expenditures', label:'Expenditures' }]

export function EntryListPage() {
  const entries = useEntries()
  const [filter, setFilter] = useState<FilterKey>('all')

  if (entries === undefined) return <p>Loading...</p>

  const filtered = filter === 'all' ? entries : entries.filter(e => e.domain === filter)

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        {/* Filter tabs */}
        <div role="group" aria-label="Filter entries" className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              aria-pressed={filter === opt.value}
              className={cn(
                'px-3 py-1 rounded-md text-sm font-medium border transition-colors',
                filter === opt.value
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)]'
                  : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* List */}
        {filtered.length === 0 ? (
          <p className="text-center opacity-60 text-sm py-8">No entries yet.</p>
        ) : (
          <ul>
            {filtered.map(entry => <EntryRow key={entry.id} entry={entry} />)}
          </ul>
        )}
      </div>
    </div>
  )
}
```

[ASSUMED: exact className choices — mirrors existing page patterns from DomainPage/DashboardPage]

### Pattern 2: Type Label Lookup (domain-scoped)

**Critical:** `'expense'` appears in both `'trips'` and `'expenditures'`. Always scope by domain, never do a flat cross-domain find. [VERIFIED: codebase grep — navigation.ts comment]

```tsx
// Source: navigation.ts getDomainConfig
function getTypeLabel(domain: EntryDomain, type: EntryType): string {
  return getDomainConfig(domain)?.types.find(t => t.type === type)?.label ?? type
}
// Usage in row: getTypeLabel(entry.domain, entry.type)
```

### Pattern 3: Date Display

```tsx
// occurredAt is optional epoch ms; recordedAt is always present
const dateMs = entry.occurredAt ?? entry.recordedAt
const dateStr = new Date(dateMs).toLocaleDateString()
// For tests: toLocaleDateString() is locale-dependent; prefer toLocaleDateString('en-US') or
// just test that the rendered text is non-empty, not the exact format.
```

### Pattern 4: EntryRow

```tsx
// Source: DomainPage.tsx Link tile pattern — adapted for /entries/:id
import { Link } from 'react-router-dom'

function EntryRow({ entry }: { entry: LifeLogEntry }) {
  const dateMs = entry.occurredAt ?? entry.recordedAt
  const typeLabel = getTypeLabel(entry.domain, entry.type)
  return (
    <li>
      <Link
        to={`/entries/${entry.id}`}
        className="flex items-center justify-between min-h-[56px] px-4 py-3 rounded-lg
                   border border-[var(--color-border)] bg-[var(--color-muted)]
                   hover:bg-[var(--color-border)] active:opacity-75 transition-colors"
      >
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{entry.title}</span>
          <span className="text-xs opacity-60">{typeLabel} · {new Date(dateMs).toLocaleDateString()}</span>
        </div>
        {entry.amount != null && (
          <span className="text-sm font-medium shrink-0 ml-4">${entry.amount.toFixed(2)}</span>
        )}
      </Link>
    </li>
  )
}
```

### Pattern 5: useEntry(id) Hook — Loading vs Not-Found Distinction

**Decision:** Add `useEntry(id)` to `entriesRepository.ts`. Use `useLiveQuery` with a `.then(e => e ?? null)` transform so the return type is `LifeLogEntry | null | undefined`:

- `undefined` — Dexie is still opening (loading state)
- `null` — Dexie is open, entry genuinely not found
- `LifeLogEntry` — found

This is idiomatic and consistent with the existing `useEntries()` pattern where callers must handle `undefined` as loading. [VERIFIED: codebase grep — entriesRepository.ts useLiveQuery pattern]

```ts
// Source: entriesRepository.ts — mirrors useEntries() pattern
export function useEntry(id: string): LifeLogEntry | null | undefined {
  return useLiveQuery(
    () => db.entries.get(id).then(e => e ?? null),
    [id],
  )
}
```

**In EntryDetailPage:**
```tsx
const id = useParams<{ id: string }>().id ?? ''
const entry = useEntry(id)
const goBack = useBackOrHome('/entries')

if (entry === undefined) return <p>Loading...</p>
if (entry === null) {
  return (
    <div className="...">
      <button onClick={goBack} aria-label="Go back">← Back</button>
      <p>Entry not found.</p>
    </div>
  )
}
// render full entry
```

### Pattern 6: Metadata JSON Preview

```tsx
// In EntryDetailPage — renders the opaque metadata bag as pretty-printed JSON
<pre
  className="text-xs overflow-auto bg-[var(--color-muted)] p-3 rounded-md whitespace-pre-wrap break-all"
  data-testid="metadata-json"
>
  {JSON.stringify(entry.metadata, null, 2)}
</pre>
```

The `data-testid` enables asserting the presence and content of the preview in RTL tests.

### Pattern 7: sourceUrl Safe Link — Shared Utility

**Decision:** Extract `isSafeUrl` from `ReviewPage.tsx` (currently a module-private function) into a new `src/services/urlUtils.ts`. Then both `ReviewPage` and `EntryDetailPage` import from it. No code duplication.

[VERIFIED: codebase grep — isSafeUrl is defined only in src/pages/ReviewPage.tsx, line 12–18]

```ts
// src/services/urlUtils.ts — NEW FILE
/** Returns true only for http: and https: URLs — guards against javascript: XSS vectors. */
export function isSafeUrl(raw: string): boolean {
  try {
    const { protocol } = new URL(raw)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
```

```tsx
// ReviewPage.tsx update (remove local def, import from urlUtils)
import { isSafeUrl } from '../services/urlUtils'

// EntryDetailPage.tsx
import { isSafeUrl } from '../services/urlUtils'

// Usage in detail:
{entry.sourceUrl && (
  isSafeUrl(entry.sourceUrl)
    ? <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer"
         className="text-[var(--color-primary)] underline break-all">
        {entry.sourceUrl}
      </a>
    : <span className="break-all">{entry.sourceUrl}</span>
)}
```

### Pattern 8: DashboardPage Link to /entries

Add after the domain tiles. Use `QueueListIcon` (or `Bars3Icon`) from `@heroicons/react/24/outline`. Style as a secondary tile to visually distinguish from domain navigation tiles.

```tsx
// DashboardPage.tsx — add this after the NAVIGATION.map() block
import { Link } from 'react-router-dom'
import { QueueListIcon } from '@heroicons/react/24/outline'

// ...existing tiles...
<Link
  to="/entries"
  className="flex items-center gap-4 min-h-[64px] px-4 rounded-lg
             border border-[var(--color-border)] bg-[var(--color-muted)]
             hover:bg-[var(--color-border)] active:opacity-75
             transition-colors"
>
  <QueueListIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
  <span className="text-lg font-medium">View All Entries</span>
</Link>
```

### Pattern 9: exportEntries.ts — Pure Fn + Download Shim

**EXP-01 — The determinism question (RESOLVED below):**

Split into two exports: a pure data-shaping function (fully deterministic, testable without mocks) and a thin download trigger (side-effectful, tested with mocks).

```ts
// src/services/exportEntries.ts — NEW FILE
import type { LifeLogEntry } from './db'

export interface ExportEnvelope {
  version: 1
  exportedAt: number   // epoch ms — INJECTED, never read from Date.now() inside this fn
  entries: LifeLogEntry[]
}

/**
 * Pure function: shapes all entries into the export JSON string.
 * exportedAt is injected by the caller — NOT read from Date.now() here —
 * so the function is deterministic and testable without mocking Date.
 *
 * Usage: buildExportJson(entries, Date.now())
 */
export function buildExportJson(entries: LifeLogEntry[], exportedAt: number): string {
  const envelope: ExportEnvelope = { version: 1, exportedAt, entries }
  return JSON.stringify(envelope, null, 2)
}

/**
 * Browser-side download trigger. NOT pure — creates a Blob, temporary anchor, and
 * calls click(). Mock URL.createObjectURL + HTMLAnchorElement.prototype.click in tests.
 *
 * @param json    JSON string from buildExportJson
 * @param filename  Default filename for the browser download dialog
 */
export function triggerDownload(json: string, filename = 'life-log.json'): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

### Pattern 10: Testing triggerDownload in jsdom

`URL.createObjectURL` is not implemented in jsdom. The correct approach is to spy on it and on `HTMLAnchorElement.prototype.click` so the test never reaches actual browser download machinery.

```ts
// src/services/exportEntries.test.ts (triggerDownload tests)
import { describe, it, expect, vi, afterEach } from 'vitest'
import { triggerDownload } from './exportEntries'

afterEach(() => { vi.restoreAllMocks() })

describe('triggerDownload', () => {
  it('calls URL.createObjectURL with a Blob and URL.revokeObjectURL with the returned URL', () => {
    const fakeUrl = 'blob:fake-url'
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(fakeUrl)
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    triggerDownload('{"version":1}')

    expect(createSpy).toHaveBeenCalledOnce()
    expect(createSpy).toHaveBeenCalledWith(expect.any(Blob))
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(revokeSpy).toHaveBeenCalledWith(fakeUrl)
  })

  it('sets the download attribute to the filename', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    let capturedAnchor: HTMLAnchorElement | null = null
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedAnchor = this
    })

    triggerDownload('{}', 'my-log.json')

    expect(capturedAnchor).not.toBeNull()
    expect(capturedAnchor!.download).toBe('my-log.json')
    expect(capturedAnchor!.href).toContain('blob:x')
  })
})
```

**Why this works in jsdom:** jsdom supports `document.createElement('a')`, `appendChild`, `removeChild`, and lets you spy on the `click` method of HTMLAnchorElement.prototype. URL.createObjectURL/revokeObjectURL are vi.spied at the module level before the function runs.

**buildExportJson tests (pure — no mocks needed):**
```ts
describe('buildExportJson', () => {
  it('returns valid JSON with version=1, correct exportedAt, and all entries', () => {
    const entries = [{ id: 'abc', domain: 'media', type: 'book', title: 'Test',
      recordedAt: 1000, tags: [], metadata: {}, syncedAt: null }] as LifeLogEntry[]
    const exportedAt = 1700000000000
    const json = buildExportJson(entries, exportedAt)
    const parsed = JSON.parse(json) as ExportEnvelope
    expect(parsed.version).toBe(1)
    expect(parsed.exportedAt).toBe(exportedAt)
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.entries[0].id).toBe('abc')
  })

  it('builds correct JSON for an empty entries array', () => {
    const json = buildExportJson([], 999)
    const parsed = JSON.parse(json) as ExportEnvelope
    expect(parsed.entries).toEqual([])
    expect(parsed.version).toBe(1)
  })
})
```

### Pattern 11: App.tsx Route Swap

```tsx
// App.tsx — Phase 6 swap (replace PlaceholderPage stubs)
import { EntryListPage }   from './pages/EntryListPage'
import { EntryDetailPage } from './pages/EntryDetailPage'

// Replace:
//   <Route path="/entries"     element={<PlaceholderPage title="Entry List" />} />
//   <Route path="/entries/:id" element={<PlaceholderPage title="Entry Detail" />} />
// With:
<Route path="/entries"     element={<EntryListPage />} />
<Route path="/entries/:id" element={<EntryDetailPage />} />
```

The PlaceholderPage import can be removed from App.tsx once the catch-all `*` route no longer needs it — but check first: the `*` route also uses PlaceholderPage, so the import stays for now.

### Anti-Patterns to Avoid

- **Flat type lookup across all domains:** `NAVIGATION.flatMap(d => d.types).find(t => t.type === entry.type)` returns only the first match — silently wrong for `'expense'` (appears in both trips and expenditures). Always scope by `entry.domain`.
- **Calling Date.now() inside buildExportJson:** Makes the function non-deterministic and requires mocking Date in tests. Inject `exportedAt` as a parameter instead.
- **Providing a default `[]` to useEntries/useEntry:** Loses the loading state, which breaks skeleton UI. Callers must handle `undefined` explicitly.
- **Rendering sourceUrl directly as `href` without isSafeUrl check:** A `javascript:` URL in stored data would execute arbitrary code on click. Always gate with isSafeUrl.
- **Using URL.createObjectURL without revokeObjectURL:** Leaks blob URLs. Always call `revokeObjectURL` after the click.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reactive data reads | polling / useEffect + useState | `useLiveQuery` (already in useEntries) | Dexie handles subscription; polling risks stale reads |
| Entry-by-id reactive read | useEffect + entriesRepository.get + setState | `useEntry(id)` hook via useLiveQuery | Consistent with established hook pattern; auto-updates |
| Filter derived list | complex filter reducer | `entries.filter(e => e.domain === filter)` | Local in-memory array; plain filter is sufficient |
| Download file | custom streaming / server round-trip | Blob + URL.createObjectURL + anchor | Browser standard; works offline; no server needed |

---

## VIEW-04 Persistence — Automated vs Manual

| Verification | Type | Mechanism |
|--------------|------|-----------|
| Entries survive in-session navigation | Automated | useEntries() reads IndexedDB; entries created in prior tests persist in fake-indexeddb within one test suite run |
| Entries read after browser hard-refresh | Manual-only | jsdom has no concept of browser restart; must be verified by hand |
| Automated proxy for VIEW-04 | Automated | RTL test: create entry → render list → assert entry appears. This proves the repository→hook→render pipeline works on the read side |

---

## Common Pitfalls

### Pitfall 1: useLiveQuery returns undefined on first render
**What goes wrong:** Component renders with `entries === undefined` (Dexie is still opening), then the UI crashes or shows blank.
**Why it happens:** Dexie's open is async; `useLiveQuery` always returns `undefined` on the very first render with no default provided.
**How to avoid:** Gate all rendering behind `if (entries === undefined) return <LoadingState />`. Existing useEntries() comment and tests already enforce this.
**Warning signs:** Tests that render without `await screen.findBy*` — they catch the loading state and then assert on empty content.

### Pitfall 2: toLocaleDateString() is locale-dependent in test environments
**What goes wrong:** `new Date(1700000000000).toLocaleDateString()` returns different strings in CI vs local depending on the Node locale.
**Why it happens:** Node uses the ICU data in the binary; some CI images ship `full-icu`, some `small-icu`.
**How to avoid:** In tests, assert that *some* date text appears (e.g. using `data-testid="entry-date"` and checking `toBeInTheDocument()`) rather than matching the exact format string. Alternatively pass a locale: `toLocaleDateString('en-US')`.

### Pitfall 3: vi.restoreAllMocks() must be called after triggerDownload tests
**What goes wrong:** URL.createObjectURL spy leaks across tests; subsequent tests that actually need URL.createObjectURL (e.g. in another file) find it mocked.
**Why it happens:** vi.spyOn is session-scoped unless restored.
**How to avoid:** Use `afterEach(() => { vi.restoreAllMocks() })` in every describe block that spies on URL.

### Pitfall 4: useEntry(id) hook called with empty string on first render
**What goes wrong:** `useParams()` can return `undefined` for the `id` param if the route pattern doesn't match. Passing `undefined` to `db.entries.get(undefined)` throws in Dexie.
**Why it happens:** TypeScript infers `string | undefined` from `useParams<{ id: string }>().id`.
**How to avoid:** Coerce: `const id = useParams<{ id: string }>().id ?? ''`. An empty-string id will not match any real UUID, so `useEntry('')` returns null (not-found) gracefully.

### Pitfall 5: anchor click fires synchronously in jsdom — timing in tests
**What goes wrong:** Tests that try to `await` triggerDownload (it's synchronous) fail because they expect an async boundary.
**Why it happens:** `a.click()` is synchronous in jsdom.
**How to avoid:** Treat `triggerDownload` as synchronous in tests; call it without await and then immediately assert on the spy call counts.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.9 + RTL ^16.3.2 |
| Config file | `vite.config.ts` (`test.environment: 'jsdom'`, `setupFiles: ['./src/test-setup.ts']`) |
| Quick run command | `npx vitest run --reporter=verbose src/pages/EntryListPage.test.tsx src/pages/EntryDetailPage.test.tsx src/services/exportEntries.test.ts src/services/urlUtils.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIEW-01 | List renders all seeded entries; shows title/type/date/amount | RTL integration (fake-indexeddb) | `npx vitest run src/pages/EntryListPage.test.tsx` | ❌ Wave 2 |
| VIEW-02 | Filter buttons narrow list to matching domain entries; All shows all | RTL integration | same | ❌ Wave 2 |
| VIEW-03 | Detail renders full entry: all fields + `<pre>` metadata JSON; sourceUrl as link when safe, plain text when unsafe; not-found guard | RTL integration (fake-indexeddb) | `npx vitest run src/pages/EntryDetailPage.test.tsx` | ❌ Wave 2 |
| VIEW-04 | Entries readable from IndexedDB state after navigation (automated proxy) | RTL integration (automated proxy) | same as VIEW-01 | ❌ Wave 2 |
| VIEW-04 | True browser refresh persists entries | Manual-only | — (manual) | — |
| EXP-01 (pure fn) | buildExportJson returns correct JSON with version/exportedAt/entries | Unit (pure, no mocks) | `npx vitest run src/services/exportEntries.test.ts` | ❌ Wave 1 |
| EXP-01 (trigger) | triggerDownload calls URL.createObjectURL, clicks anchor, revokeObjectURL | Unit (mocked) | same | ❌ Wave 1 |

### Sampling Rate
- **Per task commit:** run the specific new test file (`npx vitest run <file>`)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps (must exist before implementation tasks)

All gaps are created by the implementation plans themselves (no test infrastructure setup needed — fake-indexeddb, RTL, Vitest already wired). The following files do not yet exist and must be created:

- [ ] `src/services/urlUtils.ts` + `src/services/urlUtils.test.ts` — Wave 1, Plan 06-01
- [ ] `src/services/exportEntries.ts` + `src/services/exportEntries.test.ts` — Wave 1, Plan 06-03
- [ ] `src/pages/EntryListPage.tsx` + `src/pages/EntryListPage.test.tsx` — Wave 2, Plan 06-04
- [ ] `src/pages/EntryDetailPage.tsx` + `src/pages/EntryDetailPage.test.tsx` — Wave 2, Plan 06-05

*(If no gaps: "None" — the existing test infrastructure covers all phase requirements. Here there are 4 new test files to create, but the test harness itself is fully operational.)*

---

## Security Domain

> `security_enforcement` is not set to false in config.json — section included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (local-only, no auth) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | `isSafeUrl()` — validate sourceUrl scheme before rendering as `<a href>` |
| V6 Cryptography | no | — |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| `javascript:` URL in stored sourceUrl rendered as href | Spoofing / Tampering | `isSafeUrl()` gates all `<a href>` renders; unsafe → plain text |
| XSS via metadata JSON preview | Tampering | `JSON.stringify` output in a `<pre>` — React escapes it automatically; no `dangerouslySetInnerHTML` |
| Open redirect via sourceUrl | Spoofing | `isSafeUrl()` limits to `http:`/`https:`; no redirects are programmatic |

**No new security surface is introduced by the export feature.** The JSON is built from local IndexedDB data and downloaded to the user's own device — there is no transmission, no server, no third party.

---

## Plan Structure Recommendation

**Wave 1 — Infrastructure (3 parallel plans, no file overlap):**

| Plan | Files Created/Modified | Delivers |
|------|----------------------|---------|
| 06-01 | `src/services/urlUtils.ts` (new), `src/services/urlUtils.test.ts` (new), `src/pages/ReviewPage.tsx` (update: remove local isSafeUrl, import from urlUtils) | Shared isSafeUrl; ReviewPage still fully tested |
| 06-02 | `src/services/entriesRepository.ts` (add useEntry hook), `src/services/entriesRepository.test.tsx` (add useEntry tests) | useEntry(id) hook: loading/null/found tri-state |
| 06-03 | `src/services/exportEntries.ts` (new), `src/services/exportEntries.test.ts` (new) | buildExportJson + triggerDownload + full test coverage |

**Wave 2 — Pages (2 parallel plans; App.tsx in 06-05 only):**

| Plan | Files Created/Modified | Delivers |
|------|----------------------|---------|
| 06-04 | `src/pages/EntryListPage.tsx` (new), `src/pages/EntryListPage.test.tsx` (new), `src/pages/DashboardPage.tsx` (add /entries link) | VIEW-01, VIEW-02, VIEW-04 (automated proxy), Dashboard reachability |
| 06-05 | `src/pages/EntryDetailPage.tsx` (new), `src/pages/EntryDetailPage.test.tsx` (new), `src/App.tsx` (swap both stubs) | VIEW-03 + full route wiring |

No file is touched by more than one plan in the same wave.

---

## Open Questions (RESOLVED)

1. **Where should isSafeUrl live?**
   - What we know: it currently is a module-private function in ReviewPage.tsx; EntryDetailPage also needs it.
   - What's unclear: services/ vs utils/ convention.
   - RESOLVED: `src/services/urlUtils.ts` — mirrors the pattern of other pure-function modules in services/ (e.g. `extractMetadataFromUrl.ts`). No `src/utils/` directory exists yet; avoid creating a new top-level directory for one function.

2. **useEntry hook: one-shot entriesRepository.get + useEffect/useState OR reactive useLiveQuery?**
   - What we know: useEntries() uses useLiveQuery; entriesRepository.get is one-shot Promise.
   - RESOLVED: reactive `useLiveQuery(() => db.entries.get(id).then(e => e ?? null), [id])` returning `LifeLogEntry | null | undefined`. Consistent with existing hook pattern; gives reactivity if the entry is updated from another tab or concurrent operation.

3. **exportedAt in the export envelope — include it? And if so, how to avoid breaking determinism in tests?**
   - What we know: CONTEXT.md says "NOTE: exportedAt would need a timestamp — if included, inject it (don't call Date.now() inside the pure fn)."
   - RESOLVED: include `exportedAt` (useful metadata for the recipient). Inject it as a second parameter: `buildExportJson(entries, exportedAt: number)`. Caller passes `Date.now()`. The pure function never calls Date internally. Tests pass a fixed value.

4. **How to test triggerDownload in jsdom where URL.createObjectURL is not implemented?**
   - What we know: jsdom does not implement URL.createObjectURL. A naive call throws `"Not implemented"`.
   - RESOLVED: `vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')` + `vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})` + `vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})`. Call `vi.restoreAllMocks()` in afterEach. Test the pure buildExportJson function without any mocks.

5. **VIEW-04 automated proxy: what exactly can we automate?**
   - RESOLVED: the automated proxy is that `useEntries()` reads from IndexedDB (via fake-indexeddb), so a test that creates entries and then renders EntryListPage and sees them proves the persistence pipeline. A true browser hard-refresh test is manual-only (jsdom has no concept of browser restart).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `QueueListIcon` exists in `@heroicons/react/24/outline` at the installed version (^2.2.0) | Pattern 8 (Dashboard link) | Use an alternative icon like `ListBulletIcon` or `Bars3Icon` — all are in the heroicons 2.x outline set |
| A2 | Filter tab style (button with aria-pressed) provides sufficient UX for the prototype | Pattern 1 (filter state) | Could use radio buttons or a `<select>` instead — cosmetic only, not a functional risk |

[ASSUMED: A1 — heroicons icon name not confirmed via official docs, only from common knowledge of heroicons 2.x set]

---

## Environment Availability

> Step 2.6: No new external tools, services, runtimes, or CLIs beyond the project's own dependencies. All capabilities are browser built-ins (Blob, URL.createObjectURL) or already-installed npm packages. Section skipped for this phase.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase grep — src/services/db.ts] — LifeLogEntry type, all fields
- [VERIFIED: codebase grep — src/services/entriesRepository.ts] — useEntries pattern, useLiveQuery return semantics, get() is one-shot Promise
- [VERIFIED: codebase grep — src/config/navigation.ts] — NAVIGATION array, getDomainConfig, domain/type labels, 'expense' cross-domain note
- [VERIFIED: codebase grep — src/pages/ReviewPage.tsx] — isSafeUrl private fn (lines 12–18), existing page layout patterns
- [VERIFIED: codebase grep — src/pages/DashboardPage.tsx] — Link tile pattern, no /entries link currently
- [VERIFIED: codebase grep — src/App.tsx] — /entries + /entries/:id PlaceholderPage stubs (lines 24–25)
- [VERIFIED: codebase grep — src/test-setup.ts] — `fake-indexeddb/auto` + jest-dom imports
- [VERIFIED: codebase grep — package.json] — all installed deps and versions
- [VERIFIED: codebase grep — vite.config.ts] — jsdom environment, setupFiles
- [VERIFIED: codebase grep — src/services/entriesRepository.test.tsx] — db.delete()/db.open() reset pattern, act() + findByText for useLiveQuery

### Secondary (MEDIUM confidence)
- [CITED: vitest.dev — vi.spyOn] — API for spying on prototype methods and static methods
- [CITED: MDN — URL.createObjectURL] — not available in jsdom; must be mocked in unit tests

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all existing
- Architecture: HIGH — all patterns derived directly from existing codebase files
- Pitfalls: HIGH — derived from existing test patterns and known jsdom limitations
- Export design: HIGH — pure-fn + shim split is the established Node/browser pattern; confirmed by CONTEXT.md direction

**Research date:** 2026-06-15
**Valid until:** 2026-09-15 (stable stack; no external API dependencies)

---

## RESEARCH COMPLETE

**Phase:** 6 — Entry List, Detail & Export
**Confidence:** HIGH

### Key Findings

- No new packages needed — all capabilities are browser built-ins or already installed.
- `isSafeUrl` must be extracted from `ReviewPage.tsx` (currently private) to `src/services/urlUtils.ts`; both ReviewPage and EntryDetailPage import it from there.
- `useEntry(id)` hook should be added to `entriesRepository.ts` using `useLiveQuery` with a `.then(e => e ?? null)` transform, returning `LifeLogEntry | null | undefined` to distinguish loading / not-found / found.
- `exportEntries.ts` must be split: `buildExportJson(entries, exportedAt)` is a pure deterministic function (exportedAt injected by caller, never read from Date.now() internally); `triggerDownload(json, filename)` is the thin side-effectful shim mocked in jsdom via `vi.spyOn(URL, 'createObjectURL')` + `vi.spyOn(HTMLAnchorElement.prototype, 'click')`.
- Filter pattern: `useState<'all' | EntryDomain>` + derived `entries.filter()` — no memoization needed. Filter options derived from NAVIGATION so domain order and labels stay in sync automatically.
- Type label lookup must be domain-scoped: `getDomainConfig(entry.domain)?.types.find(t => t.type === entry.type)?.label` — flat cross-domain lookup is silently wrong for `'expense'`.

### Files Created
`.planning/phases/06-entry-list-detail-export/06-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard stack | HIGH | No new packages; all verified in package.json |
| Architecture patterns | HIGH | Derived directly from reading all 5 existing page files + entriesRepository |
| Export design | HIGH | Pure-fn + shim split confirmed by CONTEXT.md note + established jsdom mock pattern |
| Test strategy | HIGH | Existing test files in codebase show exact patterns (fake-indexeddb, RTL, act) |
| isSafeUrl location | HIGH | Read ReviewPage.tsx directly; function is at lines 12–18 |

### Open Questions
All 5 open questions are marked RESOLVED above. No blockers remain.

### Ready for Planning
Research complete. Planner can now create PLAN.md files for the 5-plan, 2-wave structure.

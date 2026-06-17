# Phase 11: Config Model, Schema & Storage — Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 7 (4 implementation + 3 test)
**Analogs found:** 6 / 7 (1 no-analog: JSON Schema spec document)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/config/shortcutConfig.ts` | config | transform (static lookup) | `src/config/entryFields.ts` | exact |
| `src/config/shortcutConfig.test.ts` | test | — | `src/config/entryFields.test.ts` | exact |
| `src/schemas/shortcut-config.v1.schema.json` | spec artifact | — | _(none — new directory)_ | no-analog |
| `src/services/configValidator.ts` | utility | transform (validation) | `src/services/exportEntries.ts` + `src/services/urlUtils.ts` | role-match |
| `src/services/configValidator.test.ts` | test | — | `src/services/urlUtils.test.ts` | exact |
| `src/services/configRepository.ts` | service + hook | CRUD + request-response | `src/services/entriesRepository.ts` | exact |
| `src/services/configRepository.test.tsx` | test | — | `src/services/entriesRepository.test.tsx` | exact |

---

## Pattern Assignments

### `src/config/shortcutConfig.ts` (config, static-lookup transform)

**Analog:** `src/config/entryFields.ts`

**Imports pattern** (`src/config/entryFields.ts` lines 1–4):
```typescript
// src/config/entryFields.ts — shows the project convention for cross-layer config imports
import type { EntryType } from '../services/db'
import type { ReviewDraft } from '../services/extractMetadataFromUrl'
```

For `shortcutConfig.ts`, the icon imports replace the cross-layer type imports:
```typescript
// Named static imports from @heroicons/react — NEVER use dynamic import() for icons
import type { ComponentType, SVGProps } from 'react'
import {
  BanknotesIcon, FilmIcon, TvIcon, ...
} from '@heroicons/react/24/outline'
```

**Core static-data pattern** (`src/config/entryFields.ts` lines 28–113):

The project uses a `Record<Key, Value>` constant with section dividers (not a class, not a default export):
```typescript
// Section-comment style from entryFields.ts:
// ─── ENTRY_FIELDS config ──────────────────────────────────────────────────────
export const ENTRY_FIELDS: Record<EntryType, FieldDescriptor[]> = { ... }

// ─── Positional schema (Quick-Capture DSL) ────────────────────────────────────
export const POSITIONAL_SCHEMA: Record<EntryType, string[]> = { ... }
```

Apply the same pattern for the icon map:
```typescript
// ─── Icon allow-list ─────────────────────────────────────────────────────────
export const DEFAULT_SHORTCUT_ICON = BoltIcon
export const SHORTCUT_ICON_MAP: Record<string, HeroIcon> = { BanknotesIcon, ... }
```

**Utility function pattern** (`src/config/entryFields.ts` lines 128–184):

Pure functions exported at the bottom of config modules — no side effects, no class:
```typescript
// ─── buildReviewDraft mapper ──────────────────────────────────────────────────
export function buildReviewDraft(
  fields: FieldDescriptor[],
  formValues: Record<string, string>,
): ReviewDraft {
  const draft: ReviewDraft = { metadata: {} }
  for (const field of fields) { ... }
  return draft
}
```

Apply the same style for `resolveShortcutIcon`:
```typescript
// ─── Icon resolver ────────────────────────────────────────────────────────────
export function resolveShortcutIcon(key: string | undefined): HeroIcon {
  if (!key) return DEFAULT_SHORTCUT_ICON
  return SHORTCUT_ICON_MAP[key] ?? DEFAULT_SHORTCUT_ICON
}
```

**Type declaration pattern** (`src/config/entryFields.ts` lines 7–24):

Interfaces and union types declared before the constants that use them:
```typescript
// ─── Types ────────────────────────────────────────────────────────────────────
export type FieldInputType = 'text' | 'number' | 'date' | 'tags'

export interface FieldDescriptor {
  key: string
  label: string
  ...
}
```

Use the same order for `shortcutConfig.ts`: types first (`Shortcut`, `Layout`, `ShortcutConfig`), then constants (`SHORTCUT_ICON_MAP`), then functions (`resolveShortcutIcon`).

---

### `src/config/shortcutConfig.test.ts` (test)

**Analog:** `src/config/entryFields.test.ts` (for structured config assertions) + `src/config/appBrand.test.ts` (for simple const-value assertions)

**Imports + describe/it/expect pattern** (`src/config/entryFields.test.ts` lines 1–6):
```typescript
import { describe, it, expect } from 'vitest'
import { ENTRY_FIELDS, buildReviewDraft } from './entryFields'
import type { EntryType } from '../services/db'
```

Apply the same for the icon test:
```typescript
import { describe, it, expect } from 'vitest'
import {
  resolveShortcutIcon,
  SHORTCUT_ICON_MAP,
  DEFAULT_SHORTCUT_ICON,
} from './shortcutConfig'
import { BanknotesIcon } from '@heroicons/react/24/outline'
```

**Named-member coverage pattern** (`src/config/entryFields.test.ts` lines 8–54):

Tests assert known members return expected values, and boundary/unknown keys are handled:
```typescript
describe('ENTRY_FIELDS', () => {
  it('covers all 7 EntryType values', () => {
    for (const type of ALL_ENTRY_TYPES) {
      expect(ENTRY_FIELDS[type]).toBeDefined()
      expect(ENTRY_FIELDS[type].length).toBeGreaterThan(0)
    }
  })
  it('place: "name" field has label "Name" and maps to core.title', () => {
    const nameField = ENTRY_FIELDS.place.find((f) => f.key === 'name')
    expect(nameField?.mapTo).toEqual({ kind: 'core', field: 'title' })
  })
})
```

Apply for icon tests:
```typescript
describe('resolveShortcutIcon', () => {
  it('returns the BanknotesIcon component for "BanknotesIcon"', () => {
    expect(resolveShortcutIcon('BanknotesIcon')).toBe(BanknotesIcon)
  })
  it('returns DEFAULT_SHORTCUT_ICON for an unknown key', () => {
    expect(resolveShortcutIcon('UnknownIcon')).toBe(DEFAULT_SHORTCUT_ICON)
  })
  it('returns DEFAULT_SHORTCUT_ICON for undefined', () => {
    expect(resolveShortcutIcon(undefined)).toBe(DEFAULT_SHORTCUT_ICON)
  })
})
```

**Simple-const assertion pattern** (`src/config/appBrand.test.ts` lines 1–26):
```typescript
import { describe, it, expect } from 'vitest'
import { appBrand } from './appBrand'

describe('appBrand', () => {
  it('name is Life Log', () => {
    expect(appBrand.name).toBe('Life Log')
  })
})
```

Use for asserting SHORTCUT_ICON_MAP key count and DEFAULT_SHORTCUT_ICON identity.

---

### `src/schemas/shortcut-config.v1.schema.json` (spec artifact)

**No analog** — this is the first JSON Schema document in the codebase and the first use of `src/schemas/`. The directory does not yet exist and must be created.

The Research file (11-RESEARCH.md lines 408–455) provides the authoritative spec sketch. Use draft-07 (`$schema: "http://json-schema.org/draft-07/schema#"`), `$defs` (not `definitions`), and `additionalProperties: false` on every object. This file is NOT imported at runtime.

---

### `src/services/configValidator.ts` (utility, transform/validation)

**Analog:** `src/services/exportEntries.ts` (discriminated-union result + pure function export pattern) + `src/services/urlUtils.ts` (minimal validation function returning boolean)

**Discriminated-union result pattern** (`src/services/exportEntries.ts` lines 1–11):

`exportEntries.ts` uses a literal-versioned envelope as the return shape. Adapt the union pattern for a validator result:
```typescript
// exportEntries.ts shows the version-literal type pattern:
export interface ExportEnvelope {
  version: 1          // literal type — mirrors ShortcutConfig.version pattern
  exportedAt: number
  entries: LifeLogEntry[]
}
```

The `ValidationResult` discriminated union follows the same literal-type discipline:
```typescript
// No analog exists directly, but the project uses discriminated unions
// (see src/state/common/requestState.ts) — apply the same pattern:
export type ValidationResult =
  | { ok: true;  config: ShortcutConfig }
  | { ok: false; reason: string }
```

**Pure-function export pattern** (`src/services/exportEntries.ts` lines 27–30):

All service functions are named exports at module scope — no default export, no class:
```typescript
export function buildExportJson(entries: LifeLogEntry[], exportedAt: number): string {
  const envelope: ExportEnvelope = { version: 1, exportedAt, entries }
  return JSON.stringify(envelope, null, 2)
}
```

Apply the same for `validateShortcutConfig` and `migrateConfig`:
```typescript
export function validateShortcutConfig(raw: unknown): ValidationResult { ... }
export function migrateConfig(raw: unknown): ValidationResult { ... }
```

**Minimal guard pattern** (`src/services/urlUtils.ts` lines 1–9):

The project's hand-rolled validation style: early return on type failure, no library:
```typescript
export function isSafeUrl(raw: string): boolean {
  try {
    const { protocol } = new URL(raw)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
```

Apply the same defensive cast pattern inside `validateShortcutConfig`:
```typescript
// Pattern: typeof check → cast → field-by-field structural walk
if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
  return { ok: false, reason: 'Config must be a JSON object.' }
}
const obj = raw as Record<string, unknown>
```

**Section-divider comment style** (`src/services/exportEntries.ts` lines 5–6, 21–22):
```typescript
// ─── Export envelope shape (EXP-01) ─────────────────────────────────────────
// ─── Pure function: shapes all entries into the export JSON string ────────────
```

Use the same `// ─── ... ─────` style for sections in `configValidator.ts`:
```
// ─── Structural validator ─────────────────────────────────────────────────────
// ─── Migration entry point (CFG-03) ──────────────────────────────────────────
```

---

### `src/services/configValidator.test.ts` (test)

**Analog:** `src/services/urlUtils.test.ts` (validation function test matrix) + `src/services/exportEntries.test.ts` (pure-function test structure)

**Validation matrix pattern** (`src/services/urlUtils.test.ts` lines 1–28):
```typescript
import { describe, it, expect } from 'vitest'
import { isSafeUrl } from './urlUtils'

describe('isSafeUrl', () => {
  it('returns true for https: URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true)
  })
  it('returns false for javascript: URLs', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
  })
  it('returns false for empty string', () => {
    expect(isSafeUrl('')).toBe(false)
  })
})
```

Apply one `describe` block per function (`validateShortcutConfig`, `migrateConfig`), one `it` per rejection path from the RESEARCH.md test matrix (CFG-02/CFG-03 rows). No `beforeEach` needed — pure functions have no state.

**Pure-function test pattern** (`src/services/exportEntries.test.ts` lines 7–54):

No mocks required for pure functions; provide inline fixture data:
```typescript
describe('buildExportJson', () => {
  it('returns valid JSON with version=1, correct exportedAt, and all entries', () => {
    const entries = [ { id: 'abc', ... } ] as LifeLogEntry[]
    const json = buildExportJson(entries, 1700000000000)
    const parsed = JSON.parse(json) as ExportEnvelope
    expect(parsed.version).toBe(1)
  })
})
```

Apply: build inline config fixture objects (`makeValidConfig()` factory), assert `{ ok: true }` / `{ ok: false, reason }` shape directly.

---

### `src/services/configRepository.ts` (service + hook, CRUD + request-response)

**Analog:** `src/services/entriesRepository.ts` — exact role and data flow match.

**Imports pattern** (`src/services/entriesRepository.ts` lines 1–3):
```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { LifeLogEntry } from './db'
```

Apply directly:
```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { ShortcutConfig } from '../config/shortcutConfig'
```

**Repository object pattern** (`src/services/entriesRepository.ts` lines 10–56):

Named object export (not a class, not default export) with async methods:
```typescript
export const entriesRepository = {
  async create(entry: Omit<LifeLogEntry, 'id'>): Promise<LifeLogEntry> {
    const id = crypto.randomUUID()
    const full: LifeLogEntry = { ...entry, id }
    await db.entries.add(full)
    return full
  },
  async get(id: string): Promise<LifeLogEntry | undefined> {
    return db.entries.get(id)
  },
  ...
}
```

Apply for config repository — two methods only (simpler than entries):
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

**useLiveQuery hook pattern — no default value** (`src/services/entriesRepository.ts` lines 129–135):

The project rule is explicit: no default `[]` — `undefined` means Dexie is opening:
```typescript
export function useEntries(): LifeLogEntry[] | undefined {
  return useLiveQuery(
    () => db.entries.orderBy('recordedAt').reverse().toArray(),
    [],
    // No default value: callers distinguish undefined (loading) from [] (empty)
  )
}
```

Apply identically:
```typescript
export function useShortcutConfig(): ShortcutConfig | undefined {
  return useLiveQuery(
    () => configRepository.get(),
    [],
    // No default: undefined = Dexie opening or no config saved
  )
}
```

**JSDoc comment style** (`src/services/entriesRepository.ts` lines 120–128):
```typescript
/**
 * Reactive hook for components: returns all entries ordered by recordedAt descending.
 *
 * Returns `undefined` while Dexie is opening (first render), then `LifeLogEntry[]`.
 * Callers MUST handle `undefined` to distinguish "loading" from "empty array".
 * Do NOT provide a default [] — losing the loading state breaks skeleton UI.
 */
```

Replicate the "Callers MUST handle `undefined`" warning in the `useShortcutConfig` JSDoc.

---

### `src/services/configRepository.test.tsx` (test, .tsx extension)

**Analog:** `src/services/entriesRepository.test.tsx` — exact analog including file extension (.tsx because the file renders React hook test components inline).

**Test setup pattern** (`src/services/entriesRepository.test.tsx` lines 1–10):
```typescript
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { entriesRepository, useEntries, useEntry } from './entriesRepository'
import type { LifeLogEntry } from './db'

beforeEach(async () => {
  await db.delete()
  await db.open()
})
```

Apply the same `beforeEach` reset — `fake-indexeddb/auto` is already hoisted in `src/test-setup.ts` so no extra import is needed:
```typescript
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { configRepository, useShortcutConfig } from './configRepository'
import type { ShortcutConfig } from '../config/shortcutConfig'

beforeEach(async () => {
  await db.delete()
  await db.open()
})
```

**Round-trip test pattern** (`src/services/entriesRepository.test.tsx` lines 29–46):
```typescript
describe('entriesRepository: create and get', () => {
  it('create returns a LifeLogEntry with a non-empty string id', async () => {
    const entry = await entriesRepository.create(makeEntryData())
    expect(typeof entry.id).toBe('string')
  })
  it('create persists and get retrieves the same entry (round-trip)', async () => {
    const created = await entriesRepository.create(makeEntryData())
    const found = await entriesRepository.get(created.id)
    expect(found).toEqual(created)
  })
  it('get returns undefined for a non-existent id', async () => {
    const result = await entriesRepository.get('non-existent-id')
    expect(result).toBeUndefined()
  })
})
```

Apply for config round-trips:
```typescript
function makeValidConfig(): ShortcutConfig {
  return { version: 1, layouts: [] }
}

describe('configRepository: get and put', () => {
  it('get returns undefined before any write', async () => {
    const result = await configRepository.get()
    expect(result).toBeUndefined()
  })
  it('put stores config and get returns it typed', async () => {
    const config = makeValidConfig()
    await configRepository.put(config)
    const result = await configRepository.get()
    expect(result).toEqual(config)
  })
})
```

**Reactive hook test pattern** (`src/services/entriesRepository.test.tsx` lines 132–166):

Inline test component renders hook output; `findByText` awaits useLiveQuery re-render; `act()` wraps DB writes:
```typescript
function EntryListTest() {
  const entries = useEntries()
  if (entries === undefined) return <p>Loading...</p>
  return <div><p>{entries.length} entries</p></div>
}

describe('useEntries reactive hook (SC2a)', () => {
  it('initially shows 0 entries after Dexie opens', async () => {
    render(<EntryListTest />)
    expect(await screen.findByText('0 entries')).toBeInTheDocument()
  })
  it('re-renders with new entry title after create() is called', async () => {
    render(<EntryListTest />)
    await screen.findByText('0 entries')
    await act(async () => {
      await entriesRepository.create(makeEntryData({ title: 'My Reactive Entry' }))
    })
    expect(await screen.findByText('My Reactive Entry')).toBeInTheDocument()
  })
})
```

Apply for `useShortcutConfig`:
```typescript
function ConfigTest() {
  const config = useShortcutConfig()
  if (config === undefined) return <p>Loading</p>
  return <p>{config.layouts.length} layouts</p>
}

describe('useShortcutConfig reactive hook', () => {
  it('returns undefined before config is saved', async () => {
    render(<ConfigTest />)
    expect(await screen.findByText('Loading')).toBeInTheDocument()
  })
  it('re-renders with layout count after put()', async () => {
    render(<ConfigTest />)
    await screen.findByText('Loading')
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    expect(await screen.findByText('0 layouts')).toBeInTheDocument()
  })
})
```

---

## Shared Patterns

### Section-divider comment style
**Source:** `src/services/entriesRepository.ts` lines 1, 9, 105, 116; `src/services/exportEntries.ts` lines 5, 21; `src/config/entryFields.ts` lines 27, 94, 116
**Apply to:** All new implementation files
```typescript
// ─── Section title ────────────────────────────────────────────────────────────
```

### No default export — named exports only
**Source:** `src/services/entriesRepository.ts`, `src/services/exportEntries.ts`, `src/config/entryFields.ts` — zero default exports in the codebase
**Apply to:** `configValidator.ts`, `configRepository.ts`, `shortcutConfig.ts`

Every export is named: `export const`, `export function`, `export type`, `export interface`.

### No Dexie `db` access in components — repository layer only
**Source:** `src/services/entriesRepository.ts` lines 7–9:
```typescript
// All component access to IndexedDB entries goes through this module.
// Components MUST NOT import `db` directly — use entriesRepository or useEntries.
```
**Apply to:** `configRepository.ts` — same rule applies. Components use `useShortcutConfig()` or `configRepository`, never `db` directly.

### Test fixture factory function pattern
**Source:** `src/services/entriesRepository.test.tsx` lines 14–25:
```typescript
function makeEntryData(overrides?: Partial<Omit<LifeLogEntry, 'id'>>): Omit<LifeLogEntry, 'id'> {
  return {
    domain: 'media',
    type: 'book',
    title: 'The Pragmatic Programmer',
    recordedAt: 1700000000000,
    tags: [],
    metadata: {},
    syncedAt: null,
    ...overrides,
  }
}
```
**Apply to:** `configRepository.test.tsx` as `makeValidConfig()` and `configValidator.test.ts` as inline config literals.

### `fake-indexeddb/auto` is already hoisted — no per-file import required
**Source:** `src/test-setup.ts` line 1:
```typescript
import 'fake-indexeddb/auto'
```
**Apply to:** `configRepository.test.tsx` — do NOT re-import `fake-indexeddb/auto`. The global setup already covers it. Only the `beforeEach(() => { db.delete(); db.open() })` reset is needed.

### `useLiveQuery` dependency array — use `[]` for no-dependency queries
**Source:** `src/services/entriesRepository.ts` lines 130–134 and 161–165:
```typescript
return useLiveQuery(
  () => db.entries.orderBy('recordedAt').reverse().toArray(),
  [],  // empty deps: query never changes; re-runs only on table mutation
)
```
**Apply to:** `configRepository.ts` — `useShortcutConfig()` takes no arguments so deps array is `[]`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/schemas/shortcut-config.v1.schema.json` | spec artifact | — | No JSON Schema documents exist in the codebase; `src/schemas/` directory does not exist and must be created. The RESEARCH.md Pattern 4 (lines 408–455) provides the authoritative spec sketch — use it directly. |

---

## Metadata

**Analog search scope:** `src/config/`, `src/services/`, `src/state/`
**Files scanned:** 14 source files, 10 test files
**Pattern extraction date:** 2026-06-17

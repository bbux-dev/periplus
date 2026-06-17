# Phase 14: Import / Export Config - Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 6 (2 new services + 2 new pages + 2 modified files)
**Analogs found:** 5 / 6 (file-input/import is net-new — no analog)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/services/configPort.ts` (export side) | service | transform | `src/services/exportEntries.ts` | exact |
| `src/services/configPort.ts` (import side) | service | file-I/O + CRUD | `src/services/configValidator.ts` + `configRepository.ts` | role-match |
| `src/services/configPort.test.ts` | test | file-I/O + CRUD | `src/services/exportEntries.test.ts` + `configValidator.test.ts` | exact |
| `src/pages/SettingsPage.tsx` | page (component) | request-response | `src/pages/EntryListPage.tsx` | role-match |
| `src/pages/SettingsPage.test.tsx` | test | request-response | `src/pages/EntryListPage.test.tsx` | role-match |
| `src/App.tsx` (add route) | router config | request-response | `src/App.tsx` (existing route block) | exact |
| `src/pages/DashboardPage.tsx` (add link) | page (component) | request-response | `src/pages/DashboardPage.tsx` (existing Link block) | exact |

---

## Pattern Assignments

### `src/services/configPort.ts` — export side (service, transform)

**Analog:** `src/services/exportEntries.ts`

The export side of configPort.ts is a near-exact mirror of exportEntries.ts. The only
differences are the envelope shape (config instead of entries) and the filename default.
`triggerDownload` must be REUSED (imported), never duplicated.

**Imports pattern** (`src/services/exportEntries.ts` lines 1-3):
```typescript
import type { LifeLogEntry } from './db'

export type { LifeLogEntry }
```
For configPort, replace with:
```typescript
import type { ShortcutConfig } from '../config/shortcutConfig'
import { triggerDownload } from './exportEntries'           // reuse — do NOT duplicate
import { migrateConfig } from './configValidator'
import { configRepository } from './configRepository'
```

**Pure export function pattern** (`src/services/exportEntries.ts` lines 21-30):
```typescript
/**
 * Pure function: shapes all entries into the versioned export JSON string.
 *
 * @param entries    All LifeLogEntry records to include.
 * @param exportedAt Epoch ms timestamp — INJECTED by caller; NEVER called internally.
 */
export function buildExportJson(entries: LifeLogEntry[], exportedAt: number): string {
  const envelope: ExportEnvelope = { version: 1, exportedAt, entries }
  return JSON.stringify(envelope, null, 2)
}
```
Mirror for configPort:
```typescript
export interface ConfigExportEnvelope {
  version: 1
  exportedAt: number   // epoch ms — INJECTED by caller; never read internally
  config: ShortcutConfig
}

export function buildConfigExportJson(config: ShortcutConfig, exportedAt: number): string {
  const envelope: ConfigExportEnvelope = { version: 1, exportedAt, config }
  return JSON.stringify(envelope, null, 2)
}
```

**triggerDownload reuse** (`src/services/exportEntries.ts` lines 44-57):
```typescript
// DO NOT copy this function. Import it:
// import { triggerDownload } from './exportEntries'
// Then call:
triggerDownload(buildConfigExportJson(config, Date.now()), 'life-log-shortcuts.json')
```

---

### `src/services/configPort.ts` — import side (service, file-I/O + CRUD)

**Analog:** `src/services/configValidator.ts` (migrateConfig) + `src/services/configRepository.ts` (put)

**migrateConfig call pattern** (`src/services/configValidator.ts` lines 113-136):
```typescript
export function migrateConfig(raw: unknown): ValidationResult {
  // ...guards, version check, migration chain...
  return validateShortcutConfig(raw)
}
// Returns: { ok: true, config: ShortcutConfig } | { ok: false, reason: string }
```

**configRepository.put pattern** (`src/services/configRepository.ts` lines 29-31):
```typescript
/** Replaces (upserts) the entire config atomically. */
async put(config: ShortcutConfig): Promise<void> {
  await db.settings.put({ key: CONFIG_KEY, value: config })
},
```

**Import function to build** (no direct analog — compose from the two above):
```typescript
export type ImportResult =
  | { ok: true }
  | { ok: false; reason: string }

/**
 * Reads a File, parses JSON, runs migrateConfig, and on success writes to
 * configRepository. Returns { ok: true } or { ok: false, reason } — NEVER
 * partially applies.
 *
 * NOTE: file.text() is the modern File API. It is supported in all target
 * browsers and in jsdom (fake it with `new File([json], 'f.json')`).
 */
export async function importConfig(file: File): Promise<ImportResult> {
  let raw: unknown
  try {
    const text = await file.text()
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'File is not valid JSON.' }
  }
  const result = migrateConfig(raw)
  if (!result.ok) return result
  await configRepository.put(result.config)
  return { ok: true }
}
```

**File-input reading — NET NEW:** There is no existing `<input type="file">` / FileReader usage
in the codebase. The import function above uses the modern `file.text()` API (Promise-based,
no FileReader callback needed). See the "No Analog Found" section below.

---

### `src/services/configPort.test.ts` (test, transform + file-I/O)

**Analog:** `src/services/exportEntries.test.ts` (export tests) + `src/services/configValidator.test.ts` (validate/migrate tests)

**Test file imports pattern** (`src/services/exportEntries.test.ts` lines 1-3):
```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildExportJson, triggerDownload } from './exportEntries'
import type { LifeLogEntry, ExportEnvelope } from './exportEntries'
```

**triggerDownload spy pattern** (`src/services/exportEntries.test.ts` lines 63-77):
```typescript
it('calls URL.createObjectURL with a Blob, clicks anchor, and revokes the URL', () => {
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
```

**afterEach restore pattern** (`src/services/exportEntries.test.ts` lines 59-61):
```typescript
afterEach(() => {
  vi.restoreAllMocks()
})
```

**Dexie reset for import tests** (`src/services/configRepository.test.tsx` lines 9-12):
```typescript
// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it
beforeEach(async () => {
  await db.delete()
  await db.open()
})
```

**Fixture factory pattern** (`src/services/configValidator.test.ts` lines 11-17):
```typescript
function makeValidConfig(overrides?: Partial<ShortcutConfig>): ShortcutConfig {
  return {
    version: 1,
    layouts: [],
    ...overrides,
  }
}
```

**File construction for import tests** (net-new — no analog; use Web API):
```typescript
// Construct a File object in tests — jsdom supports new File([...], name)
function makeConfigFile(config: unknown): File {
  const json = JSON.stringify(config)
  return new File([json], 'shortcuts.json', { type: 'application/json' })
}
```

**buildConfigExportJson purity tests** (mirror `exportEntries.test.ts` lines 7-53):
```typescript
describe('buildConfigExportJson', () => {
  it('returns valid JSON with version=1, correct exportedAt, and the config', () => { ... })
  it('is deterministic — same inputs produce identical output', () => { ... })
})
```

**triggerDownload is reused (test by mocking it):**
For configPort tests that call `triggerDownload`, mock it the same way as `EntryListPage.test.tsx`
lines 12-19 (vi.mock the whole exportEntries module, keep real `buildExportJson`, stub `triggerDownload`).

---

### `src/pages/SettingsPage.tsx` (page, request-response)

**Analog:** `src/pages/EntryListPage.tsx` (export trigger in UI) + `src/pages/PlaceholderPage.tsx` (minimal page shell)

**Page shell + CSS token pattern** (`src/pages/EntryListPage.tsx` lines 79-82 and `PlaceholderPage.tsx` lines 11-12):
```typescript
return (
  <div className="min-h-screen flex flex-col px-6 py-8 bg-[var(--color-background)] text-[var(--color-foreground)]">
    <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Shortcuts Config</h1>
      {/* content */}
    </div>
  </div>
)
```

**Back-navigation pattern** (`src/pages/PlaceholderPage.tsx` lines 1-2, 9, 13-19):
```typescript
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useBackOrHome } from '../hooks/useBackOrHome'
// ...
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

**Export button pattern** (`src/pages/EntryListPage.tsx` lines 74-76, 120-128):
```typescript
function handleExport() {
  triggerDownload(buildExportJson(allEntries, Date.now()), 'life-log-export.json')
}
// ...
<button
  onClick={handleExport}
  disabled={allEntries.length === 0}
  className="mt-2 px-4 py-2 rounded-md border border-[var(--color-border)]
             text-sm font-medium hover:bg-[var(--color-muted)] transition-colors
             disabled:opacity-40 disabled:cursor-not-allowed"
>
  Export JSON
</button>
```
Mirror for SettingsPage:
```typescript
function handleExport() {
  triggerDownload(buildConfigExportJson(config, Date.now()), 'life-log-shortcuts.json')
}
```

**useShortcutConfig loading gate pattern** (`src/pages/DashboardPage.tsx` lines 39-43):
```typescript
const config = useShortcutConfig()
// ...
// Guard: undefined = Dexie still opening
if (config === undefined) return <p>Loading...</p>
```

**State for import error/status** (no direct analog — use React useState; pattern from EntryListPage line 61):
```typescript
const [filter, setFilter] = useState<FilterKey>('all')
// Mirror:
const [importStatus, setImportStatus] = useState<{ ok: boolean; reason?: string } | null>(null)
```

**File-input element — NET NEW** (no analog in codebase):
```typescript
// Hidden file input triggered by a button — standard pattern for file pickers
<input
  ref={fileInputRef}
  type="file"
  accept=".json,application/json"
  className="sr-only"
  onChange={handleFileChange}
  aria-label="Choose config file"
/>
<button
  onClick={() => fileInputRef.current?.click()}
  className="px-4 py-2 rounded-md border border-[var(--color-border)]
             text-sm font-medium hover:bg-[var(--color-muted)] transition-colors"
>
  Import JSON
</button>
{importStatus && !importStatus.ok && (
  <p role="alert" className="text-sm text-[var(--color-destructive)]">
    {importStatus.reason}
  </p>
)}
```

**cn utility** (used in `EntryListPage.tsx` line 6 — import for conditional classes):
```typescript
import { cn } from '../components/ui/cn'
```

---

### `src/pages/SettingsPage.test.tsx` (test, request-response)

**Analog:** `src/pages/EntryListPage.test.tsx`

**Test file structure** (`src/pages/EntryListPage.test.tsx` lines 1-37):
```typescript
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
// ...

beforeEach(async () => {
  await db.delete()
  await db.open()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}
```

**triggerDownload mock pattern** (`src/pages/EntryListPage.test.tsx` lines 12-19):
```typescript
// Mock triggerDownload so jsdom does not throw on Blob/URL.createObjectURL.
// Keep the real buildExportJson so the JSON argument is fully shaped and testable.
vi.mock('../services/exportEntries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/exportEntries')>()
  return {
    ...actual,
    triggerDownload: vi.fn(),
  }
})
```

**Export button click test** (`src/pages/EntryListPage.test.tsx` lines 205-219):
```typescript
it('calls triggerDownload once with a JSON string containing all entry titles', async () => {
  // ...seed data...
  renderPage()
  await screen.findByText(/* heading */)

  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Export JSON/i }))

  expect(vi.mocked(triggerDownload)).toHaveBeenCalledOnce()
  const [jsonArg] = vi.mocked(triggerDownload).mock.calls[0]
  expect(jsonArg).toContain(/* expected content */)
})
```

**File-input testing — NET NEW** (no analog; construct File and fire onChange):
```typescript
// Simulate a user picking a file — userEvent.upload() handles file inputs
const fileInput = screen.getByLabelText(/choose config file/i)
const file = new File([JSON.stringify(validConfig)], 'shortcuts.json', { type: 'application/json' })
await userEvent.upload(fileInput, file)
// Then assert on success message or updated config
```

---

### `src/App.tsx` — add `/settings` route (router config, request-response)

**Analog:** `src/App.tsx` (existing route block)

**Import block** (`src/App.tsx` lines 1-10):
```typescript
import { Routes, Route } from 'react-router-dom'
import { DashboardPage }   from './pages/DashboardPage'
// ... other page imports ...
import { PlaceholderPage } from './pages/PlaceholderPage'
```
Add: `import { SettingsPage } from './pages/SettingsPage'`

**Route registration pattern** (`src/App.tsx` lines 14-34):
```typescript
function App() {
  return (
    <Routes>
      {/* Phase 3 — real content */}
      <Route path="/"              element={<DashboardPage />} />
      {/* ... existing routes ... */}

      {/* Phase 14 — Import / Export Config */}
      <Route path="/settings"      element={<SettingsPage />} />

      {/* Catch-all: unknown paths show a graceful not-found page */}
      <Route path="*" element={<PlaceholderPage title="Page Not Found" />} />
    </Routes>
  )
}
```
The new route goes BEFORE the catch-all `*` route, following the existing ordering convention.

---

### `src/pages/DashboardPage.tsx` — add `/settings` link (page, request-response)

**Analog:** `src/pages/DashboardPage.tsx` (existing Link entries, lines 110-122)

**Link pattern to mirror exactly** (`src/pages/DashboardPage.tsx` lines 110-122):
```typescript
<Link
  to="/entries"
  className={cn(
    'flex items-center gap-4 min-h-[64px] px-4 rounded-lg',
    'border border-[var(--color-border)] bg-[var(--color-muted)]',
    'hover:bg-[var(--color-border)] active:opacity-75',
    'transition-colors',
  )}
>
  <QueueListIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
  <span className="text-lg font-medium">View All Entries</span>
</Link>
```
New link follows this structure exactly:
```typescript
<Link
  to="/settings"
  className={cn(
    'flex items-center gap-4 min-h-[64px] px-4 rounded-lg',
    'border border-[var(--color-border)] bg-[var(--color-muted)]',
    'hover:bg-[var(--color-border)] active:opacity-75',
    'transition-colors',
  )}
>
  <Cog6ToothIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
  <span className="text-lg font-medium">Shortcuts Config</span>
</Link>
```
Choose an appropriate Heroicons outline icon (e.g. `Cog6ToothIcon`, `AdjustmentsHorizontalIcon`,
or `ArrowUpTrayIcon` — already in `@heroicons/react/24/outline`). Add the import alongside
existing Heroicons imports at the top of DashboardPage.tsx (lines 3-4).

---

## Shared Patterns

### CSS design tokens
**Source:** All page files (e.g. `src/pages/EntryListPage.tsx` lines 80, 91, 93-95, 123-126)
**Apply to:** `SettingsPage.tsx`
```typescript
// Background / text
'bg-[var(--color-background)] text-[var(--color-foreground)]'

// Muted card / border
'border border-[var(--color-border)] bg-[var(--color-muted)]'
'hover:bg-[var(--color-muted)]'

// Primary accent
'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
'text-[var(--color-primary)]'

// Disabled state
'disabled:opacity-40 disabled:cursor-not-allowed'

// Error/destructive (net-new for import error message — token exists in design system)
'text-[var(--color-destructive)]'
```

### Dexie reset in tests
**Source:** `src/services/configRepository.test.tsx` lines 7-12
**Apply to:** `configPort.test.ts` and `SettingsPage.test.tsx`
```typescript
// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it
beforeEach(async () => {
  await db.delete()
  await db.open()
})
```

### Reactive config hook loading gate
**Source:** `src/pages/EntryListPage.tsx` line 64 / `DashboardPage.tsx` line 66
**Apply to:** `SettingsPage.tsx`
```typescript
const config = useShortcutConfig()
if (config === undefined) return <p>Loading...</p>
```

### Pure function determinism rule (injected timestamp)
**Source:** `src/services/exportEntries.ts` lines 15-18, comment on lines 7-10
**Apply to:** `buildConfigExportJson` in `configPort.ts`
```typescript
// exportedAt is injected by the caller so this function remains deterministic
// and testable without mocking Date. The caller is responsible for providing
// the current timestamp (e.g. pass the epoch ms from the call site).
```

### vi.clearAllMocks in beforeEach
**Source:** `src/pages/EntryListPage.test.tsx` line 24
**Apply to:** `SettingsPage.test.tsx` (mocks triggerDownload)
```typescript
beforeEach(async () => {
  await db.delete()
  await db.open()
  vi.clearAllMocks()   // reset call counts between tests
})
```

---

## No Analog Found

| File / Feature | Role | Data Flow | Reason |
|---|---|---|---|
| File-input reading in `configPort.ts` | service | file-I/O | No `<input type="file">` / FileReader / `file.text()` usage anywhere in the codebase |
| `<input type="file">` in `SettingsPage.tsx` | component | file-I/O | No file-picker UI pattern exists yet |
| `userEvent.upload()` in `SettingsPage.test.tsx` | test | file-I/O | No file-input RTL test exists; use `userEvent.upload(inputEl, file)` from `@testing-library/user-event` |
| Import success/error state display | component | request-response | No async-result / alert-role error display pattern in existing pages |

For file-input testing, consult the `@testing-library/user-event` docs for `userEvent.upload()`,
and construct `File` objects directly (`new File([jsonString], 'name.json', { type: 'application/json' })`).
This is fully supported in jsdom and requires no additional mocking.

---

## Metadata

**Analog search scope:** `src/services/`, `src/pages/`, `src/App.tsx`, `src/config/`
**Files read:** 12 (exportEntries.ts, exportEntries.test.ts, configValidator.ts,
  configValidator.test.ts, configRepository.ts, configRepository.test.tsx,
  EntryListPage.tsx, EntryListPage.test.tsx, DashboardPage.tsx, DashboardPage.test.tsx,
  PlaceholderPage.tsx, PlaceholderPage.test.tsx, App.tsx, shortcutConfig.ts, test-setup.ts)
**Pattern extraction date:** 2026-06-17

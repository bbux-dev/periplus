# Phase 13: Tap-to-Capture Flow - Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 9 (5 new/modified source files + 4 test files)
**Analogs found:** 7 / 9 (2 are net-new constructs with no close codebase analog)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/services/captureService.ts` | service | transform (pure) | `src/services/exportEntries.ts` | role-match |
| `src/services/captureService.test.ts` | test | — | `src/config/entryFields.test.ts` | exact (pure-function test style) |
| `src/hooks/useShortcutCapture.ts` | hook | event-driven | `src/hooks/useBackOrHome.ts` + `src/pages/QuickCapturePage.tsx` | role-match composite |
| `src/components/dashboard/HoleSheet.tsx` | component | event-driven | NO close analog | net-new (bottom sheet + numeric keypad) |
| `src/components/dashboard/HoleSheet.test.tsx` | test | — | `src/components/ui/FormField.test.tsx` | role-match |
| `src/components/dashboard/SavedToast.tsx` | component | event-driven | NO close analog | net-new (toast) |
| `src/components/dashboard/SavedToast.test.tsx` | test | — | `src/components/ui/FormField.test.tsx` | role-match |
| `src/pages/DashboardPage.tsx` (modified) | page | event-driven | itself (lines 60–68) | exact (seam already present) |
| `src/pages/DashboardPage.test.tsx` (extended) | test | — | itself (existing file) | exact |

---

## Pattern Assignments

### `src/services/captureService.ts` (service, pure-function transform)

**Primary analog:** `src/services/exportEntries.ts`
**Secondary refs:** `src/pages/ReviewPage.tsx` (entry-construction contract), `src/config/entryFields.ts` (POSITIONAL_SCHEMA + buildReviewDraft)

#### Imports pattern — copy from `src/services/exportEntries.ts` lines 1–3:
```typescript
import type { LifeLogEntry } from './db'
// captureService adds:
import type { EntryDomain, EntryType } from './db'
import type { ReviewDraft } from './extractMetadataFromUrl'
import { POSITIONAL_SCHEMA } from '../config/entryFields'
```

#### Pure-function module style — copy from `src/services/exportEntries.ts` lines 17–30:
```typescript
// No class, no default export. Named exports only.
// Every exported symbol is either a const (data) or a pure function.
// Side-effectful functions are segregated and clearly labelled (see triggerDownload).
// Usage: import { buildExportJson } from './exportEntries'
export function buildExportJson(entries: LifeLogEntry[], exportedAt: number): string {
  const envelope: ExportEnvelope = { version: 1, exportedAt, entries }
  return JSON.stringify(envelope, null, 2)
}
```
Apply: all functions in captureService.ts must be named exports, no class, no default export. Inject timestamps/IDs as parameters so functions stay deterministic and testable.

#### Entry-construction contract — extracted from `src/pages/ReviewPage.tsx` lines 108–123:
```typescript
// ReviewPage handleSave — THIS IS THE AUTHORITATIVE CONTRACT draftToEntry must mirror:
const entry = {
  domain: domain as EntryDomain,
  type: type as EntryType,
  title: title.trim() || 'Untitled',        // form state initialized from draft.title ?? ''
  recordedAt: Date.now(),
  tags: parsedTags,                          // tags.split(',').map(t => t.trim()).filter(Boolean)
  metadata: initialDraft.metadata ?? {},
  syncedAt: null as number | null,
  // Optional fields omitted when empty:
  ...(safeSourceUrl        ? { sourceUrl: safeSourceUrl }  : {}),
  ...(location_            ? { location: location_ }        : {}),
  ...(description          ? { description }                : {}),
  ...(!isNaN(parsedAmount) ? { amount: parsedAmount }       : {}),
  ...(!isNaN(parsedDate)   ? { occurredAt: parsedDate }     : {}),
}
await entriesRepository.create(entry)
```
**Key differences for `draftToEntry`:** `draft.tags` is already `string[]` (no re-split needed); `draft.amount` is already `number | undefined` (no parseFloat); `draft.occurredAt` is already epoch ms (no Date.parse); `sourceUrl` is omitted (shortcuts have no URL origin).

#### POSITIONAL_SCHEMA usage — from `src/config/entryFields.ts` lines 105–113:
```typescript
export const POSITIONAL_SCHEMA: Record<EntryType, string[]> = {
  show:    ['title', 'creator'],
  movie:   ['title', 'creator'],
  book:    ['title', 'creator'],
  podcast: ['title', 'creator'],
  place:   ['name', 'address'],
  event:   ['title', 'location'],
  expense: ['amount', 'category'],
}
// Usage in detectHoles:
const positionalHoles = POSITIONAL_SCHEMA[type].filter((k) => !cleanVals[k])
```

#### buildReviewDraft usage — from `src/pages/QuickCapturePage.tsx` lines 57–60:
```typescript
const draft = buildReviewDraft(ENTRY_FIELDS[parsed.type], parsed.values)
const domain = defaultDomainForType(parsed.type)
navigate(`/d/${domain}/${parsed.type}/review`, { state: { draft } })
```
Apply: captureService functions receive pre-built `draft` (callers already called `buildReviewDraft`); captureService does NOT call `buildReviewDraft` internally — that stays at the hook/orchestrator level.

---

### `src/services/captureService.test.ts` (test, pure-function units)

**Analog:** `src/config/entryFields.test.ts`

#### Test file structure — copy from `src/config/entryFields.test.ts` lines 1–5:
```typescript
import { describe, it, expect } from 'vitest'
import { ENTRY_FIELDS, buildReviewDraft } from './entryFields'
import type { EntryType } from '../services/db'
// No beforeEach db reset needed — no IndexedDB access in pure-function tests.
```

#### Factory function pattern — copy from `src/services/entriesRepository.test.tsx` lines 14–25:
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
Apply: create `makeReviewDraft(overrides?)` and `makeShortcut(overrides?)` factory helpers for captureService tests.

#### Pure-function assertion pattern — copy from `src/config/entryFields.test.ts` lines 59–68 style:
```typescript
describe('buildReviewDraft — expense mapping', () => {
  it('maps amount to draft.amount (core JS number) and currency to draft.metadata.currency', () => {
    const fields = ENTRY_FIELDS.expense
    // ...
    expect(draft.amount).toBe(12.5)
    expect(draft.metadata.currency).toBe('USD')
  })
})
```

---

### `src/hooks/useShortcutCapture.ts` (hook, event-driven)

**Analog A (hook shape):** `src/hooks/useBackOrHome.ts`
**Analog B (parseDSL + navigate pattern):** `src/pages/QuickCapturePage.tsx` lines 56–61

#### Hook file structure — copy from `src/hooks/useBackOrHome.ts`:
```typescript
import { useNavigate } from 'react-router-dom'

// Single named export, no default export.
// Hook name matches file name: useBackOrHome → useShortcutCapture.
export function useBackOrHome(fallback: string = '/') {
  const navigate = useNavigate()
  return () => { /* ... */ }
}
```
Apply: `useShortcutCapture` exports one named function; no default export. Returns an object of handlers + state values (unlike `useBackOrHome` which returns a single function, because this hook manages more state).

#### Navigate + parseDSL pattern — copy from `src/pages/QuickCapturePage.tsx` lines 1–9 + 56–61:
```typescript
import { useNavigate } from 'react-router-dom'
import { ENTRY_FIELDS, buildReviewDraft } from '../config/entryFields'
import { defaultDomainForType } from '../config/navigation'
import { parseDSL } from '../services/dsl/parser'

// Inside handleConfirm:
const handleConfirm = () => {
  if (parsed.status !== 'ok' || !parsed.type) return  // guard: bad parse = no-op
  const draft = buildReviewDraft(ENTRY_FIELDS[parsed.type], parsed.values)
  const domain = defaultDomainForType(parsed.type)
  navigate(`/d/${domain}/${parsed.type}/review`, { state: { draft } })
}
```
Apply: `useShortcutCapture.handleTap` MUST guard `parsed.status !== 'ok'` before branching. The `navigate` call with `{ state: { draft } }` is the exact shape ReviewPage expects at `location.state.draft`.

#### useState + useCallback + useRef + useEffect pattern — inferred from QuickCapturePage + DashboardPage:
```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
// useRef for the timer (avoids stale closure vs useState):
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
// useEffect for cleanup on unmount:
useEffect(() => {
  return () => { if (timerRef.current) clearTimeout(timerRef.current) }
}, [])
// useCallback for all handlers (stable references for JSX props):
const showToast = useCallback((entryId: string) => { /* ... */ }, [])
```

#### entriesRepository usage — copy from `src/services/entriesRepository.ts` lines 15–19:
```typescript
async create(entry: Omit<LifeLogEntry, 'id'>): Promise<LifeLogEntry>
// create() returns the full LifeLogEntry with its generated id:
const saved = await entriesRepository.create(entry)
showToast(saved.id)  // saved.id is the UUID to pass to delete() for undo
```

```typescript
async delete(id: string): Promise<void>
// delete() for undo:
await entriesRepository.delete(toast.entryId)
```

---

### `src/components/dashboard/HoleSheet.tsx` (component, event-driven) — NET-NEW CONSTRUCT

**No close analog exists.** The codebase has no bottom sheet, modal dialog, or numeric keypad. This is a net-new UI construct.

**Partial analog A — button styling:** `src/components/dashboard/ShortcutRow.tsx` lines 13–28
```tsx
<button
  type="button"
  onClick={onClick}
  className="flex w-full items-center gap-3.5 min-h-[64px] px-4 rounded-lg
             border border-[var(--color-border)] bg-[var(--color-background)]
             hover:bg-[var(--color-muted)] active:opacity-75 transition-colors text-left"
>
```
Apply: all interactive buttons in HoleSheet must use `type="button"`, `active:opacity-75 transition-colors`, and `var(--color-*)` CSS tokens. No hardcoded hex/rgb colors.

**Partial analog B — live DSL preview pattern:** `src/pages/QuickCapturePage.tsx` lines 137–168
```tsx
{text.trim() !== '' && (
  <div className="rounded-lg border border-[var(--color-border)] p-4 flex flex-col gap-3">
    <span className="font-mono text-sm text-[var(--color-primary)]">▸ {parsed.type}</span>
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm font-mono">
      {valueEntries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[var(--color-foreground)] opacity-60">{k}</dt>
          <dd className="break-words">{v}</dd>
        </div>
      ))}
    </dl>
  </div>
)}
```
Apply: HoleSheet's live DSL preview must use `font-mono` and `var(--color-primary)` for the preview text. The preview updates synchronously on every keypad press — no debouncing. Call `buildDSLPreview(type, mergedValues)` from captureService directly in render.

**Partial analog C — disabled button pattern:** `src/pages/QuickCapturePage.tsx` line 170:
```tsx
<Button variant="primary" onClick={handleConfirm} disabled={!canConfirm}>
  Review &amp; Save
</Button>
```
Apply: HoleSheet Save button must be `disabled` until all holes in `fills` have non-empty values. Use the existing `Button` component from `src/components/ui/Button`.

**Planner note on sheet positioning:** Use a fixed overlay `div` + bottom-anchored panel `div` (no dialog library). Use `role="dialog" aria-modal="true" aria-label="Fill in required fields"` on the panel. Use `useEffect` + `ref.focus()` to move focus into the sheet on open. CSS: `fixed inset-0 bg-black/40 z-40` for overlay; `fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-background)] rounded-t-2xl` for panel.

---

### `src/components/dashboard/HoleSheet.test.tsx` (test, component)

**Analog:** `src/components/ui/FormField.test.tsx`

#### Component test structure — copy from `src/components/ui/FormField.test.tsx` lines 1–5:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HoleSheet } from './HoleSheet'
// No MemoryRouter needed — HoleSheet has no routing; no db reset needed — no IndexedDB access.
```

#### userEvent pattern for button clicks — copy from `src/components/ui/FormField.test.tsx` lines 14–28:
```typescript
it('forwards input props (value, onChange, placeholder) to the inner Input', async () => {
  const user = userEvent.setup()
  const handleChange = vi.fn()
  render(<FormField id="title" label="Title" value="" onChange={handleChange} placeholder="..." />)
  await user.type(screen.getByLabelText('Title'), 'hello')
  expect(handleChange).toHaveBeenCalled()
})
```
Apply to HoleSheet:
```typescript
it('preview updates as user taps keypad', async () => {
  const user = userEvent.setup()
  render(<HoleSheet isOpen type="expense" domain="expenditures" ... />)
  await user.click(screen.getByRole('button', { name: '1' }))
  await user.click(screen.getByRole('button', { name: '2' }))
  expect(screen.getByText(/expense 12:food/)).toBeInTheDocument()
})
```

---

### `src/components/dashboard/SavedToast.tsx` (component, event-driven) — NET-NEW CONSTRUCT

**No close analog exists.** The codebase has no toast notification component.

**Partial analog — inline button + active state:** `src/pages/QuickCapturePage.tsx` lines 106–113:
```tsx
<button
  role="option"
  aria-selected={false}
  onClick={() => acceptType(t)}
  className="px-3 py-1 rounded-full text-sm border border-[var(--color-border)]
             bg-[var(--color-muted)] hover:bg-[var(--color-border)]"
>
```
Apply: the Undo button inside SavedToast uses the same `hover:opacity-80 active:opacity-60 transition-opacity` hover/active pattern (but inverted colors for toast context).

**Planner note on toast semantics:** Use `role="status" aria-live="polite"` on the container `div` for screen-reader announcement. Position with `fixed bottom-6 left-1/2 -translate-x-1/2 z-50`. Background: `bg-[var(--color-foreground)] text-[var(--color-background)]` (intentional inversion — dark-on-light / light-on-dark for contrast).

**Toast auto-dismiss pattern:** State lives in `DashboardPage` (the page that owns the taps), not in the component. `SavedToast` is a purely presentational component that receives `onUndo` as a prop.

---

### `src/components/dashboard/SavedToast.test.tsx` (test, component)

**Analog:** `src/components/ui/FormField.test.tsx` for component test structure.

For timer-dependent behavior (auto-dismiss), use `vi.useFakeTimers()`:
```typescript
// From RESEARCH.md test patterns — no codebase example yet, but vi.useFakeTimers is confirmed available:
import { vi } from 'vitest'
describe('toast auto-dismiss', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('auto-dismisses after 4 seconds', async () => {
    // render parent that manages toast state
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
```
**Note:** Timer tests involving React state updates need `act()` wrapping the `advanceTimersByTime` call. This is confirmed Vitest + RTL convention.

---

### `src/pages/DashboardPage.tsx` (modified, page, event-driven)

**Analog:** itself — the current file at `/home/bbux/git/life-log/src/pages/DashboardPage.tsx`

#### The exact seam to replace — `src/pages/DashboardPage.tsx` lines 60–68:
```typescript
// CURRENT (Phase 12 no-op, lines 64–66):
onClick={() => {
  // TODO Phase 13: capture seam — no-op for now
}}

// PHASE 13 REPLACEMENT:
onClick={() => handleTap(s)}
```

#### Imports to add (top of file):
```typescript
import { useShortcutCapture } from '../hooks/useShortcutCapture'
import { HoleSheet } from '../components/dashboard/HoleSheet'
import { SavedToast } from '../components/dashboard/SavedToast'
```

#### Hook call + JSX additions pattern — modeled after existing `useEffect` seeding pattern (lines 17–33):
```typescript
// Add after existing useEffect:
const {
  handleTap,
  toastEntryId,
  handleUndo,
  sheetState,
  handleSheetSave,
  handleSheetCancel,
} = useShortcutCapture()

// In JSX, before closing outer div (after NAVIGATION links):
{toastEntryId && <SavedToast onUndo={handleUndo} />}
{sheetState && (
  <HoleSheet
    isOpen
    type={sheetState.type}
    domain={sheetState.domain}
    baseValues={sheetState.baseValues}
    holeMap={sheetState.holeMap}
    onSave={handleSheetSave}
    onCancel={handleSheetCancel}
  />
)}
```

---

### `src/pages/DashboardPage.test.tsx` (extended, integration tests)

**Analog:** itself — the existing file at `/home/bbux/git/life-log/src/pages/DashboardPage.test.tsx`

#### Existing setup to preserve and extend — lines 1–18:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../services/db'
import { configRepository, activeLayoutRepository } from '../services/configRepository'
import type { ShortcutConfig } from '../config/shortcutConfig'
import { DashboardPage } from './DashboardPage'

describe('DashboardPage', () => {
  beforeEach(async () => {
    await db.delete()     // ← mandatory; reset Dexie before every test
    await db.open()
  })
  function renderDashboard() {
    return render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  }
```
**Warning:** When adding CAP-03 routing tests (confirm=true → navigate to /review), `MemoryRouter` alone does not render routes — wrap with `<Routes>` and add a `<Route path="/d/:domain/:type/review" element={<ReviewProbe />} />` probe component. Copy the pattern from `src/pages/ManualEntryPage.integration.test.tsx` lines 38–48.

#### MemoryRouter + Routes pattern for cross-page navigation — `src/pages/ManualEntryPage.integration.test.tsx` lines 38–48:
```typescript
function renderManualFlow(domain: string, type: string) {
  return render(
    <MemoryRouter initialEntries={[`/d/${domain}/${type}/manual`]}>
      <Routes>
        <Route path="/d/:domain/:type/manual" element={<ManualEntryPage />} />
        <Route path="/d/:domain/:type/review" element={<ReviewPage />} />
        <Route path="/d/:domain" element={<DomainProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}
```
Apply: add a `renderDashboardWithRoutes()` helper that includes a `ReviewProbe` route for `confirm=true` tests.

#### Adding import for fake-timer tests:
```typescript
// Add to existing imports in DashboardPage.test.tsx:
import { vi, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { entriesRepository } from '../services/entriesRepository'
```

---

## Shared Patterns

### CSS Token Convention
**Source:** `src/components/dashboard/ShortcutRow.tsx` lines 16–18, `src/pages/DashboardPage.tsx` lines 48, 75–80
**Apply to:** All new component files (HoleSheet, SavedToast)
```tsx
// ALWAYS use CSS custom properties, never hardcoded colors:
className="bg-[var(--color-background)] text-[var(--color-foreground)]"
className="border-[var(--color-border)] bg-[var(--color-muted)]"
className="text-[var(--color-primary)]"
// Hover/active states:
className="hover:bg-[var(--color-border)] active:opacity-75 transition-colors"
```

### Named exports, no default exports
**Source:** `src/services/exportEntries.ts` lines 27–30, `src/hooks/useBackOrHome.ts` line 12, `src/components/dashboard/ShortcutRow.tsx` line 9
**Apply to:** All new files
```typescript
// All files use named exports:
export function buildExportJson(...) { ... }
export function useBackOrHome(...) { ... }
export function ShortcutRow(...) { ... }
// Never: export default function ...
```

### type="button" on all non-submit buttons
**Source:** `src/components/dashboard/ShortcutRow.tsx` line 13
**Apply to:** HoleSheet keypad buttons, preset buttons, Save/Cancel buttons; SavedToast Undo button
```tsx
<button type="button" onClick={...}>
```

### Pure-function service: inject side effects as parameters
**Source:** `src/services/exportEntries.ts` lines 16–30 (comment + `exportedAt` parameter)
**Apply to:** `captureService.ts` — `draftToEntry` must not call `Date.now()` internally; caller passes the timestamp OR the function calls it internally as a one-liner (mirror ReviewPage's `recordedAt: Date.now()`). The key rule: never mock-unfriendly global calls buried in pure functions.
```typescript
// exportEntries precedent:
// exportedAt is injected by the caller so this function remains deterministic
// and testable without mocking Date. The caller is responsible for providing
// the current timestamp.
export function buildExportJson(entries: LifeLogEntry[], exportedAt: number): string {
```
**Note:** `draftToEntry` calls `Date.now()` inline (mirrors ReviewPage exactly) — this is acceptable because tests mock at the `entriesRepository.create` boundary, not at the function level.

### Error guard: silent no-op on bad input
**Source:** `src/pages/QuickCapturePage.tsx` line 57:
```typescript
const handleConfirm = () => {
  if (parsed.status !== 'ok' || !parsed.type) return  // ← silent return, no throw, no console.error
```
**Apply to:** `useShortcutCapture.handleTap` — bad DSL template = silent return. Do not show an error to the user for a malformed template (shortcut config validation is a separate concern).

### Async error isolation pattern
**Source:** `src/pages/DashboardPage.tsx` lines 21–33:
```typescript
useEffect(() => {
  let cancelled = false
  ;(async () => {
    try {
      const existing = await configRepository.get()
      if (existing === undefined && !cancelled) { ... }
    } catch (err) {
      console.error('[DashboardPage] Failed to seed default config:', err)
    }
  })()
  return () => { cancelled = true }
}, [])
```
**Apply to:** `useShortcutCapture.handleTap` — wrap `entriesRepository.create` in try/catch; log errors with `[useShortcutCapture]` prefix. Do not propagate uncaught promise rejections.

### DB reset in beforeEach
**Source:** `src/pages/DashboardPage.test.tsx` lines 11–14, `src/services/entriesRepository.test.tsx` lines 7–10
**Apply to:** Any test file that calls `entriesRepository.create/delete` (DashboardPage.test.tsx extensions)
```typescript
beforeEach(async () => {
  await db.delete()
  await db.open()
})
```

---

## No Analog Found

Files with no close match in the codebase — planner must use RESEARCH.md patterns as the primary reference:

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/components/dashboard/HoleSheet.tsx` | component | event-driven | No bottom sheet, modal dialog, or numeric keypad exists in the codebase. The overlay+panel pattern, `role="dialog" aria-modal`, and 3×4 keypad grid are fully novel constructs. |
| `src/components/dashboard/SavedToast.tsx` | component | event-driven | No toast notification exists in the codebase. The `role="status" aria-live="polite"` + fixed-position pattern is fully novel. No toast library is installed. |

For both: use the RESEARCH.md `## Code Examples` section (HoleSheet lines 356–478, SavedToast lines 524–555) as the authoritative specification. The only codebase conventions to carry over are `var(--color-*)` tokens, `type="button"`, `active:opacity-75`, named exports, and the `cn()` import from `src/components/ui/cn`.

---

## Metadata

**Analog search scope:** `src/services/`, `src/hooks/`, `src/components/dashboard/`, `src/components/ui/`, `src/pages/`, `src/config/`
**Files read:** 15 source files + 4 test files
**Pattern extraction date:** 2026-06-17

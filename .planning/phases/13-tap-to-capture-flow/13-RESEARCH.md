# Phase 13: Tap-to-Capture Flow - Research

**Researched:** 2026-06-17
**Domain:** React/PWA shortcut capture orchestration, DSL hole detection, headless entry finalization, mobile bottom sheet UI, undo toast
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (implementation decisions — all Claude's discretion)
- Parse the shortcut's `dslTemplate` with `parseDSL` on every tap
- Holes = empty positional slots + named-hole placeholders (CAP-04 token TBD in research)
- `confirm: true` → always ReviewPage regardless of holes
- `confirm: false` + zero holes → direct save + "Saved · Undo" toast
- `confirm: false` + holes → fill-the-hole sheet → direct save + toast
- No new capture logic beyond what the v0.2.0 pipeline already provides
- Undo calls `entriesRepository.delete(id)`; the `create` return provides the id

### Claude's Discretion
- All implementation choices are at Claude's discretion guided by the ROADMAP, design note, sketch-001 Variant B, and codebase conventions.
- CAP-04 placeholder token: pick one convention (design suggests `?` or `{}`)
- Multi-hole ordering: template slot order (then named holes)
- Toast dismissal timing
- File structure / component names

### Deferred Ideas (OUT OF SCOPE)
- Import / export config — Phase 14
- Authoring tool — Phase 15
- Fully polished amount sheet (per-type field validation beyond amount, keyboard/keypad parity) — future refinement
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAP-01 | Tapping a shortcut with no holes captures directly via parseDSL → buildReviewDraft, no prompt | Confirmed: parseDSL → cleanValues → buildReviewDraft → draftToEntry → create; schema comparison detects zero holes |
| CAP-02 | Tapping a shortcut with holes opens fill-the-hole sheet (keypad, presets, live DSL preview); multi-hole follows template slot order | Confirmed: bottom sheet component with buildDSLPreview; hole order = POSITIONAL_SCHEMA order then named |
| CAP-03 | `confirm: false` → direct save to IndexedDB + "Saved · Undo" toast backed by entriesRepository.delete; `confirm: true` → ReviewPage | Confirmed: draftToEntry extracts the finalization contract; toast state in DashboardPage |
| CAP-04 | A defined placeholder convention marks a named-param hole so the micro-prompt knows to ask for it | Research recommends `{}` token, post-parse detection via value comparison |
</phase_requirements>

---

## Summary

Phase 13 wires the Phase-12 `onClick` no-op on `ShortcutRow` into the real capture pipeline using the v0.2.0 `parseDSL` → `buildReviewDraft` machinery that already exists. The new work is: (1) a **capture orchestrator** that decides which of three paths to take per tap, (2) a **hole-detection algorithm** that inspects parsed `values` against `POSITIONAL_SCHEMA`, (3) a **`draftToEntry` helper** that finalizes a `ReviewDraft` into a `Omit<LifeLogEntry, 'id'>` for the headless direct-save path without duplicating ReviewPage's logic, (4) a **fill-the-hole bottom sheet** component (keypad + presets + live DSL preview), (5) a **`{}` named-hole placeholder token** with post-parse detection, and (6) a **"Saved · Undo" toast** backed by `entriesRepository.delete`.

No new runtime dependencies are needed. The codebase already provides: `parseDSL`, `POSITIONAL_SCHEMA`, `ENTRY_FIELDS`, `buildReviewDraft`, `ReviewPage`, `defaultDomainForType`, `entriesRepository.create/delete`, `db`, fake-indexeddb, Vitest + RTL + userEvent. Tailwind v4 CSS tokens (`var(--color-*)`) and `cn()` drive styling.

**Primary recommendation:** Extract `draftToEntry` and `detectHoles` into `src/services/captureService.ts`; put the capture orchestration as a custom hook `useShortcutCapture` consumed by `DashboardPage`; build `HoleSheet` and `SavedToast` as dashboard-scoped components.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Capture decision routing | Frontend (DashboardPage + hook) | — | All logic is local; no backend; decisions made at tap time from in-memory parsed result |
| Hole detection | Service layer (captureService.ts) | — | Pure function over POSITIONAL_SCHEMA + values — belongs in services, not UI |
| Entry finalization (draftToEntry) | Service layer (captureService.ts) | — | Shared logic between direct-save and future ReviewPage refactor |
| Direct IndexedDB write | Repository layer (entriesRepository) | — | Already exists; direct-save calls the same `.create()` ReviewPage uses |
| ReviewPage routing (confirm=true) | Frontend router | — | Reuses exact navigate pattern from QuickCapturePage |
| Fill-the-hole sheet UI | Frontend component (HoleSheet) | — | Mobile interaction concern; stateful but self-contained |
| Live DSL preview computation | Service layer (captureService.ts) | HoleSheet | buildDSLPreview is a pure function; called from HoleSheet render |
| Undo (delete entry) | Repository layer (entriesRepository) | DashboardPage toast state | entriesRepository.delete already exists |
| Toast lifetime management | Frontend (DashboardPage state) | — | Scoped to the page that owns the shortcut taps; no cross-page toast needed |

---

## Standard Stack

No new runtime packages required. Everything uses existing dependencies. [VERIFIED: reading package.json]

### Core (already installed)
| Library | Version | Purpose | Role in Phase 13 |
|---------|---------|---------|------------------|
| `parseDSL` | internal | DSL parse | Entry point for every shortcut tap |
| `buildReviewDraft` | internal | Values → ReviewDraft | Shared with ReviewPage; used in both direct-save and ReviewPage paths |
| `entriesRepository` | internal | IndexedDB CRUD | `.create()` for save, `.delete()` for undo |
| `defaultDomainForType` | internal | Type → domain routing | Same helper QuickCapturePage uses |
| `@testing-library/react` | ^16.3.2 | Component tests | RTL + userEvent for all new component tests |
| `vitest` | ^4.1.9 | Test runner | Includes `vi.useFakeTimers()` for toast tests |
| `fake-indexeddb` | ^6.2.5 | In-memory IDB | Already auto-imported in test-setup.ts; integration tests reset db in beforeEach |

### No Alternatives Needed
No new runtime dependencies are required for Phase 13. The toast is hand-rolled state (no toast library). The bottom sheet is a positioned `div` (no dialog library). The keypad is a grid of `<button>` elements.

---

## Package Legitimacy Audit

No new packages to install in this phase. All required functionality exists in the current dependency tree. This section is not applicable.

---

## Architecture Patterns

### Capture Decision Flow

```
DashboardPage
  ShortcutRow.onClick
    → useShortcutCapture(shortcut)
        │
        ├─ parseDSL(shortcut.dslTemplate)
        │     status !== 'ok' → silently return (bad template; do nothing)
        │
        ├─ detectHoles(type, values)
        │     positionalHoles = POSITIONAL_SCHEMA[type].filter(k => !cleanValues[k])
        │     namedHoles      = entries(values).filter(v === '{}').map(k)
        │
        ├─ shortcut.confirm === true
        │     → buildReviewDraft(ENTRY_FIELDS[type], cleanValues)
        │     → navigate('/d/{domain}/{type}/review', { state: { draft } })
        │
        ├─ confirm === false AND holes.length === 0
        │     → buildReviewDraft(ENTRY_FIELDS[type], values)
        │     → draftToEntry(draft, type, domain)
        │     → entriesRepository.create(entry) → { id, ... }
        │     → showToast(entry.id)
        │
        └─ confirm === false AND holes.length > 0
              → setSheetState({ type, domain, baseValues: cleanValues, holes })
              HoleSheet (open)
                user fills values (amount keypad / text input)
                live preview: buildDSLPreview(type, mergedValues)
                  [Save tapped]
                  → buildReviewDraft(ENTRY_FIELDS[type], mergedValues)
                  → draftToEntry(draft, type, domain)
                  → entriesRepository.create(entry) → { id }
                  → closeSheet + showToast(entry.id)

Toast visible
  [4 s pass]  → setToast(null)
  [Undo tap]  → clearTimeout + entriesRepository.delete(toast.entryId) + setToast(null)
```

### Recommended Project Structure

New files in bold:

```
src/
├── services/
│   └── captureService.ts        # NEW: draftToEntry, detectHoles, buildDSLPreview, HOLE_TOKEN
├── hooks/
│   └── useShortcutCapture.ts    # NEW: orchestrator hook (or inline in DashboardPage)
├── components/
│   └── dashboard/
│       ├── ShortcutRow.tsx      # UNCHANGED (onClick prop already exists)
│       ├── LayoutChips.tsx      # UNCHANGED
│       ├── HoleSheet.tsx        # NEW: fill-the-hole bottom sheet
│       └── SavedToast.tsx       # NEW: "Saved · Undo" toast
└── pages/
    └── DashboardPage.tsx        # MODIFIED: wire capture + toast + sheet state
```

---

## Key Technical Findings

### 1. Headless Direct-Save: `draftToEntry` Helper [VERIFIED: reading ReviewPage.tsx]

ReviewPage's `handleSave` constructs a `Omit<LifeLogEntry, 'id'>` from local form state (initialized from `location.state.draft`). The user may have edited those fields. For direct-save we bypass the form entirely — the draft IS the final data.

**The exact entry-construction contract** (from ReviewPage lines 109–123, adapted for headless use):

```typescript
// src/services/captureService.ts
import type { ReviewDraft } from './extractMetadataFromUrl'
import type { EntryDomain, EntryType, LifeLogEntry } from './db'

export function draftToEntry(
  draft: ReviewDraft,
  type: EntryType,
  domain: EntryDomain,
): Omit<LifeLogEntry, 'id'> {
  return {
    domain,
    type,
    title:      draft.title?.trim() || 'Untitled',   // mirrors: title.trim() || 'Untitled'
    recordedAt: Date.now(),                           // mirrors: Date.now()
    tags:       draft.tags ?? [],                     // mirrors: parsedTags (already string[])
    metadata:   draft.metadata ?? {},                 // mirrors: initialDraft.metadata ?? {}
    syncedAt:   null,                                 // mirrors: null as number | null
    ...(draft.location                        ? { location:    draft.location }    : {}),
    ...(draft.description                     ? { description: draft.description } : {}),
    ...(draft.amount   != null && !Number.isNaN(draft.amount)
                                              ? { amount:      draft.amount }      : {}),
    ...(draft.occurredAt != null && !Number.isNaN(draft.occurredAt)
                                              ? { occurredAt:  draft.occurredAt }  : {}),
    // sourceUrl: not applicable for shortcut captures (no URL origin)
  }
}
```

**Field-by-field derivation from ReviewPage:**

| LifeLogEntry field | ReviewPage source | draftToEntry source | Notes |
|--------------------|-------------------|---------------------|-------|
| `domain` | route param | argument | Same |
| `type` | route param | argument | Same |
| `title` | `title.trim() \|\| 'Untitled'` (form state ← `draft.title ?? ''`) | `draft.title?.trim() \|\| 'Untitled'` | Identical semantics |
| `recordedAt` | `Date.now()` | `Date.now()` | Always capture-time |
| `tags` | `tags.split(',').map(trim).filter(Boolean)` (form state ← `draft.tags?.join(', ')`) | `draft.tags ?? []` | draft.tags is already `string[]` from buildReviewDraft |
| `metadata` | `initialDraft.metadata ?? {}` | `draft.metadata ?? {}` | Direct — metadata never re-parsed |
| `syncedAt` | `null` | `null` | Always null on create |
| `location?` | `location_` if truthy (form state ← `draft.location`) | `draft.location` if truthy | Same |
| `description?` | `description` if truthy (form state ← `draft.description`) | `draft.description` if truthy | Same |
| `amount?` | `parseFloat(amount)` if not NaN (form state ← `String(draft.amount)`) | `draft.amount` if not null/NaN | draft.amount is already `number` from buildReviewDraft |
| `occurredAt?` | `Date.parse(occurredAt+'T00:00:00')` if not NaN | `draft.occurredAt` if not null/NaN | draft.occurredAt is already epoch ms from buildReviewDraft |
| `sourceUrl?` | isSafeUrl check on form state | omitted | Shortcuts have no URL origin |

**Why extract rather than duplicate:** Keeping `draftToEntry` as a standalone pure function ensures direct-save and ReviewPage always produce the same shape. ReviewPage can optionally be refactored later to call `draftToEntry(collectFormDraft(), type, domain)` — but that refactor is out of Phase 13 scope. For now, `draftToEntry` serves the direct-save path alone.

---

### 2. Hole Detection Algorithm [VERIFIED: reading parser.ts + parser.test.ts]

#### Tracing `parseDSL('expense :food')`

The warning condition in parser.ts line 204: `if (part.trim() === '' && parts.length > 1)`. For `expense :food`:

1. `raw = 'expense :food'`
2. `qIdx = -1` → `leftRegion = 'expense :food'`, `paramRegion = null`
3. Leading word: candidate = `'expense'` → TYPE_NAMES includes it → `type = 'expense'`, `posRegion = ':food'`
4. `schema = ['amount', 'category']`
5. `posRegion.trim() = ':food' !== ''` → enter loop
6. `parts = splitTopLevel(':food', ':') = ['', 'food']`  — `parts.length = 2`
7. i=0: `part = ''`, `val = unquote('') = ''`
   - `val === ''`; `part.trim() === '' && parts.length (2) > 1` → **`warnings.push('empty "amount" slot')`**
   - return (no value assigned)
8. i=1: `part = 'food'`, `val = 'food'` → `values['category'] = 'food'`
9. Result: `{ status: 'ok', type: 'expense', values: { category: 'food' }, issues: [], warnings: ['empty "amount" slot'] }`

**Confirmed**: the warning IS emitted for a single leading empty slot when `parts.length > 1` (i.e., the colon is present). This matches test case `empty-positional-slot`.

**Single-slot edge case**: If `posRegion = ''` (e.g., template = `'expense'`), the positionals loop is skipped entirely, `values` has no keys, and NO warning is emitted — but the amount slot is still missing from `values`. The `{}` named-hole path also produces no warning. The warning-string approach would miss this case; the schema-comparison approach handles it correctly.

#### Recommended Hole-Detection Algorithm

Do NOT rely on warning strings. Use POSITIONAL_SCHEMA vs values comparison — robust for all cases:

```typescript
// src/services/captureService.ts
import { POSITIONAL_SCHEMA } from '../config/entryFields'
import type { EntryType } from './db'

export const HOLE_TOKEN = '{}'

export interface HoleMap {
  positional: string[]  // field keys from POSITIONAL_SCHEMA missing in cleanValues
  named:      string[]  // field keys whose parsed value was '{}'
  hasHoles:   boolean
}

/**
 * Detects holes in a parsed template.
 *
 * Call AFTER stripping HOLE_TOKEN entries from values (see cleanValues()).
 * positionalHoles = POSITIONAL_SCHEMA[type] keys absent from cleanValues.
 * namedHoles = keys where parsedValues[k] === HOLE_TOKEN before cleaning.
 */
export function detectHoles(
  type: EntryType,
  rawValues: Record<string, string>,   // values direct from parseDSL (may contain '{}')
): HoleMap {
  const namedHoles = Object.entries(rawValues)
    .filter(([, v]) => v === HOLE_TOKEN)
    .map(([k]) => k)

  const cleanVals = cleanValues(rawValues)
  const positionalHoles = POSITIONAL_SCHEMA[type].filter((k) => !cleanVals[k])

  return {
    positional: positionalHoles,
    named: namedHoles,
    hasHoles: positionalHoles.length + namedHoles.length > 0,
  }
}

/** Remove '{}' entries — they are holes, not real values. */
export function cleanValues(
  values: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== HOLE_TOKEN),
  )
}
```

**Hole ordering for multi-hole sheet** (template slot order, then named): iterate `POSITIONAL_SCHEMA[type]` first (filtering to only the positional holes found), then append `namedHoles` in the order they were discovered. This is deterministic and authoring-friendly.

---

### 3. CAP-04 Named-Hole Placeholder Token [VERIFIED: tracing parser.ts]

#### Token: `{}`

**Recommended convention: use `{}` as the placeholder value in a named param.**

Example template authoring: `expense :food?merchant={}`

**Trace through `parseDSL('expense :food?merchant={}')`:**

1. `qIdx` = position of first `?` = 13
2. `leftRegion = 'expense :food'`, `paramRegion = 'merchant={}'`
3. type = 'expense', posRegion = ':food' → positional processing as above (category='food', warns 'empty "amount" slot')
4. Named params: `splitTopLevel('merchant={}', ',') = ['merchant={}']`
5. seg = `'merchant={}'`; `eq = 8` (the `=`)
6. key = `'merchant'`; `val = unquote('{}')` → s = `'{}'`, s[0] = `'{'` ≠ `'"'` → returns `'{}'`
7. canonical = NAMED_ALIASES['merchant'] ?? 'merchant' = 'merchant'
8. `fieldKeys('expense')` includes 'merchant' → `values['merchant'] = '{}'`
9. Result: `{ status: 'ok', values: { category: 'food', merchant: '{}' }, warnings: ['empty "amount" slot'] }`

**Does NOT error.** `{}` is treated as a plain string value. Post-parse detection reads it out.

**Why `{}` over `?`:**
- `?` is already a DSL delimiter (marks start of named-param region). A value like `merchant=?` parses fine since it is after the first `?`, but it is visually confusing to authors — a second `?` in `expense :food?merchant=?` looks wrong.
- `{}` is not a natural expense value or title. It is visually clear as "empty slot". It does not collide with any DSL delimiter.
- `{}` already appears in the design note as the suggested option.

**Stripping algorithm (post-parse):**

```typescript
// After parseDSL, before building draft or showing sheet:
const namedHoles = Object.entries(parsed.values)
  .filter(([, v]) => v === HOLE_TOKEN)
  .map(([k]) => k)

const cleanVals = cleanValues(parsed.values)
// cleanVals does NOT contain 'merchant' → '{}'  is gone
// positional holes still visible via POSITIONAL_SCHEMA comparison
```

**Template authoring examples:**

| Template | Positional holes | Named holes | Result |
|----------|-----------------|-------------|--------|
| `expense 5:coffee` | none | none | Direct save immediately |
| `expense :food` | amount | none | Sheet asks for amount |
| `expense :food?merchant={}` | amount | merchant | Sheet asks for amount, then merchant |
| `expense 12:food?merchant={}` | none | merchant | Sheet asks for merchant only |
| `movie :` | title, creator | none | Sheet or ReviewPage depending on confirm |
| `expense :food?tags="work"` | amount | none | Sheet asks for amount; tags pre-filled |

**Phase 15 authoring implication**: when a user adds a `{}` to a named param in the template editor, it will be treated as a hole at capture time. The editor can surface this as a UI affordance (a "make this a hole" toggle that inserts `={}`). For Phase 13 (no editor yet), `{}` is only in the seeded default config templates or hand-crafted by the user in Phase 14/15.

---

### 4. Fill-the-Hole Sheet — Component Structure [VERIFIED: reading sketch README + design note]

#### Component: `HoleSheet`

```typescript
// src/components/dashboard/HoleSheet.tsx

interface HoleSheetProps {
  isOpen: boolean
  type: EntryType
  domain: EntryDomain
  baseValues: Record<string, string>   // clean template values (no holes)
  holeMap: HoleMap                     // from detectHoles
  onSave: (filledValues: Record<string, string>) => void
  onCancel: () => void
}
```

**Internal state:** `fills: Record<string, string>` (key = hole field key, value = current input)

**Primary amount hole affordances** (Variant B design):
- Big right-aligned amount display (e.g., `$12.50` or just `12.50` for draft)
- Quick-amount presets: `$5 / $10 / $20 / $50` — buttons that set the amount fill
- Numeric keypad: digits 0–9, decimal point, backspace
- Live DSL preview line (monospace): `expense 12.50:food`
- Save button — disabled until all holes have non-empty, valid values

**Keypad grid layout (Tailwind v4):**

```tsx
{/* 3 columns × 4 rows: 1-9, decimal, 0, backspace */}
<div className="grid grid-cols-3 gap-2">
  {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map((k) => (
    <button
      key={k}
      type="button"
      aria-label={k === '⌫' ? 'Backspace' : k}
      onClick={() => handleKeypad(k)}
      className="h-14 rounded-lg text-xl font-medium
                 bg-[var(--color-muted)] hover:bg-[var(--color-border)]
                 active:opacity-75 transition-colors"
    >
      {k}
    </button>
  ))}
</div>
```

**Live DSL preview:** calls `buildDSLPreview(type, mergedValues)` on every keystroke. `mergedValues = { ...baseValues, ...fills }`. The preview updates synchronously — no debouncing needed (pure computation).

#### `buildDSLPreview` function

```typescript
// src/services/captureService.ts
import { POSITIONAL_SCHEMA } from '../config/entryFields'
import type { EntryType } from './db'

/**
 * Reconstructs a human-readable DSL line from type + merged values.
 * Used for the live preview in HoleSheet. Values passed here must be
 * clean (no HOLE_TOKEN) — positional holes become empty string slots.
 */
export function buildDSLPreview(
  type: EntryType,
  mergedValues: Record<string, string>,
): string {
  const schema = POSITIONAL_SCHEMA[type]
  const positionals = schema.map((k) => mergedValues[k] ?? '').join(':')

  const namedEntries = Object.entries(mergedValues)
    .filter(([k, v]) => !schema.includes(k) && v)
    .map(([k, v]) => {
      const needsQuote = /[ :,?]/.test(v)
      return `${k}=${needsQuote ? `"${v}"` : v}`
    })

  const namedStr = namedEntries.length ? `?${namedEntries.join(',')}` : ''
  return `${type} ${positionals}${namedStr}`
}
```

**The same function drives both preview and the save path.** On save, `onSave(fills)` is called; the orchestrator merges fills with baseValues, calls `buildReviewDraft`, then `draftToEntry`, then `entriesRepository.create`. No separate reconstruction needed — the draft already carries the finalized data.

#### Multi-hole ordering

```typescript
// Ordered holes list: positional first (in POSITIONAL_SCHEMA order), then named
const orderedHoles: Array<{ key: string; isAmount: boolean }> = [
  ...holeMap.positional.map((k) => ({
    key: k,
    isAmount: k === 'amount',
  })),
  ...holeMap.named.map((k) => ({
    key: k,
    isAmount: false,
  })),
]
```

For the MVP: show all holes in the same sheet at once (amount gets the keypad UI; other holes get a plain `<input type="text">`). Sequential prompting (one at a time) is a future refinement.

#### Bottom-sheet positioning

No dialog library needed. Use a fixed overlay + bottom-anchored panel:

```tsx
{/* Overlay */}
<div
  className="fixed inset-0 bg-black/40 z-40"
  onClick={onCancel}
  aria-hidden="true"
/>
{/* Sheet panel */}
<div
  role="dialog"
  aria-modal="true"
  aria-label="Fill in required fields"
  className="fixed bottom-0 left-0 right-0 z-50
             bg-[var(--color-background)] rounded-t-2xl
             px-6 pt-6 pb-safe max-h-[85vh] overflow-y-auto"
>
```

`role="dialog"` + `aria-modal="true"` satisfies WCAG 2.1 SC 4.1.2 for the keypad dialog. Focus should move to the sheet on open (use `useEffect` + `ref.focus()`).

---

### 5. "Saved · Undo" Toast [VERIFIED: reading package.json — no toast library present]

#### Pattern: DashboardPage-level state

No new dependency. State lives in `DashboardPage` since only shortcut taps on that page produce toasts.

```typescript
// Inside DashboardPage

interface ToastState {
  entryId: string
  timerId: ReturnType<typeof setTimeout>
}

const [toast, setToast] = useState<ToastState | null>(null)

const showToast = useCallback((entryId: string) => {
  setToast((prev) => {
    if (prev) clearTimeout(prev.timerId)
    const timerId = setTimeout(() => setToast(null), 4000)
    return { entryId, timerId }
  })
}, [])

const handleUndo = useCallback(async () => {
  setToast((prev) => {
    if (prev) clearTimeout(prev.timerId)
    return null
  })
  if (toast) {
    await entriesRepository.delete(toast.entryId)
  }
}, [toast])

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (toast) clearTimeout(toast.timerId)
  }
}, [toast])
```

**`SavedToast` component** (rendered in DashboardPage when toast !== null):

```tsx
// src/components/dashboard/SavedToast.tsx
interface SavedToastProps {
  onUndo: () => void
}

export function SavedToast({ onUndo }: SavedToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                 flex items-center gap-3 px-4 py-3 rounded-xl
                 bg-[var(--color-foreground)] text-[var(--color-background)]
                 shadow-lg text-sm font-medium"
    >
      <span>Saved</span>
      <button
        type="button"
        onClick={onUndo}
        className="underline underline-offset-2 font-semibold
                   hover:opacity-80 active:opacity-60 transition-opacity"
      >
        Undo
      </button>
    </div>
  )
}
```

`role="status"` + `aria-live="polite"` — screen reader announces save without interrupting. The toast uses `--color-foreground` as background (dark on light, light on dark) for contrast.

**Auto-dismiss timing:** 4 seconds. Sufficient for reading "Saved · Undo" and tapping Undo; short enough to not clutter. Closing HoleSheet should not auto-dismiss an existing toast (a rapid sequence of saves should each get their own toast with fresh timer).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Entry finalization logic | Custom field-mapping code in DashboardPage | `draftToEntry` (extracted from ReviewPage) | ReviewPage already has the correct contract; divergence = bugs |
| Hole detection | Warning-string parsing | `POSITIONAL_SCHEMA[type].filter(k => !cleanValues[k])` | Warning string condition is `parts.length > 1` — fragile for edge cases; schema comparison is always correct |
| DSL value → draft mapping | Manual field extraction | `buildReviewDraft(ENTRY_FIELDS[type], values)` | Already handles type coercion, NaN skipping, date parsing, tags splitting |
| Domain resolution for routing | Custom type→domain map | `defaultDomainForType(parsed.type)` from `navigation.ts` | Already handles the `expense` multi-domain ambiguity (defaults to 'expenditures') |
| Toast library | Importing `react-hot-toast` or similar | In-memory `useState` + `setTimeout` | Zero new deps; toast is a single fixed-position div; no animation required for MVP |

**Key insight:** The v0.2.0 pipeline (parseDSL → buildReviewDraft → entriesRepository.create) already handles 95% of the work. Phase 13 adds a routing layer in front, a small helper behind, and two UI components. Do not reinvent the parse/map/persist chain.

---

## DashboardPage Modification: The onClick Seam

The seam is already in place (DashboardPage.tsx line 65):

```typescript
// CURRENT (Phase 12 no-op):
onClick={() => {
  // TODO Phase 13: capture seam — no-op for now
}}

// PHASE 13 REPLACEMENT:
onClick={() => handleShortcutTap(s)}
```

Where `handleShortcutTap` is either:
- A function from `useShortcutCapture` hook
- Defined inline in `DashboardPage` if the orchestrator is small enough

`ShortcutRow.tsx` requires NO changes — it already accepts `onClick: () => void`.

---

## Common Pitfalls

### Pitfall 1: Passing '{}' as a real value to buildReviewDraft
**What goes wrong:** If `cleanValues` is not called before `buildReviewDraft`, the draft gets `merchant: '{}'` as a real metadata value and it persists to IndexedDB as the string `'{}'`.
**Why it happens:** parseDSL returns `values.merchant = '{}'` for a named-hole template; it is not a parse error.
**How to avoid:** Always call `cleanValues(parsed.values)` before passing to `buildReviewDraft`. The `detectHoles` function should be called first (it reads the raw values), then clean.
**Warning signs:** Saved entry has `metadata.merchant = '{}'`.

### Pitfall 2: Using warning strings for hole detection
**What goes wrong:** `warnings.includes('empty "amount" slot')` misses the case where `posRegion = ''` (e.g., bare `expense` with no positional region at all) — no warning is emitted but the hole exists.
**Why it happens:** The warning is only emitted when `parts.length > 1` (line 204 of parser.ts). A template with no positional content at all (just the type word) produces no warnings but has all slots empty.
**How to avoid:** Use the `POSITIONAL_SCHEMA[type].filter(k => !cleanValues[k])` algorithm exclusively. Ignore warnings in hole detection.
**Warning signs:** A shortcut with template `'expense'` triggers direct save with no amount.

### Pitfall 3: draftToEntry diverging from ReviewPage
**What goes wrong:** ReviewPage is updated (e.g., new field added) but `draftToEntry` is not, so direct-save entries are missing the field.
**Why it happens:** Logic is duplicated rather than shared.
**How to avoid:** Treat `draftToEntry` as the single source of truth for entry finalization. Add a comment cross-referencing ReviewPage in both files. In a future refactor, ReviewPage calls `draftToEntry` as well.
**Warning signs:** Integration tests comparing directly-saved entries vs ReviewPage-saved entries for the same template find different fields.

### Pitfall 4: Toast timer leaked on unmount
**What goes wrong:** `setTimeout` fires after DashboardPage unmounts (e.g., user navigated away before 4s), calling `setToast(null)` on an unmounted component — React warning.
**Why it happens:** `useEffect` cleanup not wired up.
**How to avoid:** The `useEffect` cleanup in DashboardPage (shown above) clears the timer on unmount.
**Warning signs:** `Warning: Can't perform a React state update on an unmounted component` in console.

### Pitfall 5: confirm=true path still tries hole detection before navigating
**What goes wrong:** Opening the HoleSheet before navigating to ReviewPage for `confirm: true` shortcuts.
**Why it happens:** Decision tree logic error — checking holes before checking the `confirm` flag.
**How to avoid:** Check `shortcut.confirm` FIRST. If true, navigate immediately (ReviewPage is the hole-filler). Hole detection only matters for the `confirm: false` branch.
**Warning signs:** A `confirm: true` shortcut with a hole (e.g., `movie :`) opens the sheet instead of ReviewPage.

### Pitfall 6: buildDSLPreview and save path diverge
**What goes wrong:** The preview shows `expense 12.50:food` but what gets saved has `category: 'food'` and `amount: 12.5` — these are consistent. But if the preview uses a different mergedValues object than the save path, a displayed preview could differ from the saved entry.
**Why it happens:** Two separate "merge fills" computations.
**How to avoid:** `buildDSLPreview(type, mergedValues)` and `buildReviewDraft(fields, mergedValues)` BOTH receive the SAME `mergedValues = { ...baseValues, ...fills }`. Compute `mergedValues` once, use twice.

---

## Code Examples

### Capture orchestrator (core logic)

```typescript
// src/hooks/useShortcutCapture.ts
// Source: derived from QuickCapturePage.handleConfirm + entriesRepository patterns

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseDSL } from '../services/dsl/parser'
import { ENTRY_FIELDS } from '../config/entryFields'
import { buildReviewDraft } from '../config/entryFields'
import { defaultDomainForType } from '../config/navigation'
import { entriesRepository } from '../services/entriesRepository'
import {
  detectHoles,
  cleanValues,
  draftToEntry,
  type HoleMap,
} from '../services/captureService'
import type { Shortcut } from '../config/shortcutConfig'
import type { EntryType } from '../services/db'

interface SheetState {
  type: EntryType
  domain: string
  baseValues: Record<string, string>
  holeMap: HoleMap
}

export function useShortcutCapture() {
  const navigate = useNavigate()
  const [toastEntryId, setToastEntryId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sheetState, setSheetState] = useState<SheetState | null>(null)

  const showToast = useCallback((entryId: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToastEntryId(entryId)
    timerRef.current = setTimeout(() => setToastEntryId(null), 4000)
  }, [])

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const handleUndo = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const id = toastEntryId
    setToastEntryId(null)
    if (id) await entriesRepository.delete(id)
  }, [toastEntryId])

  const handleTap = useCallback(async (shortcut: Shortcut) => {
    const parsed = parseDSL(shortcut.dslTemplate)
    if (parsed.status !== 'ok' || !parsed.type) return  // bad template — silent no-op

    const type = parsed.type
    const domain = defaultDomainForType(type)
    const holeMap = detectHoles(type, parsed.values)
    const clean = cleanValues(parsed.values)

    if (shortcut.confirm) {
      // Always ReviewPage — holes are filled there
      const draft = buildReviewDraft(ENTRY_FIELDS[type], clean)
      navigate(`/d/${domain}/${type}/review`, { state: { draft } })
      return
    }

    if (!holeMap.hasHoles) {
      // Direct save
      const draft = buildReviewDraft(ENTRY_FIELDS[type], clean)
      const entry = draftToEntry(draft, type, domain)
      const saved = await entriesRepository.create(entry)
      showToast(saved.id)
      return
    }

    // Fill-the-hole sheet
    setSheetState({ type, domain, baseValues: clean, holeMap })
  }, [navigate, showToast])

  const handleSheetSave = useCallback(async (fills: Record<string, string>) => {
    if (!sheetState) return
    const { type, domain, baseValues } = sheetState
    const merged = { ...baseValues, ...fills }
    const draft = buildReviewDraft(ENTRY_FIELDS[type], merged)
    const entry = draftToEntry(draft, type as EntryType, domain as any)
    const saved = await entriesRepository.create(entry)
    setSheetState(null)
    showToast(saved.id)
  }, [sheetState, showToast])

  const handleSheetCancel = useCallback(() => setSheetState(null), [])

  return {
    handleTap,
    toastEntryId,
    handleUndo,
    sheetState,
    handleSheetSave,
    handleSheetCancel,
  }
}
```

### DashboardPage wiring (diff from current)

```typescript
// Replace the TODO comment block:
const {
  handleTap, toastEntryId, handleUndo,
  sheetState, handleSheetSave, handleSheetCancel,
} = useShortcutCapture()

// In JSX — replace the no-op onClick:
onClick={() => handleTap(s)}

// At the bottom of the returned JSX (before closing div):
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

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| QuickCapturePage: always navigate to ReviewPage | Phase 13: per-shortcut `confirm` flag; direct save bypasses ReviewPage for trusted shortcuts | Breaks v0.2.0 "always Review" invariant deliberately — pair with undo |
| No undo on capture | "Saved · Undo" toast + entriesRepository.delete | Fat-finger recovery without pessimistic confirmation dialogs |
| Empty DSL slots = parse warning only | Empty slots = explicit holes that drive UI routing | Reuses existing parser semantics; no new parsing code |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `toast` auto-dismiss of 4 seconds is appropriate UX | Toast pattern | Too short = user can't undo; too long = clutters screen. Adjust in implementation. |
| A2 | Single sheet showing all holes simultaneously is sufficient for MVP (vs sequential prompting) | HoleSheet structure | If UX feedback shows sequential is better, the sheet component needs state machine added |
| A3 | `defaultDomainForType` mapping (expense → expenditures) is correct for shortcut-captured entries | Capture orchestrator | If a shortcut for `expense` should land in `trips`, the shortcut config would need a `domain` field (not currently planned) |

**All core technical claims are VERIFIED from source code reading (parser.ts, entryFields.ts, ReviewPage.tsx, entriesRepository.ts, db.ts, navigation.ts, shortcutConfig.ts, DashboardPage.tsx, package.json, parser.test.ts, vite.config.ts, test-setup.ts).**

---

## Open Questions

1. **`confirm: true` with holes: navigate directly or fill sheet first?**
   - What we know: CONTEXT.md says "ALWAYS go through ReviewPage regardless of holes". ReviewPage already shows all fields in a form.
   - Recommendation: navigate to ReviewPage with partial draft (holes are empty form fields). No sheet needed for `confirm: true`. This is the simplest reading of the decision tree and is consistent with `movie :` in the default config routing to ReviewPage.

2. **Single-hole vs multi-hole sheet UX: all at once vs sequential?**
   - What we know: CONTEXT.md says "prompt holes in template slot order". This could mean all at once in slot order, or one at a time.
   - Recommendation: show all holes in the same sheet in slot order (amount at top with keypad, text holes below with `<input>`). Sequential prompting adds state machine complexity not needed for v0.3.0.

---

## Environment Availability

Step 2.6: No new external tools or services are introduced. All dependencies are already installed. Vitest + fake-indexeddb + RTL are confirmed present in devDependencies. SKIPPED.

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json` — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 + RTL 16.3.2 + @testing-library/user-event 14.6.1 |
| Config file | `vite.config.ts` (`test.environment: 'jsdom'`, `setupFiles: ['./src/test-setup.ts']`) |
| Setup file | `src/test-setup.ts` — imports `fake-indexeddb/auto` + `@testing-library/jest-dom` |
| Quick run command | `pnpm exec vitest run --reporter=verbose src/services/captureService.test.ts src/components/dashboard/HoleSheet.test.tsx src/pages/DashboardPage.test.tsx` |
| Full suite command | `pnpm exec vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | File | Automated Command |
|--------|----------|-----------|------|-------------------|
| CAP-01 | Zero-hole shortcut tap → entry in IDB, no sheet shown | Integration | `DashboardPage.test.tsx` | `pnpm exec vitest run src/pages/DashboardPage.test.tsx` |
| CAP-01 | `draftToEntry` produces correct entry shape | Unit | `captureService.test.ts` | `pnpm exec vitest run src/services/captureService.test.ts` |
| CAP-02 | Hole detected for `expense :food` | Unit | `captureService.test.ts` | same |
| CAP-02 | HoleSheet opens on tapping a holey shortcut | Integration | `DashboardPage.test.tsx` | same as CAP-01 |
| CAP-02 | Live preview updates as amount is typed | Component | `HoleSheet.test.tsx` | `pnpm exec vitest run src/components/dashboard/HoleSheet.test.tsx` |
| CAP-02 | Save button disabled until valid amount entered | Component | `HoleSheet.test.tsx` | same |
| CAP-02 | Multi-hole: fills in POSITIONAL_SCHEMA order | Unit | `captureService.test.ts` | same |
| CAP-03 | confirm=false + zero holes → entry persisted | Integration | `DashboardPage.test.tsx` | same |
| CAP-03 | confirm=true → navigation to /review (no IDB write) | Integration | `DashboardPage.test.tsx` | same |
| CAP-03 | Undo calls delete(id) and removes toast | Integration | `DashboardPage.test.tsx` | same |
| CAP-03 | Toast auto-dismisses after 4 s | Integration (fake timers) | `DashboardPage.test.tsx` | same |
| CAP-04 | `{}` in named param detected as namedHole | Unit | `captureService.test.ts` | same |
| CAP-04 | `{}` is stripped before buildReviewDraft | Unit | `captureService.test.ts` | same |
| CAP-04 | Named-hole template: sheet asks for that field | Integration | `DashboardPage.test.tsx` | same |

### Key Test Patterns

#### RTL + fake-indexeddb (existing pattern from DashboardPage.test.tsx)
```typescript
beforeEach(async () => {
  await db.delete()
  await db.open()
})
```

#### RTL + fake timers for toast tests
```typescript
import { vi } from 'vitest'

describe('toast behavior', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('auto-dismisses after 4 seconds', async () => {
    // render + tap zero-hole shortcut
    expect(screen.getByRole('status')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('Undo deletes the entry', async () => {
    // tap shortcut → entry created
    const entry = (await entriesRepository.list())[0]
    await userEvent.click(screen.getByRole('button', { name: /undo/i }))
    expect(await entriesRepository.get(entry.id)).toBeUndefined()
  })
})
```

#### confirm=true routing test (no IDB write)
```typescript
it('confirm=true shortcut navigates to review without saving', async () => {
  const user = userEvent.setup()
  // render DashboardPage inside MemoryRouter with Routes including /review
  // tap "New Movie" shortcut (confirm: true)
  // assert navigate called to /d/media/movie/review
  // assert entriesRepository.list() is empty
})
```

#### HoleSheet live preview test
```typescript
it('preview updates as user types', async () => {
  render(<HoleSheet ... />)
  // tap '1' then '2' on keypad
  await userEvent.click(screen.getByRole('button', { name: '1' }))
  await userEvent.click(screen.getByRole('button', { name: '2' }))
  expect(screen.getByText(/expense 12:food/)).toBeInTheDocument()
})
```

### Sampling Rate
- **Per task commit:** `pnpm exec vitest run src/services/captureService.test.ts src/components/dashboard/HoleSheet.test.tsx`
- **Per wave merge:** `pnpm exec vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/services/captureService.test.ts` — covers CAP-01 (draftToEntry), CAP-02 (detectHoles), CAP-04 ({} token)
- [ ] `src/components/dashboard/HoleSheet.test.tsx` — covers CAP-02 (live preview, keypad, disabled Save)
- [ ] `src/hooks/useShortcutCapture.test.ts` (optional — if hook is complex; may be covered by DashboardPage integration tests instead)

Existing `src/pages/DashboardPage.test.tsx` extends with CAP-01/02/03/04 integration tests. Existing `src/services/captureService.test.ts` is new.

---

## Security Domain

No new auth, URL handling, or injection surfaces in this phase. The CONTEXT.md explicitly states: "imported `dslTemplate`s run only through `parseDSL` (no `eval`)". Shortcut-based direct-save uses the same `parseDSL` → `buildReviewDraft` chain as the omnibar — no new injection surface.

`isSafeUrl` is not needed (shortcut captures have no `sourceUrl`).

ASVS: V5 Input Validation is handled by `parseDSL` (already validated). No new ASVS categories apply.

---

## Sources

### Primary (HIGH confidence — code read directly)
- `src/services/dsl/parser.ts` — parseDSL implementation, warning condition line 204, verified `expense :food` trace
- `src/config/entryFields.ts` — ENTRY_FIELDS, POSITIONAL_SCHEMA, buildReviewDraft full body
- `src/pages/ReviewPage.tsx` — full handleSave body; exact entry-construction contract lines 109–123
- `src/services/entriesRepository.ts` — create/delete signatures and return types
- `src/services/db.ts` — LifeLogEntry shape (all fields, optionality, types)
- `src/config/navigation.ts` — defaultDomainForType, expense → expenditures default
- `src/config/shortcutConfig.ts` — Shortcut type with confirm flag; DEFAULT_SHORTCUT_CONFIG examples
- `src/components/dashboard/ShortcutRow.tsx` — onClick prop interface
- `src/pages/DashboardPage.tsx` — existing TODO seam at line 65
- `src/pages/QuickCapturePage.tsx` — canonical parseDSL → buildReviewDraft → navigate pattern
- `src/services/dsl/parser.test.ts` — confirmed test case `empty-positional-slot`
- `package.json` — confirmed no toast library, confirmed fake-indexeddb + vitest + RTL present
- `vite.config.ts` — test environment jsdom, setupFiles
- `src/test-setup.ts` — fake-indexeddb/auto auto-import
- `.planning/phases/13-tap-to-capture-flow/13-CONTEXT.md` — locked decisions
- `.planning/REQUIREMENTS.md` — CAP-01..04 definitions
- `.planning/sketches/001-dashboard-shortcut-layouts/README.md` — Variant B amount sheet design
- `.planning/notes/dashboard-shortcut-layouts-design.md` — design decisions

### Secondary (MEDIUM confidence)
- `src/pages/DashboardPage.test.tsx` — existing beforeEach db reset pattern and userEvent patterns
- `src/pages/ManualEntryPage.integration.test.tsx` — integration test MemoryRouter + Routes pattern for cross-page tests

---

## Metadata

**Confidence breakdown:**
- draftToEntry contract: HIGH — read directly from ReviewPage.tsx handleSave
- Hole detection algorithm: HIGH — traced parseDSL source and matched against test case `empty-positional-slot`
- `{}` token: HIGH — traced through parser.ts; confirmed no parse error; no collision with DSL grammar
- HoleSheet component structure: MEDIUM — derived from sketch design, no prior art in codebase
- Toast pattern: HIGH — package.json confirms no library; pattern is standard React useState + setTimeout
- Test patterns: HIGH — existing DashboardPage.test.tsx and entriesRepository.test.tsx establish the pattern

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (stable codebase; no fast-moving external deps)

# Phase 15: Authoring Tool — Research

**Researched:** 2026-06-17
**Domain:** React PWA / Dexie config mutation / DSL template validation / accessible form UI
**Confidence:** HIGH — all findings grounded in the actual codebase; no external dependencies added.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- EDIT-01: Shortcut CRUD (name, icon, dslTemplate, confirm) within a layout. Reactive via `useShortcutConfig`.
- EDIT-02: Layout CRUD + reorder shortcuts (up/down, no DnD library).
- EDIT-03: "Save current as shortcut" from QuickCapturePage omnibar; activates the `+ New` LayoutChips placeholder.
- EDIT-04: parseDSL validation before save; holes are VALID (not errors); resolve exact rule in research.
- Config mutation model: read-modify-write with `validateShortcutConfig` before every `configRepository.put`. Never write invalid config.
- Reorder UX: accessible up/down buttons only — NO new runtime dependencies.
- Icon picker: SHORTCUT_ICON_MAP keys only (resolveShortcutIcon previews). No free-form input.
- UI: own route(s) reachable from Dashboard `+ New` and/or SettingsPage. Mobile-first, `var(--color-*)` tokens, existing form primitives.

### Claude's Discretion
- Exact route paths and screen structure (single vs nested).
- Whether a new `shortcutMutations.ts` module or extending `shortcutConfig.ts` is the right home for helpers.
- Exact icon picker layout (grid, scroll, etc.).
- Which layout a "Save as Shortcut" from omnibar lands in (active layout pre-selected, user can change).
- Whether `ManageShortcutsPage` hosts layout list + shortcut list in one view or uses accordion/tabs.

### Deferred Ideas (OUT OF SCOPE)
- Drag-and-drop reordering (no new deps; up/down only).
- Cross-device sync.
- Per-type guided DSL composition / advanced template builders.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDIT-01 | Create, edit, delete shortcuts (name, icon, dslTemplate, confirm) via in-app authoring UI. New/edited shortcuts appear on Dashboard immediately. | Pure mutation helpers + ShortcutFormPage + `configRepository.put` → `useLiveQuery` reactive. |
| EDIT-02 | Create, edit, delete layouts; reorder shortcuts within a layout. Order persists across reloads. | Layout mutation helpers + `moveShortcut` helper + ManageShortcutsPage; persists via `configRepository.put`. |
| EDIT-03 | "Save current as shortcut" from omnibar; `+ New` chip is the entry point. | QuickCapturePage adds button; navigates with `{ state: { dslTemplate } }` to ShortcutFormPage; `useActiveLayoutName` pre-selects layout. |
| EDIT-04 | parseDSL validation before save; template with holes is valid; malformed template cannot be saved. | `isValidTemplate` rule defined and traced against parser. `validateTemplate` helper placed in new `templateValidator.ts`. |
</phase_requirements>

---

## Summary

Phase 15 is a pure-client authoring layer over the ShortcutConfig already managed by Phases 11–14. No backend, no new runtime packages. The key engineering work is: (1) a set of pure config-mutation helpers (`shortcutMutations.ts`) with thorough unit tests; (2) a `validateTemplate` helper that calls `parseDSL` with the right predicate to distinguish "valid template with holes" from "genuinely malformed"; (3) two new pages (`ManageShortcutsPage` and `ShortcutFormPage`) that reuse every existing form primitive; and (4) small activations in `LayoutChips`, `QuickCapturePage`, and `App.tsx`.

The most subtle point is EDIT-04: `parseDSL` treats the `{}` HOLE_TOKEN as an ordinary string value (status 'ok') and empty positional slots as warnings (also status 'ok'). Only genuine parse errors (status 'error') or unresolvable types (type === null) make a template unsaveable. The validation predicate is exactly `result.status !== 'error' && result.type !== null`.

**Primary recommendation:** Create `src/services/shortcutMutations.ts` + `src/services/templateValidator.ts` for the logic layer; add `src/pages/ManageShortcutsPage.tsx` and `src/pages/ShortcutFormPage.tsx` for the UI. Register two routes (`/manage`, `/manage/shortcut`) in App.tsx. Activate the `+ New` chip to navigate to `/manage`. Wire the omnibar "Save as Shortcut" button with `navigate('/manage/shortcut', { state: { dslTemplate: text } })`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Config mutation logic (CRUD helpers) | Client / pure TS | — | No backend; immutable pure functions; easily unit-tested |
| Template validation (EDIT-04) | Client / pure TS | — | Thin wrapper over existing `parseDSL`; no side effects |
| Config persistence | Dexie / IndexedDB | — | `configRepository.put` — the already-established single write path |
| Authoring UI (ManageShortcutsPage) | Browser / React | — | Local PWA, no SSR; reacts to `useLiveQuery` updates immediately |
| Shortcut form (ShortcutFormPage) | Browser / React | — | Reuses existing FormField/Input/Button primitives |
| Icon rendering | Browser / React | — | `@heroicons/react` already a runtime dep; zero new cost |
| Navigation with pre-fill state (EDIT-03) | Browser / React Router | — | react-router-dom v7 `navigate(path, { state })` — established pattern in ReviewPage, ManualEntryPage |

---

## Standard Stack

This phase adds zero new runtime dependencies. Everything required already exists.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.1.1 | UI rendering | Project runtime |
| react-router-dom | ^7.17.0 | Routing + `navigate(path,{state})` | Established routing layer |
| dexie / dexie-react-hooks | ^4.4.3 / ^4.4.0 | Config persistence + `useLiveQuery` | Established data layer |
| @heroicons/react | ^2.2.0 | Icon picker renders | Already in SHORTCUT_ICON_MAP |

### Supporting (already installed, reused in this phase)
| Library | Purpose | Reuse Point |
|---------|---------|-------------|
| `clsx` + `tailwind-merge` (via `cn`) | Conditional classnames | Icon picker selected state, form error states |
| `vitest` + `@testing-library/react` + `fake-indexeddb` | Unit + integration tests | All mutation helper tests |

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are installed in this phase.

| Package | Disposition |
|---------|-------------|
| (none) | N/A — zero new runtime or dev dependencies |

---

## Architecture Patterns

### System Architecture Diagram

```
User action (Dashboard "+ New" chip or omnibar "Save as Shortcut")
        │
        ▼
  navigate('/manage' | '/manage/shortcut', { state })
        │
        ├─── ManageShortcutsPage (/manage)
        │       │  reads: useShortcutConfig() [useLiveQuery → Dexie]
        │       │  reads: useActiveLayoutName() [useLiveQuery → Dexie]
        │       │
        │       ├─ Layout list (name, edit-rename, delete, add-new inline)
        │       │
        │       └─ Active layout's shortcut list
        │               (name, icon, template preview, up/down buttons, edit, delete)
        │               │
        │               └─ navigate('/manage/shortcut', { state: {layoutName, shortcut} })
        │
        └─── ShortcutFormPage (/manage/shortcut)
                │  reads: useLocation().state → {layoutName?, shortcut?, dslTemplate?}
                │  reads: useShortcutConfig() — to know all layout names for chooser
                │  reads: useActiveLayoutName() — pre-selects layout when coming from omnibar
                │
                ├─ name field (FormField/Input)
                ├─ icon picker (IconPicker — grid of SHORTCUT_ICON_MAP buttons)
                ├─ dslTemplate field (FormField/Input + live parse status badge)
                │       │
                │       └─ validateTemplate(template) → shows error inline if invalid
                ├─ confirm toggle (checkbox/button)
                ├─ layout chooser (select or radio, driven by config.layouts[].name)
                │
                └─ Save → pure mutation helper → validateShortcutConfig → configRepository.put
                          (reactivity: useLiveQuery fires → Dashboard re-renders)
```

### Recommended Project Structure

```
src/
├── services/
│   ├── shortcutMutations.ts     # NEW: pure config-mutation helpers (add/update/delete/move shortcut; add/rename/delete layout)
│   ├── shortcutMutations.test.ts# NEW: unit tests — pure, no Dexie needed
│   ├── templateValidator.ts     # NEW: validateTemplate / isValidTemplate over parseDSL
│   ├── templateValidator.test.ts# NEW: unit tests for EDIT-04 predicate
│   ├── configRepository.ts      # EXISTING — unchanged; put is the write gate
│   └── configValidator.ts       # EXISTING — unchanged; validateShortcutConfig used by mutations
├── pages/
│   ├── ManageShortcutsPage.tsx  # NEW: EDIT-01/02 layout + shortcut management
│   ├── ManageShortcutsPage.test.tsx
│   ├── ShortcutFormPage.tsx     # NEW: EDIT-01/03/04 create/edit form
│   ├── ShortcutFormPage.test.tsx
│   ├── QuickCapturePage.tsx     # EDIT: add "Save as Shortcut" button (EDIT-03)
│   └── DashboardPage.tsx        # EDIT: activates + New chip (EDIT-02/03)
├── components/
│   └── dashboard/
│       ├── LayoutChips.tsx      # EDIT: + New chip → navigate('/manage')
│       └── IconPicker.tsx       # NEW: dep-free grid picker over SHORTCUT_ICON_MAP
├── App.tsx                      # EDIT: add /manage and /manage/shortcut routes
└── config/
    └── shortcutConfig.ts        # EXISTING — unchanged (types, SHORTCUT_ICON_MAP, resolveShortcutIcon)
```

---

## EDIT-04: Template Validity Rule (Critical)

### Traced parseDSL behavior for each template class

All traces verified by reading `src/services/dsl/parser.ts` and `src/services/dsl/parser.test.ts`. [VERIFIED: codebase]

**a. Complete line (no holes):** `'expense 5:coffee'`
```
parseDSL('expense 5:coffee')
→ { status: 'ok', type: 'expense', values: { amount: '5', category: 'coffee' }, issues: [], warnings: [] }
```
Rule check: `status !== 'error'` ✓ AND `type !== null` ✓ → **VALID TEMPLATE**

**b. Positional-hole line (empty slot):** `'expense :food'`
```
parseDSL('expense :food')
→ { status: 'ok', type: 'expense', values: { category: 'food' }, issues: [], warnings: ['empty "amount" slot'] }
```
Parser path: `parts = ['', 'food']`; part[0].trim() === '' AND parts.length > 1 → pushes warning, does NOT push issue.
`status` = `issues.length ? 'error' : 'ok'` = `'ok'`.
Rule check: `status !== 'error'` ✓ AND `type !== null` ✓ → **VALID TEMPLATE** (warnings are acceptable).

**c. `{}` named-hole line:** `'expense 5:food?merchant={}'`
```
parseDSL('expense 5:food?merchant={}')
→ { status: 'ok', type: 'expense', values: { amount: '5', category: 'food', merchant: '{}' }, issues: [], warnings: [] }
```
Parser path: named param `merchant={}` — `unquote('{}')` returns `'{}'` (no quotes to strip). `{}` is a valid string value to parseDSL. Issues remain empty.
Critical: The HOLE_TOKEN `{}` is **transparent to parseDSL**. No stripping via `cleanValues` is needed before calling `validateTemplate`. The hole is only meaningful to `captureService.detectHoles` at capture time.
Rule check: `status !== 'error'` ✓ AND `type !== null` ✓ → **VALID TEMPLATE**

**d. Genuinely malformed templates:**

| Input | parseDSL result | Reason | Valid? |
|-------|----------------|--------|--------|
| `'expense 12:food?colour=blue'` | `{status:'error', type:'expense', issues:['unknown field "colour" for type "expense"']}` | Unknown named field → issues.push → status='error' | NO |
| `'book "Dune:Herbert'` | `{status:'error', type:null, issues:['unterminated quote in: "Dune:Herbert']}` | ParseError thrown, caught → status='error' | NO |
| `'12.50:food'` (no type token, no defaultType) | `{status:'ambiguous', type:null, issues:['no type given and no domain context']}` | Returns early before final status line | NO |
| `'expense 1:2:3'` | `{status:'error', type:'expense', issues:['3 positional slots but "expense" defines 2']}` | Too many slots → issues.push → status='error' | NO |
| `'expense 12:food?merchant'` | `{status:'error', type:'expense', issues:['param "merchant" missing '='']}` | Missing '=' in named param | NO |
| `'p coffee:5'` (partial type, no defaultType) | `{status:'ambiguous', type:null, ...}` | Partial prefix → early return | NO |

### The exact predicate

```typescript
// src/services/templateValidator.ts

import { parseDSL } from './dsl/parser'

export interface TemplateValidationResult {
  valid: boolean
  /** Human-readable parse error; undefined when valid. */
  error?: string
}

/**
 * Validates whether a dslTemplate string is saveable as a shortcut.
 *
 * Valid = parseable (status !== 'error') AND has a resolvable type (type !== null).
 * Warnings (empty slots, trailing '?') are ACCEPTABLE — they are the "holes."
 * The {} HOLE_TOKEN is treated as an ordinary string value by parseDSL and
 * does NOT need to be stripped before calling this function.
 *
 * Returns { valid: true } for templates with holes (EDIT-04 requirement).
 * Returns { valid: false, error: string } for unterminated quotes, unknown fields,
 * too many slots, missing '=', ambiguous/no type.
 */
export function validateTemplate(template: string): TemplateValidationResult {
  const result = parseDSL(template)
  if (result.status === 'error') {
    return { valid: false, error: result.issues[0] ?? 'Invalid DSL template.' }
  }
  if (result.type === null) {
    // status === 'ambiguous': no type resolved
    return {
      valid: false,
      error: result.issues[0] ?? 'Add a type token (e.g. expense, movie, book).',
    }
  }
  return { valid: true }
}

/** Convenience boolean. */
export function isValidTemplate(template: string): boolean {
  return validateTemplate(template).valid
}
```

**Why `status !== 'error' && type !== null` covers everything:**
- `status === 'ok'` always implies `type !== null` (parser resolves type before reaching the final status line — if type were null, it returned 'ambiguous' early). So in practice `status === 'ok'` is sufficient, but checking both is defensive.
- `status === 'ambiguous'` always has `type === null` (all 'ambiguous' returns are early returns with `type: null`).
- `status === 'error'` CAN have `type !== null` (e.g. unknown field after a valid type). Checking `status !== 'error'` catches these.

**No `cleanValues` needed in `validateTemplate`:** The `{}` token is a valid string value to the parser. `cleanValues` is only called at capture time to prevent `{}` from being written to metadata.

---

## Pure Config-Mutation Helpers

### Module location

**`src/services/shortcutMutations.ts`** [ASSUMED — new module; consistent with project convention of pure functions in `services/`]

Rationale: `config/shortcutConfig.ts` is a data-only module (types, constants, icon map). Mutation logic belongs in `services/` alongside `captureService.ts`, `configValidator.ts`, etc. Keeps `shortcutConfig.ts` clean and import-boundary clear.

### Helper signatures and edge cases

```typescript
// src/services/shortcutMutations.ts
import type { ShortcutConfig, Layout, Shortcut } from '../config/shortcutConfig'

// ─── Shortcut mutations ───────────────────────────────────────────────────────

/**
 * Adds a shortcut to the named layout.
 * Throws if layout not found or a shortcut with the same name already exists.
 */
export function addShortcut(
  config: ShortcutConfig,
  layoutName: string,
  shortcut: Shortcut,
): ShortcutConfig

/**
 * Replaces a shortcut identified by its current name with new data.
 * Throws if layout not found or shortcut not found.
 * Edge: if name changes, verifies no duplicate name in the layout.
 */
export function updateShortcut(
  config: ShortcutConfig,
  layoutName: string,
  originalName: string,
  updates: Shortcut,
): ShortcutConfig

/**
 * Removes a shortcut by name from the named layout.
 * Throws if layout not found or shortcut not found.
 */
export function deleteShortcut(
  config: ShortcutConfig,
  layoutName: string,
  shortcutName: string,
): ShortcutConfig

/**
 * Moves a shortcut one position up or down within its layout.
 * Clamps at array bounds (noop when already at boundary).
 * Throws if layout or shortcut not found.
 */
export function moveShortcut(
  config: ShortcutConfig,
  layoutName: string,
  shortcutName: string,
  direction: 'up' | 'down',
): ShortcutConfig

// ─── Layout mutations ─────────────────────────────────────────────────────────

/**
 * Adds a new empty layout.
 * Throws if a layout with the same name already exists.
 */
export function addLayout(
  config: ShortcutConfig,
  layout: Layout,
): ShortcutConfig

/**
 * Renames a layout.
 * Throws if layout not found or new name duplicates an existing layout.
 * Does NOT update activeLayoutName in Dexie — that is the caller's concern.
 */
export function renameLayout(
  config: ShortcutConfig,
  oldName: string,
  newName: string,
): ShortcutConfig

/**
 * Deletes a layout.
 * GUARD: throws (or returns unchanged) if this is the last layout — the Dashboard
 * requires at least one layout. UI must disable delete when layouts.length === 1.
 * Throws if layout not found.
 */
export function deleteLayout(
  config: ShortcutConfig,
  layoutName: string,
): ShortcutConfig
```

### Edge cases and invariants

| Situation | Behavior |
|-----------|----------|
| Delete last layout | Guard: throw `Error('Cannot delete the only remaining layout.')`. UI disables the button when `layouts.length === 1`. |
| Delete active layout | No special action in the helper — `activeLayoutName` persists separately in Dexie. Phase 12 logic (`layouts.find(l => l.name === persistedName) ?? layouts[0]`) already falls back correctly. |
| Duplicate layout name | `addLayout` / `renameLayout` throw; UI shows error message to user. |
| Duplicate shortcut name in layout | `addShortcut` / `updateShortcut` throw; UI shows error message. |
| `moveShortcut` at boundary | Clamp: noop (return config unchanged). UI disables up button at index 0, down button at last index. |
| `validateShortcutConfig` after mutation | Every helper produces a structurally valid config. Callers still run `validateShortcutConfig(next)` before `configRepository.put` as a defense-in-depth check. If `ok: false` (should not happen with correct helpers), surface error to user and abort write. |

### Move algorithm (moveShortcut)

```typescript
export function moveShortcut(
  config: ShortcutConfig,
  layoutName: string,
  shortcutName: string,
  direction: 'up' | 'down',
): ShortcutConfig {
  const layouts = config.layouts.map((l) => {
    if (l.name !== layoutName) return l
    const idx = l.shortcuts.findIndex((s) => s.name === shortcutName)
    if (idx === -1) throw new Error(`Shortcut "${shortcutName}" not found in layout "${layoutName}"`)
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= l.shortcuts.length) return l // at boundary — noop
    const shortcuts = [...l.shortcuts]
    ;[shortcuts[idx], shortcuts[newIdx]] = [shortcuts[newIdx], shortcuts[idx]]
    return { ...l, shortcuts }
  })
  return { ...config, layouts }
}
```

### Write path pattern (for pages to follow)

```typescript
// In a page/component handler:
async function handleSaveShortcut(layoutName: string, shortcut: Shortcut) {
  const current = await configRepository.get()
  if (!current) return // shouldn't happen
  const next = addShortcut(current, layoutName, shortcut)         // pure mutation
  const vr = validateShortcutConfig(next)                         // structural check
  if (!vr.ok) { showError(vr.reason); return }                    // defense in depth
  await configRepository.put(vr.config)                           // atomic write → useLiveQuery fires
}
```

---

## Reorder Approach (No New Deps)

**Confirmed recommendation: accessible up/down move buttons.** [ASSUMED — dep-free, keyboard/screen-reader friendly, consistent with CONTEXT.md locked decision]

### UI buttons per shortcut row

Each shortcut row in `ManageShortcutsPage` renders two icon buttons:

```tsx
<Button
  variant="ghost"
  size="icon"
  aria-label={`Move ${shortcut.name} up`}
  disabled={index === 0}
  onClick={() => handleMove(layoutName, shortcut.name, 'up')}
>
  <ChevronUpIcon className="h-4 w-4" />
</Button>
<Button
  variant="ghost"
  size="icon"
  aria-label={`Move ${shortcut.name} down`}
  disabled={index === shortcuts.length - 1}
  onClick={() => handleMove(layoutName, shortcut.name, 'down')}
>
  <ChevronDownIcon className="h-4 w-4" />
</Button>
```

`ChevronUpIcon` and `ChevronDownIcon` are from `@heroicons/react/24/outline` (already a dep).

**Accessibility:** `aria-label` includes the shortcut name (screen reader announces "Move Groceries up"). `disabled` prevents interaction at boundaries.

**Keyboard:** Focus management is natural — Tab moves through all buttons in DOM order. `disabled` buttons are skipped by keyboard.

**Test:** Pure function test on `moveShortcut` covers all boundary cases without needing DOM.

### Why not HTML5 native DnD

HTML5 drag-and-drop is keyboard-inaccessible without significant extra code (keyboard drag event emulation). Touch events on mobile require separate handling. The result would be more complex and less accessible than simple buttons. Up/down is the correct choice here. [ASSUMED based on established accessibility guidance]

---

## UI Structure and Navigation

### Screen / route structure

**Two new routes (flat, not nested):**

```tsx
// App.tsx additions (before the catch-all):
<Route path="/manage"           element={<ManageShortcutsPage />} />
<Route path="/manage/shortcut"  element={<ShortcutFormPage />} />
```

**ManageShortcutsPage** (`/manage`):
- Back button → Dashboard (`/`)
- Layout section: list of layouts, each row has rename button, delete button (disabled when 1 layout)
- "New Layout" inline form: text input + Create button (avoids navigation for a simple action)
- Active-layout's shortcut section: scrollable list with per-shortcut up/down/edit/delete controls
- Layout selector tabs (layout name chips, consistent with Dashboard): clicking a layout chip changes which layout's shortcuts are shown in the manage view
- "Add Shortcut" button → `navigate('/manage/shortcut', { state: { layoutName } })`

**ShortcutFormPage** (`/manage/shortcut`):
- Back button → `/manage`
- Title: "New Shortcut" or "Edit Shortcut" (based on `location.state?.shortcut` presence)
- Fields: name (FormField/Input), icon (IconPicker), dslTemplate (FormField/Input + live parse badge), confirm (toggle/checkbox), layout chooser (select)
- Save button: disabled until `validateTemplate(dslTemplate).valid && name.trim() !== ''`
- Error display: `validateTemplate` error shown inline beneath the dslTemplate field

**Single-screen reasoning:** Layouts and their shortcuts are naturally one management context. A two-level drill-down (layout list → shortcut list) would require an extra tap and navigation animation for a simple list. A single page with layout-chip selector (reusing the chips pattern from Dashboard) is faster and more consistent. [ASSUMED — preferred minimal approach]

### Dashboard `+ New` chip activation

In `LayoutChips.tsx`, change the disabled `+ New` button to a real link/button that navigates to `/manage`:

```tsx
// Before (disabled placeholder):
<button type="button" disabled className="...">+ New</button>

// After (active — navigate to manage screen):
<button
  type="button"
  onClick={() => onManage()}   // caller passes onManage prop
  className="shrink-0 whitespace-nowrap rounded-full border border-dashed
             px-4 py-1.5 text-sm font-semibold text-[var(--color-foreground)]
             hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-offset-2"
>
  + New
</button>
```

`DashboardPage` passes `onManage={() => navigate('/manage')}` via the `LayoutChips` `onManage` prop.

Alternatively: use `<Link to="/manage">` inside `LayoutChips` — avoids adding a new prop. Either is fine; the prop approach keeps `LayoutChips` agnostic to routing.

### SettingsPage link

The existing "Shortcuts Config" Dashboard link (`/settings`) continues to serve import/export only. No changes required to `SettingsPage`. The manage screen is a separate concern. [ASSUMED]

---

## EDIT-03: "Save Current as Shortcut" from the Omnibar

### QuickCapturePage additions

1. Import `useActiveLayoutName` from `configRepository`.
2. Add a "Save as Shortcut" button visible when `parsed.type !== null && parsed.status !== 'error'` (i.e., the template is valid enough to be a shortcut).
3. Handler navigates with DSL template as state.

```tsx
// QuickCapturePage.tsx additions
import { useNavigate } from 'react-router-dom'
import { useActiveLayoutName } from '../services/configRepository'

// Inside QuickCapturePage():
const activeLayoutName = useActiveLayoutName()

const canSaveAsShortcut = parsed.type !== null && parsed.status !== 'error'

const handleSaveAsShortcut = () => {
  navigate('/manage/shortcut', {
    state: { dslTemplate: text },
    // Do NOT pass layoutName here — ShortcutFormPage reads useActiveLayoutName itself
  })
}
```

```tsx
{/* In JSX, after the "Review & Save" button: */}
<Button
  variant="secondary"
  onClick={handleSaveAsShortcut}
  disabled={!canSaveAsShortcut}
>
  Save as Shortcut
</Button>
```

**Why not pass layoutName from QuickCapturePage:** ShortcutFormPage reads `useActiveLayoutName()` directly. This keeps the omnibar concern minimal (it passes the template only) and the form concern complete (it knows the active layout and shows a chooser).

### ShortcutFormPage navigation state

```typescript
interface ShortcutFormState {
  // Coming from omnibar (EDIT-03):
  dslTemplate?: string

  // Coming from ManageShortcutsPage (EDIT-01 edit):
  layoutName?: string
  shortcut?: Shortcut  // present = edit mode; absent = create mode
}
```

In `ShortcutFormPage`:

```tsx
const { state } = useLocation() as { state?: ShortcutFormState }
const config = useShortcutConfig()
const activeLayoutName = useActiveLayoutName()

// Pre-fill dslTemplate from omnibar navigation:
const [dslTemplate, setDslTemplate] = useState(state?.shortcut?.dslTemplate ?? state?.dslTemplate ?? '')

// Pre-select layout:
// If editing, use the layout passed in state.
// If coming from omnibar (no state.layoutName), use activeLayoutName.
// Fall back to first layout.
const defaultLayout =
  state?.layoutName ??
  activeLayoutName ??
  config?.layouts[0]?.name ??
  ''
const [selectedLayout, setSelectedLayout] = useState(defaultLayout)
```

**Layout chooser in the form:** A `<select>` element populated from `config.layouts.map(l => l.name)`. Default = `selectedLayout` computed above. This lets the user redirect the shortcut to a different layout before saving.

**What enters the form when coming from the omnibar:** The raw `text` string from QuickCapturePage. This may contain positional holes (empty `:food`-style slots) or `{}` named holes from the live typing session. The form's `dslTemplate` field is pre-filled and the live parse badge immediately shows whether it's valid. The user can tweak the template, add a name, pick an icon, and save.

---

## Icon Picker

### Component: `src/components/dashboard/IconPicker.tsx`

```tsx
import { cn } from '../ui/cn'
import { SHORTCUT_ICON_MAP, resolveShortcutIcon } from '../../config/shortcutConfig'

interface IconPickerProps {
  value: string | undefined
  onChange: (key: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div
      role="group"
      aria-label="Icon"
      className="flex flex-wrap gap-2"
    >
      {Object.keys(SHORTCUT_ICON_MAP).map((key) => {
        const Icon = resolveShortcutIcon(key)
        const isSelected = value === key
        return (
          <button
            key={key}
            type="button"
            aria-label={key.replace('Icon', '')}  // "BanknotesIcon" → "Banknotes"
            aria-pressed={isSelected}
            onClick={() => onChange(key)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md border',
              'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
              isSelected
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
```

There are 20 keys in `SHORTCUT_ICON_MAP`. On a 375px mobile viewport with `flex-wrap` and `gap-2`, 20 icons at 36px each fit in ~4-5 rows — fully scannable without scrolling.

**Accessibility:** `aria-label` per button (screen reader reads icon name). `aria-pressed` for selected state. Keyboard-navigable via Tab. `focus-visible` ring uses `var(--color-primary)` matching existing Button.

**No "none" / clear option:** The `Shortcut.icon` field is optional (`icon?: string`). In the form, if no icon is selected, `value` is `undefined` and `resolveShortcutIcon` falls back to `BoltIcon` at render time. The picker simply has no button selected (all `aria-pressed="false"`). An "X / Clear" button can optionally be added if needed.

---

## Common Pitfalls

### Pitfall 1: Rejecting valid hole templates in EDIT-04

**What goes wrong:** Checking `parsed.status === 'ok' && parsed.issues.length === 0` seems like "clean" validation, but then using it as `canSave`. This is correct! But the error occurs if the developer additionally checks `parsed.warnings.length === 0` to gate save — that would reject all hole templates since `'expense :food'` always produces a warning.

**Why it happens:** Confusing issues (hard errors) with warnings (soft notices). The parser uses warnings for soft surprises (empty slots, trailing `?`) and issues for hard errors.

**How to avoid:** Gate save only on `validateTemplate(template).valid` — which checks `status !== 'error' && type !== null`. Warnings are acceptable; they ARE the holes.

**Warning signs:** The dslTemplate field blocks save even though the template looks correct.

---

### Pitfall 2: Stale `config` reference in mutation handlers

**What goes wrong:** Reading `config` from `useShortcutConfig()` (the hook), then using it inside an async handler that runs after a re-render. By the time the handler runs, `config` could have changed (another tab / unlikely but possible in PWA).

**Why it happens:** Closures capture the value of `config` at render time.

**How to avoid:** In mutation handlers that need the freshest config, call `await configRepository.get()` imperatively (not the hook). The hook is for rendering only. Write path: `const current = await configRepository.get()`.

**Warning signs:** Edit operations silently overwrite concurrent changes.

---

### Pitfall 3: Writing activeLayoutName when deleting the active layout

**What goes wrong:** After deleting the active layout, the developer writes `activeLayoutRepository.put(config.layouts[0].name)` to "fix" the stale active name. This is unnecessary and causes a race condition with the reactive fallback.

**Why it happens:** Feeling like the stale name is a bug that needs an explicit fix.

**How to avoid:** The Phase 12 fallback `layouts.find(l => l.name === persistedName) ?? layouts[0]` already handles a stale name gracefully. Leave `activeLayoutRepository` alone when deleting a layout. Only write to it when the user explicitly selects a layout.

**Warning signs:** Double-writing to Dexie after a layout delete; tests that check `activeLayoutName` after delete finding unexpected values.

---

### Pitfall 4: `location.state` is null when navigating directly to `/manage/shortcut`

**What goes wrong:** `ShortcutFormPage` crashes when accessed via direct URL (browser refresh, copy-paste) because `useLocation().state` is null.

**Why it happens:** `navigate(path, { state })` state only exists for in-app navigation.

**How to avoid:** Guard: `const state = (useLocation().state ?? {}) as ShortcutFormState`. All fields are optional. Direct navigation shows the "Create" form with empty fields (valid behavior).

---

### Pitfall 5: Layout name uniqueness check at the wrong level

**What goes wrong:** Checking uniqueness in the form's Submit handler using the React state value of `selectedLayout` instead of against the live `config.layouts`. If the user adds a layout in another tab between typing and saving, the check passes stale data.

**Why it happens:** Trusting local form state over the single source of truth.

**How to avoid:** `addLayout` / `renameLayout` helpers throw on duplicate — this check runs against the freshly-read config from `configRepository.get()`. The UI also validates on blur/change as UX feedback, but the authoritative check is in the write path.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DSL template validation | Custom regexp or manual parse | `parseDSL` via `validateTemplate` | Parser handles quoting, aliases, all types, exact error messages |
| Config persistence | Direct `db.settings.put` in components | `configRepository.put` | Encapsulation; repository is the single write gate |
| Structural config validation | Inline shape checks | `validateShortcutConfig` | Already complete and tested for all fields |
| Icon components | Custom SVG | `resolveShortcutIcon(key)` + `SHORTCUT_ICON_MAP` | Already imported everywhere; no new cost |
| Form state management | Complex reducers | `useState` per field (ManualEntryPage pattern) | Existing pattern; forms are simple (4-5 fields) |
| Navigate with data | Query params / localStorage | `navigate(path, { state })` + `useLocation().state` | Established pattern in ReviewPage and ManualEntryPage |
| Conditional classnames | String concatenation | `cn()` from `./ui/cn` | Deduplicates Tailwind classes; established throughout |

**Key insight:** The entire authoring layer is a thin UI skin over already-built primitives. Every write ends with `validateShortcutConfig` → `configRepository.put`. Every read uses `useShortcutConfig`. Every form uses `FormField` / `Input` / `Button`. Every template check calls `parseDSL`.

---

## Validation Architecture

Config: `workflow.nyquist_validation` not explicitly `false` in `.planning/config.json` (file does not exist) → treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + @testing-library/react 16.x + fake-indexeddb 6.x |
| Config file | `vite.config.ts` (`test.environment: 'jsdom'`, `setupFiles: ['./src/test-setup.ts']`) |
| Quick run command | `pnpm exec vitest run src/services/shortcutMutations.test.ts src/services/templateValidator.test.ts` |
| Full suite command | `pnpm exec vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDIT-01 | Creating a shortcut persists it and it appears on Dashboard | integration | `pnpm exec vitest run src/pages/ManageShortcutsPage.test.tsx` | No — Wave 0 |
| EDIT-01 | Editing a shortcut updates name/icon/template/confirm | integration | same | No — Wave 0 |
| EDIT-01 | Deleting a shortcut removes it from Dashboard reactively | integration | same | No — Wave 0 |
| EDIT-02 | Creating a layout appears in layout switcher | integration | `pnpm exec vitest run src/pages/ManageShortcutsPage.test.tsx` | No — Wave 0 |
| EDIT-02 | Renaming a layout reflects in chips | integration | same | No — Wave 0 |
| EDIT-02 | Deleting a layout (not last) removes it from chips | integration | same | No — Wave 0 |
| EDIT-02 | Reorder: moving shortcut up/down changes position; persists | unit + integration | `pnpm exec vitest run src/services/shortcutMutations.test.ts` | No — Wave 0 |
| EDIT-03 | Omnibar "Save as Shortcut" pre-fills form with DSL text | integration | `pnpm exec vitest run src/pages/ShortcutFormPage.test.tsx` | No — Wave 0 |
| EDIT-03 | `+ New` chip navigates to `/manage` | integration | `pnpm exec vitest run src/pages/DashboardPage.test.tsx` | Yes (update existing) |
| EDIT-04 | Valid template with holes → Save enabled | unit | `pnpm exec vitest run src/services/templateValidator.test.ts` | No — Wave 0 |
| EDIT-04 | Malformed template → Save disabled + error message shown | unit + integration | `pnpm exec vitest run src/services/templateValidator.test.ts src/pages/ShortcutFormPage.test.tsx` | No — Wave 0 |
| EDIT-04 | `{}` named-hole template → Save enabled | unit | same | No — Wave 0 |

### Key test patterns (follow existing codebase conventions)

```typescript
// shortcutMutations.test.ts — pure unit tests, no Dexie needed
describe('moveShortcut', () => {
  it('moves a shortcut up by swapping with the previous', () => {
    const config = makeConfig(['Alpha', 'Beta', 'Gamma'])
    const result = moveShortcut(config, 'DayToDay', 'Beta', 'up')
    expect(result.layouts[0].shortcuts.map(s => s.name)).toEqual(['Beta', 'Alpha', 'Gamma'])
  })
  it('noop when moving first shortcut up', () => {
    const config = makeConfig(['Alpha', 'Beta'])
    const result = moveShortcut(config, 'DayToDay', 'Alpha', 'up')
    expect(result).toEqual(config) // or deep equal check
  })
})

// ManageShortcutsPage.test.tsx — integration test with fake-indexeddb
beforeEach(async () => { await db.delete(); await db.open() })

it('EDIT-01: adding a shortcut appears on Dashboard reactively', async () => {
  const user = userEvent.setup()
  // Pre-seed a config; render ManageShortcutsPage; use Add Shortcut button;
  // fill form; save; navigate back; re-render DashboardPage; expect new shortcut row
  ...
})
```

```typescript
// templateValidator.test.ts
import { validateTemplate, isValidTemplate } from './templateValidator'

describe('validateTemplate', () => {
  it('positional-hole template is valid (expense :food)', () => {
    expect(isValidTemplate('expense :food')).toBe(true)
  })
  it('{} named-hole template is valid (expense 5:food?merchant={})', () => {
    expect(isValidTemplate('expense 5:food?merchant={}')).toBe(true)
  })
  it('unknown field is invalid and returns the parse error', () => {
    const r = validateTemplate('expense 12:food?colour=blue')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/unknown field/)
  })
  it('no type given returns invalid with descriptive error', () => {
    const r = validateTemplate('12.50:food')
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })
})
```

### Sampling Rate

- **Per task commit:** Run the affected test file only (e.g., `pnpm exec vitest run src/services/shortcutMutations.test.ts`)
- **Per wave merge:** `pnpm exec vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/services/shortcutMutations.test.ts` — covers EDIT-01/02 mutation helpers
- [ ] `src/services/templateValidator.test.ts` — covers EDIT-04 predicate
- [ ] `src/pages/ManageShortcutsPage.test.tsx` — covers EDIT-01/02 UI
- [ ] `src/pages/ShortcutFormPage.test.tsx` — covers EDIT-01/03/04 form
- [ ] `src/pages/DashboardPage.test.tsx` — update existing: `+ New` chip no longer disabled; navigates to `/manage`

---

## Code Examples

### Pattern 1: Write path (mutation → validate → put)

```typescript
// Source: src/services/configRepository.ts (configRepository.put pattern),
//         src/services/configValidator.ts (validateShortcutConfig)
async function handleAddShortcut(layoutName: string, shortcut: Shortcut) {
  const current = await configRepository.get()
  if (!current) return
  const next = addShortcut(current, layoutName, shortcut)   // throws on duplicate name
  const vr = validateShortcutConfig(next)
  if (!vr.ok) { /* surface error — shouldn't reach here if helper is correct */ return }
  await configRepository.put(vr.config)
  // useLiveQuery fires → Dashboard and ManageShortcutsPage re-render automatically
}
```

### Pattern 2: Live DSL parse badge in ShortcutFormPage

```tsx
// Source: QuickCapturePage.tsx (parseDSL live preview pattern)
const templateResult = validateTemplate(dslTemplate)
const STATUS_STYLES = {
  valid:   'bg-green-500/15 text-green-600 dark:text-green-400',
  invalid: 'bg-red-500/15 text-red-500',
}

<FormField
  id="shortcut-template"
  label="DSL Template"
  value={dslTemplate}
  onChange={(e) => setDslTemplate(e.target.value)}
  error={dslTemplate.trim() !== '' && !templateResult.valid ? templateResult.error : undefined}
  helpText="e.g. expense :food  or  movie :  or  expense 5:coffee"
  placeholder="expense :food"
/>
{/* Live status badge — only shown when template is non-empty */}
{dslTemplate.trim() !== '' && (
  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded
                    ${templateResult.valid ? STATUS_STYLES.valid : STATUS_STYLES.invalid}`}>
    {templateResult.valid ? 'valid' : 'invalid'}
  </span>
)}
```

### Pattern 3: Navigate with state (EDIT-03 wiring)

```tsx
// Source: ManualEntryPage.tsx / ReviewPage.tsx (navigate with state pattern)

// In QuickCapturePage:
navigate('/manage/shortcut', { state: { dslTemplate: text } })

// In ShortcutFormPage:
const { state } = useLocation() as { state?: { dslTemplate?: string; layoutName?: string; shortcut?: Shortcut } }
const [dslTemplate, setDslTemplate] = useState(state?.shortcut?.dslTemplate ?? state?.dslTemplate ?? '')
```

### Pattern 4: Back-navigation convention

```tsx
// Source: SettingsPage.tsx, ManualEntryPage.tsx, QuickCapturePage.tsx
import { useBackOrHome } from '../hooks/useBackOrHome'
const goBack = useBackOrHome('/')

<button onClick={goBack} className="flex items-center gap-1 text-[var(--color-primary)] mb-2 -ml-1" aria-label="Go back">
  <ChevronLeftIcon className="h-5 w-5" />
  <span className="text-sm font-medium">Back</span>
</button>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Disabled `+ New` chip (placeholder) | Real `+ New` chip → `/manage` | Entry point for all authoring in v0.3.0 |
| Config read-only after seeding (Phases 11-13) | Full CRUD via mutation helpers + configRepository.put | Completes the authoring loop started in Phase 11 |
| No template validation at authoring time | `validateTemplate` inline in form | Templates in Dexie are all parseable post-Phase-15 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `shortcutMutations.ts` in `services/` (not `config/`) is the right module boundary | Architecture Patterns | Cosmetic only — could live in either; project conventions strongly suggest `services/` for pure functions with side-effect potential |
| A2 | Single `/manage` route hosts both layout list and shortcut list (no drill-down sub-routes) | UI Structure | If layouts grow large (>10), a two-level drill-down might be more usable; easily refactored later |
| A3 | `+ New` chip passes through `onManage` prop to LayoutChips | UI Structure | Alternatively could use `<Link>` inside LayoutChips; low risk |
| A4 | ShortcutFormPage reads `useActiveLayoutName` itself rather than receiving it from omnibar navigate state | EDIT-03 | If QuickCapturePage has no useActiveLayoutName call, omitted. Form reads hook directly — works fine |
| A5 | HTML5 native DnD is excluded (no accessible keyboard path without extra code) | Reorder Approach | Consistent with CONTEXT.md locked decision; accurate for standard HTML5 DnD |

---

## Open Questions

1. **Inline layout-name edit vs. navigate to form**
   - What we know: renaming a layout is a simple text operation; navigating to a new route for it is overkill
   - What's unclear: does ManageShortcutsPage render a text input inline for rename, or a modal, or a small route?
   - Recommendation: inline text input with a Save/Cancel pair (no new route). Simple and mobile-friendly.

2. **Shortcut name uniqueness scope**
   - What we know: `validateShortcutConfig` does not check for duplicate shortcut names within a layout (it only checks structural types)
   - What's unclear: should duplicate shortcut names across different layouts be allowed? (Currently yes — the schema doesn't forbid it)
   - Recommendation: Enforce uniqueness only within a single layout (names are layout-scoped). The mutation helper throws on duplicate within-layout. Cross-layout duplicates are fine.

3. **`+ New` chip label in manage context**
   - What we know: the chip currently says `+ New` with a dashed border to suggest "add new layout"
   - What's unclear: once activated, should it still say `+ New` (creates a layout directly) or "Manage" (opens the manage screen)?
   - Recommendation: `+ New` navigates to `/manage` — the manage screen is where layout creation happens. Rename the chip to `+ New` with tooltip "Manage shortcuts" or keep as-is.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 15 is pure code/config changes within the existing React PWA. No external services, databases, CLI tools, or runtimes beyond the already-installed project stack (Node, pnpm, Vite, Vitest).

---

## Sources

### Primary (HIGH confidence — verified by reading codebase)

- `src/services/dsl/parser.ts` — parseDSL status/type/issues/warnings behavior; `ParseStatus` type
- `src/services/dsl/parser.test.ts` — confirmed behavior for empty-slot, full, and malformed inputs
- `src/services/captureService.ts` — HOLE_TOKEN `{}`, cleanValues, detectHoles; confirmed `{}` is post-parse concern
- `src/services/configRepository.ts` — configRepository.get/put, useShortcutConfig, useActiveLayoutName
- `src/services/configValidator.ts` — validateShortcutConfig interface; what it checks/does not check
- `src/config/shortcutConfig.ts` — Shortcut/Layout/ShortcutConfig types, SHORTCUT_ICON_MAP (20 keys), resolveShortcutIcon, DEFAULT_SHORTCUT_ICON
- `src/pages/QuickCapturePage.tsx` — `text` state, `parsed` live, navigate pattern, canConfirm pattern
- `src/pages/DashboardPage.tsx` — seeding effect, useShortcutConfig, handleLayoutSelect, render structure
- `src/components/dashboard/LayoutChips.tsx` — disabled `+ New` placeholder, onSelect prop pattern
- `src/pages/ManualEntryPage.tsx` — FormField/Input/Button form primitive usage, navigate with state
- `src/pages/SettingsPage.tsx` — page shell pattern, useBackOrHome, useShortcutConfig gate
- `src/App.tsx` — existing routes, catch-all position, import pattern
- `src/components/ui/{Button,Input,FormField}.tsx` — variant/size props, error/helpText on FormField
- `package.json` — confirmed zero new deps: @heroicons/react, clsx, tailwind-merge, dexie, react-router-dom all present

### Secondary (MEDIUM confidence)

- `src/services/configRepository.test.tsx` — confirmed beforeEach `db.delete()+db.open()` test pattern, act() for reactive hook testing
- `src/pages/DashboardPage.test.tsx` — confirmed MemoryRouter + Routes pattern, fake-indexeddb usage, vi.useFakeTimers strategy

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; all primitives verified in source
- EDIT-04 predicate: HIGH — traced directly through parser.ts line by line and cross-checked with parser.test.ts
- Architecture/routes: HIGH — follows existing page/route patterns exactly
- Mutation helper signatures: HIGH — derived from types in shortcutConfig.ts + configValidator.ts
- UI component structure: MEDIUM-HIGH — follows ManualEntryPage and SettingsPage patterns; exact JSX layout is planner's discretion

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (stable codebase, no external deps; only invalidated by schema changes in Phases 11-14 code)

# Stack Research

**Domain:** Mobile-first trip logger PWA — v0.5.0 UI component additions
**Researched:** 2026-06-19
**Confidence:** HIGH

## Context

This is a subsequent-milestone research, not a greenfield stack decision. The core stack is
LOCKED (React 19 + TS 5.9 + Vite 7 + Tailwind v4 + react-router-dom v7 + Dexie + Heroicons
+ clsx + tailwind-merge). The question is whether three specific UI needs — Expense modal,
star rating input, and currency formatting — require ANY new runtime dependencies.

**Verdict: Zero new runtime dependencies warranted.** All three needs are fully addressable
with existing primitives + platform APIs.

---

## Recommended Stack

### Core Technologies (LOCKED — do not change)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React 19 + react-dom | ^19.1.1 | UI + `createPortal` | Already dep; `createPortal` is the portal primitive if needed |
| Tailwind CSS v4 | ^4.3.1 | Styling overlays, safe-area, z-index | All overlay utilities unchanged from v3 |
| @heroicons/react | ^2.2.0 | Star icons (24/solid + 24/outline) | Already dep; `StarIcon` covers filled/unfilled states |
| clsx + tailwind-merge (`cn`) | ^2.1.1 / ^3.6.0 | Conditional Tailwind class merging | Already in `components/ui/cn.ts` |

### New Runtime Dependencies

**None.** Do not add any new `dependencies` entries to `package.json`.

---

## Pattern Decisions

### 1. Expense Modal — Hand-Rolled Bottom Sheet (ZERO NEW DEP)

**Decision:** Clone and adapt `HoleSheet.tsx`. Do not add Radix Dialog or Headless UI.

**Rationale:** `HoleSheet.tsx` is a fully working, production-verified bottom-sheet modal
using `role="dialog" aria-modal="true"`, `fixed inset-0` backdrop, `fixed bottom-0` panel,
focus management via `useEffect + panelRef.focus()`, Escape key listener, and backdrop-click
dismiss. The pattern satisfies WAI-ARIA Modal Authoring Practices for this app's scope.

**Expense modal structure** (`ExpenseSheet` or inline in the Expense page):

```tsx
// Backdrop
<div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} aria-hidden="true" />

// Sheet panel
<div
  role="dialog"
  aria-modal="true"
  aria-label="Log expense"
  ref={panelRef}
  tabIndex={-1}
  className="fixed bottom-0 left-0 right-0 z-50
             bg-[var(--color-background)] rounded-t-2xl
             px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]
             max-h-[90vh] overflow-y-auto outline-none"
>
  {/* FormField (amount), Select (category), Input (vendor), Input (notes) */}
  {/* Button row: Cancel + Save */}
</div>
```

**Key differences from HoleSheet:**
- Swap keypad for standard `FormField`/`Input` controls (category is a `<select>`, not keypad)
- Amount field: `<input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]+">`
  on mobile this surfaces the numeric keyboard without forcing `type="number"` quirks
- Safe-area bottom: use `pb-[max(2rem,env(safe-area-inset-bottom))]` (Tailwind v4 arbitrary
  value with CSS `env()` function — works without any plugin)

**Portal**: `createPortal(content, document.body)` from `react-dom` (already a dep) is
available if a stacking-context conflict appears in the rewritten routing tree. Start without
it (HoleSheet works without portal); add only if z-index layering breaks with the new shell.

**Body scroll lock**: add `useEffect` in the sheet:
```ts
useEffect(() => {
  if (!isOpen) return
  document.body.style.overflow = 'hidden'
  return () => { document.body.style.overflow = '' }
}, [isOpen])
```
This prevents background scroll on mobile while the sheet is open. One line; zero dep.

**Reuse from existing primitives:**
- `Button` — Cancel + Save actions
- `FormField` + `Input` — Vendor, Notes fields
- `cn` — conditional classes on the panel

---

### 2. Star Rating Input — Hand-Rolled Button Row (ZERO NEW DEP)

**Decision:** Five `<button>` elements with `StarIcon` from Heroicons `24/solid` (filled) /
`24/outline` (unfilled). No library.

**Rationale:** A 1–5 optional rating is the simplest interactive control in the UI. The
radio-group WAI-ARIA pattern (W3C 2021 example) is correct for screenreaders, but for this
personal PWA's mobile-first tap context a button row with `aria-label` per star is equally
accessible and far simpler to implement and test.

**Implementation pattern:**

```tsx
const STARS = [1, 2, 3, 4, 5] as const

function StarRating({
  value,         // 0 = not rated
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div role="group" aria-label="Rating" className="flex gap-1">
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={value === n}
          onClick={() => onChange(value === n ? 0 : n)}  // tap same star = clear
          className={cn(
            'h-11 w-11 flex items-center justify-center rounded-full',
            'transition-colors active:opacity-75',
            n <= value
              ? 'text-amber-400'
              : 'text-[var(--color-border)]',
          )}
        >
          {n <= value
            ? <StarIcon className="h-7 w-7" aria-hidden="true" />       // 24/solid
            : <StarIconOutline className="h-7 w-7" aria-hidden="true" />// 24/outline
          }
        </button>
      ))}
    </div>
  )
}
```

**Tap-target**: `h-11 w-11` = 44×44 CSS pixels — meets WCAG 2.5.5 (AAA) minimum.

**Keyboard**: each button is naturally focusable; Tab moves between stars; Space/Enter fires
`onClick`. Arrow-key navigation (WAI-ARIA radio group pattern) is optional for a personal
PWA; add if desired via `onKeyDown` without any new dep.

**Icon imports** (already in dep):
```ts
import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline'
```

**Storage**: store as `number` (0–5) in `LifeLogEntry` metadata. Display: render stars
read-only with the same pattern but `pointer-events-none`.

---

### 3. Currency/Amount Formatting — `Intl.NumberFormat` (ZERO NEW DEP)

**Decision:** Use the platform `Intl.NumberFormat` API. No library.

**Input:** Reuse the HoleSheet keypad approach for the Expense modal amount field. The
keypad stores amount as a numeric string during entry; on save, `parseFloat(rawAmount)` gives
the number stored in the entry.

Alternative for simple entry: `<input type="text" inputMode="decimal">`. This avoids spinner
arrows from `type="number"` and gives the mobile numeric keyboard. Validate with
`/^\d+(\.\d{1,2})?$/` before enabling Save.

**Display formatting** (expense totals, trip reports, entry detail):

```ts
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Usage
usd.format(123.4)   // "$123.40"
usd.format(0)       // "$0.00"
usd.format(1234.56) // "$1,234.56"
```

Cache the formatter at module scope (construction is cheap but reuse is free):

```ts
// utils/formatCurrency.ts
const _fmt = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})
export const formatUSD = (n: number) => _fmt.format(n)
```

**Browser support:** All modern browsers including mobile Safari 14+ and Chrome 67+.
`Intl.NumberFormat` with `style: 'currency'` has been stable for years. No polyfill needed
for the target PWA audience. (HIGH confidence — MDN.)

---

### 4. Tailwind v4 Overlay/Modal Considerations

**Decision:** All required utilities exist in Tailwind v4. No new plugins or config needed.

The project uses CSS-first theming (`@theme` / CSS custom properties). All patterns from
HoleSheet transfer directly:

| Need | Utility | Notes |
|------|---------|-------|
| Full-screen backdrop | `fixed inset-0` | Unchanged in v4 |
| Backdrop dim | `bg-black/40` | Opacity syntax unchanged |
| Z-index stacking | `z-40` (backdrop), `z-50` (sheet) | Unchanged; app header uses `z-50` → sheet must be same or higher |
| Rounded top corners | `rounded-t-2xl` | Unchanged |
| Max height + scroll | `max-h-[90vh] overflow-y-auto` | Unchanged |
| iPhone safe area | `pb-[max(2rem,env(safe-area-inset-bottom))]` | Arbitrary value with CSS `env()` — works in v4 |
| Theme tokens | `bg-[var(--color-background)]` | Project convention; unchanged |

**Safe-area detail:** Tailwind v4 does not include a built-in `safe-area-inset` plugin, but
arbitrary values support `env()` directly in square brackets. The pattern
`pb-[max(2rem,env(safe-area-inset-bottom))]` ensures at least 2rem padding on all devices
and adds more on iPhones with a home indicator bar. This is the correct approach — no
additional package needed.

**Z-index note:** AppShell's header uses `z-50`. The modal backdrop at `z-40` sits under the
header's sticky bar visually — for a bottom sheet this is acceptable since the sheet rises
from below. If the sheet needs to cover the header too, use `z-[60]` on the sheet panel and
`z-[55]` on the backdrop. The existing HoleSheet uses the same `z-40`/`z-50` split without
issue.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@radix-ui/react-dialog` | Solves stacking context + focus trap well but is unnecessary — HoleSheet proves the hand-rolled pattern works | Extend `HoleSheet` pattern |
| `@headlessui/react` | Same rationale; adds 10–20KB for problems this app doesn't have | Extend `HoleSheet` pattern |
| `react-number-format` / `react-currency-input-field` | Full-featured masked input libs for a single amount field; ~20KB for a problem solvable with `inputMode="decimal"` + regex | Native `<input>` + `Intl.NumberFormat` |
| `react-star-ratings` / `react-rating` | ~5–15KB npm deps with style overrides for a 10-line component | Hand-rolled `<button>` row + Heroicons |
| `framer-motion` | Animation library for sheet slide-in; nice but zero-dep preference is strict | CSS `transition-transform` + `translate-y-full`/`translate-y-0` toggle if animation is wanted |
| `zod` | User explicitly dislikes Zod DX (see PROJECT.md); JSON Schema is the project standard | JSON Schema validation (existing pattern) |

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Hand-rolled bottom sheet (clone HoleSheet) | Radix UI Dialog | HoleSheet already proven; Radix adds bundle weight and a design-system dependency for a personal prototype |
| `Intl.NumberFormat` | `react-number-format` | Native API is sufficient; no dep budget for a single use case |
| Heroicons `StarIcon` buttons | `react-star-ratings` | Heroicons already a dep; 5 buttons is 10 lines of code |
| `createPortal` (react-dom, already dep) | Teleport/Portal library | `react-dom` is already in the dep tree |

---

## Installation

No new packages to install. Stack is fully covered by existing deps.

---

## Version Compatibility

All existing — no changes, no compatibility risks.

| Package | Current Version | Notes |
|---------|----------------|-------|
| react + react-dom | ^19.1.1 | `createPortal` stable since React 16; no change |
| @heroicons/react | ^2.2.0 | `24/solid` + `24/outline` star icons available |
| tailwindcss | ^4.3.1 | All overlay utilities unchanged; `env()` in arbitrary values works |
| clsx + tailwind-merge | already present | `cn` utility covers all new component needs |

---

## Sources

- `/reactjs/react.dev` (Context7) — `createPortal` dialog modal pattern, `useId` accessibility
- `/tailwindlabs/tailwindcss.com` (Context7) — v4 CSS-first config, backdrop-blur, overflow, fixed positioning, arbitrary values with `env()`
- [MDN Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) — currency formatting API, browser support
- [W3C WAI-ARIA Rating Radio Group Example](https://www.w3.org/TR/2021/NOTE-wai-aria-practices-1.2-20211129/examples/radio/radio-rating.html) — accessible star rating pattern
- [Scott O'Hara: Styled Radio Button Star Rating](https://scottaohara.github.io/a11y_styled_form_controls/src/radio-button--rating/) — accessible implementation reference
- Codebase analysis: `src/components/dashboard/HoleSheet.tsx`, `src/components/ui/{Button,FormField,Input,cn}`, `src/components/layout/AppShell.tsx`, `package.json`

---
*Stack research for: v0.5.0 Trips MVP UI — Expense modal, star rating, currency formatting*
*Researched: 2026-06-19*

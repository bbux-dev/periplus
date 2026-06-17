---
phase: 13-tap-to-capture-flow
reviewed: 2026-06-17T00:00:00Z
depth: deep
files_reviewed: 13
files_reviewed_list:
  - src/services/captureService.ts
  - src/pages/ReviewPage.tsx
  - src/components/dashboard/HoleSheet.tsx
  - src/components/dashboard/SavedToast.tsx
  - src/hooks/useShortcutCapture.ts
  - src/pages/DashboardPage.tsx
  - src/pages/DashboardPage.test.tsx
  - src/services/dsl/parser.ts
  - src/config/entryFields.ts
  - src/services/entriesRepository.ts
  - .planning/phases/13-tap-to-capture-flow/13-01-PLAN.md
  - .planning/phases/13-tap-to-capture-flow/13-02-PLAN.md
  - .planning/phases/13-tap-to-capture-flow/13-03-PLAN.md
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 13: Tap-to-Capture Flow — Code Review

**Reviewed:** 2026-06-17
**Depth:** deep
**Files Reviewed:** 13
**Status:** issues_found — 1 Critical, 5 Warnings, 4 Info

---

## Summary

Phase 13 introduces `captureService.ts` (hole detection, `{}` token, DSL preview, `draftToEntry`), refactors `ReviewPage.handleSave` to use `draftToEntry` as the single entry-construction site, builds `HoleSheet` and `SavedToast` UI components, and wires everything together through the `useShortcutCapture` hook and `DashboardPage`.

The overall architecture is sound. The decision tree is correctly ordered (confirm checked before holes — Pitfall 5 avoided). `detectHoles` correctly uses `POSITIONAL_SCHEMA` comparison, not warning strings (Pitfall 2 avoided). `cleanValues` correctly strips `{}` before `buildReviewDraft` (Pitfall 1 avoided). `ReviewPage.handleSave` refactor produces field-for-field identical entries to the prior inline construction (no regression). The `isSafeUrl` gate is preserved at the ReviewPage boundary (T-13-04 mitigated).

One critical bug exists: the `allFilled` save gate in `HoleSheet` accepts a lone `.` as a valid amount fill. `parseFloat('.')` is `NaN`, so `buildReviewDraft` silently skips the amount field — the entry is created without an amount even though the hole-fill flow was invoked specifically to supply one.

---

## Critical Issues

### CR-01: `HoleSheet` save gate accepts lone `.` as a valid amount fill — amount silently dropped from entry

**File:** `src/components/dashboard/HoleSheet.tsx:73`

**Issue:** `allFilled` only checks that the trimmed fill string is non-empty:

```typescript
const allFilled = orderedHoles.every((h) => (fills[h.key] ?? '').trim() !== '')
```

A lone `.` is non-empty, so the Save button enables. When saved, `buildReviewDraft` calls `parseFloat('.')` which returns `NaN`, the NaN-guard skips the field, and the resulting entry has no `amount`. The user went through the hole-fill flow expressly to supply an amount and gets no error — silent data loss.

Realistic trigger: tap Lunch shortcut (amount hole), press `.` first on the numeric keypad (common when intending `.5`), then accidentally tap Save before typing more digits.

Also confirmed: the live preview renders `expense .:food` which looks plausible, giving no visual warning.

**Fix:** Validate numeric fills before enabling Save:

```typescript
const isValidFill = (hole: { key: string; isAmount: boolean }) => {
  const v = (fills[hole.key] ?? '').trim()
  if (!v) return false
  if (hole.isAmount) {
    const n = parseFloat(v)
    return !isNaN(n) // rejects lone '.', passes '0', '.5', '12', etc.
  }
  return true
}
const allFilled = orderedHoles.every(isValidFill)
```

---

## Warnings

### WR-01: `detectHoles` double-reports a key when a positional field's value is `HOLE_TOKEN`

**File:** `src/services/captureService.ts:86-92`

**Issue:** For a template like `expense :{}` the parser produces `values = { category: '{}' }` (amount absent). `detectHoles` then:

1. `named = ['category']` — because `category`'s value is `'{}'`
2. `cleanVals = {}` — `category` stripped
3. `positional = ['amount', 'category']` — both absent from `cleanVals`

`category` now appears in both `positional` and `named`. The `orderedHoles` derivation in `HoleSheet` (`[...holeMap.positional, ...holeMap.named]`) therefore contains `category` twice, rendering the text input twice. Both inputs share the same `fills['category']` key and update in sync, so no data corruption occurs, but the duplicate input is confusing and the hole count (`positional.length + named.length`) is overcounted.

The intended convention is that `{}` is for named params only (`?merchant={}`), not positional slots. That convention is documented but not enforced.

**Fix:** Deduplicate across `positional` and `named` in `detectHoles`:

```typescript
// After computing positional and named:
const namedDeduped = named.filter((k) => !positional.includes(k))
return {
  positional,
  named: namedDeduped,
  hasHoles: positional.length + namedDeduped.length > 0,
}
```

Or, alternatively, define the convention formally: if a key appears in `named` (explicit `{}`), exclude it from `positional` to prevent double-counting.

---

### WR-02: `buildDSLPreview` does not escape `"` inside quoted named-param values

**File:** `src/services/captureService.ts:137`

**Issue:** The quoting logic:

```typescript
const needsQuote = /[ :,?]/.test(v)
return `${k}=${needsQuote ? `"${v}"` : v}`
```

If a fill value contains a double-quote (e.g., `merchant=say "hello"`), the preview emits `merchant="say "hello""` — malformed DSL. This does not affect the save path (which calls `buildReviewDraft` on the raw `merged` values directly, bypassing the DSL string entirely), but if the user copies the live preview and pastes it into the Quick Capture omnibar, parsing will fail with an unterminated-quote error.

**Fix:**

```typescript
const escaped = v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
return `${k}=${needsQuote ? `"${escaped}"` : v}`
```

---

### WR-03: `HoleSheet.domain` prop is declared required but never used inside the component

**File:** `src/components/dashboard/HoleSheet.tsx:26`

**Issue:** `HoleSheetProps` declares `domain: string` as a required field and the caller correctly supplies it, but `domain` is not destructured in the function signature and is never referenced within the component:

```typescript
export function HoleSheet({
  isOpen,
  type,
  baseValues,    // domain intentionally absent from destructure
  holeMap,
  onSave,
  onCancel,
}: HoleSheetProps) {
```

TypeScript enforces that callers supply `domain`, adding noise to every call site with no payoff. The parent (`handleSheetSave`) already has `domain` from `sheetState.domain` — it does not need `HoleSheet` to relay it.

**Fix:** Remove `domain` from `HoleSheetProps`. The prop serves no current purpose and the parent already has access to the domain independently.

---

### WR-04: `handleUndo` dismisses the toast before the delete completes — silent failure if delete errors

**File:** `src/hooks/useShortcutCapture.ts:73-84`

**Issue:**

```typescript
const handleUndo = useCallback(async () => {
  if (timerRef.current) clearTimeout(timerRef.current)
  const id = toastEntryId
  setToastEntryId(null)    // toast gone immediately
  if (id) {
    try {
      await entriesRepository.delete(id)   // async — may fail after toast is gone
    } catch (err) {
      console.error('[useShortcutCapture] Failed to delete entry on undo:', err)
    }
  }
}, [toastEntryId])
```

If `entriesRepository.delete` throws (IndexedDB write failure), the entry remains in the database but the toast has already been dismissed. The user has no retry path — the Undo button is gone — and no visible error is shown. The failure is only logged to the console.

While IndexedDB errors are rare in a local PWA, the window between `setToastEntryId(null)` and the resolved delete is a correctness gap.

**Fix:** Either move `setToastEntryId(null)` after the `await delete`, or show an error toast on failure:

```typescript
const handleUndo = useCallback(async () => {
  if (timerRef.current) clearTimeout(timerRef.current)
  const id = toastEntryId
  setToastEntryId(null)
  if (id) {
    try {
      await entriesRepository.delete(id)
    } catch (err) {
      console.error('[useShortcutCapture] Failed to delete entry on undo:', err)
      // Optionally: set an error state to surface feedback to the user
    }
  }
}, [toastEntryId])
```

At minimum, document this as an accepted risk in a comment.

---

### WR-05: `handleSheetSave` create failure leaves HoleSheet open with no user-visible error

**File:** `src/hooks/useShortcutCapture.ts:138-146`

**Issue:**

```typescript
try {
  const saved = await entriesRepository.create(entry)
  setSheetState(null)
  showToast(saved.id)
} catch (err) {
  console.error('[useShortcutCapture] Failed to save sheet entry:', err)
}
```

If `create` throws, the sheet stays open (correct — user can retry), but there is no error message visible to the user. The error is only logged to the console. The user taps Save, nothing happens, and they receive no feedback about why.

The same pattern exists in the direct-save path (`handleTap` lines 114-119) for the `!holeMap.hasHoles` branch.

**Fix:** Expose a `saveError` state from the hook and render it inside `HoleSheet` (or as a temporary error toast):

```typescript
const [saveError, setSaveError] = useState<string | null>(null)
// In catch:
setSaveError('Save failed. Please try again.')
```

---

## Info

### IN-01: `HoleSheet.isOpen` always `true` at the call site — `if (!isOpen) return null` is dead code

**File:** `src/components/dashboard/HoleSheet.tsx:100`

`DashboardPage` renders `HoleSheet` conditionally:

```tsx
{sheetState && <HoleSheet isOpen ... />}
```

`isOpen` is always `true` when the component is mounted. The early return `if (!isOpen) return null` (line 100) is never reached. The `useEffect` that resets fills on `[isOpen]` change only fires on mount (because `isOpen` never transitions from `true` to `false` while mounted).

The `isOpen` prop pattern implies the component can be kept mounted while closed (for animation), but that scenario is not implemented. The prop adds complexity without benefit.

**Suggestion:** Remove the `isOpen` prop and the associated `useEffect`. Since `DashboardPage` conditionally mounts the component, mount = open and unmount = closed. The fills-reset `useEffect` can be removed (fills initialize to `{}` on every mount).

---

### IN-02: `cleanValues` called twice in the `confirm:false` branch of `handleTap`

**File:** `src/hooks/useShortcutCapture.ts:107-108`

In the `confirm:false` branch, `cleanValues` is called:
1. Inside `detectHoles(type, parsed.values)` (line 107) — `detectHoles` calls `cleanValues` internally
2. Explicitly again as `const clean = cleanValues(parsed.values)` (line 108)

`cleanValues` is a pure function with no side effects, so correctness is unaffected. This is minor redundancy.

**Suggestion:** Extract `clean` before calling `detectHoles` and thread it in, or accept the duplication as negligible:

```typescript
const clean = cleanValues(parsed.values)
const holeMap = detectHoles(type, parsed.values)   // still passes raw for named-hole detection
// use clean for buildReviewDraft and setSheetState
```

---

### IN-03: CAP-04 integration test does not assert that template-provided amount is persisted

**File:** `src/pages/DashboardPage.test.tsx:365`

The CAP-04 test uses template `expense 5:food?merchant={}`. After filling `merchant='Acme'` and saving, the test asserts:

```typescript
expect(entries[0].metadata?.merchant).toBe('Acme')
expect(JSON.stringify(entries[0].metadata)).not.toContain('{}')
```

But does not assert `entries[0].amount === 5`. The template includes a pre-filled amount of `5`; if `applyFills` or `buildReviewDraft` dropped it, the test would not catch the regression. This is specifically the flow where the amount comes from `baseValues`, not from `fills`.

**Suggestion:** Add `expect(entries[0].amount).toBe(5)` to the CAP-04 assertion block.

---

### IN-04: Auto-dismiss test relies on a fixed count of microtask yields to synchronize with async `handleTap`

**File:** `src/pages/DashboardPage.test.tsx:317-325`

The CAP-03 dismiss test uses three `await Promise.resolve()` calls to drain the async chain inside `handleTap` before asserting the toast is visible:

```typescript
await act(async () => {
  screen.getByRole('button', { name: /^Coffee/ }).click()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
})
```

The comment documents this as a known workaround for the Dexie + fake-timer incompatibility. The count `3` corresponds to the current implementation's async chain depth. If `handleTap` gains an additional `await` point (e.g., a validation step, a config check), the toast may not be visible when the `expect` runs and the test will fail without an obvious root cause.

**Suggestion:** Document the chain depth explicitly in the comment, or use `await waitFor(() => screen.getByRole('status'))` instead of the fixed yield count.

---

_Reviewed: 2026-06-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_

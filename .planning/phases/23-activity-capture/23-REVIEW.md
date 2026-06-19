---
phase: 23-activity-capture
reviewed: 2026-06-19T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/config/activityTypes.ts
  - src/components/ui/StarRating.tsx
  - src/pages/ActivityTypePage.tsx
  - src/pages/ActivityFormPage.tsx
  - src/components/ui/StarRating.test.tsx
  - src/pages/ActivityTypePage.test.tsx
  - src/pages/ActivityFormPage.test.tsx
findings:
  critical: 0
  warning: 4
  info: 1
  total: 5
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-06-19
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 23 delivers the Activity Capture flow: a type-picker page, a form page, a reusable
StarRating widget, and their test suites. The save correctness is solid — `draftToEntry` is
called with the right arguments, `occurredAt` is correctly set to local-midnight epoch,
`tripId` is auto-stamped via `activeMode` and never hand-set, the `title` field maps to
`name`, and `rating:0` is correctly excluded from the draft. Validation blocks submission for
empty Name and for Other-type with empty Type; `noValidate` disables browser-native
validation and the form guards are correct. The hooks-before-returns ordering is correct and
the settled-signal pattern with the three-value `useLiveQuery` (rather than bare
`useActiveMode`) correctly avoids premature redirects. The double-submit `savingRef` guard
fires synchronously before any `await`. No security vulnerabilities were found.

Four warnings remain — three accessibility/keyboard issues in `StarRating` and its
integration, plus a `console.error` left in the production catch path.

---

## Critical Issues

None.

---

## Warnings

### WR-01: StarRating keyboard navigation is anchored to the focused button, not the current value

**File:** `src/components/ui/StarRating.tsx:14-21`

**Issue:** `handleKeyDown` receives `n` — the star button's own number — and derives the next
value as `n ± 1`. Because all five buttons remain independently focusable (no roving
tabindex), focus and the current rating can diverge. Concretely:

1. User selects 3 stars (value = 3, focus stays on button-3).
2. User presses ArrowRight on button-3 → `onChange(4)`. value becomes 4. Correct.
3. User presses ArrowRight again (still focused on button-3) → `onChange(4)`. No change.
   Rating is stuck at 4; the user cannot reach 5 from this position without tabbing or tapping.

Conversely, if the user tabs to button-4 while value = 2 and presses ArrowLeft,
`onChange(Math.max(0, 3))` = `onChange(3)` is called, which *increases* the rating despite
the Left key semantically meaning "decrease."

**Fix:** Base navigation on the current `value` prop, not on the focused button's number:

```tsx
function handleKeyDown(e: React.KeyboardEvent) {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    onChange(Math.min(5, value + 1))
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    onChange(Math.max(0, value - 1))
  }
}
```

Remove the `n` parameter from `handleKeyDown` and update the `onKeyDown` binding:
`onKeyDown={handleKeyDown}`.

---

### WR-02: Rating `<label htmlFor="activity-rating">` points to a non-existent element ID

**File:** `src/pages/ActivityFormPage.tsx:182-186`

**Issue:** The label at line 182 has `htmlFor="activity-rating"`, but `StarRating` renders a
`<div role="group" aria-label="Rating">` with no `id` attribute, and none of the inner
`<button>` elements carry `id="activity-rating"`. The `htmlFor` reference is dangling:

- Clicking the "Rating" label text does nothing (clicking a `<label>` whose `htmlFor`
  targets a missing element has no browser action).
- Assistive technologies cannot programmatically associate the label text with the control
  group, so screen readers must rely solely on the group's own `aria-label="Rating"`.

**Fix (option A — simplest):** Remove `htmlFor` from the label and let the group's own
`aria-label` carry the label relationship. Rename the `<label>` to a `<p>` or `<span>` with
a visually-equivalent style, or wrap in a `<fieldset>`/`<legend>` instead:

```tsx
{/* use fieldset + legend for a proper group label */}
<fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
  <legend className="text-sm font-medium text-[var(--color-foreground)]">Rating</legend>
  <StarRating value={rating} onChange={setRating} />
</fieldset>
```

**Fix (option B):** Forward an `id` prop into `StarRating` and apply it to the `<div
role="group">`, then use `aria-labelledby` instead of `aria-label`.

---

### WR-03: `aria-pressed` only marks the exact selected star; cumulative fill is invisible to screen readers

**File:** `src/components/ui/StarRating.tsx:31-32`

**Issue:** `aria-pressed={value === n}` is `true` only for the exactly-matching star. Stars
1 through `value - 1` are visually filled (the `n <= value` condition at line 40 fills them
with `StarIcon`) but announce as `aria-pressed="false"`. A screen reader user hears:
"1 star, not pressed / 2 stars, not pressed / 3 stars, pressed / 4 stars, not pressed / 5
stars, not pressed" for value = 3 — it is impossible to tell from the button states that the
rating means "3 out of 5." There is also no live-region or group label that announces the
current overall value.

**Fix:** Announce the current value on the group element so it does not have to be inferred
from the button states:

```tsx
<div
  role="group"
  aria-label={value > 0 ? `Rating: ${value} of 5 stars` : 'Rating: not set'}
  className="flex gap-1"
>
```

Separately, for the toggle-button semantic to be unambiguous, consider whether `aria-pressed`
on each button should reflect the cumulative fill (`n <= value`) rather than the exact match,
or switch to a `radiogroup`/`radio` pattern which maps more naturally to a 1-of-5 selection.

---

### WR-04: `console.error` left in production save path

**File:** `src/pages/ActivityFormPage.tsx:115`

**Issue:**

```ts
} catch (err) {
  console.error('ActivityFormPage save failed:', err)
```

This logs to the browser console on every Dexie write failure in production. The project
has no error-reporting infrastructure behind `console.error`, so this only adds noise for
end users who have DevTools open and reveals internal exception details.

**Fix:** Either remove the `console.error` entirely (the `errors._form` message shown to the
user is sufficient) or gate it on a dev-only flag:

```ts
} catch (err) {
  if (import.meta.env.DEV) console.error('ActivityFormPage save failed:', err)
  setErrors({ _form: 'Could not save. Please try again.' })
}
```

---

## Info

### IN-01: Unknown URL slug silently coerces to the "Other" form with no user feedback

**File:** `src/pages/ActivityFormPage.tsx:20-22`

**Issue:** Any slug that does not match a known type (e.g., `/activity/hiking-trail` from a
stale bookmark or manual URL edit) silently resolves to `canonicalType = 'Other'` and
`isOther = true`. The page heading renders "Other," the free-text Type field appears, and
validation requires it — but the user sees no explanation of why the type-picker choice
they expected did not load.

This is low-severity (the flow still works correctly; the user can enter a type and save),
but it may be confusing if deep links from future features use slugs that drift out of sync
with `ACTIVITY_TYPES`.

**Fix (optional):** Add a brief note when `canonicalType !== slug` (accounting for casing),
or log a warning in development to catch slug drift early:

```ts
if (import.meta.env.DEV && type && canonicalType === 'Other' && type !== 'other') {
  console.warn(`ActivityFormPage: unknown slug "${type}", falling back to Other`)
}
```

---

## Save-path Correctness Sign-off

The following items from `<review_focus>` were verified and found correct:

| Item | Verdict |
|---|---|
| `draftToEntry('activity', 'trips', activeMode)` call | Correct — line 111 |
| Slug → canonical label resolution | Correct — `find(t => t.toLowerCase() === type) ?? 'Other'` |
| Unknown slug → 'Other' + Type field required | Correct — `isOther = canonicalType === 'Other'` |
| Other free-text used as `activityType` | Correct — `isOther ? activityTypeField.trim() : canonicalType` |
| `occurredAt` = local-midnight epoch | Correct — `todayLocalMidnightEpoch()` |
| `tripId` NOT hand-set | Correct — stamped exclusively by `draftToEntry` via `activeMode.tripId` (STAMP-02) |
| `title` = Name input | Correct — `title: name.trim()` |
| Name required all types | Correct — validate() guards |
| Other → Type also required | Correct — `isOther && !activityTypeField.trim()` guard |
| Both errors block with messages (noValidate) | Correct — FormField `role="alert"` pattern |
| `rating: 0` NOT written to draft | Correct — `rating > 0 ? { rating } : {}` spread |
| Double-submit guard (`savingRef`) | Correct — synchronous guard before any `await` |
| try/catch around Dexie write | Correct — lines 91-120 |
| Settled-signal `useLiveQuery` (not bare `useActiveMode`) | Correct — three-value ready/mode pattern |
| All hooks hoisted above early returns | Correct — hooks on lines 27-53, returns on lines 57-67 |
| Navigate target `/create-trip` | Correct — line 66 |

---

_Reviewed: 2026-06-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

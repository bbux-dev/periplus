---
phase: 05-manual-entry
reviewed: 2026-06-15T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/config/entryFields.ts
  - src/pages/ManualEntryPage.tsx
  - src/pages/ReviewPage.tsx
  - src/App.tsx
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-06-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Four source files reviewed for Phase 5 (Manual Entry). Cross-referenced against `src/services/db.ts`, `src/services/extractMetadataFromUrl.ts`, `src/services/entriesRepository.ts`, `src/config/navigation.ts`, and `src/components/ui/FormField.tsx`.

The core architecture is sound. All 7 EntryTypes are covered in `ENTRY_FIELDS`. Mapping correctness is verified: `expense.amount` → `core.amount`; `place.name` → `core.title`; `place.address` → `core.location`; media `creator`/`rating` and expense `currency`/`category`/`merchant` → metadata. NaN handling is consistent (both `core.amount` and metadata number fields skip NaN). Phase 4 URL-capture behavior is preserved. No type guard is missing. The save path is shared correctly.

Three warnings are found: an unimplemented `required` declaration that creates a false interface contract, a missing loading/disabled state that allows duplicate saves, and a UTC-midnight date storage pattern that will silently produce off-by-one date display in western-hemisphere timezones. Three info items are noted for future hygiene.

No critical (data-loss, security, or crash) issues found.

---

## Warnings

### WR-01: `FieldDescriptor.required` declared but never enforced — users can save empty forms

**File:** `src/config/entryFields.ts:28` (declaration), `src/pages/ManualEntryPage.tsx:89-100` (rendering site)

**Issue:** Every type's title field carries `required: true` in `ENTRY_FIELDS`, and `FieldDescriptor` types the property explicitly. `FormField` extends `InputHTMLAttributes<HTMLInputElement>` and spreads all props onto the underlying `<Input>`, so it would honour an HTML `required` attribute if passed. But `ManualEntryPage` never passes `required={field.required}` to `<FormField>`, and `handleReview` performs no pre-flight validation. A user can click Review on a completely empty form; `buildReviewDraft` skips every empty value and returns `{ metadata: {} }`; ReviewPage then saves the entry as `title: 'Untitled'`. The `required` property is a misleading dead declaration.

**Fix:** Either enforce the contract at the call site, or remove the property if it is deliberately advisory:

```tsx
// ManualEntryPage.tsx — pass the required prop through
<FormField
  key={field.key}
  id={`manual-${field.key}`}
  label={field.label}
  type={field.inputType === 'tags' ? 'text' : field.inputType}
  placeholder={field.placeholder}
  required={field.required}            // <-- add this
  value={formValues[field.key] ?? ''}
  onChange={(e) => handleChange(field.key, e.target.value)}
/>
```

And add a pre-flight check in `handleReview` for required fields that are still empty (browser `required` validation only fires inside a `<form>` submit; a button `onClick` bypasses it):

```tsx
const handleReview = () => {
  const missing = fields.filter((f) => f.required && !formValues[f.key]?.trim())
  if (missing.length > 0) {
    // surface error UI or rely on HTML required + form submit; for now, early return
    return
  }
  const draft = buildReviewDraft(fields, formValues)
  navigate(`/d/${domain}/${type}/review`, { state: { draft } })
}
```

---

### WR-02: Save button not disabled during async save — double-click creates duplicate entries

**File:** `src/pages/ReviewPage.tsx:76-107` (`handleSave`), `src/pages/ReviewPage.tsx:185`

**Issue:** `handleSave` is async. The Save `<Button>` has no `disabled` state and no `isSaving` guard. A user who double-clicks Save (or clicks while the Dexie write is in flight) invokes `entriesRepository.create(entry)` twice concurrently. Because `create` generates a fresh `crypto.randomUUID()` on every call, both writes succeed and two identical-content entries with different UUIDs are persisted. There is no deduplication mechanism and no user-visible undo.

**Fix:** Add an `isSaving` flag:

```tsx
const [isSaving, setIsSaving] = useState(false)

const handleSave = async () => {
  if (isSaving) return
  setIsSaving(true)
  setSaveError(null)
  // ... existing logic ...
  try {
    await entriesRepository.create(entry)
    navigate(`/d/${domain}`)
  } catch (err) {
    setSaveError('Save failed. Please try again.')
    console.error('[ReviewPage] save failed:', err)
  } finally {
    setIsSaving(false)
  }
}

// In JSX:
<Button variant="primary" onClick={handleSave} disabled={isSaving}>
  {isSaving ? 'Saving…' : 'Save'}
</Button>
```

---

### WR-03: `Date.parse('YYYY-MM-DD')` stores UTC midnight — silently wrong date in UTC-offset timezones

**File:** `src/config/entryFields.ts:131` (`buildReviewDraft`), `src/pages/ReviewPage.tsx:82` (`handleSave`)

**Issue:** Per the ECMAScript spec, date-only ISO strings (`'2024-01-15'`) are parsed as **UTC midnight**, not local midnight. `Date.parse('2024-01-15')` therefore returns 1705276800000 ms (midnight UTC). For a user in New York (UTC-5), that epoch is 7 PM local time on **January 14**, not January 15. Any future display code that formats `occurredAt` in local time will show the previous calendar day. Both paths are affected:

- `buildReviewDraft` (entryFields.ts:131) stores this epoch in `draft.occurredAt`
- `handleSave` in ReviewPage (line 82) writes `Date.parse(occurredAt)` directly to the entry

The comment in `buildReviewDraft` acknowledges "UTC midnight" but does not flag it as a hazard. The ReviewPage `toISOString().split('T')[0]` display round-trips correctly only because `toISOString()` is also UTC — this masks the bug until local-time display is added.

**Fix:** Interpret date-only inputs as local midnight by appending `T00:00:00` (which the spec treats as local time) before parsing:

```ts
// entryFields.ts — buildReviewDraft, occurredAt case
case 'occurredAt': {
  const t = Date.parse(`${raw}T00:00:00`)  // local midnight, not UTC
  if (!isNaN(t)) draft.occurredAt = t
  break
}
```

```ts
// ReviewPage.tsx — handleSave
const parsedDate = occurredAt ? Date.parse(`${occurredAt}T00:00:00`) : NaN
```

And update the state initializer for consistency:

```ts
// ReviewPage.tsx — useState for occurredAt
const [occurredAt, setOccurredAt] = useState(
  initialDraft?.occurredAt
    ? new Date(initialDraft.occurredAt).toLocaleDateString('en-CA')  // 'YYYY-MM-DD' in local tz
    : '',
)
```

---

## Info

### IN-01: Redundant optional chaining on `initialDraft?.amount` after null guard

**File:** `src/pages/ReviewPage.tsx:164`

**Issue:** `initialDraft?.amount` uses `?.` inside the JSX block that only renders after the `if (!initialDraft) return null` guard at lines 72-74. `initialDraft` is guaranteed non-null at this point; the optional chain is inaccurate and could confuse future readers into thinking `initialDraft` might still be null here.

**Fix:**
```tsx
{(type === 'expense' || initialDraft.amount != null) && (
```

---

### IN-02: ReviewPage domain/type error UIs lack back navigation

**File:** `src/pages/ReviewPage.tsx:59-70`

**Issue:** The error UIs for unknown domain (`!config`, lines 59-63) and unknown type (`!typeConfig`, lines 65-70) render bare `<p>` elements with no Back button and no layout shell, leaving the user with no escape route. ManualEntryPage's equivalents (lines 34-52 and 55-72) include a full layout and a Back button. The inconsistency was carried from Phase 4 but is now more visible because Phase 5 adds a sibling page (ManualEntryPage) that handles the same guard patterns better.

**Fix:** Match ManualEntryPage's guard UI pattern (include the back button and layout wrapper).

---

### IN-03: `rating` placeholder constraint ('1–5') is advisory only — no range enforcement

**File:** `src/config/entryFields.ts:31` (and lines 39, 47, 55)

**Issue:** The `rating` field across all media types carries `placeholder: '1–5'` signalling intent, but `buildReviewDraft` calls `parseFloat(raw)` without a range check and stores whatever the user typed. Values like `-1`, `0`, `100`, or `1e5` (100000) are silently persisted as `metadata.rating`. This only matters if future display or analytics code treats rating as bounded.

**Fix:** Add a range clamp or validation in `buildReviewDraft` when `field.mapTo.key === 'rating'`, or document the unbounded contract explicitly in `FieldDescriptor` (e.g., add `min`/`max` fields). For now, a comment is the minimum acceptable action:

```ts
// entryFields.ts — rating fields
{ key: 'rating', label: 'Rating', inputType: 'number', placeholder: '1–5',
  // NOTE: range is advisory; buildReviewDraft stores any parseFloat value
  mapTo: { kind: 'metadata', key: 'rating' } },
```

---

_Reviewed: 2026-06-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

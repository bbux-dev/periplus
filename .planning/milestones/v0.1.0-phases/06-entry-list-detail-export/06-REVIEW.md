---
phase: 06-entry-list-detail-export
reviewed: 2026-06-15T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/services/urlUtils.ts
  - src/services/exportEntries.ts
  - src/pages/EntryListPage.tsx
  - src/pages/EntryDetailPage.tsx
  - src/services/entriesRepository.ts
  - src/pages/DashboardPage.tsx
  - src/App.tsx
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-06-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 6 introduces `urlUtils.isSafeUrl`, `exportEntries` (pure `buildExportJson` + `triggerDownload`
shim), the `useEntry` tri-state hook, `EntryListPage`, `EntryDetailPage`, Dashboard `/entries` link,
and App route wiring.

The security-sensitive paths are sound: `isSafeUrl` correctly gates `javascript:` and other
non-http/s schemes; `EntryDetailPage` uses a React text node (not `dangerouslySetInnerHTML`) for
the metadata `<pre>`; the sourceUrl guard is correct. The tri-state `useEntry` contract
(`undefined` → loading, `null` → not found, `LifeLogEntry` → found) is correctly implemented and
correctly consumed by `EntryDetailPage`. The export correctly uses `allEntries` (full unfiltered
set) per EXP-01, with `Date.now()` injected at the call site to keep `buildExportJson` pure.
Domain-scoped type-label lookup is correctly scoped per domain, avoiding the cross-domain
`expense` collision. `amount != null` correctly includes `amount === 0` in both list and detail
views.

Three warnings and one info item are noted below.

## Warnings

### WR-01: `triggerDownload` blob URL not revoked if a DOM operation throws

**File:** `src/services/exportEntries.ts:46-53`

**Issue:** `URL.createObjectURL(blob)` is called at line 46. The code then performs several DOM
mutations (`appendChild`, `click`, `removeChild`) before calling `URL.revokeObjectURL(url)` at
line 53. If any of those DOM operations throw (e.g. an extension intercepting the click event,
or a test environment where `document.body` is detached), the `revokeObjectURL` call is never
reached and the Blob URL leaks for the lifetime of the document.

**Fix:** Move `revokeObjectURL` into a `finally` block so cleanup is guaranteed regardless of
whether the DOM operations succeed:

```typescript
export function triggerDownload(json: string, filename = 'life-log.json'): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } finally {
    URL.revokeObjectURL(url)
  }
}
```

---

### WR-02: Empty-state copy "No entries yet." misleads when a domain filter is active

**File:** `src/pages/EntryListPage.tsx:104-106`

**Issue:** `filtered.length === 0` triggers the message "No entries yet." in all cases —
including when the user has selected a domain filter (e.g. "Media") but entries exist in other
domains. A user who switches to the "Media" filter and sees "No entries yet." is incorrectly
told they have no entries at all; the real situation is that they have no *media* entries.

This is a logic correctness issue in user feedback, not merely a phrasing preference.

**Fix:** Vary the message based on `filter`:

```tsx
{filtered.length === 0 ? (
  <p className="text-center opacity-60 text-sm py-8">
    {filter === 'all'
      ? 'No entries yet.'
      : `No ${FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? filter} entries yet.`}
  </p>
) : (
  ...
)}
```

---

### WR-03: Duplicate tag strings produce React key collision and duplicate chips

**File:** `src/pages/EntryDetailPage.tsx:138-146`

**Issue:** Tags are rendered with `key={tag}` (the tag string value). The `LifeLogEntry.tags`
field is typed as `string[]` with no uniqueness constraint, and `entriesRepository.create()` /
`.update()` impose no deduplication. If an entry is stored with duplicate tag strings (e.g.
`["food", "food"]`), React emits a duplicate-key warning, reconciliation may be incorrect, and
the UI renders the same chip twice — which the user would see as a data glitch.

**Fix:** Deduplicate at the render site (non-destructive, does not mutate stored data):

```tsx
{[...new Set(entry.tags)].map((tag) => (
  <span key={tag} className="...">
    {tag}
  </span>
))}
```

Longer-term, enforce uniqueness in the form layer before persisting.

---

## Info

### IN-01: Export button is active even when the entry list is empty

**File:** `src/pages/EntryListPage.tsx:115-121`

**Issue:** When `allEntries.length === 0`, clicking "Export JSON" triggers a download of
`{"version":1,"exportedAt":<ms>,"entries":[]}`. This is valid JSON and does not crash, but
silently exporting an empty log may confuse users who expected data to be present.

**Fix:** Disable the button (or hide it) when there is nothing to export:

```tsx
<button
  onClick={handleExport}
  disabled={allEntries.length === 0}
  className="..."
>
  Export JSON
</button>
```

---

_Reviewed: 2026-06-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

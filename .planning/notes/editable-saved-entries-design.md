---
title: Editable saved entries — design
date: 2026-06-18
context: /gsd:explore session; companion to active-mode design
status: design-note (seeds next milestone)
---

# Editable saved entries

## Problem

Saved entries are currently **read-only** (`EntryDetailPage.tsx` shows a detail view with no
edit UI). The repository already exposes `entriesRepository.update(id, changes)` — the
capability exists, it's just not wired to any form. Quick-capture is fast but lossy: amounts
get fat-fingered, metadata is missing, the wrong mode was active.

## Scope (what the user actually needs)

1. **Add / edit metadata** — tags, mode/`modeLabel`, merchant, category, notes on an
   already-saved entry. (The original "add metadata" ask.)
2. **Fix core fields** — amount, date (`occurredAt`), title, location — correct quick-capture
   mistakes.
3. **Delete entry** — remove entirely (table-stakes).

Re-assigning an entry into/out of a mode-group is **not a separate feature** — it's just
editing `metadata.mode` / `metadata.modeLabel` (see #1).

## Approach

- Wire an **edit mode** onto `EntryDetailPage` (or a dedicated edit route) that renders the
  same field set used for capture — reuse `ENTRY_FIELDS[type]` + `buildReviewDraft` so the
  edit form matches the create form and the DSL/field config stays the single source of truth.
- Persist via the existing `entriesRepository.update(id, changes)`.
- Delete via a confirm + `entriesRepository.delete` (add if missing).
- Keep `recordedAt` immutable; allow `occurredAt` to be edited.

## Touchpoints

- `src/pages/EntryDetailPage.tsx` — add edit/delete affordances.
- `src/config/entryFields.ts` — reuse `ENTRY_FIELDS` + `buildReviewDraft` for the edit form.
- `src/services/entriesRepository.ts` — `update()` exists; confirm/add `delete()`.

## Related

- [[active-mode-navigation-design]] — editing `metadata.mode`/`modeLabel` is how you fix a
  mis-stamped entry after the fact.
- [[default-occurredat-today]] — the date field this edits should also default sanely on create.

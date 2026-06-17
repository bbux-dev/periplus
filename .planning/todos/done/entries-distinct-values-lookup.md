---
title: Add distinct-values lookup to entriesRepository
date: 2026-06-16
priority: medium
---

# Add distinct-values lookup to entriesRepository

Add a helper to `src/services/entriesRepository.ts` that returns the **distinct values**
seen across existing entries for a given suggestable field, ranked by frequency
(most-used first). Powers the history-backed **value suggestions** of the Quick-Capture
DSL (note `quick-capture-dsl-design`).

## Scope

- Fields to cover: `metadata.category`, `metadata.merchant`, and `tags` (array — count
  each tag).
- Return shape: e.g. `Array<{ value: string; count: number }>`, frequency-desc.
- Optional prefix filter for typeahead (`food` matches `fo`), case-insensitive.
- Reactive variant (Dexie live query) if it backs an inline omnibar dropdown.

## Why first / why standalone

- **Parser-independent** — no dependency on the DSL grammar or omnibar; can land and be
  tested in isolation.
- Unblocks the value-suggestion layer, the main fix for freeform-category drift.

## Notes

- `metadata` is an unindexed opaque bag in Dexie (`LifeLogDB`); this is a scan/aggregate
  over entries, not an index lookup. Fine at personal-log scale; revisit if entry counts
  grow large.

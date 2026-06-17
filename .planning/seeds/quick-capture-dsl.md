---
title: Quick-Capture DSL
trigger_condition: When v0.2.0 (or next) milestone scope is being set — run at /gsd:new-milestone
planted_date: 2026-06-16
---

# Quick-Capture DSL

A URL-esque shorthand to capture entries in one line, replacing slow multi-field forms
(esp. expense). Full design in note `quick-capture-dsl-design`.

**One-line pitch:** `[type] slot1:slot2 ?k=v` omnibar with type-token + history-backed
value suggestions, parsing into the existing ReviewPage with live preview before commit.

## Why this is a strong v0.2.0 candidate

- Directly attacks the #1 friction from v0.1.0: long forms, expense worst.
- High architecture leverage — reuses `buildReviewDraft → ReviewPage`; net-new surface
  is parser + omnibar + suggestion lookups.
- Suggestions make freeform categories self-converge (fixes a latent data-quality issue).

## Suggested phase shape when promoted

1. **`entriesRepository` distinct-values lookup** (todo `entries-distinct-values-lookup`)
   — parser-independent, land first; unblocks value suggestions.
2. **Parser + grammar** — de-risk with the spike first (type-token vs title disambiguation,
   quoting).
3. **Omnibar UI + suggestions** — type-token menu (resolves p/e single-letter collisions),
   history-backed value suggestions, live parse preview.
4. **Wire into ReviewPage** — pre-fill draft, confirm-before-save.

## Open items to resolve at promotion

- Spike outcome on parser feasibility (see spike artifact).
- Whether content-based type inference and field-key suggestions enter v0.2.0 or defer.

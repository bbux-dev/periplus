---
title: "Spike: Quick-Capture DSL parser feasibility"
date: 2026-06-16
priority: high
type: spike
---

# Spike: Quick-Capture DSL parser feasibility

Throwaway prototype to de-risk the **one genuine unknown** in the Quick-Capture DSL
(note `quick-capture-dsl-design`) before committing the grammar.

Run with `/gsd:spike` when ready.

## Question

Can a type-agnostic parser reliably turn `[type] slot1:slot2 ?k=v, k=v` into the flat
`Record<string, string>` formValues that `buildReviewDraft` expects — handling the messy
cases — without becoming a footgun?

## Specific risks to probe

1. **Hybrid type-token vs positional title.** In `movie Blade Runner 2049`, is `movie`
   the type or the start of a title? Resolution: known type keywords are reserved as a
   leading token; ambiguity falls back to domain context + the suggestion menu.
2. **Single-letter type collisions.** `p` = podcast|place, `e` = event|expense. Confirm
   the suggestion menu (not the parser) is the disambiguation point.
3. **Quote / escape handling.** `book "Dune: A Novel":Herbert` — colons, commas, spaces
   inside quoted values; unterminated quotes; nested/escaped quotes.
4. **Partial input.** Slot2 omitted then `?named` (`movie "X"?rating=5`); trailing `?`
   with no params; empty positionals.

## Method

- Write a standalone parser function + a table of ~15 real example strings (cover all 7
  types, quoted free text, the p/e collisions, partial input, malformed input).
- Assert each parses to the expected formValues (or flags ambiguity for review).
- Throwaway code — the deliverable is a go/no-go on the grammar + a list of edge cases
  that must route to ReviewPage rather than parse silently.

## Success criteria

- Clean parses for the happy-path examples across all types.
- Ambiguous/malformed inputs are detected (not silently mis-parsed) so they can fall
  through to the review screen.
- Confirmation that per-type positional schemas can live as small declarations beside
  `ENTRY_FIELDS`.

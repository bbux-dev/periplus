# Spike Manifest

## Idea

A **Quick-Capture DSL** for Life Log — a URL-esque shorthand (`[type] pos1:pos2 ?k=v,k=v`)
that replaces the slow multi-field entry forms (expense worst) with a single typed line,
generalized across all 7 entry types. Parsed input pre-fills the existing `ReviewPage` with
a live preview before save. Full design in `.planning/notes/quick-capture-dsl-design.md`.

## Requirements

Design decisions, validated or hardened by spiking. Non-negotiable for the real build:

- **Parser is type-agnostic** and reads per-type positional schemas declared beside
  `ENTRY_FIELDS` — `slot1 = primary identity, slot2 = secondary`. (confirmed feasible, S001)
- **Exact-only type resolution in the parser.** Prefix/partial tokens (`p`, `e`, `boo`) are
  NOT resolved by the parser — they return `ambiguous` and are disambiguated by the
  suggestion menu. (S001)
- **Always route through ReviewPage** with live preview; never direct-save. Spiking the
  leading-type-word footgun confirmed silent saves would mis-capture. (S001)
- **Multi-value params (e.g. `tags`) must be quoted** — `tags="a, b, c"` — because `,`
  separates named params. (discovered S001)
- **Three parse statuses:** `ok` (pre-fill + confirm), `ambiguous` (prompt type pick),
  `error` (route to ReviewPage with the issue shown). (S001)

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | dsl-parser | standard | Type-agnostic parse → formValues, else flagged for ReviewPage | ✅ VALIDATED | dsl, parser, quick-capture, entry-fields |

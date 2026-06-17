---
spike: 001
name: dsl-parser
type: standard
validates: "Given a Quick-Capture DSL string, when parsed type-agnostically, then it yields the flat formValues buildReviewDraft expects — OR is flagged (ambiguous/error) for ReviewPage instead of silently mis-parsed"
verdict: VALIDATED
related: []
tags: [dsl, parser, quick-capture, entry-fields]
---

# Spike 001: DSL Parser

## What This Validates

> **Given** a Quick-Capture DSL string `[type] pos1:pos2 ?k=v,k=v`,
> **when** a type-agnostic parser reads it against per-type positional schemas,
> **then** it produces the flat `Record<string,string>` formValues that
> `buildReviewDraft()` (`src/config/entryFields.ts`) consumes — and any messy/ambiguous
> input is **flagged** (status `ambiguous`/`error`) for ReviewPage rather than saved silently.

## Research

None needed — pure string parsing, no external dependencies. The parser mirrors the
existing type/field registry from `src/config/navigation.ts` + `src/config/entryFields.ts`
(hardcoded here as `POSITIONAL_SCHEMA` / `FIELD_KEYS` / `NAMED_ALIASES`).

## How to Run

```bash
# Automated assertions (24 cases across all 7 types + the 4 risk areas)
node test.js

# Interactive playground — type strings, watch them parse live
#   open index.html in a browser (file:// is fine; parser.js loads via <script src>)
```

## What to Expect

- `node test.js` → a results table, **24/24 passed**.
- `index.html` → an input box + example chips. Green = clean parse (pre-fills ReviewPage),
  amber = ambiguous (needs type pick), red = error (route to ReviewPage). The field-values
  table updates on every keystroke, mirroring the live-preview UX the design calls for.

## Investigation Trail

1. **Built the tokenizer first.** Quote-aware `splitTopLevel` / `indexOfTopLevel` so that
   `:`, `,`, `?` inside `"..."` are literal. This is the whole ballgame — without it,
   `book "Dune: A Novel":Herbert` is unparseable.
2. **Type extraction rule landed on "exact-only."** The parser resolves a leading token
   ONLY if it's a full type name or an explicit alias (`exp`). Partial tokens that are a
   prefix of ≥1 type (`p`, `e`, `boo`) return `ambiguous` — deliberately punting prefix
   resolution to the suggestion menu, exactly as the design intended. This cleanly answers
   risk #2.
3. **Risk #1 (leading type-word hijack) resolved as defined behavior, not a bug.**
   `show dogs:5` in the expenses domain parses as type `show` (leading word wins) — but the
   parser emits a **soft warning** when the hijacked type differs from the domain default.
   The escape hatch is quoting: `"show dogs"` keeps it as text. Both paths tested.
4. **Edge cases surfaced two findings worth carrying into the build** (below).
5. **Distinguished `error` from `ambiguous`.** `ambiguous` = "I need you to pick a type"
   (recoverable via suggestions). `error` = malformed (unterminated quote, missing `=`,
   unknown field) → hard route to ReviewPage. Both are "don't save silently," but they
   drive different UI affordances.

## Results

**VERDICT: VALIDATED.** A ~190-line type-agnostic parser handles the full grammar across
all 7 types, and — critically — every messy input either parses correctly or is flagged.
Nothing mis-parses *silently*, which was the real risk.

**24/24 assertions pass**, covering: all 7 happy-path types, alias (`exp`), domain-inferred
type, unquoted spaces in titles, quoted colons, escaped quotes (`\"`), slot-2 omission,
the `p`/`e` collisions, no-type-no-context, unterminated quotes, missing `=`, empty param
name, empty positional slot, unknown field, and trailing `?`.

### Two findings that MUST shape the build

1. **The tags/comma trap.** `?` named params are comma-separated, but `tags` is itself
   comma-multi-valued. `?tags=a,b,c` parses as three params, two of which lack `=` → it
   correctly errors, but the *fix* is a rule the UI must teach: **multi-value params must be
   quoted** — `?tags="a, b, c"` works (and `buildReviewDraft` then splits on comma as usual).
   Decision for the build: either require quoting for `tags`, or pick a non-comma inner
   separator (e.g. `tags=a|b|c`). Recommend **quoting** — keeps one mental model.

2. **Leading type-words are a real footgun, and that's *why* ReviewPage-always is correct.**
   `show dogs` meaning a `$`-less expense note can't be disambiguated by the parser. The
   soft-warning + live preview is the safety net. This spike confirms the explore-session
   decision to never direct-save was the right one — direct-save would have shipped silent
   mis-parses here.

### Edge cases that MUST route to ReviewPage (never save silently)

| Input shape | Status | Why |
|-------------|--------|-----|
| `p ...`, `e ...`, any partial type | `ambiguous` | prefix → needs suggestion-menu pick |
| no type + no domain context | `ambiguous` | can't infer a single type |
| unterminated quote `"Dune:Herbert` | `error` | malformed |
| param missing `=` (incl. unquoted multi-comma tags) | `error` | malformed |
| empty param name `?=blue` | `error` | malformed |
| unknown field `?colour=` | `error` | not a field on this type |

### Confirmed for the build

- **Per-type positional schemas fit as tiny declarations** next to `ENTRY_FIELDS`
  (`POSITIONAL_SCHEMA` here is 7 one-line entries). The parser stays type-agnostic and reads
  them the way `buildReviewDraft` reads `mapTo`. No structural change to the entry model.
- Parser output is **already** the `formValues` shape — drop-in for `buildReviewDraft`.
- Aliases (`exp`, `date→occurredAt`, `note→description`) are trivial and improve ergonomics.

### Not covered (deferred, out of scope for feasibility)

- Suggestion-menu UI (type prefixes, history-backed values) — feasibility never in doubt;
  it's UI + the distinct-values lookup (todo `entries-distinct-values-lookup`).
- Content-based type inference (`lunch $12` → expense).
- Currency-symbol / amount-format parsing (`$12.50`, `12,50`) — parser keeps amount as a
  raw string; `buildReviewDraft` already `parseFloat`s + skips NaN, so malformed amounts
  degrade gracefully, but the build should decide whether to strip `$`.

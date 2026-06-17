---
title: Quick-Capture DSL — design
date: 2026-06-16
context: Exploration (/gsd:explore). Long multi-field forms (esp. expense) are slow.
  A URL-esque shorthand DSL feeding the existing ReviewPage as a fast input method.
---

# Quick-Capture DSL — design

## Problem

The v0.1.0 manual-entry forms are unwieldy for fast capture — most painful for
**expense**, where every entry means tabbing through amount / category / merchant /
currency / date / notes. We want a compact, URL-esque shorthand to capture an entry
in one line, generalizable across all 7 entry types.

## Grammar

```
[type] slot1 : slot2 ? key=value, key=value
```

- **`type`** — optional leading token. When omitted, inferred from the current domain
  context (hybrid omnibar). When present, names the entry type explicitly.
- **`slot1 : slot2`** — positional slots, `:`-delimited. Per-type schema (below).
- **`? k=v, k=v`** — named params for everything not positional. `,`-separated.
- **Quote-when-needed** — any positional/value containing a delimiter (space, `:`, `,`)
  is wrapped in quotes: `book "Dune: A Novel":Herbert`.

### Examples

```
exp 12.50:food?merchant=Blue Bottle
book "Dune: A Novel":Herbert?rating=5
movie "Blade Runner 2049"?rating=5        # slot2 omitted, jump straight to named
place "Blue Bottle":"315 Linden St"
12.50:coffee                              # type inferred from expenses domain
```

## Per-type positional schema

Universal rule: **slot1 = primary identity, slot2 = who/where secondary.**
Expense is the only oddball — its identity is a number, not a name.

| Type    | `slot1 : slot2`     | Common named params           |
|---------|---------------------|-------------------------------|
| expense | `amount : category` | `merchant=` `currency=` `date=` |
| book    | `title : author`    | `rating=` `date=`             |
| movie   | `title : director`  | `rating=`                     |
| show    | `title : creator`   | `rating=`                     |
| podcast | `title : host`      | `rating=`                     |
| place   | `name : address`    | `date=`                       |
| event   | `title : location`  | `date=`                       |

Implementation: each type declares a 1–2 line positional schema alongside its
`ENTRY_FIELDS` entry (`src/config/entryFields.ts`). The parser stays **type-agnostic** —
it reads the positional schema the way `buildReviewDraft` reads `mapTo`.

## Suggestions (key feature)

Two suggestion layers, both surfaced inline in the omnibar:

1. **Type-token suggestions** — prefix → type menu (`b`→book, `m`→movie). Picking one
   ghost-fills the slot layout for that type, so positional order is discoverable, not
   memorized.
   - **Also resolves single-letter collisions** the grammar otherwise has: `p` matches
     **podcast + place**, `e` matches **event + expense**. The menu disambiguates —
     type `p`, pick from the two.
2. **History-backed value suggestions** — suggest VALUES from the user's own entries:
   prior `metadata.category`, `metadata.merchant`, `tags`. `12.50:fo` → `food (used 23×)`.
   This is the real fix for freeform-category drift — categories self-converge toward
   existing values instead of accumulating typos.

Deferrable layers (noted, not in scope): field/param-key suggestions after `?`, and
content-based type inference (`lunch $12` → expense; pasted URL → movie).

## Commit flow

**Always review first.** A valid parse pre-fills the existing `ReviewPage` as a draft,
with a live "here's what I parsed" preview as you type; user confirms before save.

- The DSL is a fast **input method**, not a new save path.
- Quoting mistakes become **visible and fixable** instead of silently saved.
- Reuses the shipped `buildReviewDraft → ReviewPage` pipeline as-is; net-new surface
  is just the parser + omnibar + suggestion lookups.

## Architecture fit

- Parser emits the same flat `Record<string, string>` formValues that the manual form
  produces → `buildReviewDraft()` (`src/config/entryFields.ts`) already turns that into
  a `ReviewDraft`. **No new persistence logic.**
- Value suggestions require a **distinct-values lookup** over entries
  (`metadata.category`, `metadata.merchant`, `tags`) — not yet exposed by
  `entriesRepository`. Small, parser-independent; can land first. See
  todo `entries-distinct-values-lookup`.
- Parser disambiguation (hybrid type-token vs positional title, quoting) carries the
  only real feasibility risk → spike before committing the grammar.

## Decisions captured

- Entry point: **hybrid omnibar** (type token optional, inferred from domain).
- Free text: **quote-when-needed** (vs compact-only positionals or trailing free-text region).
- Commit: **always route through ReviewPage** (vs direct-save-with-undo or confidence-gated).
- Suggestions: **type-token + history-backed values** are in scope; field-key and
  content-based-type inference deferred.

## Routing

Next milestone scope is open (v0.1.0 shipped 2026-06-16). Seeded to surface at
`/gsd:new-milestone` rather than forced into an empty milestone. See seed
`quick-capture-dsl`.

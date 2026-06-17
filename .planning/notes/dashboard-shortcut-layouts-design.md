---
title: Dashboard shortcut layouts — design
date: 2026-06-17
context: Exploration (/gsd:explore). Build on the v0.2.0 Quick-Capture DSL with
  customizable one-tap shortcut buttons grouped into switchable layouts, as a portable
  per-user (single-user) config.
---

# Dashboard shortcut layouts — design

## Problem

The v0.2.0 Quick-Capture DSL made one-line capture fast, but you still type the line
every time. For *recurring* captures (trip expense, daily coffee, school expense) the type
+ most fields are always the same — only one value (usually the amount) changes, or nothing
changes at all. We want **customizable shortcut buttons on the Dashboard** that collapse a
common capture to a tap (+ maybe one field).

## Core insight

**A shortcut is a saved DSL template with "holes."** The DSL already does the work:

- A shortcut stores a DSL string template; the **holes are the empty slots** in it.
  `expense :food?merchant=Blue Bottle` ← the empty amount slot IS the hole (the parser
  already flags empty positional slots with a warning — `empty "amount" slot`).
- On tap: prompt for the hole(s) → the filled string is a valid DSL line → `parseDSL` →
  `buildReviewDraft(ENTRY_FIELDS[type], values)` → save. **Almost no new capture logic** —
  it reuses the entire v0.2.0 pipeline.

## Layered, portable config

```
Config (one per install — single user)
 └─ Layouts[]          # named, switchable sets shown on the Dashboard
     ├─ name           # "DayToDay" | "Travel" | "WorkTrip" | …
     ├─ icon?
     └─ shortcuts[]    # ordered
         ├─ name       # "Trip Expense", "Daily Coffee", "School Expense"
         ├─ icon?
         ├─ dslTemplate# e.g. "expense :food?merchant=Blue Bottle"  (empty slot = hole)
         └─ confirm    # false = one-tap direct save; true = route through ReviewPage
```

- **Layouts** let you flip the Dashboard between contexts (DayToDay vs Travel vs WorkTrip).
- **Shortcuts** span a spectrum, all expressed as one template + a `confirm` flag:
  - **Zero holes** (`expense 5:coffee?merchant=Blue Bottle`) → one-tap, fixed entry.
  - **One hole** (`expense :food`) → tap → fill amount → save.
  - **Variable text** (a title) → set `confirm: true` to land on Review.

## Save path — per-shortcut `confirm` flag

Decision: **per-shortcut choice** (not global). Trusted/fixed shortcuts one-tap save
straight to IndexedDB; others (`confirm: true`) route through the existing `ReviewPage`.
- One-tap direct save **bows out of the v0.2.0 "always Review" invariant on purpose** for
  trusted templates — pair it with an **undo affordance** ("Saved · Undo") so a fat-finger
  amount isn't silently wrong. `entriesRepository.delete` already exists for undo.

## Storage, schema, portability

- **Storage:** a single config object in the existing Dexie `settings` store
  (`src/services/db.ts` already has a `settings` key/value store — currently unused).
- **Schema:** a **JSON Schema** for the config (layouts + shortcuts), versioned. Chosen over
  Zod (user dislikes Zod DX) and well-suited to a config that is hand-editable and shared.
- **Import/export:** mirror the existing entries-export pattern
  (`src/services/exportEntries.ts` / `triggerDownload`). Export your config as JSON; import
  validates against the JSON Schema before applying. This is how "my wife's shortcuts vs
  mine" works **without** accounts — she imports a starter config on her own install and
  diverges. Single-user stays intact.

## Reuse map (what's actually new)

| Reused as-is | New surface |
|--------------|-------------|
| `parseDSL`, `POSITIONAL_SCHEMA`, `buildReviewDraft`, `ReviewPage`, empty-slot detection, `entriesRepository.create`/`.delete`, `triggerDownload` | Config types + JSON Schema + validator; Dashboard layout/shortcut rendering + layout switcher; fill-the-hole micro-prompt; one-tap-save + undo toast; import/export UI; (later) an authoring/manager screen |

## Decisions captured

- **Single user** for now — no profiles/accounts (honors locked Out-of-Scope). "User-specific"
  is delivered via **portable import/export config**, not per-account data.
- **JSON Schema** for the config (not Zod, not plain hand-rolled) — validates imports + docs
  the shareable format.
- **Per-shortcut `confirm`** flag decides one-tap-save vs Review.
- Shortcut = DSL template; **holes = empty slots** (reuse existing parser behavior).

## Sketch outcomes (sketch 001, 2026-06-17)

- **Layout presentation:** **chips + rows** (Variant B) — horizontally scrollable layout
  chips (+ "New") above full-width tappable list rows. Scales to many layouts; most legible
  on a phone.
- **Icons:** use **Heroicons** (`@heroicons/react`, already a dependency), reusing the app's
  existing icon vocabulary (`BanknotesIcon`/`FilmIcon`/`MapPinIcon`) where they fit. Emoji
  were rejected as too cheesy.
- **Fill-the-amount UI:** a proper mobile sheet — big amount display, quick-amount presets,
  **numeric keypad** (one-thumb), and a **live DSL preview** of the resulting line. The
  sketch version is directional, not final.
- **Authoring tool is WANTED (not just deferred).** The user explicitly wants a tool to
  create/edit/reorder shortcuts and layouts (assign icon + `confirm` flag). It likely still
  lands in a later phase than the read-only/default-layouts MVP, but it is in scope for the
  feature, not optional. The "+ New" chip is its entry point.

## Deferred / decide-at-planning

- **Authoring depth / sequencing.** MVP can ship **default layouts** + **import/export** +
  possibly **"Save current as shortcut"** from the omnibar first; the full
  create/edit/reorder **authoring tool** (wanted — see above) follows as its own phase.
- **Placeholder convention for non-positional holes.** Empty positional slots are natural
  holes; prompting for a named param (e.g. `merchant`) needs a token like `?` or `{}` in the
  template. Define it when planning.
- **Config versioning/migration** for forward-compatible imports (see todo
  `shortcut-config-json-schema`).
- **Multi-hole ordering** — if a shortcut has >1 hole, what order does the micro-prompt ask?
  (Template slot order is the obvious default.)

## Routing

v0.2.0 shipped 2026-06-16; next milestone is open. Seeded to surface at `/gsd:new-milestone`
(see seed `dashboard-shortcut-layouts`). Builds directly on [[quick-capture-dsl-design]].

# Life Log

A mobile-first, installable **PWA** for fast, structured personal life-logging on the go —
media you consume, trips you take, and money you spend, captured as typed entries in a single
local event log. No accounts, no backend, no sync: everything lives in IndexedDB on your device
and works offline.

> Personal prototype, not a public product. Stack is locked: React 19 + TypeScript 5.9 + Vite 7,
> Tailwind v4, react-router-dom v7, Dexie (IndexedDB), `vite-plugin-pwa`, Vitest.

## Capture paths

There are three ways to add an entry, fastest first:

1. **Quick Capture (DSL)** — type a one-line shorthand. ← see below
2. **URL-first** — paste a link (IMDb, Goodreads, Google Maps, …); metadata is extracted offline.
3. **Manual** — the full per-type form (`Enter Manually`).

All three converge on the same **Review** screen before anything is saved.

## Quick-Capture DSL

A compact, URL-esque shorthand that parses **live** into the Review screen. Open it from the
dashboard's **Quick Capture** tile (route `/capture`).

### Grammar

```
[type] slot1 : slot2 ? key=value, key=value
```

| Part | Meaning |
|------|---------|
| `type` | Optional leading word naming the entry type (`book`, `expense`, …). Omit it inside a single-type domain and it's inferred from context. |
| `slot1 : slot2` | Two **positional** slots, `:`-separated. slot1 = primary identity, slot2 = the "who/where" secondary. Per-type meaning below. |
| `? key=value, key=value` | **Named** params for everything else, `,`-separated. |

The parsed result pre-fills Review — it never saves directly, so you always get a glance-and-confirm.

### Positional slots per type

| Type | `slot1 : slot2` | Common named params |
|---------|---------------------|----------------------------------|
| `expense` | `amount : category` | `merchant=` `currency=` `date=` |
| `book` | `title : author` | `rating=` `date=` |
| `movie` | `title : director` | `rating=` |
| `show` | `title : creator` | `rating=` |
| `podcast` | `title : host` | `rating=` |
| `place` | `name : address` | `date=` |
| `event` | `title : location` | `date=` |

> Param aliases: `date=` → entry date, `note=` → notes, `author=`/`director=`/`host=` → creator,
> `cur=` → currency. Type aliases: `exp` → expense, `mov` → movie, `pod` → podcast.

### Worked examples (one per type)

```text
expense 12.50:food?merchant=Blue Bottle      # $12.50, category food, at Blue Bottle
book "Dune: A Novel":Herbert?rating=5         # title with a colon → quote it
movie "Blade Runner 2049"?rating=5            # slot2 omitted; jump straight to a named param
show Severance:Apple TV?rating=5              # title : creator
podcast "Hardcore History":"Dan Carlin"       # quote any value with spaces
place "Blue Bottle":"315 Linden St"           # name : address
event Standup:Office?date=2026-06-16          # title : location, with a date
```

Inside the **Expenditures** domain the type is inferred, so a bare line works:

```text
12.50:coffee                                  # → an expense, amount 12.50, category coffee
```

### Quoting

Wrap any value in double quotes when it contains a delimiter — a space, `:`, `,`, or `?`:

```text
book "Dune: A Novel":Herbert                  # colon inside the title
place "Blue Bottle":"315 Linden St"           # spaces in both slots
expense 12:food?tags="travel, work"           # multi-value params MUST be quoted —
                                              # commas separate params, so unquoted tags break
```

Use `\"` for a literal quote inside a quoted value.

### Suggestions

As you type, the omnibar offers:

- **Type-token suggestions** — `b` → `book`, and ambiguous single letters open a menu:
  `p` → `place` / `podcast`, `e` → `event` / `expense`.
- **History-backed value suggestions** — once you've used categories, merchants, or tags before,
  they're suggested (frequency-ranked) as you type that slot. Picking one keeps your values
  consistent instead of drifting into typos.

### Statuses

The live preview shows one of three states, and **Review & Save** is enabled only for `ok`:

| Status | Meaning | What to do |
|--------|---------|-----------|
| `ok` | Clean parse | Confirm → Review screen |
| `ambiguous` | Needs a type pick (e.g. you typed `p`) | Choose from the suggestions |
| `error` | Malformed (unterminated quote, missing `=`, unknown field) | Fix the highlighted issue |

This design is deliberate: nothing is ever saved from a guess. The full design rationale and the
parser feasibility spike live under `.planning/notes/quick-capture-dsl-design.md` and
`.planning/spikes/001-dsl-parser/`.

## Development

```bash
npm install
npm run dev        # Vite dev server
npx vitest run     # run the test suite
npm run build      # tsc -b && vite build (also emits the PWA service worker)
npm run lint       # eslint
```

## Data export

Every entry is a single `LifeLogEntry` row in IndexedDB. **View All Entries → Export** downloads
the full log as JSON, so other tools can read it.

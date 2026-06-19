# Life Log — Engine & DSL Reference

> A description of the **underlying engine** that powers Life Log: its data model, storage
> layer, type/field system, capture pipeline, and the Quick-Capture **DSL**. This document
> deliberately ignores all UI/presentation (pages, components, routing, styling). It describes
> the engine as a reusable core: the inputs it accepts, the transformations it performs, and the
> records it produces.
>
> Audience: anyone reasoning about, reusing, or re-skinning the engine. Everything here lives
> under `src/services/` and `src/config/` and is pure/headless except where noted.

---

## 1. What the engine is

Life Log's engine turns short, structured **inputs** (a URL, a one-line DSL string, a set of
form values, or a saved shortcut template) into **typed, persisted life-event records** stored
locally in the browser (IndexedDB via Dexie). There is no backend, no auth, and no network
dependency — the engine is fully offline and single-user.

Three ideas define it:

1. **One record type.** Everything a user logs — a movie watched, a place visited, an expense —
   is a single `LifeLogEntry`, discriminated by `domain` + `type`. There are no per-category
   tables.
2. **One field configuration is the single source of truth.** `ENTRY_FIELDS` (per type) and the
   `db.ts` taxonomy drive the form mapping, the DSL parser, the suggestion engine, and the
   edit/round-trip logic. Add a field once and every subsystem sees it.
3. **One construction site.** Every capture path, no matter the input, converges on a single
   intermediate representation (`ReviewDraft`) and a single finalizer (`draftToEntry`) that
   builds the stored record. This guarantees all entries are shaped identically regardless of
   how they were captured.

The **DSL** is the lever: a compact, URL-esque grammar (`[type] pos1:pos2 ?k=v,k=v`) that
collapses a multi-field capture into one line. It is the substrate beneath quick-capture, the
saved shortcut templates, and the "holes" mechanism.

---

## 2. Core data model

### 2.1 The record: `LifeLogEntry`

Source: `src/services/db.ts`.

```ts
interface LifeLogEntry {
  id: string                          // UUID (crypto.randomUUID), assigned at create()
  domain: EntryDomain                 // 'media' | 'trips' | 'expenditures'  (indexed)
  type: EntryType                     // discriminant (not indexed)
  title: string                       // always present (falls back to 'Untitled')
  description?: string
  occurredAt?: number                 // epoch ms — when the event happened (optional)
  recordedAt: number                  // epoch ms — when it was captured (always present, indexed)
  sourceUrl?: string                  // original URL for URL-captured entries
  amount?: number                     // expense amount
  location?: string
  tags: string[]                      // always an array (may be empty)
  metadata: Record<string, unknown>   // opaque bag — type-specific extras + provenance
  syncedAt: number | null             // null = never synced (future-sync seam)
}
```

Notes:
- `recordedAt` is the immutable capture timestamp; `occurredAt` is the (editable, optional)
  event time. They are distinct on purpose.
- `metadata` is an open bag. Known keys come from `ENTRY_FIELDS` metadata mappings (e.g.
  `creator`, `rating`, `currency`, `category`, `merchant`), URL extraction (e.g. `imdbId`,
  `coordinates`, `spotifyId`), and **mode provenance** (`mode`, `modeLabel`). Unknown keys are
  preserved across edits.
- `syncedAt` is a deliberately unused seam: a future sync layer can query "everything not yet
  synced" without a schema change.

### 2.2 Taxonomy: domains and types

Source: `src/services/db.ts` (types) and `src/config/navigation.ts` (the taxonomy table).

| Domain          | Types                                  |
|-----------------|----------------------------------------|
| `media`         | `show`, `movie`, `book`, `podcast`     |
| `trips`         | `place`, `event`, `expense`            |
| `expenditures`  | `expense`                              |

`expense` intentionally exists in **two** domains. All type lookups must be **domain-scoped** —
a flat cross-domain `find(t => t.type === 'expense')` silently returns only the first match.
The helper `defaultDomainForType(type)` resolves the canonical domain for a bare (domain-less)
capture: `expense → expenditures`; every other type belongs to exactly one domain.

The `EntryDomain` / `EntryType` unions in `db.ts` are the **single source of truth** for the
taxonomy; `navigation.ts`, `entryFields.ts`, and the DSL parser all derive from them.

### 2.3 Storage: Dexie / IndexedDB

Source: `src/services/db.ts`. Database name: `LifeLogDB`.

| Version | Stores (Dexie schema string)                | Purpose |
|---------|---------------------------------------------|---------|
| 1       | `counter: 'id'`                             | Legacy tracer store (kept for migration integrity; not used by the engine) |
| 2       | `entries: '&id, recordedAt, domain'`, `settings: 'key'` | The live stores |

Indexing:
- **`entries`** — primary key `&id` (unique); secondary indexes on `recordedAt` and `domain`.
  `type`, `tags`, `metadata`, and `syncedAt` are intentionally **not** indexed (IndexedDB cannot
  index `null`; arrays/objects deferred). Full-scan filters over these are correct at personal-log
  scale.
- **`settings`** — a generic key/value store (`{ key, value }`). It holds the shortcut config and
  all singleton app state (active layout, active mode). Arbitrary keys are allowed, so new
  singletons require **no schema bump**.

Versioning rule: never modify a shipped `version(n).stores(...)` block; add a new `version(n+1)`
with the delta.

---

## 3. Storage layer — repositories

All persistence goes through repository modules. **Nothing outside these modules touches `db`
directly.** Each exposes async methods plus reactive hooks (`useLiveQuery`-based) that re-render
on data change. The hooks are the only React-aware surface and can be ignored when treating the
engine as headless — the underlying `*.get/put/...` methods are plain async functions.

### 3.1 `entriesRepository` (`src/services/entriesRepository.ts`)

| Method | Behavior |
|--------|----------|
| `create(entry: Omit<LifeLogEntry,'id'>)` | Assigns a `crypto.randomUUID()` and inserts. Returns the full entry. UUIDs (not auto-increment) keep IDs stable across devices for a future sync. |
| `get(id)` | One entry or `undefined`. |
| `list()` | All entries, `recordedAt` descending (newest first). |
| `listUnsynced()` | `syncedAt == null` (full scan — the sync seam). |
| `update(id, changes: Partial<Omit<LifeLogEntry,'id'>>)` | Dexie partial update; returns the update count (1 found / 0 missing). |
| `delete(id)` | Permanent removal. |
| `listDistinctValues(field, prefix?)` | Frequency-ranked distinct values for a **suggestable** field across all entries (backs DSL value suggestions). |

**Distinct values** are computed over `category`, `merchant` (both in `metadata`) and `tags`
(the core array). Aggregation is case-insensitive (first-seen casing wins on ties), ranked by
count then alphabetically, with optional case-insensitive prefix filtering. This is a full scan
by design (those fields are unindexed).

### 3.2 `configRepository` (`src/services/configRepository.ts`)

- `configRepository.get()/put()` — the shortcut config, stored under settings key
  `shortcutConfig`. **Reads are not re-validated** (every write path validates first; see §8).
- `activeLayoutRepository.get()/put()` — the active layout name, under key `activeLayoutName`.
  (Legacy selector for the dashboard's active layout; superseded as the dashboard's source of
  truth by the active-mode model in §7, but still used for layout authoring.)

### 3.3 `activeMode` (`src/services/activeMode.ts`)

The persisted "active mode + instance label" singleton (settings key `activeMode`):

```ts
interface ActiveMode { mode: string; label: string }   // mode = a layout name; label = free text
```

| Export | Behavior |
|--------|----------|
| `activeModeRepository.get()/put()` | Read/write the single `{ mode, label }`. |
| `defaultInstanceLabel(mode, now?)` | `\`${mode}-${Mon}-${Year}\``, e.g. `Travel-Jun-2026`. |
| `activateMode(mode, label?)` | Persists `{ mode, label: trimmed || defaultInstanceLabel(mode) }`. |
| `listModes(config)` | The layout names of the config, in order (modes **are** layouts). |

> **Known limitation (by design, as of v0.4.0).** Only one `{ mode, label }` is stored; activating
> overwrites it. There is no persisted *collection* of instances to list/switch between — that is
> a candidate for the next iteration. Entries already stamped with a prior label are unaffected.

---

## 4. The type/field system

This is the spine the DSL, the capture pipeline, and edit/round-trip all hang from. Source:
`src/config/entryFields.ts`.

### 4.1 `ENTRY_FIELDS` — field descriptors per type

Each type maps to an ordered list of `FieldDescriptor`s:

```ts
interface FieldDescriptor {
  key: string                       // unique within the type; the formValues key + DSL field key
  label: string                     // human label
  inputType: 'text'|'number'|'date'|'tags'
  placeholder?: string
  required?: boolean
  min?: number; max?: number        // numeric bounds; out-of-range values are dropped
  mapTo:
    | { kind: 'core'; field: 'title'|'description'|'occurredAt'|'amount'|'location'|'tags' }
    | { kind: 'metadata'; key: string }
}
```

The crucial part is `mapTo`: it routes a field either to a **core** column of `LifeLogEntry` or
into the **metadata** bag under a named key. Field `key` and the stored location are decoupled
(e.g. `place`'s `name` field maps to core `title`; its `address` field maps to core `location`).

Field layout per type (key → mapTo):

| Type | Fields (key → target) |
|------|-----------------------|
| `show` / `movie` / `book` / `podcast` | `title`→core.title *(required)*, `creator`→meta.creator, `occurredAt`→core.occurredAt *(date)*, `rating`→meta.rating *(number 1–5)*, `description`→core.description, `tags`→core.tags |
| `place` | `name`→core.title *(required)*, `address`→core.location, `occurredAt`→core.occurredAt, `description`→core.description, `tags`→core.tags |
| `event` | `title`→core.title *(required)*, `location`→core.location, `occurredAt`→core.occurredAt, `description`→core.description, `tags`→core.tags |
| `expense` | `title`→core.title *(required)*, `amount`→core.amount *(number)*, `currency`→meta.currency, `category`→meta.category, `merchant`→meta.merchant, `occurredAt`→core.occurredAt, `description`→core.description, `tags`→core.tags |

### 4.2 `POSITIONAL_SCHEMA` — DSL slot order per type

Declares which field keys are **positional** in the DSL shorthand and in what order. Everything
else is reachable as a named `?key=value` param.

| Type | slot 1 | slot 2 |
|------|--------|--------|
| `show` / `movie` / `book` / `podcast` | `title` | `creator` |
| `place` | `name` | `address` |
| `event` | `title` | `location` |
| `expense` | `amount` | `category` |

`expense` is the only type whose slot 1 is a number — which is why `expense 12.50:food` reads
naturally.

### 4.3 `ReviewDraft` — the universal intermediate representation

Source: `src/services/extractMetadataFromUrl.ts` (co-located with the URL extractor).

```ts
interface ReviewDraft {
  sourceUrl?: string
  title?: string
  location?: string
  description?: string
  occurredAt?: number      // epoch ms
  amount?: number
  tags?: string[]
  metadata: Record<string, unknown>   // type-specific extras
}
```

Every capture path produces a `ReviewDraft`; `draftToEntry` consumes one. It is the neutral
hand-off between "parse the input" and "construct the record."

### 4.4 Mappers — values ⇄ entry

| Function | Direction | Behavior |
|----------|-----------|----------|
| `buildReviewDraft(fields, formValues)` | flat string values → `ReviewDraft` | Applies each descriptor's `mapTo`. Empty/whitespace values are skipped. Numbers parse via `parseFloat` (NaN dropped; min/max enforced). Dates parse as **local** midnight (`Date.parse(\`${d}T00:00:00\`)`, never UTC). Tags split on commas and trim. |
| `formValuesFromEntry(fields, entry)` | `LifeLogEntry` → flat string values | The inverse: stringifies core/metadata values back into form-shaped strings (dates → local `YYYY-MM-DD`, amount → string, tags → comma-joined). |
| `buildEntryUpdate(fields, entry, formValues, extraMetadata)` | edits → `Partial<LifeLogEntry>` | Produces a change set for an edit. Core fields covered by the form are set (cleared → `undefined`). Metadata is **merged** over the existing bag — known fields can be set or cleared, **unknown keys are preserved** (URL/DSL keys, `mode`/`modeLabel`). Never writes `recordedAt`, `syncedAt`, `domain`, or `type`. |

The local-date convention is a hard rule throughout: format with `toLocaleDateString('en-CA')`
(`YYYY-MM-DD`) and parse with `Date.parse(\`${d}T00:00:00\`)`. Using UTC (`toISOString` /
`Date.UTC`) causes off-by-one errors in non-UTC zones.

---

## 5. The Quick-Capture DSL

Source: `src/services/dsl/parser.ts` (grammar + parser), `src/services/dsl/suggest.ts`
(suggestions), `src/services/templateValidator.ts` (saveability predicate).

The DSL is a one-line shorthand that parses into the same flat `formValues` map that
`buildReviewDraft` consumes — so a DSL string and a manual form are interchangeable inputs.

### 5.1 Grammar

```
line     := [ type ] [ positionals ] [ '?' params ]
type     := <type-name | alias>           # optional leading word
positionals := value ( ':' value )*       # filled by POSITIONAL_SCHEMA order
params   := pair ( ',' pair )*
pair     := key '=' value
value    := bareword | '"' quoted '"'     # quote anything containing space : , ? 
```

- **Type token** (optional leading word). Resolved **only** against exact type names and explicit
  aliases (below). A partial/prefix token (`boo`, `p`) is *not* resolved by the parser — it is the
  suggestion menu's job — and yields `status: 'ambiguous'`.
- **Positionals** — `:`-separated, filled in `POSITIONAL_SCHEMA[type]` order. More slots than the
  schema defines is an **error** ("quote values containing ':'").
- **Named params** — after the first top-level `?`, `,`-separated `key=value`. Keys are validated
  against the type's `ENTRY_FIELDS` keys (after alias resolution); unknown keys are an **error**.
- **Quoting/escaping** — wrap any value containing a delimiter (space, `:`, `,`, `?`) in double
  quotes. Inside quotes, `\"` and `\\` escape. All splitting is **quote-aware** (delimiters inside
  quotes are literal). An unterminated quote is an error.

### 5.2 Type resolution & aliases

`TYPE_NAMES` = the keys of `POSITIONAL_SCHEMA`. Explicit type aliases:

| Alias | Type |
|-------|------|
| `exp` | `expense` |
| `mov` | `movie` |
| `pod` | `podcast` |

If no type token is present, the parser falls back to `opts.defaultType` (e.g. a domain context).
If neither is available it returns `ambiguous` ("no type given and no domain context"). If a
leading word resolves to a type that differs from the supplied `defaultType`, that's a soft
**warning** (not an error) — "quote it to use it as text."

**Named-param aliases** (so users type friendly keys) resolve to canonical `ENTRY_FIELDS` keys:

| Alias(es) | Canonical field |
|-----------|-----------------|
| `date`, `when` | `occurredAt` |
| `note`, `notes`, `desc` | `description` |
| `author`, `director`, `host` | `creator` |
| `cur` | `currency` |

### 5.3 Parser output: `ParseResult`

```ts
interface ParseResult {
  status: 'ok' | 'ambiguous' | 'error'
  type: EntryType | null
  values: Record<string, string>   // keyed by ENTRY_FIELDS field keys → feeds buildReviewDraft
  issues: string[]                 // hard problems → must NOT save silently (route to review)
  warnings: string[]               // soft surprises → save allowed, surface in preview
}
```

- `ok` — clean parse; `values` ready for `buildReviewDraft(ENTRY_FIELDS[type], values)`.
- `ambiguous` — needs a human choice (partial/missing type). Never auto-saved.
- `error` — structural problem (too many slots, unknown field, missing `=`, bad quoting). Never
  auto-saved.

The `issues` vs `warnings` split encodes the engine's safety posture: **issues block silent
saves; warnings inform but allow.**

### 5.4 Holes (template placeholders)

A **hole** is an unfilled slot in a saved template — the mechanism that makes a shortcut "tap +
fill one field." Two kinds:

- **Positional hole** — a schema slot absent from the parsed values (e.g. `expense :food` leaves
  `amount` empty).
- **Named hole** — a param whose value is the literal token `{}` (`HOLE_TOKEN`), e.g.
  `expense :food?merchant={}`.

Hole handling lives in `captureService` (§6): `detectHoles(type, rawValues)` returns a `HoleMap`
(`{ positional, named, hasHoles }`); `cleanValues` strips `{}` tokens before building a draft so
the token is never persisted. Holes are **valid** in a template — they produce parser warnings,
not errors (see `templateValidator`).

### 5.5 Suggestions

`src/services/dsl/suggest.ts` provides pure functions for an as-you-type assist (the engine side
of an omnibar; UI not described here):

- `typeMatches(prefix)` — types whose name or alias starts with `prefix` (resolves single-letter
  collisions like `p` → `place`/`podcast`).
- `suggestionContext(input, resolvedType)` — classifies what's being typed at the cursor:
  `type` (still typing the leading token), `value` (the active positional slot or `key=` maps to a
  suggestable `DistinctField` — `category` / `merchant` / `tags`), or `none`.
- `applyValueSuggestion(input, value)` / `quoteValue(value)` — splice a chosen suggestion back into
  the string, auto-quoting if it contains a delimiter.

### 5.6 Template validation

`validateTemplate(template)` / `isValidTemplate(template)` decide whether a DSL string is saveable
as a shortcut: **valid = parseable (`status !== 'error'`) AND has a resolvable type**. Holes
(empty slots, `{}`) are explicitly acceptable. This is the gate used when authoring shortcuts.

### 5.7 Worked examples

| DSL | Parsed result |
|-----|---------------|
| `expense 12.50:food` | type=expense, amount=12.50, category=food |
| `exp 5:coffee?merchant="Blue Bottle"` | expense, amount=5, category=coffee, merchant="Blue Bottle" |
| `movie "Dune: Part Two"?director="Denis Villeneuve",date=2026-03-01` | movie, title="Dune: Part Two", creator=…, occurredAt=2026-03-01 |
| `book "The Pragmatic Programmer":Hunt?rating=5` | book, title=…, creator=Hunt, rating=5 |
| `place "Powell's Books":"1005 W Burnside St"` | place, name=…, address=… |
| `expense :food` | expense, category=food, **amount is a positional hole** |
| `expense :food?merchant={}` | expense, category=food, **merchant is a named hole** |
| `boo …` | `ambiguous` — partial type, pick from suggestions |
| `expense 5:food:extra` | `error` — too many positional slots |

---

## 6. The capture pipeline

The heart of the engine: every input becomes a `LifeLogEntry` through one converging flow.

```
              ┌─ URL string ───────────► extractMetadataFromUrl(url, type) ─► ExtractedDraft ┐
  input ──────┤                                                                              │
              ├─ DSL string ───────────► parseDSL(input, {defaultType}) ─► values ─┐         │
              │                                                                     ▼         ▼
              ├─ form values ──────────────────────────────────────► buildReviewDraft(fields, values)
              │                                                                     │
              └─ shortcut template ────► parseDSL(template) ─► detectHoles/cleanValues/applyFills ─┘
                                                                                    │
                                                                                    ▼
                                                                              ReviewDraft
                                                                                    │
                                  withDefaultOccurredAt(draft, type)  (defaults date to today)
                                                                                    │
                                                                                    ▼
                            draftToEntry(draft, type, domain, activeMode?)  ── single construction site
                                                                                    │
                                                                                    ▼
                                                            entriesRepository.create(entry)  ─► IndexedDB
```

### 6.1 `draftToEntry` — the single construction site

Source: `src/services/captureService.ts`.

```ts
draftToEntry(draft: ReviewDraft, type, domain, activeMode?: ActiveMode | null): Omit<LifeLogEntry,'id'>
```

Responsibilities (the *only* place entries are shaped):
- `title` ← `draft.title?.trim() || 'Untitled'`.
- `recordedAt` ← `Date.now()`; `syncedAt` ← `null`; `tags` ← `draft.tags ?? []`.
- Optional fields (`sourceUrl`, `location`, `description`, `amount`, `occurredAt`) are included
  only when truthy / not NaN.
- **Mode stamping**: when `activeMode?.mode` is a non-empty string, metadata becomes
  `{ ...draft.metadata, mode, modeLabel }`. When no mode is active, **no** `mode`/`modeLabel` keys
  are written (no empty placeholders).

Any change to how an entry is constructed happens here and is therefore consistent across **all**
capture paths.

### 6.2 Hole-filling helpers (`captureService.ts`)

- `HOLE_TOKEN = '{}'`.
- `cleanValues(values)` — strip `{}` entries (never persist the token).
- `detectHoles(type, rawValues)` — `HoleMap { positional, named, hasHoles }`, comparing against
  `POSITIONAL_SCHEMA` (handles bare templates like `expense` correctly). Positional holes are
  ordered by schema, named holes by discovery; a slot claimed both ways is de-duplicated to
  positional.
- `applyFills(base, fills)` — merge user-provided fills over template base values (the **same**
  merged map must feed both the preview and the saved draft).
- `buildDSLPreview(type, mergedValues)` — reconstruct a canonical DSL line from values (for a live
  preview), re-quoting named values as needed.

### 6.3 Date defaulting

- `typeHasDateField(type)` — true iff the type has a core `occurredAt` descriptor.
- `todayLocalDate()` / `todayLocalMidnightEpoch()` — today in the local convention.
- `withDefaultOccurredAt(draft, type)` — returns the draft with `occurredAt` defaulted to today's
  local midnight **only** when the type has a date field and the draft has none. Pure; never
  mutates. Applied at the one-tap capture paths (so a date is present without a tap) — but **not**
  inside `draftToEntry`, so a deliberately-cleared date in a review/edit flow is honored.

---

## 7. Provenance — active mode stamping

The active mode (§3.3) is a cross-cutting capture concern threaded through `draftToEntry`'s
optional `activeMode` argument. When a mode is active, every captured entry is stamped with
`metadata.mode` (a layout/mode name) and `metadata.modeLabel` (the free-text instance label, e.g.
`Oregon-Jun-2026`). This makes otherwise-similar entries separable after the fact ("everything
logged during the Oregon trip") and is editable like any other metadata (the edit path preserves
and exposes these keys; §4.4). Captures made with no active mode are simply unstamped.

---

## 8. Shortcut config model

Source: `src/config/shortcutConfig.ts` (types + defaults), `src/services/configValidator.ts`
(validation/migration).

```ts
interface Shortcut { name: string; icon?: string; dslTemplate: string; confirm: boolean }
interface Layout   { name: string; icon?: string; shortcuts: Shortcut[] }
interface ShortcutConfig { version: 1; layouts: Layout[] }
```

- A **shortcut** is a saved DSL template plus a `confirm` flag (the engine reads `dslTemplate` and
  runs it through the same `parseDSL` pipeline; the template is never `eval`'d). `confirm`
  distinguishes "save directly" from "route through a review step" at the call site.
- A **layout** is a named list of shortcuts. **Modes are layouts** (§3.3) — `listModes` returns
  layout names. Layouts/modes are independent lists; overlap between them is allowed.
- The config is stored as a single versioned JSON object in the `settings` store. Icons are stored
  as opaque string keys (resolved leniently to a fallback at render time), so the icon set can
  change without a config version bump.

### 8.1 Validation & migration

`configValidator.ts`:
- `validateShortcutConfig(raw)` — structural, **wholesale-reject** validator. Checks
  `version === 1`, `layouts` is an array, and each layout/shortcut has the required shapes
  (non-empty `name`, string `dslTemplate`, boolean `confirm`, optional string `icon`). Returns
  `{ ok, config }` or `{ ok: false, reason }`. It does **not** call `parseDSL` — DSL correctness is
  enforced separately (template authoring).
- `migrateConfig(raw)` — the import entry point: guards the integer `version`, **rejects** configs
  newer than `CURRENT_CONFIG_VERSION` (= 1) with an "update the app" message, runs the migration
  chain (empty/no-op for v1 — the seam exists), then delegates to `validateShortcutConfig`.

---

## 9. URL extraction (offline heuristics)

Source: `src/services/extractMetadataFromUrl.ts`. Pure, offline, and **never throws**.

`extractMetadataFromUrl(url, type)` always returns an `ExtractedDraft` with `sourceUrl` set
(guarantee CAPT-04), even for invalid or unrecognized URLs. It dispatches by **hostname** (more
reliable than type), with hardened host matching (e.g. `*.google.com` but not `evil-google.com`;
`amazon.<tld>` regional pattern):

| Host pattern | Extracts |
|--------------|----------|
| `maps.app.goo.gl` | nothing resolvable offline → `metadata.extractionNote` |
| `*.google.com/maps` | place name → `title`+`location`; lat/lng → `metadata.coordinates` |
| `www.imdb.com` / `m.imdb.com` `/title/ttNNN` | `metadata.imdbId` |
| `goodreads.com` `/book/show/N-slug` | title (slug → Title Case) |
| `amazon.<tld>` `/…/dp/ASIN` | title (slug → Title Case) |
| `podcasts.apple.com` `/podcast/slug/idN` | title |
| `open.spotify.com` `/show|episode/id` | `metadata.spotifyId`, `kind` |
| anything else | base draft (sourceUrl only) |

`ExtractedDraft` is structurally assignable to `ReviewDraft` (its `sourceUrl: string` satisfies the
optional field), so it drops straight into the capture pipeline.

---

## 10. Import / export

Two independent portable JSON formats, each a versioned envelope.

- **Entries** (`src/services/exportEntries.ts`): `buildExportJson(entries, exportedAt)` →
  `{ version: 1, exportedAt, entries }`. `exportedAt` is **injected** by the caller so the function
  is pure/deterministic (no internal `Date`). `triggerDownload` is the only side-effectful shim.
- **Config** (`src/services/configPort.ts`): `buildConfigExportJson(config, exportedAt)` →
  `{ version: 1, exportedAt, config }`. `importConfig(file)` reads the file, parses JSON, **unwraps**
  the `{ config }` envelope (a bare hand-edited config also works), runs `migrateConfig`, and on
  success writes via `configRepository.put`. It is **wholesale**: on any failure (bad JSON, invalid
  structure, too-new version, IndexedDB write error) it returns `{ ok: false, reason }` and applies
  **nothing** — no partial state.

There is currently no entries-**import** (the export round-trips but is read-only on the way back
in) — a known future seam.

---

## 11. Safety & invariants

- **No code execution from data.** DSL templates and imported configs are **data**: parsed and
  structurally validated, never `eval`'d. The "DSL" is interpreted by `parseDSL`, not by JS.
- **URL safety.** `isSafeUrl(raw)` (`src/services/urlUtils.ts`) returns true only for `http:` /
  `https:` — used to gate any rendering/following of a `sourceUrl` (blocks `javascript:` vectors).
- **Wholesale-reject everywhere.** Config import and validation never partial-apply.
- **Single construction site.** All entries are built by `draftToEntry` — uniform shape regardless
  of input.
- **Single source of truth.** The `db.ts` taxonomy and `ENTRY_FIELDS` drive the parser, the
  suggestion engine, the mappers, and edit round-trips. Adding a field in one place propagates.
- **Local-date convention.** Always local midnight (`toLocaleDateString('en-CA')` +
  `Date.parse(\`${d}T00:00:00\`)`), never UTC.
- **Forward-compat seams.** Versioned record envelopes + config `version` + the `migrateConfig`
  chain + the `syncedAt`/`listUnsynced` sync seam are all in place but dormant.
- **Pure where it counts.** Parser, mappers, extractors, hole logic, and export builders are pure
  functions (timestamps/`Date` injected) — trivially testable without mocking time or the DOM.

---

## 12. Extending the engine

| To add… | Do this |
|---------|---------|
| **A new entry type** | Add it to the `EntryType` union (`db.ts`), to a domain's `types` in `navigation.ts`, to `ENTRY_FIELDS` and `POSITIONAL_SCHEMA`. The parser, suggestions, mappers, and capture pipeline pick it up automatically. |
| **A new field on a type** | Add a `FieldDescriptor` to that type's `ENTRY_FIELDS` (choose `mapTo` core vs metadata). It becomes form-, DSL-, and edit-addressable at once. Add to `POSITIONAL_SCHEMA` only if it should be a positional slot. |
| **A DSL alias** | Add to `TYPE_ALIASES` (type token) or `NAMED_ALIASES` (param key) in `parser.ts`. |
| **A suggestable field** | Add its key to the `DistinctField` set (`entriesRepository.ts`) and the `DISTINCT_FIELDS` set (`suggest.ts`). |
| **A new URL source** | Add a host-matched extractor in `extractMetadataFromUrl.ts` returning an `ExtractedDraft`. |
| **A config schema change** | Bump `version`, add a `migrateV{n}ToV{n+1}` step to the `migrateConfig` chain, extend `validateShortcutConfig`. |
| **A sync layer** | Consume `listUnsynced()`, write `syncedAt` on success. The seam is already shaped for it. |

---

## 13. Engine module map

| Module | Role |
|--------|------|
| `src/services/db.ts` | Dexie schema, `LifeLogEntry`, taxonomy unions — the data foundation |
| `src/config/navigation.ts` | Domain/type taxonomy table + `defaultDomainForType` |
| `src/config/entryFields.ts` | `ENTRY_FIELDS`, `POSITIONAL_SCHEMA`, `buildReviewDraft`, `formValuesFromEntry`, `buildEntryUpdate` |
| `src/services/entriesRepository.ts` | Entry CRUD, distinct-value aggregation, sync seam |
| `src/services/configRepository.ts` | Shortcut config + active-layout persistence |
| `src/services/activeMode.ts` | Active mode + instance label persistence and helpers |
| `src/services/captureService.ts` | `draftToEntry`, hole logic, DSL preview, date defaulting |
| `src/services/dsl/parser.ts` | The DSL grammar + `parseDSL` |
| `src/services/dsl/suggest.ts` | As-you-type suggestion logic |
| `src/services/templateValidator.ts` | Shortcut-template saveability predicate |
| `src/services/extractMetadataFromUrl.ts` | Offline URL → draft heuristics; `ReviewDraft` type |
| `src/services/urlUtils.ts` | `isSafeUrl` |
| `src/services/exportEntries.ts` | Entries export envelope + download shim |
| `src/services/configPort.ts` | Config export/import envelope |
| `src/services/configValidator.ts` | Config structural validation + migration chain |

---

*Generated as an engine/DSL reference (UI-free). Reflects the codebase through milestone v0.4.0.*

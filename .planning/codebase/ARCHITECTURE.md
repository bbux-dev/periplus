<!-- refreshed: 2026-06-17 -->
# Architecture

**Analysis Date:** 2026-06-17

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Pages (route components)                  │
│   `src/pages/*`  — Dashboard, Domain, QuickCapture,          │
│                    CaptureUrl, ManualEntry, Review,          │
│                    EntryList, EntryDetail                     │
├──────────────────┬──────────────────┬───────────────────────┤
│   UI primitives  │   Hooks          │   Config (declarative) │
│ `components/ui/*` │  `src/hooks/*`   │  `src/config/*`        │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Services (logic boundary)                  │
│  `entriesRepository` · DSL parser/suggest · URL extractor    │
│  `src/services/*`  ·  `src/services/dsl/*`                   │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  IndexedDB (Dexie)  —  the only persistence store            │
│  `src/services/db.ts`  (LifeLogDB: entries / settings / counter) │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Route table | Maps URLs → page components | `src/App.tsx` |
| App entry | Mounts React, router, SW registrar | `src/main.tsx` |
| DB class | Defines `LifeLogDB` schema + `LifeLogEntry` type | `src/services/db.ts` |
| entriesRepository | Sole CRUD + reactive-hook access to entries | `src/services/entriesRepository.ts` |
| DSL parser | Parses Quick-Capture shorthand → field values | `src/services/dsl/parser.ts` |
| DSL suggest | Type-token + history value suggestions | `src/services/dsl/suggest.ts` |
| URL extractor | Offline URL-string → `ExtractedDraft` | `src/services/extractMetadataFromUrl.ts` |
| Field config | Per-type form fields + DSL positional schema + `buildReviewDraft` | `src/config/entryFields.ts` |
| Navigation config | Domain → type → icon/label map; domain lookups | `src/config/navigation.ts` |
| ReviewPage | Single save path; builds full entry, persists | `src/pages/ReviewPage.tsx` |

## Pattern Overview

**Overall:** Client-only, layered React SPA (PWA) with a thin repository over IndexedDB and a config-driven form/DSL system. No backend, no global state library — reactivity comes from Dexie's `useLiveQuery`.

**Key Characteristics:**
- **Single record type.** Everything persisted is one `LifeLogEntry` shape (`src/services/db.ts`); `domain` + `type` discriminate it. Type-specific extras live in an opaque `metadata: Record<string, unknown>` bag.
- **Single DB access boundary.** All entry reads/writes go through `entriesRepository` (commands) or the `useEntries` / `useEntry` / `useDistinctValues` hooks (reactive reads). Components never import `db` directly.
- **Config-as-source-of-truth.** `ENTRY_FIELDS` and `POSITIONAL_SCHEMA` in `src/config/entryFields.ts` declaratively drive both the manual form AND the DSL parser, so the two stay in lockstep via the shared `buildReviewDraft` mapper.
- **One save path.** Three capture flows converge on `ReviewPage`, which is the only place `entriesRepository.create()` is called.

## Layers

**Pages (`src/pages/`):**
- Purpose: route-level components; own local form state and navigation.
- Depends on: UI primitives, hooks, config, services.
- Used by: the router (`src/App.tsx`).

**UI primitives (`src/components/ui/`):**
- Purpose: presentational building blocks (`Button`, `Input`, `FormField`) + `cn` class helper.
- Depends on: `clsx` / `tailwind-merge` (via `cn.ts`).

**Hooks (`src/hooks/`):**
- Purpose: reusable behaviour. `useBackOrHome` — back navigation with a home fallback.

**Config (`src/config/`):**
- Purpose: declarative data driving forms, routing labels, and the DSL. `entryFields.ts`, `navigation.ts`, plus env/brand (`publicEnv.ts`, `appBrand.ts`).

**Services (`src/services/`):**
- Purpose: all non-presentational logic — persistence (`db.ts`, `entriesRepository.ts`), the DSL (`dsl/`), URL extraction, URL safety (`urlUtils.ts`), export (`exportEntries.ts`).
- Depends on: Dexie. The DSL/config layers are pure (no Dexie) except suggestion wiring.

**State helpers (`src/state/common/`):**
- Purpose: small cross-cutting utilities — `assertNever` (exhaustiveness), `requestState` (loading/error modelling). NOT a global store.

## Data Flow

### Primary Capture → Save Path (all three flows converge)

1. User picks a flow and produces a `ReviewDraft`:
   - **URL-first:** `CaptureUrlPage` calls `extractMetadataFromUrl(url, type)` → `ExtractedDraft` (`src/pages/CaptureUrlPage.tsx`).
   - **Manual:** `ManualEntryPage` collects form values → `buildReviewDraft(ENTRY_FIELDS[type], values)` (`src/pages/ManualEntryPage.tsx:39`).
   - **Quick-Capture DSL:** `QuickCapturePage` runs `parseDSL(text)` then `buildReviewDraft(ENTRY_FIELDS[type], parsed.values)` (`src/pages/QuickCapturePage.tsx:56`).
2. Each flow navigates to the shared review route, passing the draft in router state:
   `navigate('/d/${domain}/${type}/review', { state: { draft } })` (`CaptureUrlPage.tsx:22`, `ManualEntryPage.tsx:39`, `QuickCapturePage.tsx:60`).
3. `ReviewPage` reads `location.state.draft`, hydrates editable fields, and on Save builds the full `Omit<LifeLogEntry,'id'>` and calls `entriesRepository.create(entry)` (`src/pages/ReviewPage.tsx:95-126`). This is the only write site.
4. `entriesRepository.create` generates a UUID (`crypto.randomUUID()`) and `db.entries.add(full)` (`src/services/entriesRepository.ts:15-20`).

### Reactive Read Path

1. List/detail pages call `useEntries()` / `useEntry(id)` (`src/services/entriesRepository.ts`).
2. Dexie `useLiveQuery` re-runs the query whenever the store changes — UI updates automatically, no manual refetch.
3. Tri-state contract: `undefined` = loading, `[]`/`null` = loaded-empty/not-found. Callers MUST handle both.

**State Management:**
- Per-component `useState` for form fields; Dexie `useLiveQuery` for persisted data; React Router `location.state` to pass the in-flight draft between capture and review. No Redux/Zustand/Context store.

## Key Abstractions

**`LifeLogEntry`:**
- Purpose: the one persisted record. Core fields are first-class columns; type-specific data lives in `metadata`.
- File: `src/services/db.ts`.

**`ReviewDraft` / `ExtractedDraft`:**
- Purpose: the transport shape between any capture flow and `ReviewPage`. `ExtractedDraft` is structurally assignable to `ReviewDraft`.
- File: `src/services/extractMetadataFromUrl.ts`.

**`FieldDescriptor` + `ENTRY_FIELDS` + `POSITIONAL_SCHEMA`:**
- Purpose: declarative per-type field definitions. `mapTo` directs each field to a core column or a `metadata` key; `POSITIONAL_SCHEMA` declares DSL positional slots in terms of the same field keys.
- File: `src/config/entryFields.ts`.

**`ParseResult` (DSL):**
- Purpose: parser output — `status` (`ok`/`ambiguous`/`error`), resolved `type`, flat `values` keyed by `ENTRY_FIELDS` keys (ready for `buildReviewDraft`), plus `issues`/`warnings`.
- File: `src/services/dsl/parser.ts`.

## Entry Points

**App bootstrap:**
- Location: `src/main.tsx` — `createRoot` → `<StrictMode><BrowserRouter><PWARegistrar/><App/></BrowserRouter>`.
- Triggers: page load / PWA launch.

**Routing:**
- Location: `src/App.tsx` — declares all routes; `*` falls back to `PlaceholderPage` ("Page Not Found").

## Architectural Constraints

- **Threading:** single-threaded browser main thread. Dexie operations are async (Promises); no web workers.
- **Global state:** the only module-level singleton is `export const db = new LifeLogDB()` in `src/services/db.ts`. No other shared mutable state.
- **Schema is append-only.** `db.ts` versions are persisted in IndexedDB — never mutate an existing `this.version(n).stores(...)` block; add a new version for changes.
- **Indexing limits:** `tags`, `metadata`, and `syncedAt` are intentionally NOT indexed (IndexedDB cannot index `null`/arrays). Queries over them are full scans (`listUnsynced`, `listDistinctValues`) — acceptable at personal-log scale only.
- **Draft transport via router state:** `ReviewPage` requires `location.state.draft`; direct navigation/refresh has no draft and redirects back to the capture route (`ReviewPage.tsx:24-29`).

## Anti-Patterns

### Importing `db` directly from a component

**What happens:** A component bypasses `entriesRepository` and touches `db.entries` directly.
**Why it's wrong:** Breaks the single access boundary, loses the UUID/sync-safety guarantees in `create`, and scatters query logic.
**Do this instead:** Use `entriesRepository` for commands and `useEntries`/`useEntry`/`useDistinctValues` for reactive reads (`src/services/entriesRepository.ts`).

### Defaulting Dexie hooks to `[]` / `null`

**What happens:** A caller passes a default value to `useLiveQuery`, collapsing the loading state.
**Why it's wrong:** Loses the `undefined` = "still opening" signal, breaking skeleton/loading UI and making "loading" indistinguishable from "empty".
**Do this instead:** Keep `useEntries`/`useEntry` defaultless and branch on `undefined` vs `[]`/`null` (documented in `entriesRepository.ts`).

### Saving outside ReviewPage

**What happens:** A capture flow calls `entriesRepository.create()` itself.
**Why it's wrong:** There must be exactly one save path so validation (safe URL, NaN handling, required defaults, double-submit guard) lives in one place.
**Do this instead:** Build a `ReviewDraft` and `navigate(.../review, { state: { draft } })`; let `ReviewPage` persist (`src/pages/ReviewPage.tsx`).

### Diverging the DSL from the manual form

**What happens:** Adding a DSL slot/param without updating `ENTRY_FIELDS`, or vice versa.
**Why it's wrong:** The parser validates keys against `ENTRY_FIELDS` and feeds `buildReviewDraft`; drift produces "unknown field" errors or silently dropped values.
**Do this instead:** Edit `ENTRY_FIELDS` and `POSITIONAL_SCHEMA` together in `src/config/entryFields.ts` — they are the shared source of truth.

## Error Handling

**Strategy:** fail soft and keep the user in flow. Pure parsers/extractors never throw to the UI.

**Patterns:**
- `extractMetadataFromUrl` always returns a base draft (preserving `sourceUrl`) on bad/unknown URLs — never throws (CAPT-04).
- `parseDSL` returns a structured `ParseResult` with `status`/`issues`/`warnings` instead of throwing; an internal `ParseError` is caught and converted to an `error` result.
- `ReviewPage.handleSave` wraps `create()` in try/catch, sets a user-visible `saveError`, logs via `console.error`, and uses a `savingRef` to block double-submits.
- `entriesRepository.update` returns the Dexie update count (0 = id not found) so callers can detect concurrent deletes.

## Cross-Cutting Concerns

**Logging:** `console` only (debug on SW register, error on save/SW failure).
**Validation:** input validation lives in `buildReviewDraft` (NaN/range/empty handling), `parseDSL` (grammar/field validation), and `isSafeUrl` in `src/services/urlUtils.ts` (blocks unsafe URL schemes before persistence).
**Authentication:** none (backendless — see INTEGRATIONS.md).

---

*Architecture analysis: 2026-06-17*

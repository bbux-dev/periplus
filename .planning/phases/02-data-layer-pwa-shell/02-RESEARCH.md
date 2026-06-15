# Phase 2: Data Layer & PWA Shell — Research

**Researched:** 2026-06-15
**Domain:** Dexie 4 schema upgrade + repository pattern + vite-plugin-pwa + useLiveQuery reactive reads
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Stack is LOCKED: React + Vite + TypeScript, Dexie (IndexedDB), `useLiveQuery` reactive reads, Tailwind v4
CSS-first, heroicons. All implementation choices are at Claude's discretion — discuss phase was skipped
(`workflow.skip_discuss=true`). Phase 1 established: `src/services/db.ts` (Dexie instance, version 1,
counter store), `src/test-setup.ts` (fake-indexeddb/auto + jest-dom), Vitest + RTL test harness.

Phase 2 introduces:
- Real domain model (`LifeLogEntry`) and repository (`entriesRepository`) — counter from Phase 1 is
  preserved (removal is not required).
- `vite-plugin-pwa` for web manifest + service worker — deliberately deferred from Phase 1.
- `src/state/common/` and `src/config/` modules (SETUP-04).
- `src/pwa/pwaConfig.ts` testable factory (PWA-01).

### Claude's Discretion
All implementation choices within the locked stack. Key discretion areas: primary key type for entries
(`++id` vs UUID string), sync-state field strategy (syncedAt timestamp vs synced flag), index selection,
pwaConfig factory structure, SETUP-04 module shapes, PWA icon generation approach.

### Deferred Ideas (OUT OF SCOPE)
Actual backend sync logic. The unsynced-entries query is a seam only — no backend exists.
Counter removal (deferred until real capture lands, not required in Phase 2).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-04 | `state/common/` (`requestState.ts`, `assertNever.ts`) and `config/` (`appBrand.ts`, `publicEnv.ts`) modules exist with co-located Vitest tests | Shapes defined in Architecture Patterns §Pattern 7; all pure TypeScript, no external deps |
| DATA-01 | `LifeLogEntry` type defined with exact fields: id, domain, type, title, description?, occurredAt?, recordedAt, sourceUrl?, amount?, location?, tags, metadata | LifeLogEntry interface defined in §Pattern 2 with discriminated `domain`+`type` and `syncedAt` field |
| DATA-02 | Dexie database defines `entries` (keyed by `id`) and `settings` object stores | Schema v2 pattern in §Pattern 1; `&id` unique string key, indexes on `recordedAt` + `domain` |
| DATA-03 | `services/entriesRepository.ts` provides CRUD over `LifeLogEntry` (create, read, list, update, delete) | Repository pattern defined in §Pattern 3 |
| DATA-04 | Repository exposes "unsynced entries" query stub for a future sync layer | `listUnsynced()` using `.filter(e => e.syncedAt == null).toArray()` — no index needed at this scale |
| DATA-05 | Reactive reads over `LifeLogEntry` use `useLiveQuery`; components re-render when entries change | `useEntries()` hook in §Pattern 3; tested via RTL + fake-indexeddb |
| PWA-01 | `pwa/pwaConfig.ts` exports a testable `createPwaOptions()` factory consumed by a thin `vite.config.ts` | Factory pattern in §Pattern 5; tsconfig.node.json requires update to include `src/pwa/**` |
| PWA-02 | App is installable as a mobile-first PWA with a web manifest | Manifest fields defined in §Pattern 5; 192+512 PNGs required in `public/` |
| PWA-03 | Service worker caches the app shell (NetworkFirst navigation, precache static assets, `registerType: 'autoUpdate'`) | workbox config with `navigateFallback: '/index.html'` + `globPatterns` in §Pattern 5 |
| PWA-04 | App shell and previously visited routes load while offline | `navigateFallback: '/index.html'` in workbox config makes the SPA shell available offline |
| PWA-05 | A new entry can be created and persisted while offline | IndexedDB writes do not require network; if app shell loads offline (PWA-04), entries persist normally |
</phase_requirements>

---

## Summary

Phase 2 has two loosely coupled workstreams: the data layer (Dexie schema upgrade, `LifeLogEntry`
domain model, `entriesRepository`, reactive `useEntries` hook) and the PWA shell (`vite-plugin-pwa`
configured with `generateSW` strategy, a `createPwaOptions()` factory, web manifest, and app-shell
precache). A third smaller workstream covers the SETUP-04 utility modules (`requestState`, `assertNever`,
`appBrand`, `publicEnv`). These can be parallelised: the data layer needs no PWA knowledge, and the
PWA config needs no Dexie knowledge. SETUP-04 can land in any order.

The single new production package is `vite-plugin-pwa@^1.3.0`, which bundles `workbox-build` and
`workbox-window` as runtime dependencies — no separate workbox installs required. The package explicitly
supports Vite 7 in its peer dependency range (`vite: '^3.1.0 || ... || ^7.0.0 || ^8.0.0'`).

The critical design choice for the sync-state seam is `syncedAt: number | null` on `LifeLogEntry`
(null = unsynced). IndexedDB cannot efficiently index null values, so the unsynced query uses a full
table scan via `.filter()`. This is acceptable at local-app scale and is explicitly the right tradeoff
here — build the seam, not the sync.

**Primary recommendation:** Implement in three parallel waves: Wave 1 = SETUP-04 + LifeLogEntry type,
Wave 2 = Dexie v2 schema + entriesRepository + useEntries hook, Wave 3 = PWA plugin + pwaConfig factory
+ SW registration. Build-artifact assertions cover PWA-01..03; manual verification covers SC4 (offline
load) and SC5 (offline create).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `LifeLogEntry` persistence | Database / Storage (IndexedDB via Dexie) | — | All reads/writes go through Dexie's `entries` table; no server involved |
| Reactive entry list (DATA-05) | Browser (dexie-react-hooks) | — | `useLiveQuery` bridges Dexie observables to React; lives in the hook layer |
| Unsynced query seam (DATA-04) | Database / Storage (Dexie filter) | — | `.filter(e => e.syncedAt == null)` on the Dexie table; no index needed at scale |
| Repository CRUD abstraction | Application service (`src/services/`) | — | `entriesRepository` wraps the Dexie table; components never import `db` directly |
| PWA manifest + service worker | Build tool (vite-plugin-pwa / Workbox) | Browser (SW runtime) | Plugin generates `manifest.webmanifest` and `sw.js` at build time; browser executes SW at runtime |
| App-shell offline caching | Browser (Service Worker / Workbox generateSW) | — | SW intercepts navigation requests and serves cached `index.html` via `navigateFallback` |
| SW registration in React | Browser (virtual:pwa-register/react) | — | `useRegisterSW` hook from the virtual module manages registration state in React |
| SETUP-04 utilities | Application (TypeScript modules) | — | Pure TS utilities with no runtime deps; consumed by future phases |

---

## Standard Stack

### Core Additions (Phase 2 production dependency)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite-plugin-pwa | ^1.3.0 | PWA manifest + Workbox service worker generation | Locked by architecture-template; only Vite-native PWA plugin; explicitly supports Vite 7 |

No other new production runtime dependencies. `dexie`, `dexie-react-hooks`, `react`, `react-dom`, `react-router-dom` were all installed in Phase 1.

### Dev / Build Additions

None required: `vite-plugin-pwa@1.3.0` bundles `workbox-build@^7.4.1` and `workbox-window@^7.4.1` as its own runtime dependencies (they install transitively). No separate `workbox-*` installs are needed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `vite-plugin-pwa` (generateSW) | `vite-plugin-pwa` (injectManifest) | injectManifest requires writing a custom SW file; generateSW covers all Phase 2 needs with zero SW code |
| `syncedAt: number \| null` (filter scan) | `synced: 0 \| 1` (indexed number) | 0/1 enables indexed queries; syncedAt is more semantically rich and filter scan is fine at local scale |
| `crypto.randomUUID()` for entry id | `++id` auto-increment | Auto-increment is simpler but UUID strings are sync-compatible; UUID is correct for a future sync seam |

**Installation:**
```bash
npm install --save-dev vite-plugin-pwa
```

> `vite-plugin-pwa` is a devDependency — it is a Vite build plugin. The workbox runtime (`workbox-window`)
> that ships with it only runs in the browser via generated SW code, not in the Node build process.

**Version verification:**
```bash
npm view vite-plugin-pwa version    # confirmed: 1.3.0
```

---

## Package Legitimacy Audit

> slopcheck was unavailable in this environment. Graceful degradation applies.
> All packages below are tagged `[ASSUMED]`. The planner must add `checkpoint:human-verify` before the install batch.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| vite-plugin-pwa | npm | ~5 yrs (2020-08-20) | high (confirmed canonical plugin) | github.com/vite-pwa/vite-plugin-pwa | unavailable | Approved [ASSUMED] |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable. Mitigating signal: `vite-plugin-pwa` is 5+ years old (first published
2020-08-20, last updated 2026-05-05), has 135 published versions, is the official Vite PWA plugin
with an active GitHub repo, and has no `scripts.postinstall` in the published package (verified via
`npm view vite-plugin-pwa scripts.postinstall` → empty). The peerDeps explicitly declare Vite 7
compatibility. Risk is LOW based on all available non-slopcheck signals.*

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (phone-sized viewport, potentially offline)
        │
        ▼
  index.html (served from SW cache when offline)
        │
        ▼
  main.tsx  ──────────────────────────────────────────┐
   │ createRoot + BrowserRouter + <App />             │
   │ useRegisterSW() ← virtual:pwa-register/react    │ SW registration
        │                                             │ (autoUpdate)
        ▼                                             │
  App.tsx (Routes)                                    ▼
   │  Route path="/"                        Service Worker (sw.js)
   │          │                             generated by workbox
   ▼          ▼                             ├── precache: JS/CSS/HTML/PNG
  WelcomePage.tsx                           ├── navigateFallback: /index.html
   │          │                             └── runtime cache (no API calls)
   │   Counter.tsx (Phase 1 tracer)
   │   [future: entry list component]
        │
        ▼
  useEntries()  ← useLiveQuery
  dexie-react-hooks
        │
        ▼
  entriesRepository.ts
  (create / get / list / listUnsynced / update / delete)
        │
        ▼
  db.ts  ── LifeLogDB extends Dexie (version 2)
        │         entries table: &id, recordedAt, domain
        │         settings table: key
        │         counter table: id (Phase 1, unchanged)
        ▼
  IndexedDB (browser, local-only, works offline)

Build pipeline:
  vite.config.ts
    VitePWA(createPwaOptions())  ←  src/pwa/pwaConfig.ts
    generates:
      dist/manifest.webmanifest
      dist/sw.js
      dist/workbox-*.js  (precache manifest)
```

### Recommended Project Structure (Phase 2 output)

```
src/
├── pwa/
│   ├── pwaConfig.ts            # createPwaOptions() factory (new)
│   └── .gitkeep                # Phase 1 placeholder (replace with real file)
├── config/
│   ├── appBrand.ts             # App name, shortName, description, themeColor (new)
│   ├── appBrand.test.ts        # co-located test (new)
│   ├── publicEnv.ts            # Public env vars placeholder (new)
│   └── publicEnv.test.ts       # co-located test (new)
├── state/
│   └── common/
│       ├── requestState.ts     # RequestState<T> discriminated union (new)
│       ├── requestState.test.ts
│       ├── assertNever.ts      # exhaustiveness check (new)
│       └── assertNever.test.ts
├── services/
│   ├── db.ts                   # Extended: LifeLogDB v2 + entries + settings tables
│   ├── db.test.ts              # Extended: v2 schema tests
│   ├── entriesRepository.ts    # CRUD + useEntries hook (new)
│   └── entriesRepository.test.ts
├── components/
│   └── Counter.tsx             # Unchanged from Phase 1
└── vite-env.d.ts               # Add /// <reference types="vite-plugin-pwa/react" />
public/
├── pwa-192x192.png             # PWA icon (new — must be a real PNG)
├── pwa-512x512.png             # PWA icon (new — must be a real PNG)
└── vite.svg                    # Existing
vite.config.ts                  # Add VitePWA(createPwaOptions()) to plugins
tsconfig.node.json              # Add "src/pwa/**" to include array
```

---

### Pattern 1: Dexie v2 Schema Upgrade (DATA-02)

**What:** Add the `entries` and `settings` tables without destroying the Phase 1 `counter` store.

**Key Dexie 4 rule:** Only new or changed tables need to be declared in a new version block. Tables omitted from a higher version remain unchanged from their prior declaration. Do NOT delete or re-declare `version(1)`.

```typescript
// src/services/db.ts  (replaces Phase 1 file)
import Dexie, { type EntityTable } from 'dexie'
import type { LifeLogEntry } from '../types/lifeLogEntry'  // or defined inline

interface Counter {
  id: number     // fixed: always 1
  value: number
}

interface Setting {
  key: string
  value: unknown
}

class LifeLogDB extends Dexie {
  counter!: EntityTable<Counter, 'id'>
  entries!: EntityTable<LifeLogEntry, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('LifeLogDB')
    // Phase 1: counter store — DO NOT modify this block
    this.version(1).stores({
      counter: 'id',
    })
    // Phase 2: add entries + settings — counter is NOT redeclared here
    this.version(2).stores({
      entries: '&id, recordedAt, domain',
      settings: 'key',
    })
  }
}

export const db = new LifeLogDB()
```

**Index string breakdown for `entries: '&id, recordedAt, domain'`:**
- `&id` — unique primary key (caller provides UUID string; `&` enforces uniqueness without auto-increment)
- `recordedAt` — secondary index for ordering entries by creation time (Phase 6 listing)
- `domain` — secondary index for filtering by category (Phase 6 filter tabs)

**Do NOT index:** `syncedAt` (cannot index `null` in IndexedDB — sparse indexes skip null/undefined), `tags` array unless multi-entry index is needed (defer to Phase 6), `metadata` (opaque blob).

[CITED: dexie.org/docs/Tutorial/Design]

---

### Pattern 2: LifeLogEntry Domain Model (DATA-01)

**Source:** REQUIREMENTS.md DATA-01 field list. Discriminated by `domain` + `type`.

```typescript
// src/types/lifeLogEntry.ts  (new file, or co-located in services/)
// Alternatively inline in db.ts if the project prefers co-location

export type EntryDomain = 'media' | 'trips' | 'expenditures'

export type EntryType =
  | 'show'     // media
  | 'movie'    // media
  | 'book'     // media
  | 'podcast'  // media
  | 'place'    // trips
  | 'event'    // trips
  | 'expense'  // trips OR expenditures

export interface LifeLogEntry {
  id: string                          // UUID; provided by entriesRepository.create()
  domain: EntryDomain                 // indexed; used for category filtering
  type: EntryType                     // discriminant; not indexed in Phase 2
  title: string
  description?: string
  occurredAt?: number                 // epoch ms; optional (event time, may be unknown)
  recordedAt: number                  // epoch ms; indexed; when entry was captured (always present)
  sourceUrl?: string                  // original URL for URL-captured entries
  amount?: number                     // expense amount
  location?: string
  tags: string[]                      // string array; NOT indexed in Phase 2
  metadata: Record<string, unknown>   // opaque bag for extraction data; NOT indexed
  syncedAt: number | null             // null = not yet synced; epoch ms when synced; NOT indexed
}
```

**Why `syncedAt: number | null` (not `synced: 0 | 1`):**
- More semantically rich (records WHEN it was synced, not just WHETHER)
- The unsynced query uses a filter scan, which is acceptable for a local app with small datasets
- If this were a high-volume app, `synced: 0 | 1` would enable an efficient indexed query; that optimization can be added later if needed
- The CONTEXT.md explicitly uses `syncedAt` terminology

[CITED: dexie.org/docs/WhereClause/WhereClause.noneOf() (IndexedDB null/boolean indexing limitation)]

---

### Pattern 3: entriesRepository + useEntries Hook (DATA-03, DATA-04, DATA-05)

```typescript
// src/services/entriesRepository.ts
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { LifeLogEntry } from '../types/lifeLogEntry'

// CRUD operations (DATA-03)
export const entriesRepository = {
  async create(entry: Omit<LifeLogEntry, 'id'>): Promise<LifeLogEntry> {
    const id = crypto.randomUUID()
    const full: LifeLogEntry = { ...entry, id }
    await db.entries.add(full)
    return full
  },

  async get(id: string): Promise<LifeLogEntry | undefined> {
    return db.entries.get(id)
  },

  async list(): Promise<LifeLogEntry[]> {
    return db.entries.orderBy('recordedAt').reverse().toArray()
  },

  // Sync seam (DATA-04): full filter scan; fine at local scale
  async listUnsynced(): Promise<LifeLogEntry[]> {
    return db.entries.filter((e) => e.syncedAt == null).toArray()
  },

  async update(id: string, changes: Partial<Omit<LifeLogEntry, 'id'>>): Promise<void> {
    await db.entries.update(id, changes)
  },

  async delete(id: string): Promise<void> {
    await db.entries.delete(id)
  },
}

// Reactive hook for components (DATA-05)
// Returns undefined while Dexie is opening, then [] when no entries exist
export function useEntries(): LifeLogEntry[] | undefined {
  return useLiveQuery(
    () => db.entries.orderBy('recordedAt').reverse().toArray(),
    [],
  )
}
```

**Component consumption pattern:**
```typescript
// Example: future entry list component
import { useEntries } from '../services/entriesRepository'

export function EntryList() {
  const entries = useEntries()
  if (!entries) return <p>Loading...</p>
  return <ul>{entries.map(e => <li key={e.id}>{e.title}</li>)}</ul>
}
```

[CITED: dexie.org/docs/dexie-react-hooks/useLiveQuery()]

---

### Pattern 4: VitePWA Plugin in vite.config.ts (PWA-01 integration point)

```typescript
// vite.config.ts  (modified from Phase 1)
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { createPwaOptions } from './src/pwa/pwaConfig'

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA(createPwaOptions())],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    passWithNoTests: true,
  },
})
```

**Required tsconfig.node.json change:** Add `"src/pwa/**"` to the `include` array so `tsc -b` can type-check the import:
```json
{
  "include": ["vite.config.ts", "src/pwa/**"]
}
```
Without this, `tsc -b` fails with "Module not in compilation scope" because tsconfig.node.json currently only includes `vite.config.ts`.

[ASSUMED: tsconfig.node.json update pattern; standard practice for Vite projects that pull build-time helpers from src/]

---

### Pattern 5: pwa/pwaConfig.ts Testable Factory (PWA-01..04)

```typescript
// src/pwa/pwaConfig.ts
import type { VitePWAOptions } from 'vite-plugin-pwa'

// Inline brand constants (no cross-file import to avoid tsconfig.node.json complications)
const APP_NAME = 'Life Log'
const THEME_COLOR = '#1e40af'  // matches --color-primary in index.css

export function createPwaOptions(): Partial<VitePWAOptions> {
  return {
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'vite.svg'],
    manifest: {
      name: APP_NAME,
      short_name: APP_NAME,
      description: 'Capture structured life events locally and offline',
      theme_color: THEME_COLOR,
      background_color: '#ffffff',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    workbox: {
      // Precache all static assets (JS, CSS, HTML, icons, fonts)
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      // SPA offline: navigate to cached index.html for all app routes
      navigateFallback: '/index.html',
    },
    devOptions: {
      // SW disabled in dev by default; set enabled: true to test locally
      enabled: false,
    },
  }
}
```

**Testable via Vitest:**
```typescript
// src/pwa/pwaConfig.test.ts
import { describe, it, expect } from 'vitest'
import { createPwaOptions } from './pwaConfig'

describe('createPwaOptions', () => {
  it('returns registerType autoUpdate', () => {
    expect(createPwaOptions().registerType).toBe('autoUpdate')
  })
  it('manifest has required PWA fields', () => {
    const { manifest } = createPwaOptions()
    expect(manifest?.name).toBeTruthy()
    expect(manifest?.short_name).toBeTruthy()
    expect(manifest?.icons).toHaveLength(2)
    const sizes = manifest?.icons?.map(i => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })
  it('workbox config has navigateFallback for SPA offline', () => {
    expect(createPwaOptions().workbox?.navigateFallback).toBe('/index.html')
  })
})
```

[CITED: vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html]

---

### Pattern 6: Service Worker Registration in main.tsx (PWA-02, PWA-03)

**TypeScript declaration — add to `src/vite-env.d.ts`:**
```typescript
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
```

**Simple autoUpdate registration — add to `src/main.tsx`:**
```typescript
import { useRegisterSW } from 'virtual:pwa-register/react'
// ...existing imports...

// Minimal SW registration at app root; no UI needed for autoUpdate
function PWARegistrar() {
  useRegisterSW({
    onRegistered(r) {
      if (import.meta.env.DEV) console.debug('SW registered:', r)
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
    },
  })
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PWARegistrar />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

**Alternative (simpler for autoUpdate):** For `registerType: 'autoUpdate'`, the plugin also supports auto-registration via `injectRegister: 'auto'` (the default), which injects registration code into the HTML entry point without requiring `useRegisterSW` in React at all. The `useRegisterSW` hook is only needed if you want React-level registration lifecycle callbacks. For Phase 2, either approach works; the `useRegisterSW` approach is more visible and testable.

[CITED: vite-pwa-org.netlify.app/frameworks/react.html]
[CITED: vite-pwa-org.netlify.app/guide/development — devOptions.enabled behavior]

---

### Pattern 7: SETUP-04 Utility Modules

All four are pure TypeScript with no external dependencies. Shape is intentionally minimal — these are extensible scaffolds.

```typescript
// src/state/common/requestState.ts
export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

export const idle = { status: 'idle' } as const
export const loading = { status: 'loading' } as const
export function success<T>(data: T): RequestState<T> {
  return { status: 'success', data }
}
export function failure(error: Error): RequestState<never> {
  return { status: 'error', error }
}
```

```typescript
// src/state/common/assertNever.ts
export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminant: ${JSON.stringify(value)}`)
}
```

```typescript
// src/config/appBrand.ts
export const appBrand = {
  name: 'Life Log',
  shortName: 'Life Log',
  description: 'Capture structured life events locally and offline',
  themeColor: '#1e40af',  // matches --color-primary in src/index.css
} as const
```

```typescript
// src/config/publicEnv.ts
// Public (non-secret) environment variables read from import.meta.env.
// No env vars in Phase 2 — extensible placeholder for future phases.
export const publicEnv = {} as const
```

[ASSUMED: Module shapes derived from architecture-template.md description and patrimonium convention]

---

### Pattern 8: PWA Icon Generation

The manifest requires `pwa-192x192.png` and `pwa-512x512.png` in the `public/` directory. These must be real PNG files (not SVG, not empty). Options:

1. **Node.js script (recommended for reproducibility):** Write a short Node script that generates solid-color square PNGs using the `canvas` npm package or `sharp`. Output files to `public/pwa-192x192.png` and `public/pwa-512x512.png`.
2. **@vite-pwa/assets-generator (overkill for Phase 2):** The optional peer dep that generates all variants from an SVG. Adds a devDep + config file; not worth it for a prototype.
3. **Manual asset creation:** Use any image editor or online tool to create 192×192 and 512×512 PNGs and commit them to `public/`.

**Recommendation for Phase 2:** Use a minimal Node.js script to generate placeholder PNGs programmatically. They only need to be valid PNGs at the correct dimensions — visual quality is not a requirement for the tracer prototype. This avoids a binary asset checked into git while remaining reproducible.

---

### Anti-Patterns to Avoid

- **Editing `version(1).stores()` to add new tables:** Causes `VersionError` for any browser that opened the DB at v1. Always add a new `version(2).stores()` block. Never mutate existing version blocks.
- **Indexing `syncedAt` in Dexie schema:** IndexedDB sparse indexes skip `null`/`undefined`/boolean values. Declaring `syncedAt` as an index would silently exclude unsynced entries (where `syncedAt` is null) from the index — the opposite of what we want. Leave it unindexed and use `.filter()`.
- **Using boolean `synced: boolean` as a field:** IndexedDB cannot index booleans. If you want an indexable sync flag, use a number `0|1`, not a boolean. For Phase 2, `syncedAt: number | null` is preferred.
- **Setting `devOptions.enabled: true` permanently:** Enabling the SW in dev causes Vite HMR to conflict with the SW cache. Leave `enabled: false` by default; set it manually during PWA-specific debugging.
- **Installing `workbox-window` or `workbox-build` separately:** These are already bundled as runtime dependencies of `vite-plugin-pwa@1.3.0`. Separate installation creates version conflicts.
- **Skipping `tsconfig.node.json` update:** Without adding `src/pwa/**` to tsconfig.node.json's `include`, `tsc -b` fails when `vite.config.ts` imports from `./src/pwa/pwaConfig`. This is a required change that must precede the PWA wave.
- **Using `++id` for the entries primary key:** Auto-increment integer IDs are browser-local and will conflict during future sync (two devices can independently produce `id: 1`). Use `crypto.randomUUID()` for a globally unique string ID instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker generation | Custom `sw.js` file with fetch listeners | `vite-plugin-pwa` generateSW strategy | Workbox's precache, versioning, and cache invalidation are ~1000 lines of edge-case logic |
| Web manifest injection | Manually add `<link rel="manifest">` to index.html | VitePWA plugin `manifest:` option | Plugin handles asset hashing, MIME type serving, and meta-tag injection automatically |
| Offline navigation fallback | Custom SW route matching for SPA | `navigateFallback: '/index.html'` in workbox config | One line vs. a full SW Router implementation |
| UUIDs for entry IDs | Custom nanoid / timestamp ID | `crypto.randomUUID()` | Built into modern browsers; no dep; 122-bit random collision-safe |
| IndexedDB null indexing | Custom bitmap or inverted index | `.filter(e => e.syncedAt == null)` | Full table scan is correct for local-only data at personal-log scale |

**Key insight:** Service workers are notoriously hard to get right. Cache invalidation, update lifecycle, and navigation fallback all have subtle edge cases. Workbox (via vite-plugin-pwa) has solved all of them — use it.

---

## Common Pitfalls

### Pitfall 1: VersionError on Dexie Schema Change

**What goes wrong:** After changing `version(1).stores()` to add entries/settings, any browser that previously opened the DB at version 1 throws `Dexie.VersionError: The requested version (1) is older than the existing version`.

**Why it happens:** IndexedDB version numbers are browser-persisted. Modifying an already-committed schema version causes the IDB `open()` to compare the requested version to the stored version and reject the call.

**How to avoid:** NEVER change `version(1).stores()` after it has shipped. Add `version(2).stores(...)` as a separate block. In tests, call `db.delete()` + `db.open()` in `beforeEach` to reset state (existing Phase 1 db.test.ts pattern).

**Warning signs:** `VersionError` during `db.open()`; test isolation failures where one test's schema bleeds into another.

---

### Pitfall 2: PWA Service Worker Not Generated in Dev

**What goes wrong:** Running `npm run dev` shows no `sw.js` and `manifest.webmanifest` in DevTools → Application tab.

**Why it happens:** By default, `vite-plugin-pwa` only generates the SW during `vite build` (not during dev server). `devOptions.enabled` defaults to `false`.

**How to avoid:** For PWA testing, always use `npm run build && npm run preview` (not `npm run dev`). To test offline, enable Chrome DevTools → Network → Offline after the SW has installed from a preview/production build.

**Warning signs:** DevTools → Application → Service Workers shows "No service workers detected"; manifest fields absent in dev.

---

### Pitfall 3: `tsc -b` Fails After Adding pwaConfig Import

**What goes wrong:** `tsc -b` exits with an error like "File 'src/pwa/pwaConfig.ts' is not under 'rootDir'".

**Why it happens:** `tsconfig.node.json` only includes `vite.config.ts`. When `vite.config.ts` imports from `./src/pwa/pwaConfig`, TypeScript cannot type-check the import because `src/pwa/pwaConfig.ts` is outside the node compilation scope.

**How to avoid:** Update `tsconfig.node.json` `"include"` to add `"src/pwa/**"` before writing the `vite.config.ts` import. This must be a Wave 0 or first-task step in the PWA wave.

**Warning signs:** TypeScript error about "Module ... is not listed under 'files'" or "not under 'rootDir'" during `tsc -b`.

---

### Pitfall 4: `virtual:pwa-register/react` Type Errors

**What goes wrong:** TypeScript cannot find module `'virtual:pwa-register/react'` — TS2307 error.

**Why it happens:** Virtual modules don't exist on disk; TypeScript needs a type declaration to understand them. The `vite-plugin-pwa/react` declaration file provides these types.

**How to avoid:** Add `/// <reference types="vite-plugin-pwa/react" />` to `src/vite-env.d.ts`. This must exist before any file imports `virtual:pwa-register/react`.

**Warning signs:** TS2307 on the virtual module import; compilation passes in Vite (which ignores types) but `tsc -b` fails.

---

### Pitfall 5: useLiveQuery Returns undefined on First Render

**What goes wrong:** A component using `useEntries()` receives `undefined` on initial render, causing downstream `.map()` to crash.

**Why it happens:** `useLiveQuery` is inherently async — Dexie's DB open is asynchronous. The first render fires before the IndexedDB transaction resolves.

**How to avoid:** Either check for `undefined` before rendering (`if (!entries) return null`), or provide a default value as the third argument to `useLiveQuery`. The `useEntries()` hook above returns `undefined` intentionally — callers must handle the loading state. Do not provide a `[]` default inside the hook if you need to distinguish "loading" from "empty".

**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'map')` in a component.

---

### Pitfall 6: PWA Icons Not Real PNG Files

**What goes wrong:** The web app manifest references `pwa-192x192.png` and `pwa-512x512.png` but they are placeholder files, empty files, or SVG files with a .png extension.

**Why it happens:** PWA installability requires the browser to fetch and validate the manifest icons. Invalid PNG files cause the install prompt to never appear.

**How to avoid:** Verify `public/pwa-192x192.png` and `public/pwa-512x512.png` are valid PNG binary files at exactly their declared dimensions. Test with `file public/pwa-192x192.png` → should report "PNG image data, 192 x 192".

**Warning signs:** Chrome DevTools → Application → Manifest shows "Download error" or "Unable to download icon" for the 192x192 or 512x512 icons.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Workbox CLI / CRA PWA config | `vite-plugin-pwa` (generateSW + VitePWA plugin) | ~2021 | Integrated with Vite build; no separate SW build step |
| Manual `navigator.serviceWorker.register()` | `virtual:pwa-register/react` → `useRegisterSW` | 2021+ | React hook manages SW lifecycle; handles update prompts |
| `<link rel="manifest" href="manifest.json">` in HTML | Plugin injects manifest link + meta tags automatically | vite-plugin-pwa | Zero-config manifest injection |
| Sequential Dexie version declarations (all stores repeated) | Dexie 3+ incremental: only changed tables per version | Dexie 3.0 (2021) | Cleaner version blocks; omit unchanged stores |
| `dexie.version(N).stores({ table: '++id' })` integer PK | UUID string PK `&id` + `crypto.randomUUID()` | Post-Dexie 4 + sync-era pattern | Sync-safe IDs without coordination |

**Deprecated/outdated:**
- CRA's built-in `workbox-webpack-plugin` pattern: CRA is deprecated; Vite + vite-plugin-pwa replaces it
- Manual `navigator.serviceWorker.register('/sw.js')` in `index.html`: Still valid but bypasses the update lifecycle management that `useRegisterSW` provides

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `SETUP-04` module shapes (`requestState.ts`, `assertNever.ts`, `appBrand.ts`, `publicEnv.ts`) match the patrimonium/architecture-template convention | Pattern 7 | Low — shapes are standard TypeScript utilities; a different shape would only affect Phase 3+ import paths |
| A2 | `tsconfig.node.json` `include` update to add `src/pwa/**` is sufficient for `vite.config.ts` to import from `./src/pwa/pwaConfig` without TS errors | Pattern 4, Pitfall 3 | Low — this is standard TypeScript project-references behavior; if it fails, the alternative is to inline the PWA config in vite.config.ts and make pwaConfig.ts unused by vite.config.ts |
| A3 | `injectRegister: 'auto'` (the default in vite-plugin-pwa when `registerType: 'autoUpdate'`) injects registration code into the HTML entry point without requiring `useRegisterSW` in React | Pattern 6 | Low — if auto-injection doesn't work, `useRegisterSW` is the explicit fallback and works regardless |
| A4 | Placeholder PNG files generated by a Node script (solid-color rectangles at correct dimensions) will satisfy browser PWA install criteria | Pattern 8 | Low — browsers check PNG validity and dimensions, not visual quality; a valid monochrome PNG passes |
| A5 | All npm packages (including `vite-plugin-pwa`) are legitimate and not slopsquatted | Package Legitimacy Audit | Low — package is 5+ years old with known maintainer, no postinstall script, and explicit Vite 7 peerDep declaration; slopcheck unavailable for formal verification |
| A6 | `vite-plugin-pwa` does NOT require `workbox-window` as a separate devDependency (it bundles it) | Standard Stack | Low — confirmed `workbox-window@^7.4.1` is in the package's `dependencies`, not just peerDependencies; npm installs it transitively |

---

## Open Questions

1. **PNG icon generation mechanism**
   - What we know: 192×192 and 512×512 PNGs must exist in `public/` as valid PNG binaries
   - What's unclear: Whether to generate them with a Node script, a devDependency, or commit pre-made assets
   - Recommendation: Planner should include a task to generate minimal placeholder PNGs programmatically. A simple approach: use a small Node script that writes a minimal valid PNG header+body for a solid-color square. Alternatively, commit two pre-made 1-color PNG files from any image tool.

2. **LifeLogEntry type location**
   - What we know: The interface is needed by both `db.ts` (EntityTable generic) and `entriesRepository.ts` (function signatures)
   - What's unclear: Whether to define it in `src/types/lifeLogEntry.ts` or co-located in `src/services/db.ts`
   - Recommendation: Define in `src/services/db.ts` alongside the Dexie class for Phase 2 (keeps all data-layer types together). If type exports grow unwieldy, refactor to `src/types/` in Phase 3.

3. **Counter removal timing**
   - What we know: Phase 1 counter is explicitly preserved ("removal not required here unless it conflicts")
   - What's unclear: Whether leaving the counter in `WelcomePage.tsx` is confusing alongside the new data layer
   - Recommendation: Leave the counter in place for Phase 2. Remove it when the first real entry capture UI lands (Phase 4). The counter does not conflict with `entries`/`settings` stores.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | Package install, build | ✓ | (confirmed — Phase 1 ran successfully) | — |
| Vite 7 + react plugin | Build, preview, SW generation | ✓ | 7.1.7 (from package.json) | — |
| Browser with IDB support | Manual SC4/SC5 verification | not tested | — | Chrome DevTools → Application for PWA audit |
| `vite preview` command | Manual offline testing (SW only runs from build) | ✓ | Ships with vite | — |

**Missing dependencies with no fallback:** None — all Phase 2 work is local-first with no external services.

**Missing dependencies with fallback:** None.

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` → treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.9 |
| Config file | `vite.config.ts` — `test:` block (import from `vitest/config`) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run && tsc -b && vite build` |

### Phase Requirements → Test Map

| Req ID | Success Criterion | Behavior | Test Type | Automated Command | SC Automation Boundary |
|--------|-------------------|----------|-----------|-------------------|------------------------|
| SETUP-04 | — | `requestState.ts` exports compile and correct types | Unit | `npx vitest run src/state/common/requestState.test.ts` | Fully automated |
| SETUP-04 | — | `assertNever` throws on unhandled value | Unit | `npx vitest run src/state/common/assertNever.test.ts` | Fully automated |
| SETUP-04 | — | `appBrand` has name + themeColor | Unit | `npx vitest run src/config/appBrand.test.ts` | Fully automated |
| SETUP-04 | — | `publicEnv` is an object | Unit | `npx vitest run src/config/publicEnv.test.ts` | Fully automated |
| DATA-01 | — | LifeLogEntry interface assignable with all required fields | Unit (TypeScript compile) | `tsc -b` exits 0 | Fully automated |
| DATA-02 | — | Dexie v2: entries + settings tables open; counter still works | Unit + fake-indexeddb | `npx vitest run src/services/db.test.ts` | Fully automated |
| DATA-02 | — | Schema v2 upgrade: inserting an entry succeeds | Unit + fake-indexeddb | `npx vitest run src/services/db.test.ts` | Fully automated |
| DATA-03 / SC1 | `LifeLogEntry` can be written and read back | `entriesRepository.create()` + `.get()` round-trip | Unit + fake-indexeddb | `npx vitest run src/services/entriesRepository.test.ts` | Fully automated |
| DATA-03 | — | `list()`, `update()`, `delete()` operations | Unit + fake-indexeddb | `npx vitest run src/services/entriesRepository.test.ts` | Fully automated |
| DATA-04 / SC3 | "unsynced entries" query returns entries with `syncedAt == null` | `listUnsynced()` filters correctly | Unit + fake-indexeddb | `npx vitest run src/services/entriesRepository.test.ts` | Fully automated |
| DATA-05 / SC2a | Component using `useEntries()` re-renders when entries change | RTL render + `entriesRepository.create()` → DOM update | Unit + RTL + fake-indexeddb | `npx vitest run src/services/entriesRepository.test.ts` (or dedicated component test) | Fully automated |
| DATA-05 / SC2b | Entries survive a page refresh (real IndexedDB persistence) | Hard-refresh in browser after creating entry | **Manual only** | `vite dev` → create entry → refresh → verify entry present | Cannot be automated with fake-indexeddb (in-memory only) |
| PWA-01 | `createPwaOptions()` returns correct shape | Factory returns object with registerType, manifest, workbox | Unit | `npx vitest run src/pwa/pwaConfig.test.ts` | Fully automated |
| PWA-02 / SC4a | `manifest.webmanifest` generated with required fields | Build artifact: dist/manifest.webmanifest exists + contains name, icons | Build artifact assertion | `vite build && grep -q '"name"' dist/manifest.webmanifest` | Fully automated |
| PWA-03 / SC4b | Service worker generated with precache manifest | Build artifact: dist/sw.js exists + workbox-*.js exists | Build artifact assertion | `vite build && test -f dist/sw.js` | Fully automated |
| PWA-03 | SW registration code present in bundle | Build artifact: dist/index.html or bundle references registerSW | Build artifact assertion | `grep -r "registerSW\|virtual:pwa" dist/` | Fully automated |
| PWA-04 / SC4c | App shell opens while offline | SW intercepts navigation + serves index.html from cache | **Manual only** | `vite build && vite preview` → DevTools offline → navigate | Browser SW + offline mode required |
| PWA-05 / SC5 | New entry persists while offline | App shell offline (SC4) + IndexedDB write (SC1) | **Manual only** | Same as SC4c + create entry + verify in DevTools IDB | IndexedDB works offline; requires offline browser |

### Automated vs Manual Boundary Summary

**Automated (Vitest + build gate):** SC1, SC2a (reactive re-render), SC3, PWA-01 (factory shape), PWA-02 and PWA-03 (build artifact existence and content), SETUP-04 modules.

**Manual only:**
- **SC2b** (cross-refresh persistence): fake-indexeddb is in-memory; a real IndexedDB refresh test requires a real browser. Verify manually: `npm run dev` → create entry → hard-refresh → entry still visible.
- **SC4c** (app shell offline): requires a real SW installation from a production build. Verify: `npm run build && npm run preview` → Chrome DevTools → Network → Offline → navigate to app → shell renders.
- **SC5** (offline create): Requires SC4c verified first. Verify: while offline, create an entry via UI → entry appears in the list and is present in DevTools → Application → IndexedDB.

**Rationale for manual boundary:** Service worker install, cache population, and offline intercept require the browser's SW API — which fake-indexeddb + jsdom cannot simulate. Build artifact assertions are a reliable proxy for "the SW will work" but cannot substitute for an end-to-end browser test. The Vitest + artifact gate is sufficient for phase acceptance; manual verification confirms the full scenario.

### Sampling Rate

- **Per task commit:** `npx vitest run` (unit tests; ~seconds)
- **Per wave merge:** `npx vitest run && tsc -b && vite build` (includes artifact generation)
- **Phase gate:** Full suite green + manual SC2b/SC4c/SC5 verification before `/gsd:verify-work`

### Wave 0 Gaps

New test files to create:
- [ ] `src/state/common/requestState.test.ts` — covers SETUP-04 (requestState helpers)
- [ ] `src/state/common/assertNever.test.ts` — covers SETUP-04 (assertNever throw)
- [ ] `src/config/appBrand.test.ts` — covers SETUP-04 (brand constants shape)
- [ ] `src/config/publicEnv.test.ts` — covers SETUP-04 (publicEnv shape)
- [ ] `src/pwa/pwaConfig.test.ts` — covers PWA-01 (factory returns valid options)
- [ ] `src/services/entriesRepository.test.ts` — covers DATA-01..05, SC1, SC2a, SC3

Existing test files to extend:
- [ ] `src/services/db.test.ts` — extend with v2 schema tests (entries table opens, settings table opens)

No test framework changes — existing Vitest + fake-indexeddb + RTL setup from Phase 1 covers all needs.

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth; single-user local prototype |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | Single-user; all data is same-origin IndexedDB |
| V5 Input Validation | Minimal | `LifeLogEntry` fields are typed at compile time; `title: string` is freeform input but not rendered as HTML in Phase 2 (no XSS surface yet) |
| V6 Cryptography | No | No secrets, no encryption; `crypto.randomUUID()` is used for ID generation only (not cryptographic security context) |
| PWA / SW integrity | Low | Service worker is same-origin; Workbox precache uses revision hashing; no external CDN scripts cached |

**Threat pattern specific to PWA:** A compromised service worker can intercept all page requests. Mitigated by: (1) SW is generated from source (not fetched from external URL), (2) same-origin only, (3) Workbox's precache manifest uses content hashes to detect tampered assets. No action needed beyond the standard Workbox setup.

---

## Sources

### Primary (HIGH confidence)
- [dexie.org/docs/Tutorial/Design#database-versioning](https://dexie.org/docs/Tutorial/Design#database-versioning) — "New versions need only to specify changed tables"; version upgrade pattern
- [dexie.org/docs/Version/Version.stores()](https://dexie.org/docs/Version/Version.stores()) — Index string format (`&id`, `++id`, compound, multi-entry)
- [dexie.org/docs/dexie-react-hooks/useLiveQuery()](https://dexie.org/docs/dexie-react-hooks/useLiveQuery()) — useLiveQuery API signature, array querier pattern, undefined loading state
- [dexie.org/docs/WhereClause/WhereClause.noneOf()](https://dexie.org/docs/WhereClause/WhereClause.noneOf()) — Confirmed: IndexedDB cannot index null/boolean/undefined; sparse index limitation
- [vite-pwa-org.netlify.app/guide/](https://vite-pwa-org.netlify.app/guide/) — VitePWA plugin overview; registerType; devOptions behavior
- [vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html](https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html) — Required manifest fields; 192x192 + 512x512 icons minimum
- [vite-pwa-org.netlify.app/frameworks/react.html](https://vite-pwa-org.netlify.app/frameworks/react.html) — useRegisterSW hook; ReloadPrompt pattern; TypeScript types
- [npm: vite-plugin-pwa peerDependencies](https://www.npmjs.com/package/vite-plugin-pwa) — Confirmed: `vite: '^3.1.0 || ... || ^7.0.0 || ^8.0.0'`; workbox-window/build bundled; no postinstall
- [github.com/vite-pwa/vite-plugin-pwa/blob/main/docs/frameworks/react.md](https://github.com/vite-pwa/vite-plugin-pwa/blob/main/docs/frameworks/react.md) — useRegisterSW full signature; vite-plugin-pwa/react type reference

### Secondary (MEDIUM confidence)
- [blog.brightcoding.dev — VitePWA React SPA guide](https://www.blog.brightcoding.dev/2025/12/03/%F0%9F%9A%80-the-ultimate-guide-to-transforming-vite-apps-into-lightning-fast-pwas-with-vite-plugin-pwa/) — Full vite.config.ts example with navigateFallback, globPatterns, manifest icons; verified against primary docs
- [vite-pwa-org.netlify.app/guide/development](https://vite-pwa-org.netlify.app/guide/development) — devOptions.enabled; dev vs build behavior differences

### Tertiary (LOW confidence)
- None — all major claims were verified against official documentation or npm registry.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| vite-plugin-pwa version + Vite 7 compatibility | HIGH | peerDeps verified directly via `npm view`; explicit `^7.0.0` in peerDep range |
| Dexie v2 schema upgrade pattern | HIGH | Official dexie.org docs read directly; "only changed tables" rule confirmed |
| LifeLogEntry field set | HIGH | Copied verbatim from REQUIREMENTS.md DATA-01 |
| syncedAt null indexing limitation | HIGH | Official Dexie docs + WhereClause.noneOf() docs confirm IndexedDB cannot index null |
| pwaConfig factory pattern + tsconfig.node.json update | MEDIUM | Pattern derived from standard Vite project structure; tsconfig update is [ASSUMED] as correct fix |
| SETUP-04 module shapes | MEDIUM | Architecture template describes names; exact shapes are [ASSUMED] from patrimonium convention |
| PWA icon generation approach | MEDIUM | Minimal requirements confirmed from official docs; Node.js script approach is [ASSUMED] as valid |

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (30 days — vite-plugin-pwa and Dexie patterns are stable; Vite 7 minor updates may occur but won't break the patterns)

---

## RESEARCH COMPLETE

**Phase:** 2 - Data Layer & PWA Shell
**Confidence:** HIGH

### Key Findings

1. **vite-plugin-pwa@1.3.0 explicitly supports Vite 7** in its peerDep range; no separate workbox installs needed (bundled); no postinstall script. Install as a single `npm install --save-dev vite-plugin-pwa`.

2. **Dexie v2 schema upgrade is additive:** Only declare new tables (`entries`, `settings`) in `version(2).stores()`. The `counter` store from version(1) is preserved automatically. Never edit version(1).

3. **`syncedAt: number | null` is the correct sync-seam field.** IndexedDB cannot index null — the unsynced query uses `.filter(e => e.syncedAt == null).toArray()` (full table scan; fine at local scale). Use UUID strings (`crypto.randomUUID()`) for entry IDs, not auto-increment, for future sync compatibility.

4. **Two key infrastructure changes in vite.config.ts and tsconfig.node.json:** Add `VitePWA(createPwaOptions())` to plugins, and add `"src/pwa/**"` to tsconfig.node.json's include array (required for `tsc -b` to resolve the pwaConfig import).

5. **PWA test boundary is explicit:** SC1/SC2a/SC3 and all DATA requirements are fully automatable with Vitest + fake-indexeddb. SC4c (offline shell), SC5 (offline create), and SC2b (cross-refresh persistence) are manual-only — they require a real browser with an installed service worker.

### File Created
`.planning/phases/02-data-layer-pwa-shell/02-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack (vite-plugin-pwa) | HIGH | peerDeps and version verified via npm registry |
| Dexie schema upgrade | HIGH | Official dexie.org docs; exact upgrade rule confirmed |
| LifeLogEntry domain model | HIGH | Derived from REQUIREMENTS.md verbatim field list |
| Architecture (repository + hooks) | HIGH | Follows established Phase 1 patterns + official dexie-react-hooks docs |
| PWA config + workbox | MEDIUM | Verified against official docs; exact workbox options are partly [ASSUMED] |
| SETUP-04 module shapes | MEDIUM | Architecture template names confirmed; shapes are [ASSUMED] from convention |

### Open Questions
- PNG icon generation method (Node script vs committed asset vs devtool): needs planner decision
- LifeLogEntry type location: `src/services/db.ts` (co-located) vs `src/types/lifeLogEntry.ts` (standalone)

### Ready for Planning
Research complete. Planner can now create PLAN.md files for Phase 2.

# SPEC: Frontend Architecture Template (Life Log PWA)

Status: Accepted
Type: Technical Specification

## Purpose

Pin the React application structure for the Life Log PWA to the layout proven in
the `patrimonium/apps/web` codebase — **the React side only**. Patrimonium is a
well-structured React 19 + Vite + TypeScript + Tailwind v4 + `vite-plugin-pwa`
app; we adopt its *structure, conventions, and primitives*, not its
backend/auth/API-contract machinery.

This SPEC is deliberately scoped to be compatible with `spec.md`. Where the two
documents touch the same scope, `spec.md` is authoritative on **product/UX** and
this doc is authoritative on **code structure**. Nothing here contradicts
`spec.md`.

## Adopted from patrimonium/apps/web

### Stack (carry over verbatim where applicable)

- React 19 + React DOM 19
- Vite 7 (`vite` dev / `tsc -b && vite build`)
- TypeScript 5.9, project references (`tsconfig.json` → `tsconfig.app.json` +
  `tsconfig.node.json`)
- Tailwind CSS v4 via `@tailwindcss/vite`
- `vite-plugin-pwa` (Workbox) for the service worker and web manifest
- `react-router-dom` v7 for routing
- Vitest for unit tests; ESLint flat config (`eslint.config.mjs`) with
  `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

### Directory layout (mirror this)

```
src/
├── main.tsx                # Root render: providers (Router, Dexie/live-query) + <App/>
├── App.tsx                 # Route table
├── index.css               # Tailwind entry + theme tokens
├── pages/                  # One component per screen (route target)
├── components/             # Shared composite components
│   └── ui/                 # Design-system primitives (Button, Input, FormField, cn, theme)
├── services/               # Data-access modules (one per resource)
├── state/
│   └── common/             # Cross-cutting helpers (requestState, assertNever)
├── config/                 # Runtime/public config + app brand
├── pwa/
│   └── pwaConfig.ts        # createPwaOptions() consumed by vite.config.ts
├── assets/
└── @types / types/
```

### Conventions to carry over

- **UI primitives in `components/ui/`**: `cn.ts` (class-join helper),
  `Button.tsx` (variant/size `Record` lookup pattern), `Input.tsx`,
  `FormField.tsx`, `FormErrorBanner.tsx`, `theme.ts`, `inputStyles.ts`.
  Tailwind classes reference CSS custom properties (`hsl(var(--color-primary))`).
- **`state/common/requestState.ts`**: the `idle|loading|success|error`
  `RequestState` machine with `startRequest()/succeedRequest()/failRequest()`
  helpers, and `assertNever.ts` for exhaustive switch checks over the union
  types (`LifeLogType`, `LifeLogDomain`).
- **`pwa/pwaConfig.ts`**: extract a testable `createPwaOptions()` factory; keep
  `vite.config.ts` thin. Reuse the Workbox runtime-caching shape
  (NetworkFirst navigation shell, precache glob for static assets,
  `registerType: 'autoUpdate'`).
- **`config/` module** for brand/app-name resolution (e.g. `appBrand.ts`,
  `publicEnv.ts`) with co-located `*.test.ts`.
- **Co-located tests**: `Foo.tsx` + `Foo.test.tsx` (Vitest).

## Deviations from patrimonium (required by spec.md)

These are intentional and authoritative — `spec.md` mandates no backend:

1. **No `auth/`, no `authFetch`, no API contracts.** `spec.md` requires no
   login/auth and no backend for the prototype. Drop patrimonium's
   `src/auth/`, `services/authFetch.ts`, and `@patrimonium/contracts` usage.
2. **`services/` are local repositories, not HTTP clients.** Each module wraps
   Dexie/IndexedDB instead of `fetch`. Replace patrimonium's per-resource HTTP
   clients with:
   - `services/db.ts` — Dexie database (`entries`, `settings` object stores;
     `entries` keyed by `id`)
   - `services/entriesRepository.ts` — CRUD over `LifeLogEntry`, plus the
     "unsynced entries" query stub so a future sync layer can read local data
   - `services/extractMetadataFromUrl.ts` — the URL/domain heuristic from
     `spec.md` (`google_maps`, `imdb`, `book_url`, `podcast_url`)
   - `services/exportEntries.ts` — JSON export of all entries
3. **Reactive reads via `dexie-react-hooks` (`useLiveQuery`)** instead of
   TanStack Query against a server. (TanStack Query is patrimonium's
   server-cache layer; it is not needed for a local-only IndexedDB store.)
4. **i18next is optional / out of scope** for the prototype — patrimonium is
   multi-locale; Life Log is single-locale. Skip `i18n.ts` and `locales/`
   unless trivially cheap.
5. **No monorepo.** Patrimonium is a pnpm/turbo monorepo (`apps/web`). Life Log
   is a single Vite app at the repo root (or `web/`), no workspace contracts
   package.

## Acceptance criteria

- Project scaffolds with the directory layout above.
- `pwa/pwaConfig.ts` exports a `createPwaOptions()` consumed by `vite.config.ts`.
- `components/ui/` contains at least `cn`, `Button`, `Input`, `FormField`.
- `services/` contains a Dexie `db.ts`, `entriesRepository.ts`,
  `extractMetadataFromUrl.ts`, and `exportEntries.ts` — and **no** `authFetch`
  or HTTP API client.
- `state/common/` contains `requestState.ts` and `assertNever.ts`.
- All `spec.md` acceptance criteria remain satisfiable under this structure.

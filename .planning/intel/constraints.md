# Constraints (SPEC intel)

Synthesized from 2 SPEC documents. `spec.md` is authoritative on product / UX / data-model; `docs/architecture-template.md` is authoritative on code structure and explicitly defers to `spec.md` on product scope. No contradictions detected.

---

## Data Model: LifeLogEntry
- source: /home/bbux/git/life-log/spec.md
- type: schema

Single primary stored record type `LifeLogEntry`. Authoritative shape:

```ts
type LifeLogDomain = "media" | "trips" | "expenditures";

type LifeLogType =
  | "media.show"
  | "media.movie"
  | "media.book"
  | "media.podcast"
  | "trip.place"
  | "trip.event"
  | "trip.expense"
  | "expenditure.expense";

type Money = { amount: number; currency: string };

type Location = {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  url?: string;
};

type LifeLogEntry = {
  id: string;
  domain: LifeLogDomain;
  type: LifeLogType;
  title: string;
  description?: string;
  occurredAt?: string;
  recordedAt: string;
  sourceUrl?: string;
  amount?: Money;
  location?: Location;
  tags: string[];
  metadata: Record<string, unknown>;
};
```

All user-facing categories (Trips, Media, Expenditures) become typed entries in a single event log that other apps can later read from.

---

## Storage: IndexedDB object stores
- source: /home/bbux/git/life-log/spec.md
- type: schema

Use IndexedDB. Object stores: `entries` (keyed by `id`) and `settings`. No sync engine required for prototype, but structure code so a future sync layer could read unsynced local entries and push them elsewhere.

---

## PWA / Offline requirements (NFRs)
- source: /home/bbux/git/life-log/spec.md
- type: nfr

- Mobile-first installable PWA; phone-sized screens first.
- App shell loads offline; entries can be created offline.
- Persist entries locally via IndexedDB.
- Use a service worker for offline app-shell caching.
- No login/auth for prototype; no backend required.
- Include JSON export of all entries.

---

## Capture flow protocol (URL-first)
- source: /home/bbux/git/life-log/spec.md
- type: protocol

Default capture path for every entry type is **From URL**. Manual entry is a secondary action behind a visible `Enter Manually` button (manual entry must NOT be the default).

Normal flow: Home Dashboard → Select root node → Select entry type → From URL capture → Review/edit extracted metadata → Save.
Manual fallback inserts `Enter Manually → Manual form` before Save.

URL capture behavior: user pastes URL; app infers metadata; navigates to Review Entry. If extraction fails, preserve the URL and still navigate to Review Entry with whatever fields are available.

---

## URL metadata extraction
- source: /home/bbux/git/life-log/spec.md
- type: protocol

Implement `extractMetadataFromUrl(url, type)` using URL/domain heuristics returning a partial entry draft. Import sources: `google_maps` (Trip Place), `imdb` (Movie/Show), `book_url` (Goodreads/Amazon/OpenLibrary), `podcast_url` (Podcast). Flow matters more than perfect extraction; Review screen lets user fix weak metadata.

---

## Screens / navigation tree
- source: /home/bbux/git/life-log/spec.md
- type: protocol

Screens: (1) Home Dashboard (Media/Trips/Expenditures), (2) Category Screen, (3) URL Capture Screen, (4) Manual Entry Screen, (5) Review Entry Screen, (6) Entry List Screen (filters: All/Media/Trips/Expenditures), (7) Entry Detail Screen.

Navigation tree:
```
Home
├── Media → Show, Movie, Book, Podcast
├── Trips → Place, Event, Expense
└── Expenditures → Expense
```

---

## Product acceptance criteria
- source: /home/bbux/git/life-log/spec.md
- type: nfr

- Install/open app like a mobile PWA; open while offline.
- Create a Media Book entry manually.
- Create a Trip Place entry from a pasted Google Maps URL.
- Create a Trip Expense entry; create a general Expenditure Expense entry.
- Saved entries persist after refresh; view list of all saved entries.
- Export all entries as JSON.
- Manual entry is not the default; requires clicking `Enter Manually`.

---

## Non-goals (prototype)
- source: /home/bbux/git/life-log/spec.md
- type: nfr

No user accounts, backend sync, receipt OCR, real third-party API integrations, perfect scraping, multi-user, public sharing, payments, complex analytics, native Android app, or push notifications.

---

## Stack pin (frontend)
- source: /home/bbux/git/life-log/docs/architecture-template.md
- type: nfr

Adopt structure/conventions/primitives from `patrimonium/apps/web` (React side only):
- React 19 + React DOM 19; Vite 7 (`vite` dev / `tsc -b && vite build`).
- TypeScript 5.9 with project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`).
- Tailwind CSS v4 via `@tailwindcss/vite`.
- `vite-plugin-pwa` (Workbox) for service worker + web manifest.
- `react-router-dom` v7.
- Vitest unit tests; ESLint flat config (`eslint.config.mjs`) with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.

Consistent with `spec.md` implementation preference (React, TypeScript, Vite, Dexie, React Router, PWA plugin).

---

## Directory layout (code structure)
- source: /home/bbux/git/life-log/docs/architecture-template.md
- type: protocol

```
src/
├── main.tsx          # Root render: providers (Router, Dexie/live-query) + <App/>
├── App.tsx           # Route table
├── index.css         # Tailwind entry + theme tokens
├── pages/            # One component per screen (route target)
├── components/       # Shared composite components
│   └── ui/           # Design-system primitives (Button, Input, FormField, cn, theme)
├── services/         # Data-access modules (one per resource)
├── state/
│   └── common/       # Cross-cutting helpers (requestState, assertNever)
├── config/           # Runtime/public config + app brand
├── pwa/
│   └── pwaConfig.ts  # createPwaOptions() consumed by vite.config.ts
├── assets/
└── @types / types/
```

---

## Conventions
- source: /home/bbux/git/life-log/docs/architecture-template.md
- type: protocol

- UI primitives in `components/ui/`: `cn.ts`, `Button.tsx` (variant/size `Record` lookup), `Input.tsx`, `FormField.tsx`, `FormErrorBanner.tsx`, `theme.ts`, `inputStyles.ts`. Tailwind classes reference CSS custom properties (`hsl(var(--color-primary))`).
- `state/common/requestState.ts`: `idle|loading|success|error` `RequestState` machine with `startRequest()/succeedRequest()/failRequest()`; `assertNever.ts` for exhaustive switches over `LifeLogType`/`LifeLogDomain`.
- `pwa/pwaConfig.ts`: testable `createPwaOptions()` factory; thin `vite.config.ts`. Workbox runtime-caching: NetworkFirst navigation shell, precache glob for static assets, `registerType: 'autoUpdate'`.
- `config/` module for brand/app-name resolution (`appBrand.ts`, `publicEnv.ts`) with co-located `*.test.ts`.
- Co-located tests: `Foo.tsx` + `Foo.test.tsx` (Vitest).

---

## Deviations from patrimonium (required by spec.md)
- source: /home/bbux/git/life-log/docs/architecture-template.md
- type: protocol

These are authoritative because `spec.md` mandates no backend:
1. No `auth/`, no `authFetch`, no API contracts (drop `src/auth/`, `services/authFetch.ts`, `@patrimonium/contracts`).
2. `services/` are local Dexie/IndexedDB repositories, not HTTP clients:
   - `services/db.ts` — Dexie database (`entries`, `settings`; `entries` keyed by `id`)
   - `services/entriesRepository.ts` — CRUD over `LifeLogEntry` + "unsynced entries" query stub
   - `services/extractMetadataFromUrl.ts` — URL/domain heuristic (`google_maps`, `imdb`, `book_url`, `podcast_url`)
   - `services/exportEntries.ts` — JSON export of all entries
3. Reactive reads via `dexie-react-hooks` (`useLiveQuery`) instead of TanStack Query.
4. i18next optional / out of scope (single-locale); skip `i18n.ts` and `locales/`.
5. No monorepo — single Vite app at repo root (or `web/`), no workspace contracts package.

---

## Architecture acceptance criteria
- source: /home/bbux/git/life-log/docs/architecture-template.md
- type: nfr

- Project scaffolds with the directory layout above.
- `pwa/pwaConfig.ts` exports `createPwaOptions()` consumed by `vite.config.ts`.
- `components/ui/` contains at least `cn`, `Button`, `Input`, `FormField`.
- `services/` contains Dexie `db.ts`, `entriesRepository.ts`, `extractMetadataFromUrl.ts`, `exportEntries.ts` — and no `authFetch` / HTTP API client.
- `state/common/` contains `requestState.ts` and `assertNever.ts`.
- All `spec.md` acceptance criteria remain satisfiable under this structure.

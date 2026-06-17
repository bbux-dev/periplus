# External Integrations

**Analysis Date:** 2026-06-17

> **This app is deliberately backendless.** There are no external APIs, no authentication provider, no network calls to third parties, and no server. Everything runs in the browser against local storage. The "integrations" below are local boundaries (IndexedDB, the service worker) and offline-only heuristics — not live services. Do not introduce network calls without an explicit decision to change this architecture.

## APIs & External Services

**None.** The app makes no outbound HTTP requests. The metadata extractor (`src/services/extractMetadataFromUrl.ts`) recognises URLs from Google Maps, IMDb, Goodreads, Amazon, Apple Podcasts, and Spotify, but it **never contacts those services** — it parses the URL string offline (hostname + path regex) to derive titles/IDs/coordinates. It is a pure function that always returns an `ExtractedDraft` and never throws (CAPT-04 guarantee).

## Data Storage

**Databases:**
- IndexedDB via Dexie — the sole persistence layer.
  - Database: `LifeLogDB` (`src/services/db.ts`).
  - Stores: `entries` (`&id, recordedAt, domain`), `settings` (`key`), `counter` (`id`).
  - Schema version 2 (additive upgrade over v1 counter store).
  - Access boundary: components MUST go through `entriesRepository` / the reactive hooks in `src/services/entriesRepository.ts`. Direct `db` imports from components are forbidden by convention.
  - Test storage: `fake-indexeddb` provides an in-memory IndexedDB for Vitest.

**File Storage:**
- Local filesystem only — no remote object storage. `src/services/exportEntries.ts` produces a downloadable export of entries (client-side blob), the only "egress" path for user data.

**Caching:**
- Workbox precache (service worker) for the app shell — see CI/CD & Deployment. This caches static assets, not API responses (there are none).

## Authentication & Identity

**Auth Provider:**
- None. No login, no users, no accounts. Data is scoped to the browser/device. Playwright relies on this: no `setup` project, no `storageState` (`playwright.config.ts` comments document this intentional absence).

## Monitoring & Observability

**Error Tracking:**
- None. Failures surface in the UI (e.g. `ReviewPage` sets a `saveError` and renders a `role="alert"`) and via `console.error` (e.g. `[ReviewPage] save failed`).

**Logs:**
- `console` only. Service-worker registration logs to `console.debug` in dev and `console.error` on registration failure (`src/main.tsx`).

## CI/CD & Deployment

**Hosting:**
- Static hosting (any CDN / static host). `vite build` emits `dist/` containing the app shell, generated service worker, and `manifest.webmanifest`.

**Service Worker (PWA):**
- vite-plugin-pwa + Workbox, configured in `src/pwa/pwaConfig.ts`:
  - `registerType: 'autoUpdate'`.
  - `workbox.globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']` — precache the full app shell.
  - `workbox.navigateFallback: '/index.html'` — SPA offline navigation.
  - `devOptions.enabled: false` — SW only built in `vite build` / `vite preview`, never in `vite dev` (avoids HMR conflicts).
- Registration runtime: `useRegisterSW` from `virtual:pwa-register/react` in `src/main.tsx` (the `PWARegistrar` component).

**CI Pipeline:**
- Playwright config is CI-aware (`process.env.CI` toggles retries, workers, reporters → `github` reporter). The concrete CI workflow file was not located in this scan; confirm under `.github/` if present.

## Environment Configuration

**Required env vars:**
- None required to run. Build-time Vite env access is centralized in `src/config/publicEnv.ts` (only `VITE_`-prefixed public values; no secrets).

**Secrets location:**
- Not applicable — the app holds no secrets and performs no authenticated calls.

## Webhooks & Callbacks

**Incoming:** None.

**Outgoing:** None.

---

*Integration audit: 2026-06-17*

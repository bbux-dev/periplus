# Technology Stack

**Analysis Date:** 2026-06-17

## Languages

**Primary:**
- TypeScript ~5.9.3 (`typescript` devDependency) — all application and test code under `src/` and `e2e/`. Strict mode enabled (`tsconfig.app.json`).

**Secondary:**
- CSS — single global stylesheet `src/index.css` (Tailwind v4 entrypoint + CSS custom properties for theming, e.g. `--color-primary`, `--color-background`).
- HTML — `index.html` (Vite SPA shell mounting `#root`).

## Runtime

**Environment:**
- Browser-only PWA. No Node.js server runtime — the app is deliberately backendless (see INTEGRATIONS.md). Build/tooling target ES2022 (app) / ES2023 (node config files).
- Persistence is the browser's IndexedDB (via Dexie), wrapped by the service worker for offline support.

**Package Manager:**
- pnpm — pinned via `"packageManager": "pnpm@11.1.2"` in `package.json`.
- Lockfile: `pnpm-lock.yaml` present at repo root.
- Workspace marker: `pnpm-workspace.yaml` present (single-package workspace at root).

## Frameworks

**Core:**
- React 19.1.1 (`react`, `react-dom`) — UI library. Entry mount in `src/main.tsx` via `createRoot` + `<StrictMode>`.
- react-router-dom 7.17.0 — client-side routing. `<BrowserRouter>` in `src/main.tsx`; route table in `src/App.tsx`.
- Dexie 4.4.3 (`dexie`) + dexie-react-hooks 4.4.0 — IndexedDB wrapper and reactive `useLiveQuery` hooks. DB class in `src/services/db.ts`.
- Tailwind CSS 4.3.1 (`tailwindcss` + `@tailwindcss/vite`) — utility-first styling via the Vite plugin (no `tailwind.config.js`; v4 is CSS-config driven through `src/index.css`).

**Testing:**
- Vitest 4.1.9 (`vitest`) — unit/component test runner, configured in `vite.config.ts` (`test` block, jsdom environment, globals on). Co-located `*.test.ts(x)` files.
- @testing-library/react 16.3.2, @testing-library/jest-dom 6.9.1, @testing-library/user-event 14.6.1 — React component testing.
- jsdom 29.1.1 — DOM environment for Vitest.
- fake-indexeddb 6.2.5 — in-memory IndexedDB for Dexie tests.
- Playwright 1.61.0 (`@playwright/test`) — end-to-end tests in `e2e/`, configured in `playwright.config.ts`.

**Build/Dev:**
- Vite 7.1.7 (`vite`) — dev server, bundler, preview. Config: `vite.config.ts`.
- @vitejs/plugin-react 5.0.3 — React Fast Refresh + JSX transform.
- vite-plugin-pwa 1.3.0 — generates the Workbox service worker and web manifest. Options factory: `src/pwa/pwaConfig.ts`.
- workbox-window 7.4.1 — service-worker registration runtime (`virtual:pwa-register/react` consumed in `src/main.tsx`).
- TypeScript project references — `tsc -b` runs before `vite build` (see `build` script).

## Key Dependencies

**Critical:**
- `dexie` / `dexie-react-hooks` — the entire persistence + reactive-read layer. Losing these means rewriting `src/services/db.ts` and `src/services/entriesRepository.ts`.
- `react-router-dom` — all navigation and the draft-passing save flow (`navigate(..., { state: { draft } })`) depend on v7 router state semantics.

**Infrastructure:**
- `@heroicons/react` 2.2.0 — SVG icon components (domain/type icons in `src/config/navigation.ts`, back chevrons in pages).
- `clsx` 2.1.1 + `tailwind-merge` 3.6.0 — class-name composition, wrapped in `src/components/ui/cn.ts`.

## Configuration

**Environment:**
- No runtime secrets or external env vars. `src/config/publicEnv.ts` centralizes any `import.meta.env` reads (build-time Vite env only). No `.env` file is required to run the app.
- PWA brand constants are inlined in `src/pwa/pwaConfig.ts` (deliberately NOT imported from `src/config/` to keep `tsconfig.node.json` scope clean).

**Build:**
- `vite.config.ts` — plugins (`react`, `tailwindcss`, `VitePWA`) + Vitest `test` block. Excludes `e2e/**` from Vitest.
- `tsconfig.json` — solution file referencing `tsconfig.app.json` (app `src/`, ES2022, DOM libs) and `tsconfig.node.json` (build scripts: `vite.config.ts` + `src/pwa/pwaConfig.ts`, ES2023, no DOM).
- `eslint.config.mjs` — flat config: `@eslint/js` recommended, `typescript-eslint` recommended, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`. Ignores `dist`.
- `e2e/tsconfig.json` — separate TS config scoping the Playwright suite.

## Platform Requirements

**Development:**
- pnpm 11.1.2; Node.js capable of running Vite 7 / pnpm 11 (Node 20+ recommended; `@types/node` 24.x).
- Playwright browsers installed via `pnpm e2e:install`.

**Production:**
- Static hosting only — `vite build` emits a static bundle to `dist/` (app shell + Workbox service worker + manifest). No server process. Deployable to any static host/CDN with SPA fallback to `index.html` (the service worker also sets `navigateFallback: '/index.html'`).

## Scripts (package.json)

```bash
pnpm dev              # Vite dev server (no service worker)
pnpm build            # tsc -b && vite build → dist/
pnpm preview          # Serve the production build (service worker active)
pnpm lint             # eslint .
pnpm e2e:smoke        # Playwright: mobile + chromium projects
pnpm e2e:smoke:all    # Playwright: all projects (adds firefox, webkit)
pnpm e2e:install      # Install Playwright browsers
```

(Unit tests run via `vitest` / `pnpm exec vitest`; no dedicated `test` script is declared in `package.json`.)

---

*Stack analysis: 2026-06-17*

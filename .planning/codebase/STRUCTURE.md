# Codebase Structure

**Analysis Date:** 2026-06-17

## Directory Layout

```
life-log/
├── index.html              # Vite SPA shell (mounts #root)
├── vite.config.ts          # Vite + Vitest + Tailwind + PWA config
├── playwright.config.ts     # Playwright e2e config (mobile/chromium/firefox/webkit)
├── eslint.config.mjs       # Flat ESLint config
├── tsconfig.json           # Solution file → app + node references
├── tsconfig.app.json       # App TS config (src/, ES2022, DOM)
├── tsconfig.node.json      # Build-script TS config (vite.config + pwaConfig)
├── package.json            # pnpm@11.1.2 pinned; deps + scripts
├── pnpm-lock.yaml          # Lockfile
├── pnpm-workspace.yaml     # Single-package workspace marker
├── public/                 # Static assets served as-is (icons, favicon)
├── dist/                   # Build output (generated; gitignored)
├── docs/                   # Project documentation
├── scripts/                # Repo utility scripts
├── spec.md / README.md     # Top-level spec + readme
├── .planning/              # GSD planning artifacts (see below)
├── e2e/                    # Playwright end-to-end suite
└── src/                    # Application source
    ├── main.tsx            # React/Router/SW bootstrap
    ├── App.tsx             # Route table
    ├── index.css           # Tailwind v4 entry + CSS theme variables
    ├── test-setup.ts       # Vitest setup (jest-dom, fake-indexeddb)
    ├── vite-env.d.ts       # Vite/PWA ambient types
    ├── pages/              # Route-level page components
    ├── components/ui/      # Presentational primitives (Button, Input, FormField, cn)
    ├── services/           # Logic + persistence boundary
    │   └── dsl/            # Quick-Capture DSL (parser, suggest)
    ├── config/             # Declarative config (entryFields, navigation, env, brand)
    ├── state/common/       # Cross-cutting utilities (assertNever, requestState)
    ├── hooks/              # Reusable hooks (useBackOrHome)
    └── assets/             # Imported asset files
```

## Directory Purposes

**`src/pages/`:**
- Purpose: one component per route. Owns local form state + navigation.
- Key files: `DashboardPage.tsx`, `DomainPage.tsx`, `QuickCapturePage.tsx`, `CaptureUrlPage.tsx`, `ManualEntryPage.tsx`, `ReviewPage.tsx` (the single save path), `EntryListPage.tsx`, `EntryDetailPage.tsx`, `PlaceholderPage.tsx`.

**`src/components/ui/`:**
- Purpose: reusable presentational primitives.
- Key files: `Button.tsx`, `Input.tsx`, `FormField.tsx`, `cn.ts` (clsx + tailwind-merge helper).

**`src/services/`:**
- Purpose: all non-UI logic and the persistence boundary.
- Key files: `db.ts` (Dexie `LifeLogDB` + `LifeLogEntry`), `entriesRepository.ts` (CRUD + reactive hooks), `extractMetadataFromUrl.ts` (offline URL parsing), `urlUtils.ts` (`isSafeUrl`), `exportEntries.ts`.

**`src/services/dsl/`:**
- Purpose: the Quick-Capture shorthand language.
- Key files: `parser.ts` (`parseDSL`, type/alias registries), `suggest.ts` (`suggestionContext`, `typeMatches`, `applyValueSuggestion`).

**`src/config/`:**
- Purpose: declarative data driving forms, routing labels, and the DSL.
- Key files: `entryFields.ts` (`ENTRY_FIELDS`, `POSITIONAL_SCHEMA`, `buildReviewDraft`), `navigation.ts` (`NAVIGATION`, `getDomainConfig`, `defaultDomainForType`), `publicEnv.ts`, `appBrand.ts`.

**`src/state/common/`:**
- Purpose: small shared utilities (NOT a global store). `assertNever.ts`, `requestState.ts`.

**`src/hooks/`:**
- Purpose: reusable React hooks. `useBackOrHome.ts`.

**`src/pwa/`:**
- Purpose: PWA/service-worker config. `pwaConfig.ts` (`createPwaOptions`) — imported by `vite.config.ts`.

**`e2e/`:**
- Purpose: Playwright suite. `e2e/test/fixtures/` (custom test fixtures), `e2e/test/helpers/` (e.g. `quickCapture.ts`), `e2e/test/smoke/` (`*.spec.ts`), `e2e/tsconfig.json`, `e2e/README.md`.

**`.planning/`:**
- Purpose: GSD workflow artifacts. `PROJECT.md`, `ROADMAP.md`, `MILESTONES.md`, `STATE.md`, `REQUIREMENTS.md`, plus subdirs `phases/`, `milestones/`, `todos/{pending,done}/`, `spikes/` (e.g. `001-dsl-parser`), `seeds/`, `notes/`, `intel/`, and `codebase/` (these analysis docs).

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React mount, `BrowserRouter`, service-worker registrar.
- `src/App.tsx`: route table.
- `index.html`: HTML shell.

**Configuration:**
- `vite.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `tsconfig*.json`.

**Core Logic:**
- `src/services/db.ts`, `src/services/entriesRepository.ts`, `src/config/entryFields.ts`, `src/services/dsl/parser.ts`.

**Testing:**
- Unit/component: co-located `src/**/*.test.ts(x)` (+ `*.integration.test.tsx`). Setup: `src/test-setup.ts`.
- E2E: `e2e/test/smoke/*.spec.ts`.

## Naming Conventions

**Files:**
- Components/pages: PascalCase `.tsx` (`ReviewPage.tsx`, `Button.tsx`).
- Services/config/hooks/utils: camelCase `.ts` (`entriesRepository.ts`, `entryFields.ts`, `useBackOrHome.ts`).
- Unit/component tests: co-located, same basename + `.test.ts(x)` (`db.test.ts`, `ReviewPage.test.tsx`). Integration variant: `*.integration.test.tsx`.
- E2E tests: `*.spec.ts` under `e2e/test/smoke/`.

**Directories:**
- lowercase, single-word where possible (`pages`, `components/ui`, `services/dsl`, `state/common`). Empty dirs hold a `.gitkeep`.

## Where to Add New Code

**New page / route:**
- Component: `src/pages/<Name>Page.tsx`; register in `src/App.tsx`.
- Test: `src/pages/<Name>Page.test.tsx`.

**New entry type or field:**
- Edit `src/config/entryFields.ts` — add to `ENTRY_FIELDS` AND `POSITIONAL_SCHEMA` together, plus the `EntryType` union in `src/services/db.ts` and the `NAVIGATION` map in `src/config/navigation.ts`. Do NOT scatter type-specific logic into pages.

**New persistence query:**
- Add a method to `entriesRepository` (command) or a `useLiveQuery`-backed hook (reactive read) in `src/services/entriesRepository.ts`. Never query `db` from a component.

**New UI primitive:**
- `src/components/ui/<Name>.tsx` (+ `.test.tsx`). Compose classes with `cn` from `src/components/ui/cn.ts`.

**New shared hook:**
- `src/hooks/<useName>.ts`.

**New DSL behaviour:**
- Grammar → `src/services/dsl/parser.ts`; suggestions → `src/services/dsl/suggest.ts`. Keep field keys aligned with `ENTRY_FIELDS`.

**New e2e flow:**
- Spec under `e2e/test/smoke/<flow>.spec.ts`; shared steps in `e2e/test/helpers/`.

## Special Directories

**`dist/`:** Build output. Generated: Yes. Committed: No (gitignored).
**`public/`:** Static assets copied verbatim into the build (PWA icons, favicon). Committed: Yes.
**`.planning/`:** GSD artifacts. Generated: by workflow commands. Committed: Yes.
**`test-results/` & `playwright-report/`:** Playwright output. Generated: Yes. Committed: No.

---

*Structure analysis: 2026-06-17*

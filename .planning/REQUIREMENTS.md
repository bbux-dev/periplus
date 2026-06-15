# Requirements: Life Log

**Defined:** 2026-06-15
**Core Value:** A user can capture a structured life event on their phone in seconds — URL-first — and have it persist locally and offline as a typed entry.

The full prototype scope (derived from `spec.md` and `docs/architecture-template.md`) is
preserved here and mapped across the kept 6-phase roadmap. The **current milestone (v0.1.0)**
is a deliberately thin tracer bullet — everything else is sequenced into future milestones.

## Milestone v0.1.0 Requirements — Tracer Bullet (Phase 1)

Thinnest vertical slice that proves the locked architecture end-to-end. The Counter is a
throwaway demo to exercise the UI → Dexie → IndexedDB → live-read loop; it is removed once
real capture lands.

### Foundation & Architecture (SETUP)

- [x] **SETUP-01**: Single Vite 7 + React 19 + TypeScript 5.9 app scaffolds at repo root with project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`)
- [x] **SETUP-02**: Tailwind CSS v4 wired via `@tailwindcss/vite` with theme tokens in `index.css`, and the template directory layout in place (`pages`, `components/ui`, `services`, `state/common`, `config`, `pwa`, `assets`)
- [ ] **SETUP-03**: `components/ui/` contains the `cn` helper and a `Button` primitive referencing CSS custom-property theme tokens (enough for the counter's icon buttons)

### App Shell (SHELL)

- [ ] **SHELL-01**: A mobile-first welcome screen renders the app title **"Life Log"** as the default route

### Tracer Demo (DEMO)

- [ ] **DEMO-01**: A Counter with **+ / − heroicons** increments/decrements an integer value that is persisted in a Dexie/IndexedDB store, read reactively via `dexie-react-hooks` `useLiveQuery`, and survives a page refresh

## Future Milestone Requirements (v0.2.0+)

Committed prototype scope, kept on the roadmap and sequenced into later milestones.

### Foundation & Architecture (SETUP) — later

- [ ] **SETUP-04**: `state/common/` (`requestState.ts`, `assertNever.ts`) and `config/` (`appBrand.ts`, `publicEnv.ts`) modules exist with co-located Vitest tests _(Phase 2)_
- [ ] **SETUP-05**: `components/ui/` adds the `Input` and `FormField` primitives for entry forms _(Phase 4)_

### PWA & Offline (PWA) — later _(Phase 2)_

- [ ] **PWA-01**: `pwa/pwaConfig.ts` exports a testable `createPwaOptions()` factory consumed by a thin `vite.config.ts`
- [ ] **PWA-02**: App is installable as a mobile-first PWA with a web manifest
- [ ] **PWA-03**: Service worker caches the app shell (NetworkFirst navigation, precache static assets, `registerType: 'autoUpdate'`)
- [ ] **PWA-04**: App shell and previously visited routes load while the device is offline
- [ ] **PWA-05**: A new entry can be created and persisted while offline

### Data Layer (DATA) — later _(Phase 2)_

- [ ] **DATA-01**: `LifeLogEntry` type is defined matching the authoritative schema (id, domain, type, title, description?, occurredAt?, recordedAt, sourceUrl?, amount?, location?, tags, metadata)
- [ ] **DATA-02**: Dexie database (`services/db.ts`) defines `entries` (keyed by `id`) and `settings` object stores
- [ ] **DATA-03**: `services/entriesRepository.ts` provides CRUD over `LifeLogEntry` (create, read, list, update, delete)
- [ ] **DATA-04**: Repository exposes an "unsynced entries" query stub so a future sync layer can read local entries
- [ ] **DATA-05**: Reactive reads over `LifeLogEntry` use `dexie-react-hooks` `useLiveQuery` (components re-render when entries change)

### Navigation & Screens (NAV) — later _(Phase 3)_

- [ ] **NAV-01**: Home Dashboard shows three root nodes — Media, Trips, Expenditures
- [ ] **NAV-02**: Category screen shows the entry types for the selected root (Media: Show/Movie/Book/Podcast; Trips: Place/Event/Expense; Expenditures: Expense)
- [ ] **NAV-03**: `react-router-dom` v7 route table covers all 7 screens (Dashboard, Category, URL Capture, Manual Entry, Review, Entry List, Entry Detail)
- [ ] **NAV-04**: Layout is mobile-first and usable on phone-sized screens

### URL-First Capture (CAPT) — later _(Phase 4)_

- [ ] **CAPT-01**: After choosing an entry type, the URL Capture screen is shown by default (title `Add {Entry Type}`, URL input, `Import from URL`, `Enter Manually`)
- [ ] **CAPT-02**: User pastes a URL, app infers metadata, and navigates to the Review Entry screen
- [ ] **CAPT-03**: `services/extractMetadataFromUrl(url, type)` returns a partial draft using URL/domain heuristics for `google_maps`, `imdb`, `book_url`, `podcast_url`
- [ ] **CAPT-04**: If extraction yields little/fails, the URL is preserved and Review still opens with whatever fields are available
- [ ] **CAPT-05**: Review Entry screen lets the user edit all visible fields; Save persists a `LifeLogEntry` and navigates to detail/category; Cancel discards
- [ ] **CAPT-06**: An `Enter Manually` button is clearly visible as a secondary action; manual entry is NOT the default path

### Manual Entry (MAN) — later _(Phase 5)_

- [ ] **MAN-01**: Manual Entry screen is reachable only by clicking `Enter Manually`
- [ ] **MAN-02**: Manual form shows fields appropriate to the entry type (common: title/description/occurredAt/tags; expense: amount/currency/category/merchant/notes; place: name/address/notes/tags; media: title/creator/date/rating/notes)
- [ ] **MAN-03**: Manually entered entries flow through Review → Save and persist as `LifeLogEntry`

### View & Export (VIEW) — later _(Phase 6)_

- [ ] **VIEW-01**: Entry List screen lists all saved entries with filters All / Media / Trips / Expenditures
- [ ] **VIEW-02**: Each list row shows title, type, occurred/recorded date, and amount when present
- [ ] **VIEW-03**: Entry Detail screen shows the full entry including title, type, description, source URL, amount, location, tags, and a metadata JSON preview
- [ ] **VIEW-04**: Saved entries persist after a page refresh
- [ ] **EXP-01**: User can export all entries as JSON via `services/exportEntries.ts`

## v2 Requirements

Deferred beyond the prototype. Tracked but not in the current roadmap.

### Sync (SYNC)

- **SYNC-01**: A sync layer reads unsynced local entries and pushes them to an external store

## Out of Scope

Explicitly excluded (from `spec.md` Non-Goals). Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts / auth | Single-user local prototype |
| Backend / server / sync engine | Local IndexedDB only (seam kept open for future) |
| Receipt OCR | Out of prototype scope |
| Real third-party API integrations | Heuristic URL extraction only |
| Perfect metadata scraping | Flow over fidelity; Review screen fixes weak data |
| Multi-user support | Single-user prototype |
| Public sharing | Personal log |
| Payments | Expense *records* only, no transactions |
| Complex analytics | Out of prototype scope |
| Native Android app | PWA only |
| Push notifications | Out of prototype scope |
| i18n / multi-locale | Single-locale |
| Monorepo / contracts package | Single Vite app at repo root |

## Traceability

| Requirement | Phase | Milestone | Status |
|-------------|-------|-----------|--------|
| SETUP-01 | Phase 1 | v0.1.0 | Pending |
| SETUP-02 | Phase 1 | v0.1.0 | Pending |
| SETUP-03 | Phase 1 | v0.1.0 | Pending |
| SHELL-01 | Phase 1 | v0.1.0 | Pending |
| DEMO-01 | Phase 1 | v0.1.0 | Pending |
| SETUP-04 | Phase 2 | v0.2.0+ | Pending |
| PWA-01 | Phase 2 | v0.2.0+ | Pending |
| PWA-02 | Phase 2 | v0.2.0+ | Pending |
| PWA-03 | Phase 2 | v0.2.0+ | Pending |
| PWA-04 | Phase 2 | v0.2.0+ | Pending |
| PWA-05 | Phase 2 | v0.2.0+ | Pending |
| DATA-01 | Phase 2 | v0.2.0+ | Pending |
| DATA-02 | Phase 2 | v0.2.0+ | Pending |
| DATA-03 | Phase 2 | v0.2.0+ | Pending |
| DATA-04 | Phase 2 | v0.2.0+ | Pending |
| DATA-05 | Phase 2 | v0.2.0+ | Pending |
| NAV-01 | Phase 3 | v0.2.0+ | Pending |
| NAV-02 | Phase 3 | v0.2.0+ | Pending |
| NAV-03 | Phase 3 | v0.2.0+ | Pending |
| NAV-04 | Phase 3 | v0.2.0+ | Pending |
| SETUP-05 | Phase 4 | v0.2.0+ | Pending |
| CAPT-01 | Phase 4 | v0.2.0+ | Pending |
| CAPT-02 | Phase 4 | v0.2.0+ | Pending |
| CAPT-03 | Phase 4 | v0.2.0+ | Pending |
| CAPT-04 | Phase 4 | v0.2.0+ | Pending |
| CAPT-05 | Phase 4 | v0.2.0+ | Pending |
| CAPT-06 | Phase 4 | v0.2.0+ | Pending |
| MAN-01 | Phase 5 | v0.2.0+ | Pending |
| MAN-02 | Phase 5 | v0.2.0+ | Pending |
| MAN-03 | Phase 5 | v0.2.0+ | Pending |
| VIEW-01 | Phase 6 | v0.2.0+ | Pending |
| VIEW-02 | Phase 6 | v0.2.0+ | Pending |
| VIEW-03 | Phase 6 | v0.2.0+ | Pending |
| VIEW-04 | Phase 6 | v0.2.0+ | Pending |
| EXP-01 | Phase 6 | v0.2.0+ | Pending |

**Coverage:**
- Total prototype requirements: 34
- v0.1.0 milestone requirements: 5 (SETUP-01, SETUP-02, SETUP-03, SHELL-01, DEMO-01)
- Mapped to phases: 34
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-15*
*Last updated: 2026-06-15 after scoping milestone v0.1.0 (tracer bullet)*

# Life Log

## What This Is

Life Log is a mobile-first, installable PWA for fast, structured personal life-logging while on the go (especially while traveling). Users capture media consumption, trips, and expenditures as typed entries in a single append-only-ish event log stored locally on the device. It is a personal prototype, not a public product — no accounts, no backend, no sync.

## Core Value

A user can capture a structured life event on their phone in seconds — URL-first — and have it persist locally and offline as a typed entry that other apps could later read.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. See REQUIREMENTS.md for full REQ-* list. -->

- [ ] Installable, mobile-first PWA whose app shell loads offline
- [ ] Local IndexedDB persistence of a single `LifeLogEntry` record type via a Dexie repository
- [ ] Home dashboard → category → entry-type navigation across all 7 screens
- [ ] URL-first capture: paste URL → infer metadata → review/edit → save (default path)
- [ ] Manual entry as a secondary path behind a visible `Enter Manually` button
- [ ] Entry list (filterable) + entry detail + JSON export of all entries

### Out of Scope

<!-- Explicit boundaries from spec.md Non-Goals. Includes reasoning to prevent re-adding. -->

- User accounts / login / auth — prototype is single-user, local-only
- Backend, server, or sync engine — local IndexedDB only (code is structured so a future sync layer *could* read unsynced entries)
- Receipt OCR — out of prototype scope
- Real third-party API integrations — extraction is URL/domain heuristics only
- Perfect metadata scraping — "flow over fidelity"; Review screen lets user fix weak metadata
- Multi-user support — single-user prototype
- Public sharing — personal log, not published
- Payments — no transactions, only expense *records*
- Complex analytics — out of prototype scope
- Native Android app — PWA only
- Push notifications — out of prototype scope
- i18n / multi-locale — single-locale (skip `i18n.ts` and `locales/`)
- Monorepo / workspace contracts package — single Vite app at repo root

## Context

- Two authoritative SPEC sources were ingested: `spec.md` (product / UX / data-model) and `docs/architecture-template.md` (code structure). They are non-contradictory; the architecture template explicitly defers to `spec.md` on product scope.
- Code structure mirrors the React side of `patrimonium/apps/web`, with required deviations: no `auth/`, no `authFetch`, no API contracts; `services/` are local Dexie repositories rather than HTTP clients; `useLiveQuery` instead of TanStack Query; single-locale; no monorepo.
- The three user-facing categories (Media, Trips, Expenditures) all collapse into one stored type, `LifeLogEntry`, distinguished by `domain` + `type`.
- Prototype priority: capture flow and local persistence over polish.

## Constraints

- **Tech stack (LOCKED)**: React 19 + React DOM 19, TypeScript 5.9 (project references), Vite 7, Tailwind CSS v4 (`@tailwindcss/vite`), `react-router-dom` v7, `vite-plugin-pwa` (Workbox), Dexie + `dexie-react-hooks`, Vitest — Pinned by `architecture-template.md` SPEC; consistent with `spec.md` implementation preference.
- **No backend / no auth (LOCKED)**: All data is local IndexedDB; `services/` are Dexie repositories — Mandated by `spec.md`.
- **Directory layout (LOCKED)**: `src/{pages, components, components/ui, services, state/common, config, pwa, assets}`, single Vite app at repo root — Mandated by `architecture-template.md`.
- **Mobile-first PWA**: Phone-sized screens first; app shell + previously visited routes load offline — Core product requirement.
- **Data model (LOCKED)**: Single stored record type `LifeLogEntry` with the exact shape in REQUIREMENTS.md — Mandated by `spec.md`; future apps read this log.
- **UX rule**: URL-first is the default capture path; manual entry must NOT be default (requires `Enter Manually`) — Explicit `spec.md` acceptance criterion.

## Key Decisions

<!-- LOCKED decisions sourced from architecture-template.md SPEC + spec.md. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React 19 + TS 5.9 + Vite 7 single app (no monorepo) | Matches architecture-template SPEC; prototype simplicity | — LOCKED |
| Tailwind CSS v4 via `@tailwindcss/vite` | Pinned by template; theme tokens via CSS custom properties | — LOCKED |
| `vite-plugin-pwa` (Workbox), `createPwaOptions()` factory | Testable PWA config; NetworkFirst shell, `autoUpdate` | — LOCKED |
| Dexie + `useLiveQuery` (not TanStack Query) | Local IndexedDB repos; reactive reads without a server | — LOCKED |
| `services/` are local Dexie repositories, not HTTP clients | spec.md mandates no backend; drop `authFetch` / contracts | — LOCKED |
| Single `LifeLogEntry` record type; `entries` + `settings` stores | All categories are typed entries in one event log | — LOCKED |
| URL-first capture default; manual behind `Enter Manually` | Explicit spec.md UX rule + acceptance criterion | — LOCKED |
| Structure for a future sync layer (unsynced-entries query stub) | No sync now, but keep the seam open | — LOCKED |

---
*Last updated: 2026-06-15 after initial roadmap creation from ingest*

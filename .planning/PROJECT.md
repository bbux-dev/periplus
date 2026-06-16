# Life Log

## What This Is

Life Log is a mobile-first, installable PWA for fast, structured personal life-logging while on the go (especially while traveling). Users capture media consumption, trips, and expenditures as typed entries in a single append-only-ish event log stored locally on the device. It is a personal prototype, not a public product — no accounts, no backend, no sync. As of v0.1.0 the full local prototype is working end-to-end: URL-first capture, manual entry, browse/filter/detail, and JSON export, all offline.

## Core Value

A user can capture a structured life event on their phone in seconds — URL-first — and have it persist locally and offline as a typed entry that other apps could later read.

## Current State: v0.1.0 SHIPPED (2026-06-16)

**What shipped:** The tracer milestone grew into a complete working local life-log. All 6 phases (1–6) shipped and were verified. The throwaway tracer counter was removed in Phase 4 once real capture landed, as planned.

- Vite 7 + React 19 + TS 5.9 app at repo root, Tailwind v4 CSS-first, template directory layout
- `LifeLogEntry` Dexie/IndexedDB data layer + `entriesRepository` with reactive `useLiveQuery` reads + a future-sync seam (`syncedAt`/`listUnsynced`)
- Installable, offline-capable PWA (manifest + service worker via `vite-plugin-pwa`)
- Home dashboard → domain → entry-type navigation across all screens, with a 404 catch-all
- URL-first capture (offline URL-string heuristics) → Review → Save (the default path)
- Manual entry as the secondary path (`Enter Manually`) with type-appropriate fields
- Entry list (filterable), entry detail (with metadata JSON preview + safe-URL gating), and full JSON export

**Quality at ship:** 221 tests passing; `tsc -b` + `vite build` clean; milestone audit passed (35/35 requirements, 4/4 E2E flows). ~4,900 LOC across 28 source files + 25 test files.

**Next milestone:** scope is open — run `/gsd:new-milestone`. See ROADMAP.md v0.2.0+ for candidate directions.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ App scaffold (Vite 7 + React 19 + TS 5.9, Tailwind v4, template layout) — v0.1.0
- ✓ Mobile-first "Life Log" welcome/dashboard at the default route — v0.1.0
- ✓ Dexie/IndexedDB store with reactive `useLiveQuery` reads — v0.1.0
- ✓ Installable, offline-capable PWA (app shell loads offline) — v0.1.0
- ✓ `LifeLogEntry` record type + `entriesRepository` (CRUD + reactive) — v0.1.0
- ✓ Home dashboard → domain → entry-type navigation across all screens — v0.1.0
- ✓ URL-first capture (offline heuristics) → review → save, the default path — v0.1.0
- ✓ Manual entry behind a visible `Enter Manually` secondary button — v0.1.0
- ✓ Entry list (filterable) + detail + JSON export of all entries — v0.1.0

### Active

<!-- Next milestone scope is open — run /gsd:new-milestone. -->

(None — v0.1.0 shipped; next milestone not yet scoped)

### Deferred (candidate directions for the next milestone)

<!-- Seams already exist in code for the first two. -->

- [ ] Backend sync layer (consume the existing `syncedAt` / `listUnsynced` seam)
- [ ] Edit / delete from Entry Detail (`entriesRepository.update`/`.delete` already exist, unused)
- [ ] JSON import (round-trips the existing export)
- [ ] Richer per-type capture heuristics + short-link (`maps.app.goo.gl`) resolution

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
- The three user-facing categories (Media, Trips, Expenditures) all collapse into one stored type, `LifeLogEntry`, distinguished by `domain` + `type`. The `db.ts` taxonomy (`EntryDomain`/`EntryType`) is the single source of truth consumed by `navigation.ts` and `entryFields.ts`.
- Prototype priority: capture flow and local persistence over polish.
- **As of v0.1.0:** the prototype is fully built and verified locally — ~4,900 LOC across 28 source + 25 test files, 221 tests, PWA build clean. Development used the GSD autonomous pipeline (research → plan → check → execute → code-review+fix → verify per phase); each phase's code review surfaced and fixed real bugs (stale-closure race, double-click duplicate save, UTC-midnight date off-by-one, `javascript:` URL XSS gate). Known tech debt: scaffolded-but-unused SETUP-04 primitives and the future-sync seam methods (intentional).

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
| React 19 + TS 5.9 + Vite 7 single app (no monorepo) | Matches architecture-template SPEC; prototype simplicity | ✓ LOCKED — shipped v0.1.0 |
| Tailwind CSS v4 via `@tailwindcss/vite` | Pinned by template; theme tokens via CSS custom properties | ✓ LOCKED — shipped v0.1.0 |
| `vite-plugin-pwa` (Workbox), `createPwaOptions()` factory | Testable PWA config; NetworkFirst shell, `autoUpdate` | ✓ LOCKED — shipped v0.1.0 |
| Dexie + `useLiveQuery` (not TanStack Query) | Local IndexedDB repos; reactive reads without a server | ✓ LOCKED — shipped v0.1.0 |
| `services/` are local Dexie repositories, not HTTP clients | spec.md mandates no backend; drop `authFetch` / contracts | ✓ LOCKED — shipped v0.1.0 |
| Single `LifeLogEntry` record type; `entries` + `settings` stores | All categories are typed entries in one event log | ✓ LOCKED — shipped v0.1.0 |
| URL-first capture default; manual behind `Enter Manually` | Explicit spec.md UX rule + acceptance criterion | ✓ LOCKED — shipped v0.1.0 |
| Structure for a future sync layer (unsynced-entries query stub) | No sync now, but keep the seam open | ✓ LOCKED — shipped v0.1.0 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-16 after completing milestone v0.1.0 (full local life-log shipped)*

# Phase 2: Data Layer & PWA Shell - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

`LifeLogEntry` records persist locally in IndexedDB through a repository with reactive reads, and the app becomes an installable, offline-capable PWA.

**Requirements:** SETUP-04, DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, PWA-01, PWA-02, PWA-03, PWA-04, PWA-05

**Depends on:** Phase 1 (scaffold, Dexie db instance, useLiveQuery harness, test infra all in place).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting (`workflow.skip_discuss=true`). Use the ROADMAP phase goal, success criteria, the LOCKED stack/architecture in PROJECT.md, the Phase 1 SUMMARY/RESEARCH for established patterns, and codebase conventions.

### Locked constraints (from PROJECT.md / Phase 1)
- Stack is LOCKED: React + Vite + TypeScript, Dexie (IndexedDB), `useLiveQuery` reactive reads, Tailwind v4 CSS-first, heroicons.
- Phase 1 established: `src/services/db.ts` (Dexie instance), template directory layout, Vitest + fake-indexeddb test harness.
- This phase introduces the real domain model (`LifeLogEntry`) and a repository abstraction (`entriesRepository`) — the throwaway counter from Phase 1 can be removed if/when real capture lands (per Phase 1 note), but removal is not required here unless it conflicts.
- PWA: `vite-plugin-pwa` is introduced HERE (Phase 1 deliberately deferred it). Provide a web manifest + registered service worker; the app shell must open offline and a new entry must persist offline.

</decisions>

<code_context>
## Existing Code Insights

Build on Phase 1: extend `src/services/db.ts` with the `lifeLogEntries` table and a versioned schema upgrade; add `src/services/entriesRepository.ts` (or under `services/`) for CRUD + reactive queries; PWA config lives under `pwa/` + `vite.config.ts`. Codebase context gathered during plan-phase research. Mirrors patrimonium/apps/web structure per [[architecture-template]], adapted to no-backend/Dexie.

</code_context>

<specifics>
## Specific Ideas

Success criteria (validation gate — tests/build must prove these):
1. A `LifeLogEntry` can be written and read back from IndexedDB via `entriesRepository`.
2. Stored entries survive a page refresh; a component using `useLiveQuery` re-renders when entries change.
3. An "unsynced entries" query returns local entries, proving the future-sync seam exists (entries carry a sync-state field).
4. The app is installable (web manifest + registered service worker) and the app shell opens while offline.
5. A new entry can be created and persisted while offline.

Notes:
- The "unsynced" seam (SC3) implies `LifeLogEntry` carries a sync-status/`syncedAt` field and the repository exposes an unsynced query — even though no backend sync exists yet. Build the seam, not the sync.
- SC4/SC5 (offline install) are partly verifiable via build artifacts (manifest + SW registration present, precache manifest generated) and partly manual (real offline behavior in a browser). Document the manual-only portions in the validation strategy.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped. Actual backend sync is out of scope (only the local seam is built).

</deferred>

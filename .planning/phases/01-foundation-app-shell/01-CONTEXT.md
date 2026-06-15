# Phase 1: Foundation & App Shell - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

A runnable app built on the locked stack shows a "Life Log" welcome screen and a counter whose value persists in IndexedDB via Dexie and updates reactively — proving the architecture end-to-end with the thinnest possible slice.

**Requirements:** SETUP-01, SETUP-02, SETUP-03, SHELL-01, DEMO-01

**Note:** The counter is a throwaway tracer demo, not a product requirement — it is removed once real capture lands.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting (`workflow.skip_discuss=true`). Use the ROADMAP phase goal, success criteria, the LOCKED stack/architecture in PROJECT.md, and `.planning/codebase`/architecture-template conventions to guide decisions.

### Locked constraints (from PROJECT.md / architecture-template)
- Stack is LOCKED: React + Vite + TypeScript, Dexie (IndexedDB), `useLiveQuery` for reactive reads, Tailwind + `cn` helper, heroicons.
- Template directory layout required: `pages`, `components/ui`, `services`, `state/common`, `config`, `pwa`, `assets`.
- `cn` helper + `Button` primitive must be present.

</decisions>

<code_context>
## Existing Code Insights

This is the first phase — the repo currently has only `.planning/` docs and no application code. Codebase context will be gathered during plan-phase research. Mirror the patrimonium/apps/web React structure per [[architecture-template]], adapted to no-backend/Dexie.

</code_context>

<specifics>
## Specific Ideas

Success criteria (validation gate — tests/build must prove these):
1. Dev server loads a "Life Log" welcome screen on a phone-sized viewport.
2. `tsc -b && vite build` succeeds with the template directory layout and `cn` + `Button` present.
3. +/− heroicon buttons increment/decrement the counter; displayed value updates reactively via `useLiveQuery`.
4. Counter value persists in Dexie/IndexedDB and survives a full page refresh.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>

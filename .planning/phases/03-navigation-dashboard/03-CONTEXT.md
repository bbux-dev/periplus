# Phase 3: Navigation & Dashboard - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

A user can navigate from the home dashboard down to any entry type and back, across all screens.

**Requirements:** NAV-01, NAV-02, NAV-03, NAV-04

**Depends on:** Phase 2 (data layer + repository + PWA shell + routing dep react-router-dom installed).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss skipped per `workflow.skip_discuss=true`. Use ROADMAP goal/criteria, the LifeLogEntry taxonomy already in `src/services/db.ts` (EntryDomain / EntryType), the LOCKED stack, and Phase 1/2 conventions.

### Locked constraints
- Stack LOCKED: React + react-router-dom, Tailwind v4 CSS-first, heroicons, mobile-first.
- Navigation taxonomy (from success criteria — must match the `EntryDomain`/`EntryType` model from Phase 2):
  - **Media** → Show, Movie, Book, Podcast
  - **Trips** → Place, Event, Expense
  - **Expenditures** → Expense
- Pages live under `src/pages/`; routing wired in `App.tsx`/`main.tsx` (react-router-dom). Mirror the WelcomePage pattern from Phase 1.
- Phone-sized layout; every screen reachable via the router; browser Back returns up the navigation tree.

</decisions>

<code_context>
## Existing Code Insights

Build on Phase 2: `src/services/db.ts` defines `EntryDomain` and `EntryType` (the taxonomy source of truth — reuse it, do not redefine). Phase 1 established `WelcomePage` + the router entry point. Add a Home Dashboard page (root nodes), domain pages (entry-type lists), and route wiring. The throwaway counter may be relocated/removed if it conflicts with the new dashboard home (per Phase 1 note: remove when real capture lands — Phase 4 — so likely keep or move for now). Mirrors patrimonium/apps/web structure per [[architecture-template]].

</code_context>

<specifics>
## Specific Ideas

Success criteria (validation gate — RTL routing tests must prove these):
1. Home Dashboard shows Media, Trips, Expenditures root nodes.
2. Selecting a root node shows its entry types (Media: Show/Movie/Book/Podcast; Trips: Place/Event/Expense; Expenditures: Expense).
3. Every screen reachable through the router on a phone-sized layout.
4. Browser Back returns to the previous screen in the navigation tree.

Notes:
- Derive the dashboard structure from the `EntryDomain`/`EntryType` enums in db.ts so navigation and data stay in sync (single source of truth).
- This phase is navigation scaffolding only — selecting an entry type can route to a placeholder "type" screen; actual capture/manual-entry forms land in Phases 4–5. Keep destination screens minimal but real (reachable, labeled, back works).
- Test routing with react-router (MemoryRouter/RTL): assert dashboard renders root nodes, clicking navigates to the domain screen showing the right types, and back navigation works.

</specifics>

<deferred>
## Deferred Ideas

None — discuss skipped. Capture forms and entry detail are later phases.

</deferred>

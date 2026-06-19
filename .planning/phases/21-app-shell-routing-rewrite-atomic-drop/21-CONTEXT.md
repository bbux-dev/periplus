# Phase 21: App Shell + Routing Rewrite + Atomic Drop - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning
**Mode:** Auto-generated (skip_discuss) + milestone research + dependency mapping

<domain>
## Phase Boundary

Rewrite the UI skeleton to trip-only and ATOMICALLY remove all non-trip screens + the dead
DSL/shortcut/layout subsystem, keeping `tsc -b` clean and the full test suite green after the
deletion commit. Establishes the navigational shell that Phases 22–24 fill in.

Delivers (UI-01..05, TRIP-02, TRIP-04):
- Atomic deletion of the 11 non-trip pages + their test files + the dead DSL/shortcut subsystem.
- `App.tsx` rewritten to expose only trip-flow routes + the 404 catch-all.
- `AppShell` rewritten: hamburger = Home / Previous Trips / Settings; app bar shows the active trip
  name; NO `NAVIGATION`, `useShortcutConfig`, `listModes`, or `LayoutChips`.
- `SettingsPage` reduced to JSON export only (reuses `exportEntries`).
- `CreateTripPage` (empty/first-run "Create a Trip" screen) wired to `tripService.createAndActivateTrip`.
- `TripHomePage` STUB at `/` with a correct loading-vs-no-trip guard (full Home is Phase 22).
- `App.test.tsx` replaced with trip-router coverage.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Two critical decouplings BEFORE any deletion (compile-safety)
1. **Move `ReviewDraft`.** It is currently defined in `src/services/extractMetadataFromUrl.ts` (to be
   deleted) but imported by KEPT files `captureService.ts` and `config/entryFields.ts`
   (`buildReviewDraft`/`projectEntryToFormValues` are reused by trip forms in later phases). Move the
   `ReviewDraft` interface into `captureService.ts` (a kept file), update both importers to import it
   from there, THEN delete `extractMetadataFromUrl.ts`.
2. **Decouple `activeMode.ts` from `shortcutConfig`.** `activeMode.ts`'s only coupling is the
   `listModes(config: ShortcutConfig)` helper (modes-derived-from-layouts) and its
   `import type { ShortcutConfig }`. Trips activate via `activateMode` directly and never need
   `listModes`. Remove `listModes` + the `ShortcutConfig` import from `activeMode.ts` (check for
   callers first — they all live in the to-be-deleted shortcut UI). Keep the rest of `activeMode.ts`
   (activate/useActiveMode/tripId/defaultInstanceLabel) intact.

### Atomic deletion (the central pitfall)
- Every deleted page `.tsx` MUST be deleted together with its paired `.test.tsx` in the SAME commit —
  a dangling test that imports a deleted module red-lights the whole Vitest file. Same for deleted
  services/hooks/components and their tests.
- After the deletion commit, `npx vitest run` must be green with zero `Cannot find module` errors and
  `npx tsc -b` must be clean.

### `useActiveMode` loading-vs-no-trip guard (the second pitfall)
- `useActiveMode()` returns `undefined` BOTH while Dexie is opening AND when no trip exists. The `/`
  route must distinguish them: show a neutral loading skeleton until Dexie resolves, then show
  `CreateTripPage` only when resolved-and-empty. No flash of "Create a Trip" on an active-trip cold
  load. Use a settled/loading signal (e.g. the `useLiveQuery` initial `undefined` vs a resolved
  sentinel) — do NOT treat bare `undefined` as "no trip".

### Trip persistence (TRIP-04)
- The active trip persists across reload because it lives in the `activeMode` Dexie `settings` key —
  no new persistence. Verify a reload keeps the active trip.

### Claude's Discretion
Exact route paths, the loading-skeleton visual, CreateTripPage layout (it gets refined in later
phases), and the precise ordering of the move/decouple/delete/rewrite tasks are at Claude's
discretion, provided the suite stays green after each commit where feasible and definitely after the
deletion commit.
</decisions>

<inventory>
## Keep / Drop / Rewrite / New

### KEEP (engine + reused primitives — do NOT delete)
- Services: `db.ts`, `entriesRepository.ts`, `activeMode.ts` (minus `listModes`), `captureService.ts`
  (now also home of `ReviewDraft`), `tripService.ts`, `exportEntries.ts`, `distinctValues.ts`,
  `urlUtils.ts` (only if still referenced by a kept file — otherwise drop).
- Config: `entryFields.ts`, `appBrand.ts`, `publicEnv.ts`.
- Components: `components/ui/{Button,FormField,Input,cn}`, `components/dashboard/{HoleSheet,SavedToast}`
  (reused for Expense sheet + save toast in later phases — keep), `components/layout/AppShell` (REWRITE).
- Pages: `PlaceholderPage` (kept as the 404 catch-all).
- `state/common/*`, `hooks/useBackOrHome.ts` (keep if still used by AppShell/kept pages; else drop).

### DROP (non-trip UI + dead subsystems — delete .tsx/.ts WITH their tests, atomically)
- Pages (11): `CaptureUrlPage`, `DashboardPage`, `DomainPage`, `EntryDetailPage`, `EntryEditPage`,
  `EntryListPage`, `ManageShortcutsPage`, `ManualEntryPage`, `QuickCapturePage`, `ReviewPage`,
  `ShortcutFormPage` (+ their `.test.tsx` / integration tests).
- DSL: `services/dsl/{parser,suggest}.ts` (+ tests).
- Config: `navigation.ts`, `shortcutConfig.ts` (+ tests).
- Services: `configRepository.ts`, `configPort.ts`, `configValidator.ts`, `shortcutMutations.ts`,
  `templateValidator.ts`, `extractMetadataFromUrl.ts` (after ReviewDraft move) (+ tests).
- Dashboard comps: `IconPicker.tsx`, `LayoutChips.tsx`, `ShortcutRow.tsx`.
- Hooks: `useShortcutCapture.ts` (+ test).
- Schema: `schemas/shortcut-config.v1.schema.json`.
- (Verify each drop has no remaining importer among KEPT files before deleting — the compile gate is
  the source of truth. `distinctValues`/`urlUtils`/`useBackOrHome` are conditional: drop only if
  unreferenced after the page deletions.)

### REWRITE
- `App.tsx` — trip-only routes: `/` (TripHome-or-CreateTrip), Previous Trips, Trip Detail, Settings,
  plus the `*` PlaceholderPage catch-all. (Activity/Expense routes can be added in Phases 22–23; for
  now wire what this phase delivers and leave clearly-marked placeholders if a route target isn't
  built yet.)
- `AppShell.tsx` — trip nav (Home / Previous Trips / Settings) + active-trip-name app bar.
- `SettingsPage.tsx` — export-only.
- `App.test.tsx` — replace with trip-router coverage.

### NEW
- `CreateTripPage.tsx` (+ test) — name input + Save → `createAndActivateTrip` → navigate to `/`.
- `TripHomePage.tsx` (+ test) — STUB with the loading-vs-no-trip guard (full Home is Phase 22).
</inventory>

<canonical_refs>
## Canonical References

- `.planning/research/ARCHITECTURE.md` — dropped/kept/new inventory + ReviewDraft move note.
- `.planning/research/PITFALLS.md` — atomic page+test deletion, `useActiveMode` loading ambiguity,
  AppShell decoupling, fake-timers.
- `src/components/layout/AppShell.tsx` — current shell to rewrite (note its dead imports).
- `src/App.tsx` — current router to rewrite.
- `src/services/activeMode.ts` — `useActiveMode`, `defaultInstanceLabel`, the `listModes` to remove.
- `src/services/tripService.ts` — `createAndActivateTrip`, `useTrips`, `useActiveMode` consumers.
- `src/services/captureService.ts` + `src/config/entryFields.ts` — the `ReviewDraft` move sites.
</canonical_refs>

<specifics>
## Specific Ideas

- Suggested task order: (1) move `ReviewDraft` + update importers; (2) remove `listModes`/ShortcutConfig
  import from `activeMode.ts`; (3) rewrite `AppShell` + `App.tsx` + `SettingsPage` and add
  `CreateTripPage` + `TripHomePage` stub + replace `App.test.tsx`; (4) atomic deletion commit of all
  dead pages/services/hooks/components/schema + their tests; (5) `tsc -b` + full `vitest run` green.
  (Order (3) before (4) so the app still compiles against the new shell when the old files vanish.)
- Run `npx tsc -b` after the deletion to catch any missed importer; fix by either deleting the
  straggler or re-pointing it at a kept module.
- This phase deletes a LOT of tests; the suite count will DROP from 631 — that is expected and correct.
  The gate is "green", not "count ≥ 631".
</specifics>

<deferred>
## Deferred Ideas
- Full Trip Home (total, recent entries, Expense/Activity buttons) → Phase 22.
- Expense modal / Activity flow / Previous Trips / Trip Detail → Phases 22–24.
</deferred>

---

*Phase: 21-app-shell-routing-rewrite-atomic-drop*
*Context gathered: 2026-06-19 (skip_discuss + research + dependency mapping)*

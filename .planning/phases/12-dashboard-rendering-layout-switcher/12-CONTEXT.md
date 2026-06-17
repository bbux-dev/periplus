# Phase 12: Dashboard Rendering & Layout Switcher - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss); design contract = sketch 001 (Variant B)

<domain>
## Phase Boundary

The Dashboard renders the active layout's shortcuts as full-width tappable rows with Heroicons
icons, provides a horizontally-scrollable layout chip switcher with persisted selection, and
seeds sensible defaults on a fresh install. Requirements DASH-01, DASH-02, DASH-03.

**Scope boundary (IMPORTANT):** This phase RENDERS shortcuts and switches layouts. The actual
tap → fill-the-hole → capture/save behavior is **Phase 13** (CAP-01..04). In this phase a
shortcut row is a button that is wired to a no-op / placeholder handler (or a TODO seam) — do
NOT implement parseDSL capture, the amount sheet, one-tap save, or ReviewPage routing here.
Import/export (Phase 14) and the authoring tool (Phase 15) are also out of scope; the "+ New"
chip may render as a disabled/placeholder affordance pointing at Phase 15.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
Implementation choices at Claude's discretion, guided by the ROADMAP goal/success criteria,
the design note, the **winning sketch (Variant B)**, and codebase conventions.

### Design contract — sketch 001, Variant B (chips + rows)
Reference: `.planning/sketches/001-dashboard-shortcut-layouts/index.html` + `README.md`.
- **Layout switcher:** horizontally-scrollable **chips** along the top (one per layout), active
  chip visually highlighted; a trailing "+ New" chip as a placeholder entry point for the
  Phase 15 authoring tool (render it, but it need not do anything yet — disabled or a TODO).
- **Shortcuts:** full-width **tappable list rows**, each with its Heroicons icon (via
  `resolveShortcutIcon` from Phase 11), the shortcut name, and optionally the DSL template as a
  secondary line. Rows are the most tappable/legible option on a phone.
- **Icons:** `@heroicons/react` via the Phase 11 `SHORTCUT_ICON_MAP`/`resolveShortcutIcon`
  (BoltIcon fallback). NO emoji.
- Match the existing app's light tokens (`var(--color-*)`), mobile-first, `max-w-sm` column,
  `min-h-[64px]`-class tap targets — consistent with the current `DashboardPage`.

### Defaults seeding (DASH-03) — Phase 11 deferred this here
- Define `DEFAULT_SHORTCUT_CONFIG` (sensible DayToDay / Travel / WorkTrip layouts with a few
  shortcuts each, each a valid DSL template + `confirm` flag) and seed it into the Dexie
  `settings` store on a fresh install (when `useShortcutConfig()` returns `undefined` AFTER
  Dexie has opened — do NOT double-seed; respect the undefined=loading contract from Phase 11).
- Default shortcuts must use valid DSL templates that `parseDSL` accepts and icon keys present
  in `SHORTCUT_ICON_MAP`.

### Active-layout persistence (DASH-02)
- The active-layout selection must persist across reloads. Store it in the Dexie `settings`
  store (e.g. a separate key like `'activeLayoutName'`, or the config object) — reuse the
  Phase 11 repository pattern; do NOT modify `db.ts`. Reactive via `useLiveQuery`.

</decisions>

<code_context>
## Existing Code Insights

- `src/pages/DashboardPage.tsx` is the current dashboard (domain nav + Quick Capture tile +
  View All Entries). The shortcut layouts UI is ADDED here (likely above/alongside the existing
  nav, or as the primary surface — keep the existing nav reachable).
- Phase 11 shipped: `ShortcutConfig`/`Layout`/`Shortcut` types, `SHORTCUT_ICON_MAP` +
  `resolveShortcutIcon` (`src/config/shortcutConfig.ts`), `configRepository` + `useShortcutConfig`
  (`src/services/configRepository.ts`), validator + `migrateConfig` (`src/services/configValidator.ts`).
- `parseDSL` / `POSITIONAL_SCHEMA` live in the v0.2.0 DSL code — use only to VALIDATE that
  default templates parse (in a test), not to wire capture here.
- Reactive reads: `useLiveQuery` with empty deps, NO default (undefined = loading) — Phase 11 rule.
- Tests: RTL with `MemoryRouter`; Dexie tests use `db.delete()/db.open()` reset in `beforeEach`;
  reactive hook tests use `findByText` + `act()`.

</code_context>

<specifics>
## Specific Ideas

Deliverables: `DEFAULT_SHORTCUT_CONFIG` constant; a first-run seeding mechanism; an
active-layout persistence read/write (repository + hook); Dashboard UI — layout chips
(scrollable, active highlight, "+ New" placeholder) + shortcut rows (icon + name [+ template]);
all wired to the reactive config. Shortcut row onClick is a placeholder seam for Phase 13.

</specifics>

<deferred>
## Deferred Ideas

- Tap-to-capture (fill-the-hole sheet, one-tap save + undo, ReviewPage routing) — Phase 13.
- Import / export config — Phase 14.
- Authoring tool (create/edit/reorder, "+ New" chip behavior, "Save current as shortcut") — Phase 15.

</deferred>

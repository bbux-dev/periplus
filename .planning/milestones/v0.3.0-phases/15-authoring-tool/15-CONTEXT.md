# Phase 15: Authoring Tool - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Users can create, edit, delete, and reorder shortcuts and layouts in-app, and save any DSL line
from the omnibar directly as a new shortcut template. Requirements EDIT-01..04. Depends on Phases
11–13. This is the final v0.3.0 phase — it turns the read-only/seeded config into a fully
user-authorable one and activates the Phase-12 "+ New" placeholder.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
Choices at Claude's discretion, guided by ROADMAP goal/success criteria, the design note (the
authoring tool is explicitly WANTED), and codebase conventions.

### What to build (EDIT-01..04)
- **EDIT-01 — Shortcut CRUD:** create / edit / delete a shortcut (name, icon, dslTemplate,
  `confirm` flag) within a layout. New/edited shortcuts appear on the Dashboard immediately
  (reactive via `useShortcutConfig`).
- **EDIT-02 — Layout CRUD + reorder:** create / rename / delete a layout; reorder shortcuts
  within a layout. Order persists across reloads.
- **EDIT-03 — "Save current as shortcut" from the omnibar:** in `QuickCapturePage`, add an action
  that takes the current DSL line and pre-fills the shortcut-authoring form. The Phase-12
  LayoutChips "+ New" disabled placeholder becomes a real entry point (e.g. → create layout, or
  open the authoring screen).
- **EDIT-04 — parseDSL validation before save:** a shortcut whose `dslTemplate` fails `parseDSL`
  CANNOT be saved — show the parse error inline. (Note: a template legitimately contains HOLES
  — empty positional slots and the Phase-13 `{}` named-hole token — which are VALID, not errors.
  Validate that the template is well-formed/parseable, allowing holes; do not require status 'ok'
  with all slots filled. Resolve the exact "valid template" rule in research/planning, consistent
  with Phase 13's hole model.)

### Config mutation model — whole-or-reject, validated
- All edits are read-modify-write of the single `ShortcutConfig`: read current (or build new),
  apply the change immutably, run it through the Phase 11 validator (`validateShortcutConfig` /
  the config is always structurally valid), then `configRepository.put`. Never write an invalid
  config. Reuse Phase 11/12 primitives — do NOT modify `db.ts`.
- Recommend a small set of pure config-mutation helpers (add/update/delete/reorder shortcut;
  add/rename/delete layout) so the UI stays thin and the logic is unit-testable.

### Reorder UX (no new deps)
- Use accessible up/down move buttons (dep-free, keyboard-friendly) rather than a drag-and-drop
  library — NO new runtime dependencies. (If research finds a compelling native HTML5 DnD path
  that adds no deps and is accessible, it may propose it; default is up/down buttons.)

### Icon picker
- Pick from the curated `SHORTCUT_ICON_MAP` keys (render `resolveShortcutIcon` previews). No
  free-form icon input that could miss the allow-list (the resolver falls back to BoltIcon anyway,
  but the picker should only offer real keys).

### UI placement
- Build the authoring UI as its own screen(s)/route (e.g. an authoring/manage route) reachable
  from the Dashboard ("+ New" chip and/or a manage affordance) and/or the existing SettingsPage.
  Decide exact placement/navigation in research/planning; keep consistent with existing pages
  (mobile-first, `var(--color-*)`, existing form primitives like FormField/Input/Button).

### Security/scope
- Authored `dslTemplate`s are validated by `parseDSL` only (no eval); the saved config is data;
  no new injection surface. No backend, no accounts (single-user preserved). This phase does NOT
  add import/export (Phase 14, done) beyond what exists.

</decisions>

<code_context>
## Existing Code Insights — reuse, do not reinvent

- **Config read/write:** `src/services/configRepository.ts` — `configRepository.get()/put()`,
  `useShortcutConfig()`, `activeLayoutRepository`/`useActiveLayoutName`.
- **Validator + types:** `src/services/configValidator.ts` (`validateShortcutConfig`),
  `src/config/shortcutConfig.ts` (`ShortcutConfig`/`Layout`/`Shortcut`, `SHORTCUT_ICON_MAP`,
  `resolveShortcutIcon`, `DEFAULT_SHORTCUT_CONFIG`).
- **Parser for EDIT-04:** `src/services/dsl/parser.ts` `parseDSL` (statuses ok/ambiguous/error;
  holes are valid empty slots). Phase-13 `{}` named-hole token is in `src/services/captureService.ts`.
- **Omnibar (EDIT-03 entry point):** `src/pages/QuickCapturePage.tsx` (`text` state holds the DSL
  line; navigate pattern).
- **"+ New" chip:** `src/components/dashboard/LayoutChips.tsx` (disabled placeholder to activate).
- **Form primitives:** existing `FormField`/`Input`/`Button` (used by ManualEntryPage/ReviewPage) —
  reuse for the authoring forms. `cn()` for classnames.
- **Routing:** `src/App.tsx` (register any new authoring route before the catch-all).
- Conventions: pure functions in `services/`/`config/`; RTL + MemoryRouter tests; Dexie tests
  reset in `beforeEach`; `var(--color-*)` tokens; mobile-first; `useLiveQuery` no default.

</code_context>

<specifics>
## Specific Ideas

Deliverables: pure config-mutation helpers (add/update/delete/reorder shortcut; add/rename/delete
layout) with tests; a template-validity check for EDIT-04 (parseable, holes allowed); authoring
UI screen(s) with shortcut form (name, icon picker, dslTemplate w/ live parse error, confirm
toggle) and layout management + shortcut reorder (up/down); activate the "+ New" chip; add "Save
current as shortcut" to the omnibar pre-filling the form. Tests cover EDIT-01 (create→appears on
Dashboard), EDIT-02 (edit/delete persist; layout CRUD reflects in switcher; reorder persists),
EDIT-03 (omnibar pre-fills form), EDIT-04 (unparseable template can't be saved).

</specifics>

<deferred>
## Deferred Ideas

- Drag-and-drop reordering libraries — out of scope (no new deps; up/down buttons).
- Cross-device sync of authored config — out of scope (portable import/export already covers
  sharing, Phase 14). Single-user, local-only preserved.
- Per-type advanced template builders / guided DSL composition — out of scope; the form takes a
  raw dslTemplate validated by parseDSL.

</deferred>

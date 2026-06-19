# Phase 19: Active Mode Navigation + Dashboard De-Clunk - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped); enriched from design note

<domain>
## Phase Boundary

Deliver the core "de-clunk": move mode switching into the hamburger menu, show the active mode in
the app bar, and strip the dashboard down to ONLY the active mode's buttons. Consumes the Phase 18
active-mode model (`useActiveMode`, `activateMode`, `defaultInstanceLabel`, `listModes`). Final
phase of v0.4.0.

Source: `.planning/notes/active-mode-navigation-design.md`. North star: `seeds/fewest-buttons-slickest.md`
("does this remove buttons/interactions, or add them?" — this phase REMOVES the on-dashboard switcher).
</domain>

<decisions>
## Implementation Decisions

### Locked by design + codebase conventions
- **Dashboard renders only the active mode's buttons.** Derive the rendered layout from the active
  MODE (`useActiveMode().mode`), not `activeLayoutName`. REMOVE `<LayoutChips>` and `handleLayoutSelect`
  from `DashboardPage`. Keep `ShortcutRow` rendering. Fall back to `layouts[0]` when no active mode yet.
- **Keep `LayoutChips.tsx`** — it is still used by `ManageShortcutsPage` (layout management). Only its
  use on the dashboard is removed. Do NOT delete the component.
- **Switch lives in the hamburger menu** (`AppShell`), not on-screen. Add an "Active Mode" menu item;
  tapping it reveals the mode list (`listModes(config)`); tapping a mode prompts to confirm/edit the
  instance label (pre-filled with `defaultInstanceLabel(mode)`); confirm → `activateMode(mode, label)`.
  Decided against on-screen cycle/auto-detect (design note).
- **App bar shows `mode · label`** (e.g. `Travel · Oregon-Jun-2026`) via `useActiveMode()`.
- **Auto-activate a default mode on first run** (idempotent): when a config exists/seeds but no active
  mode is persisted, activate the first layout so the dashboard is never empty, the app bar shows
  state, and captures are stamped from day one. Only writes when none is set.

### Claude's Discretion
- Inline label-prompt UX inside the menu (an input pre-filled with the default + Confirm/Cancel) vs a
  small modal — prefer inline + testable (NO `window.prompt`).
- Exact app-bar placement/truncation of the `mode · label` text (center of the top bar, truncated).
- Whether to leave `activeLayoutRepository`/`useActiveLayoutName` in place (unused by the dashboard
  after this phase) — leaving them is fine; do not break `ManageShortcutsPage`.
</decisions>

<code_context>
## Existing Code Insights

- `src/components/layout/AppShell.tsx` — sticky header: top bar row (home button left, hamburger
  right; `justify-between`) + dropdown `<nav id="app-nav-menu">` with link rows + a NAVIGATION tree.
  Menu open/close + Escape + outside-click already implemented. Add the "Active Mode" row + label
  prompt here, and the app-bar `mode · label` display in the top bar row.
- `src/pages/DashboardPage.tsx` — seeds DEFAULT_SHORTCUT_CONFIG (awaited get, one-shot); uses
  `useShortcutConfig` + `useActiveLayoutName` + `<LayoutChips>` + `ShortcutRow`. Switch to
  `useActiveMode`; remove LayoutChips + handleLayoutSelect; add idempotent first-run mode activation.
- `src/services/activeMode.ts` (Phase 18) — `useActiveMode()`, `activateMode(mode,label?)`,
  `defaultInstanceLabel(mode)`, `listModes(config)`, `activeModeRepository`.
- `src/services/configRepository.ts` — `useShortcutConfig()`; `DEFAULT_SHORTCUT_CONFIG` layouts are
  DayToDay/Travel/WorkTrip (the seed modes).
- Tests: `AppShell.test.tsx` (MemoryRouter + sentinel routes; fake-indexeddb auto-hoisted — seed a
  config via configRepository.put for mode-menu tests, wrap live-query-affecting writes in act()).
  `DashboardPage.test.tsx` currently asserts CHIP behavior (aria-pressed, "+ New" chip, click-to-switch)
  — those switcher tests must be REMOVED/REPLACED with "only the active mode's shortcuts render, no chips".
</code_context>

<specifics>
## Specific Ideas

- App bar: `{activeMode && <span className="truncate ...">{activeMode.mode} · {activeMode.label}</span>}`.
- Menu "Active Mode" row: a button toggling a submenu; submenu lists `listModes(config)`; selecting a
  mode sets pending state {mode, label=defaultInstanceLabel(mode)} → render an inline labelled input +
  Confirm/Cancel; Confirm → `await activateMode(mode, label)` + close the menu; Cancel → clear pending.
- Dashboard de-clunk test: assert no element with the LayoutChips role/text appears; assert exactly the
  active mode's shortcut names render as buttons; switching the active mode (activeModeRepository.put)
  re-renders the corresponding layout's shortcuts.
- AppShell test: app bar shows "Travel · <label>" after activating; "Active Mode" item present;
  selecting a mode + confirming persists via activeModeRepository.get and updates the bar.
- Dexie + fake-Date caveat (Phase 16): fake only Date if a deterministic default label is asserted.
</specifics>

<deferred>
## Deferred Ideas

- Filtering entries by mode instance — future milestone (STAMP-01 enables it).
- Removing the now-unused `activeLayoutName` plumbing — optional cleanup, not required here.
</deferred>

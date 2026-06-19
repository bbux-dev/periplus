---
title: Active Mode navigation + instance-stamped capture — design
date: 2026-06-18
context: /gsd:explore session on navigation friction; refines v0.3.0 layout/authoring work
status: design-note (seeds next milestone)
---

# Active Mode navigation + instance-stamped capture

## Problem (the real one)

Navigation feels clunky **not** because layouts don't exist — they do (Phase 12 switcher
chips, Phase 15 in-app authoring). The friction is **steady-state noise**: a user stays in
one mode (e.g. Travel) for days, but the dashboard keeps the *other* modes' chips and the
switcher itself ever-present. Everything that isn't the active mode is noise.

> User: "Too many extra buttons along with those... I will be in a given mode for long
> periods, so having them ever present is noise."

The fix is not more controls — it's **removing** them from steady state.

## The model

- **Mode** = an independent button list (Travel, WorkTrip, DayToDay). Independent lists are
  retained (not a global pool) — overlap between e.g. Travel "Taxi" and WorkTrip "Work Taxi"
  is acceptable. Editable in-app (extends the Phase 15 authoring tool).
- Activating a mode starts an **instance** with a free-text **label**:
  `mode = "Travel", label = "Oregon-Jun-2026"`. Modes are durable templates; instances are
  the dated runs of them.
- The active mode + instance **persists** (Dexie `settings`, like the current active-layout
  persistence). Switching is rare.

## Switch UX — menu, pick active

- Switching lives in the **hamburger menu**, not on-screen. Decided against on-screen
  cycle/auto-detect.
- Menu item: **"Active Mode"** (retires the placeholder name "Active Subset").
- Flow: menu → Active Mode → list of modes → tap to activate → prompt/confirm the instance
  **label** for this run (default could be `<mode>-<Mon>-<Year>`, e.g. `Travel-Jun-2026`).
- App bar reflects current state, e.g. `Travel · Oregon-Jun-2026`.

## Dashboard — show only the active mode

- Dashboard renders **only the active mode's buttons**. No layout chips, no other modes, no
  switcher in steady state. This is the core "de-clunk."
- Reuses existing `ShortcutRow` rendering; what changes is that the layout/mode selector is
  removed from `DashboardPage` and relocated to the menu.

## Instance stamping (new capability)

- Every entry captured while a mode is active is **stamped** with provenance:
  `metadata.mode = "Travel"`, `metadata.modeLabel = "Oregon-Jun-2026"`.
- Independent button lists may produce similar entries (Taxi vs Work Taxi) — the stamp is
  what makes them separable later. Enables "everything I logged during the Oregon trip."
- Stamp is written in the single capture path (`captureService.draftToEntry`) so both
  one-tap save and ReviewPage inherit it.

## Naming

- Primary: **Mode** / **Active Mode**. Alternatives considered: "Context", "Profile".

## Touchpoints (for whoever plans this)

- `src/config/shortcutConfig.ts` — Layout → Mode concept; add instance/label support.
- `src/pages/DashboardPage.tsx` — strip the on-dashboard layout switcher; render active only.
- `src/components/layout/AppShell.tsx` — add "Active Mode" menu entry + label prompt; show
  active mode·label in app bar.
- `src/services/captureService.ts` (`draftToEntry`) — stamp `metadata.mode` + `modeLabel`.
- Dexie `settings` — persist active mode + active instance label.
- Phase 15 authoring tool — extend to manage modes/instances in-app.

## Related

- [[editable-saved-entries-design]] — same goal (richer, filterable records); re-assigning an
  entry's mode/label after the fact falls out of metadata editing.
- [[fewest-buttons-slickest]] — the guiding constraint this serves.

---
title: Fewest buttons, fewest interactions, slickest experience
trigger_condition: Before planning any navigation, dashboard, mode, or capture-flow phase — re-check the design against this constraint.
planted_date: 2026-06-18
context: /gsd:explore session — the north star behind the active-mode redesign
---

# North star: fewest buttons, fewest interactions, slickest experience

> "We will whittle this down until we have the fewest buttons with the fewest interactions
> that produce the slickest experience. The DSL helps with this."

## The constraint

Every nav/dashboard/capture decision should be measured against: **does this reduce buttons
and interactions, or add them?** The default answer to "should we add a control?" is *no* —
prefer removing, defaulting, or inferring.

Concrete expressions of this principle already decided:
- Dashboard shows **only the active mode's buttons** — switcher and other modes removed from
  steady state (noise reduction over feature addition). See [[active-mode-navigation-design]].
- Date **defaults to today** instead of being a field to fill. See [[default-occurredat-today]].
- The **DSL** is the lever: a single text grammar can collapse many buttons/fields into one
  expressive input, so push complexity into the DSL rather than into UI chrome.

## When this fires

Re-read before each phase that touches navigation, the dashboard, modes, or the capture flow.
Ask: what can be removed, defaulted, inferred, or pushed into the DSL instead of adding a
button or a tap?

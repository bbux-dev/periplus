---
title: Dashboard shortcut layouts
trigger_condition: When the next milestone (v0.3.0) scope is being set — run at /gsd:new-milestone
planted_date: 2026-06-17
---

# Dashboard shortcut layouts

Customizable one-tap shortcut buttons on the Dashboard, grouped into switchable **layouts**
(DayToDay / Travel / WorkTrip), built on top of the v0.2.0 Quick-Capture DSL. Full design in
note `dashboard-shortcut-layouts-design`.

**One-line pitch:** a shortcut is a saved DSL template with empty-slot "holes"; tap it, fill
the one missing value (or nothing), and it flows through the existing `parseDSL` →
`buildReviewDraft` → save pipeline. Layouts are switchable sets; the whole config is a single
JSON-Schema-validated object in the Dexie `settings` store, with import/export for portability.

## Why this is a strong v0.3.0 candidate

- Highest-leverage build on the DSL — collapses recurring captures to a tap; minimal new
  capture logic (reuses the entire v0.2.0 pipeline).
- Import/export config delivers "personal/shareable" without breaking the single-user,
  no-backend constraint.
- Activates the dormant Dexie `settings` store (built in v0.1.0, unused).

## Suggested phase shape when promoted

1. **Config model + JSON Schema + storage** — config types, JSON Schema (versioned), Dexie
   `settings` read/write, validator. (todo `shortcut-config-json-schema`)
2. **Dashboard rendering + layout switcher** — render layouts/shortcuts; switch between
   layouts; seed sensible defaults.
3. **Tap-to-capture flow** — fill-the-hole micro-prompt; per-shortcut `confirm` (one-tap
   direct save + undo toast, or route through ReviewPage).
4. **Import / export config** — mirror the entries-export pattern; validate imports.
5. *(later)* Authoring/manager screen + "Save current as shortcut" from the omnibar.

## Open items to resolve at promotion

- Authoring depth for v1 (defaults + import/export vs full manager screen).
- Placeholder token for non-positional holes (`?` / `{}`).
- Config versioning/migration strategy.

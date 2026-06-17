# Requirements — Life Log

Milestone **v0.3.0 — Dashboard Shortcut Layouts**. Continues from v0.2.0 (shipped; 10/10 reqs)
and v0.1.0 (shipped; 35/35 reqs). Design: `.planning/notes/dashboard-shortcut-layouts-design.md`.
UI direction: `sketches/001-dashboard-shortcut-layouts` (winner: Variant B, chips + rows).
Builds directly on the v0.2.0 Quick-Capture DSL pipeline (`parseDSL` → `buildReviewDraft` →
save) — a shortcut is a saved DSL template whose empty slots are the "holes."

## v0.3.0 Requirements

### CFG — config model, schema & storage

- [ ] **CFG-01**: The shortcut config is a single object —
  `{ version, layouts: [{ name, icon?, shortcuts: [{ name, icon?, dslTemplate, confirm }] }] }`
  — persisted in the existing (dormant) Dexie `settings` store and read back reactively.
- [ ] **CFG-02**: A versioned JSON Schema is the source of truth for the config; configs are
  validated against it on load/import and rejected as a whole (no partial apply) with a
  human-readable reason when invalid.
- [ ] **CFG-03**: The config carries a `version` field and a defined forward-compat strategy so
  a config exported by an older app version still loads in a newer one.

### DASH — dashboard rendering & layout switcher

- [ ] **DASH-01**: The Dashboard renders the active layout's shortcuts as full-width tappable
  rows (Variant B: chips + rows), each showing its name and assigned `@heroicons/react` icon.
- [ ] **DASH-02**: The user can switch between layouts via horizontally-scrollable layout chips;
  the active-layout choice persists across reloads.
- [ ] **DASH-03**: A fresh install is useful with zero setup — sensible default layouts
  (e.g. DayToDay / Travel / WorkTrip) and shortcuts are seeded into the config.

### CAP — tap-to-capture flow

- [ ] **CAP-01**: Tapping a shortcut with no holes (a complete DSL template) captures the entry
  directly through the existing `parseDSL` → `buildReviewDraft` pipeline, with no field prompt.
- [ ] **CAP-02**: Tapping a shortcut with empty-slot hole(s) opens a fill-the-hole micro-prompt
  (mobile amount keypad sheet with quick-amount presets and a live DSL preview of the resulting
  line) before capture; with multiple holes the prompt follows template slot order.
- [ ] **CAP-03**: Each shortcut's `confirm` flag chooses the save path — `confirm:false` saves
  directly to IndexedDB and shows an undo affordance ("Saved · Undo", backed by
  `entriesRepository.delete`); `confirm:true` routes through the existing `ReviewPage`.
- [ ] **CAP-04**: A defined placeholder convention lets a shortcut declare a hole for a named
  (non-positional) param so the micro-prompt can ask for it, not just empty positional slots.

### PORT — import / export

- [ ] **PORT-01**: The user can export the entire shortcut config as a JSON file (mirroring the
  existing entries-export `triggerDownload` pattern).
- [ ] **PORT-02**: The user can import a config JSON file; it is validated against the JSON
  Schema (with version migration) before being applied, and invalid files are rejected with a
  clear message — this is how a second person seeds their own install without accounts.

### EDIT — authoring tool

- [ ] **EDIT-01**: The user can create, edit, and delete shortcuts (name, icon, `dslTemplate`,
  `confirm` flag) through an in-app authoring UI.
- [ ] **EDIT-02**: The user can create, edit, and delete layouts and reorder the shortcuts
  within a layout.
- [ ] **EDIT-03**: The user can "Save current as shortcut" from the quick-capture omnibar,
  turning the current DSL line into a new shortcut template (the "+ New" chip is an entry point).
- [ ] **EDIT-04**: The authoring UI validates each shortcut's `dslTemplate` via `parseDSL` so a
  template that can't parse cannot be saved.

## Traceability

| REQ | Phase |
|-----|-------|
| CFG-01..03 | Phase 11 — Config Model, Schema & Storage |
| DASH-01..03 | Phase 12 — Dashboard Rendering & Layout Switcher |
| CAP-01..04 | Phase 13 — Tap-to-Capture Flow |
| PORT-01..02 | Phase 14 — Import / Export Config |
| EDIT-01..04 | Phase 15 — Authoring Tool |

## Future Requirements (deferred)

- v0.2.0 deferred DSL follow-ups still open: field/param-key suggestions after `?`,
  content-based type inference, currency-symbol/locale amount parsing.
- Backend sync, entry edit/delete from Entry Detail, entry-JSON import (PROJECT.md Deferred).

## Out of Scope

- All v0.1.0 / v0.2.0 Out-of-Scope exclusions carry forward (no backend/auth/OCR/accounts —
  see PROJECT.md). "Per-user" shortcuts are delivered ONLY via portable import/export config,
  not accounts or multi-user data.
- Zod or any schema lib with heavy DX — JSON Schema is the chosen validation source of truth
  (validator implementation, e.g. `ajv` vs hand-rolled, is a plan-phase decision).
- No new injection surface: imported `dslTemplate`s run only through `parseDSL` (no `eval`), and
  any `sourceUrl` produced still passes `isSafeUrl` at save.
- Replacing the v0.2.0 omnibar, URL-first, or manual capture paths — shortcuts are an additional
  fast path, not a replacement.

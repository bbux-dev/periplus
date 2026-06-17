# Phase 14: Import / Export Config - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Users can export the full shortcut config as a JSON file and import a JSON config file that is
validated against the JSON Schema (with Phase 11 version migration) before being applied.
Requirements PORT-01, PORT-02. Depends on Phase 11 (config model/validator/migration) and
Phase 12 (the config that exists to export). Independent of Phases 13/15.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
Choices at Claude's discretion, guided by ROADMAP goal/success criteria, the design note, and —
critically — the EXISTING entries-export pattern which this MUST mirror.

### Export (PORT-01) — mirror exportEntries.ts
- Add a pure `buildConfigExportJson(config, exportedAt)` (epoch ms INJECTED by caller, never read
  internally — same determinism rule as `buildExportJson`) producing a versioned JSON string of
  the shortcut config.
- Reuse the existing `triggerDownload(json, filename)` from `src/services/exportEntries.ts` for
  the browser download (default filename e.g. `life-log-shortcuts.json`). Do NOT duplicate it.

### Import (PORT-02) — validate before apply
- Read the chosen file (`<input type="file">` + FileReader/`file.text()`), `JSON.parse` it
  (catch parse errors → clear message), then run it through the Phase 11 **`migrateConfig`**
  (which rejects-if-newer, migrates-if-older, then validates) — apply ONLY on `{ ok: true }`.
- On `{ ok: false }` (or JSON parse failure): reject WHOLESALE, apply nothing, surface the
  `reason` as a clear human-readable error to the user. Never partially apply.
- On success: `configRepository.put(config)`; the Dashboard updates reactively via
  `useShortcutConfig` (no reload needed). Consider resetting/validating the persisted
  `activeLayoutName` so it still points at an existing layout after import (fall back to first
  layout if the old active name is absent — the Phase 12 derivation already handles this, so an
  explicit reset may be unnecessary; decide in planning).
- This is how a second person seeds their own install without accounts (single-user preserved).

### UI placement
- There is no Settings page yet. Add a minimal, discoverable Import/Export surface. Options
  (decide in research/planning): a small "Settings"/"Shortcuts config" section reachable from the
  Dashboard, or a dedicated route. Keep it consistent with existing pages (mobile-first,
  `var(--color-*)` tokens, existing button styles). The export trigger mirrors how
  `EntryListPage` exposes entry export.

### Security
- Imported config is DATA only — never eval'd; `dslTemplate`s run only through `parseDSL` later;
  any `sourceUrl` produced still passes `isSafeUrl` at save. The import path adds NO new injection
  surface — it only `JSON.parse`s + structurally validates.

</decisions>

<code_context>
## Existing Code Insights — reuse, do not reinvent

- **Export analog:** `src/services/exportEntries.ts` — `buildExportJson(entries, exportedAt)`
  (pure, injected timestamp) + `triggerDownload(json, filename)` (side-effectful, jsdom-mockable
  via `URL.createObjectURL` + anchor `click`). `src/pages/EntryListPage.tsx` shows the UI trigger.
- **Phase 11 import primitives:** `src/services/configValidator.ts` — `migrateConfig(raw)` →
  `{ ok: true, config } | { ok: false, reason }` (reject-if-newer/migrate-if-older/validate).
  `src/services/configRepository.ts` — `configRepository.put(config)`, `useShortcutConfig()`,
  `activeLayoutRepository`/`useActiveLayoutName`.
- **Config shape/version:** `src/config/shortcutConfig.ts` (`ShortcutConfig`, `CURRENT_CONFIG_VERSION`).
- Conventions: pure functions in `services/`; RTL + MemoryRouter tests; export tests mock
  `URL.createObjectURL` + anchor click; Dexie tests reset in `beforeEach`; `var(--color-*)` tokens.

</code_context>

<specifics>
## Specific Ideas

Deliverables: `buildConfigExportJson` (pure) reusing `triggerDownload`; an import function
(read file → JSON.parse → migrateConfig → put), returning a result the UI can show success/error
from; an Import/Export UI surface (export button + file-input import with a visible error
message); wiring so the Dashboard reflects an imported config reactively. Tests cover PORT-01
(export contents match config), PORT-02 (valid import replaces + reflects; invalid/malformed
rejected with message; older-version config migrates in).

</specifics>

<deferred>
## Deferred Ideas

- Authoring tool (create/edit/reorder, "+ New", "Save current as shortcut") — Phase 15.
- Merge-on-import (vs replace), partial import, conflict resolution — not in scope; import
  REPLACES the config wholesale after validation.

</deferred>

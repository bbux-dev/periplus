---
phase: 14-import-export-config
plan: 01
subsystem: service
tags: [file-io, dexie, indexeddb, json-export, json-import, config, migration, tdd]

# Dependency graph
requires:
  - phase: 11-config-model-schema-storage
    provides: migrateConfig, configRepository.put, ShortcutConfig, CURRENT_CONFIG_VERSION
  - phase: 06-entry-list-detail-export
    provides: triggerDownload (reused from exportEntries.ts)
provides:
  - buildConfigExportJson (pure, injected timestamp, deterministic)
  - importConfig (parse → migrateConfig → configRepository.put, wholesale reject)
  - ConfigExportEnvelope interface
  - ImportResult type
  - triggerDownload re-export from configPort (callers get one import point)
affects: [14-02-settings-page-ui, any future config tooling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Injected-timestamp determinism: exportedAt injected by caller, never read internally"
    - "Wholesale reject on import failure: configRepository.put only reached on { ok: true }"
    - "Service re-export: triggerDownload re-exported from configPort so UI uses one import"

key-files:
  created:
    - src/services/configPort.ts
    - src/services/configPort.test.ts
  modified: []

key-decisions:
  - "triggerDownload imported and re-exported from exportEntries, not duplicated — single source of truth"
  - "importConfig uses file.text() (modern File API) rather than FileReader callbacks — simpler, Promise-based, jsdom-compatible"
  - "Wholesale reject: configRepository.put is never called on any { ok: false } path — migrateConfig validates before any write"
  - "No new dependencies introduced — plan was purely compositional (configValidator + configRepository + exportEntries)"

patterns-established:
  - "ConfigExportEnvelope mirrors ExportEnvelope — versioned JSON envelope with injected timestamp"
  - "importConfig composes: file.text() → JSON.parse (try/catch) → migrateConfig → put — each step maps to a distinct failure mode"

requirements-completed: [PORT-01, PORT-02]

# Metrics
duration: 5min
completed: 2026-06-17
---

# Phase 14 Plan 01: configPort Service Layer Summary

**Pure `buildConfigExportJson` (injected-timestamp, deterministic) and `importConfig` (parse-validate-put with wholesale reject) as the testable security-critical service core for config import/export.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-17T18:07:25Z
- **Completed:** 2026-06-17T18:08:50Z
- **Tasks:** 2 (both TDD — RED then GREEN in single implementation pass)
- **Files modified:** 2

## Accomplishments

- `buildConfigExportJson(config, exportedAt)` pure function: deterministic, never reads `Date.now()`, produces pretty-printed JSON envelope mirroring `buildExportJson`
- `importConfig(file)`: reads `file.text()`, parses JSON (try/catch), runs `migrateConfig`, on `{ ok: true }` calls `configRepository.put`; on any failure returns `{ ok: false, reason }` and writes NOTHING
- `triggerDownload` re-exported from `exportEntries` so 14-02 UI has a single import point without duplicating the function body
- 9 tests covering: round-trip deep-equal, determinism, no-clock-read, valid import + Dexie write, malformed JSON rejection, structurally invalid rejection, newer-version rejection, migration path (v1 no-op seam), and `put`-not-called spy

## Task Commits

1. **Tasks 1+2: configPort service (buildConfigExportJson + importConfig)** - `c7d7e7b` (feat)

**Plan metadata:** (to follow in final commit)

## Files Created/Modified

- `src/services/configPort.ts` - Pure export function, importConfig, ConfigExportEnvelope + ImportResult types, triggerDownload re-export
- `src/services/configPort.test.ts` - 9 tests: 3 for purity/determinism, 6 for importConfig accept/reject/migrate/spy paths

## Decisions Made

- `triggerDownload` re-exported from `exportEntries` (not duplicated) — plan directive honored; grep confirms `function triggerDownload` does not appear in configPort.ts
- `file.text()` used (modern Promise-based File API) — cleaner than FileReader callbacks, fully jsdom-compatible
- `import { triggerDownload }` not needed as a separate import statement since the `export { triggerDownload }` re-export already pulls it in without duplication

## Deviations from Plan

None — plan executed exactly as written. The `SpyInstance` import was dropped from the test file (unused after settling on `vi.spyOn`) — cosmetic only, not a behavioral change.

## Issues Encountered

None. All 9 tests green on first GREEN implementation pass.

## Next Phase Readiness

- `configPort.ts` is fully implemented and tested — Plan 14-02 (SettingsPage UI) can wire `buildConfigExportJson`, `importConfig`, and `triggerDownload` directly
- No blockers

---
*Phase: 14-import-export-config*
*Completed: 2026-06-17*

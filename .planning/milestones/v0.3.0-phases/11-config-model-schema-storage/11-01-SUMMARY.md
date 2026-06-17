---
phase: 11-config-model-schema-storage
plan: "01"
subsystem: database
tags: [dexie, heroicons, typescript, json-schema, vitest, react-hooks]

requires: []
provides:
  - ShortcutConfig / Layout / Shortcut TypeScript interfaces (version: 1 literal)
  - SHORTCUT_ICON_MAP (21 curated @heroicons/react/24/outline entries) + resolveShortcutIcon()
  - DEFAULT_SHORTCUT_ICON = BoltIcon fallback
  - src/schemas/shortcut-config.v1.schema.json — draft-07 JSON Schema spec artifact
  - validateShortcutConfig (whole-or-reject structural validator with path-specific errors)
  - migrateConfig (future-version rejection + empty migration chain seam + delegates to validator)
  - CURRENT_CONFIG_VERSION = 1; ValidationResult discriminated union
  - configRepository.get() / .put() against Dexie settings store under key 'shortcutConfig'
  - useShortcutConfig() reactive hook (useLiveQuery, empty deps, no default)
affects:
  - phase-12-dashboard-rendering
  - phase-13-tap-to-capture
  - phase-14-import-export
  - phase-15-authoring-tool

tech-stack:
  added: []
  patterns:
    - Hand-rolled structural validator (whole-or-reject, path-specific error messages, no ajv/zod)
    - SHORTCUT_ICON_MAP static named-import allow-list with resolveShortcutIcon() fallback
    - Dexie settings key/value store reuse (no version bump — data write, not schema change)
    - useLiveQuery with [] deps and NO default — undefined = Dexie opening or no config saved
    - ValidationResult discriminated union { ok: true, config } | { ok: false, reason }
    - Migration chain seam (commented insertion point for future vN→vN+1 steps)

key-files:
  created:
    - src/config/shortcutConfig.ts
    - src/config/shortcutConfig.test.ts
    - src/schemas/shortcut-config.v1.schema.json
    - src/services/configValidator.ts
    - src/services/configValidator.test.ts
    - src/services/configRepository.ts
    - src/services/configRepository.test.tsx
  modified: []

key-decisions:
  - "Hand-rolled validator chosen over ajv: ~80 lines, zero new deps, consistent with isSafeUrl/buildReviewDraft pattern; schema stays as draft-07 spec artifact only"
  - "HeroIcon components are forwardRef objects (typeof==='object'), not functions — test updated to accept either type"
  - "Icon validation is LENIENT: validator accepts any string icon value; resolveShortcutIcon() falls back to BoltIcon at render time"
  - "db.ts untouched: storing shortcutConfig under settings key is a data write, not a schema change; no Dexie version bump"
  - "useShortcutConfig has NO default value: undefined means Dexie opening OR no config saved; Phase 12 handles seeding"

patterns-established:
  - "Config types in src/config/ (types first → constants → functions; named exports only; // ─── Section ─── dividers)"
  - "JSON Schema in src/schemas/ as spec/doc artifact — not imported at runtime"
  - "Hand-rolled validator: typeof check → cast → field-by-field walk → path-indexed rejection"
  - "Migration entry point wraps validateShortcutConfig with version routing and commented seam"
  - "configRepository mirrors entriesRepository: plain object with get/put, no class, no default export"

requirements-completed: [CFG-01, CFG-02, CFG-03]

duration: 5min
completed: "2026-06-17"
---

# Phase 11 Plan 01: Config Model, Schema & Storage Summary

**ShortcutConfig types + 21-icon static allow-list + draft-07 JSON Schema spec + hand-rolled structural validator with migration seam + Dexie settings repository with reactive hook — 39 new tests, zero new dependencies**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-17T15:07:49Z
- **Completed:** 2026-06-17T15:12:13Z
- **Tasks:** 3 (each with TDD RED + GREEN commits)
- **Files modified:** 7 created, 0 modified

## Accomplishments

- ShortcutConfig / Layout / Shortcut TypeScript interfaces with `version: 1` literal type; full icon allow-list (21 entries) with static `SHORTCUT_ICON_MAP` and `resolveShortcutIcon()` fallback to `BoltIcon`
- `src/schemas/shortcut-config.v1.schema.json` — draft-07 JSON Schema spec artifact (not imported at runtime; `additionalProperties: false` on every object definition; `"const": 1` on version)
- Hand-rolled `validateShortcutConfig` (whole-or-reject, path-specific error messages, no parseDSL coupling) and `migrateConfig` with forward-compat rejection + empty migration chain seam exercised by tests
- `configRepository.get()` / `.put()` against existing Dexie `settings` store under key `'shortcutConfig'`; `useShortcutConfig()` via `useLiveQuery([], no-default)` with correct `undefined` loading state

## Task Commits

Each task was committed atomically via TDD (RED → GREEN):

1. **Task 1 RED: shortcutConfig tests** - `ca49a54` (test)
2. **Task 1 GREEN: shortcutConfig implementation + JSON Schema** - `f99db1d` (feat)
3. **Task 2 RED: configValidator tests** - `17adb75` (test)
4. **Task 2 GREEN: configValidator implementation** - `0a2c033` (feat)
5. **Task 3 RED: configRepository tests** - `8d8c6a0` (test)
6. **Task 3 GREEN: configRepository implementation** - `5286b88` (feat)

## Files Created/Modified

- `src/config/shortcutConfig.ts` — ShortcutConfig/Layout/Shortcut types, SHORTCUT_ICON_MAP (21 icons), DEFAULT_SHORTCUT_ICON, resolveShortcutIcon()
- `src/config/shortcutConfig.test.ts` — 9 tests covering icon resolution and map membership
- `src/schemas/shortcut-config.v1.schema.json` — draft-07 JSON Schema spec artifact
- `src/services/configValidator.ts` — validateShortcutConfig, migrateConfig, CURRENT_CONFIG_VERSION, ValidationResult
- `src/services/configValidator.test.ts` — 22 tests covering every rejection path and migration edge case
- `src/services/configRepository.ts` — configRepository.get/.put + useShortcutConfig hook
- `src/services/configRepository.test.tsx` — 8 tests covering round-trips, upsert, and reactive re-render

## Decisions Made

- **Hand-rolled validator over ajv**: ~80 lines, zero new dependencies, path-specific messages equal to AJV at this schema depth; consistent with `isSafeUrl`/`buildReviewDraft` project pattern. AJV would add ~28-35 KB gzip. JSON Schema ships as spec artifact only.
- **Lenient icon validation**: Validator accepts any string for `icon`; `resolveShortcutIcon()` falls back to `BoltIcon` at render time. Avoids breaking configs when the allow-list changes (RESEARCH Open Q2).
- **HeroIcons are forwardRef objects**: `typeof BanknotesIcon === 'object'` in `@heroicons/react` 2.2.0. Test updated to accept `'function' || 'object' (non-null)` — both are valid React components.
- **No db.ts modification**: Storing a new key in the existing `settings` EntityTable is a data write, not a schema change. No `version(3)` bump needed (RESEARCH Pitfall 2).
- **useShortcutConfig has no default**: `undefined` signals Dexie opening OR no config saved. Phase 12 is responsible for seeding defaults (RESEARCH Pitfall 3).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion corrected for HeroIcon forwardRef component type**
- **Found during:** Task 1 GREEN (icon map test)
- **Issue:** Test asserted `typeof value === 'function'` for SHORTCUT_ICON_MAP entries, but `@heroicons/react` 2.2.0 wraps icons in `React.forwardRef`, making `typeof` return `'object'`
- **Fix:** Updated test to accept `typeof value === 'function' || (typeof value === 'object' && value !== null)` — covers both plain function components and forwardRef objects
- **Files modified:** `src/config/shortcutConfig.test.ts`
- **Verification:** All 9 shortcutConfig tests pass; assertion is correct for both current and hypothetical future icon shapes
- **Committed in:** `f99db1d` (Task 1 GREEN commit, included with test update)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug in test assertion)
**Impact on plan:** Necessary correction for the actual HeroIcons API. No scope creep.

## Issues Encountered

None beyond the forwardRef type correction documented above.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The config types, validator, and repository are all in-process, local-only operations. Threat T-11-01 through T-11-05 mitigated as planned:
- T-11-01: Structural validator rejects malformed config wholesale before any `configRepository.put`
- T-11-02: Static `SHORTCUT_ICON_MAP` lookup; no dynamic `import()` path
- T-11-04: `migrateConfig` returns `{ ok: false }` on structural failure; no crash, no partial write
- T-11-05: `migrateConfig` rejects `version > 1` with clear "please update the app" message

## Next Phase Readiness

- Phase 12 (Dashboard Rendering): `useShortcutConfig()` hook ready to consume; `configRepository.put(DEFAULT_SHORTCUT_CONFIG)` pattern for seeding defaults
- Phase 13 (Tap-to-Capture): `ShortcutConfig` / `Shortcut` types ready; `dslTemplate` is an inert string until `parseDSL` is called
- Phase 14 (Import/Export): `migrateConfig()` is the validated entry point for imported JSON
- Phase 15 (Authoring): `configRepository.put()` is the write path for authoring saves

---
*Phase: 11-config-model-schema-storage*
*Completed: 2026-06-17*

---
title: Define JSON Schema + validation/versioning for the shortcut config
date: 2026-06-17
priority: medium
resolves_phase: 11
---

# Define JSON Schema + validation/versioning for the shortcut config

Design the **JSON Schema** for the Dashboard shortcut-layouts config (note
`dashboard-shortcut-layouts-design`), and decide how it's validated on import and versioned
for forward compatibility.

## Scope

- **Schema:** a versioned JSON Schema describing the config object:
  `{ version, layouts: [{ name, icon?, shortcuts: [{ name, icon?, dslTemplate, confirm }] }] }`.
  Constrain `dslTemplate` to a string (parsed/validated separately via `parseDSL`), `confirm`
  to boolean, names to non-empty strings.
- **Validator choice:** the codebase currently has **zero validation libraries** (validation
  is hand-rolled — `buildReviewDraft`, `isSafeUrl`). Decide between:
  - `ajv` (full JSON Schema validation; new runtime dep), vs
  - a small hand-rolled structural check that mirrors the schema (no dep, less rigorous).
  Recommendation lean: ship the JSON Schema as the source of truth + a hand-rolled check for
  v1 to avoid a dep, unless richer import error messages justify `ajv`.
- **Versioning / migration:** a `version` field + a migration path so an older exported
  config still imports into a newer app (forward-compat). Decide: reject-on-mismatch vs
  best-effort migrate.
- **Security:** imported `dslTemplate`s run only through `parseDSL` (no `eval`), and any
  `sourceUrl` produced still passes `isSafeUrl` at save — confirm no new injection surface.

## Why standalone

- Foundational for the shortcut-layouts feature; parser-independent and self-contained.
- The schema doubles as documentation for the shareable/hand-editable config format.

## Notes

- Config lives in the Dexie `settings` store (`src/services/db.ts`) — built in v0.1.0, unused.
- Import/export should mirror `src/services/exportEntries.ts` + `triggerDownload`.

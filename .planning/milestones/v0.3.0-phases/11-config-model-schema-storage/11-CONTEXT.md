# Phase 11: Config Model, Schema & Storage - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The shortcut config types are defined, backed by a versioned JSON Schema, and can be
persisted to and read reactively from the Dexie `settings` store. Requirements CFG-01..03.
Foundational — no UI in this phase.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user
setting. Use the ROADMAP phase goal, success criteria, the design note
(`.planning/notes/dashboard-shortcut-layouts-design.md`), the linked todo
(`.planning/todos/pending/shortcut-config-json-schema.md`), and codebase conventions to guide
decisions.

### Pre-settled direction (from design note + todo — honor these)
- Config shape: `{ version, layouts: [{ name, icon?, shortcuts: [{ name, icon?, dslTemplate, confirm }] }] }`.
- JSON Schema is the source of truth (NOT Zod — user dislikes Zod DX). The schema doubles as
  documentation for the shareable/hand-editable config format.
- Validator implementation choice is open: `ajv` (full JSON Schema validation, new runtime dep)
  vs a small hand-rolled structural check (no dep). The todo leans hand-rolled for v1 to avoid a
  dependency unless richer import error messages justify `ajv`. Decide during planning/research.
- Storage: the single config object lives in the existing Dexie `settings` key/value store
  (`src/services/db.ts`), which was built in v0.1.0 and is currently unused.
- Versioning: a `version` field + a forward-compat migration path so an older exported config
  still imports into a newer app. Decide reject-on-mismatch vs best-effort migrate.
- Security: imported `dslTemplate`s only ever run through `parseDSL` (no `eval`); any `sourceUrl`
  produced still passes `isSafeUrl` at save. No new injection surface.

</decisions>

<code_context>
## Existing Code Insights

- Dexie DB + `settings` store defined in `src/services/db.ts` (unused key/value store).
- Reactive reads use `useLiveQuery` (dexie-react-hooks), per project convention (not TanStack).
- Existing hand-rolled validation precedent: `buildReviewDraft`, `isSafeUrl` — no validation
  libs currently in the dependency tree.
- The v0.2.0 DSL pipeline (`parseDSL`, `POSITIONAL_SCHEMA`, empty-slot detection,
  `buildReviewDraft`) is reused by later phases; this phase only needs the config model + storage.
- Codebase context will be further gathered during plan-phase research.

</code_context>

<specifics>
## Specific Ideas

See "Pre-settled direction" above. The phase deliverable is: `ShortcutConfig`/`Layout`/`Shortcut`
TS types matching the JSON Schema exactly; a validator that rejects an invalid config wholesale
with a human-readable message before any write; a Dexie `settings` repository for read/write +
a reactive read hook; and a versioned migration seam exercised by tests.

</specifics>

<deferred>
## Deferred Ideas

- Dashboard rendering, layout switcher, tap-to-capture, import/export UI, and the authoring tool
  are later phases (12–15) — not this phase.

</deferred>

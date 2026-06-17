# Requirements — Life Log

Milestone **v0.2.0 — Quick-Capture DSL**. Continues from v0.1.0 (shipped; 35/35 reqs).
Design: `.planning/notes/quick-capture-dsl-design.md`. De-risked by spike `001-dsl-parser`
(VALIDATED, 24/24).

## v0.2.0 Requirements

### DSL — shorthand parser

- [x] **DSL-01**: User can capture an entry by typing a one-line shorthand
  `[type] slot1:slot2 ?k=v,k=v` that parses into that type's entry fields, via per-type
  positional schemas declared beside `ENTRY_FIELDS`.
- [x] **DSL-02**: User can omit the leading type token and have the type inferred from the
  current domain context (single-type domains); the parser resolves only exact type
  names/aliases — partial tokens (`p`, `e`, `boo`) return `ambiguous`, not a guess.
- [x] **DSL-03**: User can quote values so free text may contain delimiters
  (`:` / `,` / space); multi-value params (e.g. `tags`) must be quoted.
- [x] **DSL-04**: Malformed or ambiguous input is reported as a status (`ambiguous` /
  `error`) with a human-readable issue, never silently mis-saved.

### OMNI — quick-capture omnibar

- [x] **OMNI-01**: User can open a quick-capture omnibar, type a DSL string, and see a live
  parse preview (parsed type + field values + any issues) update as they type.
- [x] **OMNI-02**: On confirm, parsed input pre-fills the existing Review screen (via the
  same `buildReviewDraft` → `ReviewPage` path manual entry uses); the omnibar never
  directly saves.
- [x] **OMNI-03**: User sees type-token suggestions as they type (prefix → type menu),
  which disambiguate the single-letter collisions (`p` = podcast/place, `e` =
  event/expense).
- [x] **OMNI-04**: User sees history-backed value suggestions for category / merchant /
  tags drawn from their own prior entries.

### DATA — repository support

- [x] **DATA-01**: `entriesRepository` exposes a distinct-values lookup (frequency-ranked,
  optional prefix filter) over a metadata/tags field, backing OMNI-04.

### DOCS — documentation

- [x] **DOCS-01**: Project docs (README) document the DSL grammar with worked examples for
  every entry type.

## Traceability

| REQ | Phase |
|-----|-------|
| DSL-01..04 | Phase 7 — DSL Parser |
| DATA-01 | Phase 8 — Distinct-Values Lookup |
| OMNI-01..04 | Phase 9 — Quick-Capture Omnibar |
| DOCS-01 | Phase 10 — Docs & Examples |

## Future Requirements (deferred)

- Field/param-key suggestions after `?` (suggest available named params for the type)
- Content-based type inference (`lunch $12` → expense; pasted URL → movie)
- Currency-symbol / locale amount parsing (`$12.50`, `12,50`)

## Out of Scope

- All v0.1.0 Out-of-Scope exclusions carry forward (no backend/auth/OCR/etc. — see PROJECT.md)
- Replacing the existing URL-first or manual-entry capture paths — the DSL is an additional
  fast path, not a replacement.

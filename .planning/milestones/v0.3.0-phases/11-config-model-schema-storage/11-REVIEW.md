---
phase: 11-config-model-schema-storage
reviewed: 2026-06-17
depth: deep
files_reviewed: 8
findings:
  critical: 0
  high: 0
  warning: 3
  info: 4
  total: 7
status: findings
fixed:
  - WR-01 (icon allow-list comment clarified — lenient, not a constraint)
  - WR-02 (validateShortcutConfig version error uses JSON.stringify to disambiguate string vs number)
  - WR-03 (configRepository.get() JSDoc documents no read-time validation)
deferred:
  - IN-01 (validator vs JSON-Schema additionalProperties divergence — documented behavior, spec-only artifact)
  - IN-02/IN-03/IN-04 (cosmetic test/typing nits — no functional impact)
---

# Phase 11: Code Review Report

**Status:** findings (0 Critical, 0 High; 3 Warnings, 4 Info). No blocking issues.
High-value warnings (WR-01..03) were fixed in commit following the review; remaining Info
items deferred as cosmetic.

## Summary

Phase 11 delivers a clean, zero-dependency foundational layer. All tests pass, `pnpm tsc -b`
clean, `db.ts` untouched, no `eval`/dynamic-import/`ajv`/`zod`, `useLiveQuery` called with `[]`
deps and no default. Threat-model controls all confirmed.

## Warnings (all FIXED)

### WR-01 — Contradictory comment in icon allow-list (`src/config/shortcutConfig.ts`)
Comment claimed "only keys in this map can be stored" but validator is intentionally lenient.
Fixed: comment rewritten to describe lenient intent + fallback.

### WR-02 — Ambiguous version error (`src/services/configValidator.ts`)
`Unsupported config version: 1. Expected 1.` when given string `'1'`. Fixed with
`JSON.stringify` so strings render quoted (`"1"`) vs numbers unquoted (`2`).

### WR-03 — Unchecked cast in `configRepository.get()` (`src/services/configRepository.ts`)
`row?.value as ShortcutConfig` has no read-time validation. Fixed with JSDoc documenting the
trust boundary (writes must validate before put); stronger read-time validation deferred to
Phase 14 to keep the repository data-only.

## Info (deferred — cosmetic)

- **IN-01** JSON Schema declares `additionalProperties: false` but the hand-rolled validator
  is lenient on unknown fields. Spec-only artifact; no runtime divergence. Documented behavior.
- **IN-02** Redundant `layouts: []` override in a test fixture.
- **IN-03** `HeroIcon` type alias is file-private (minor ergonomic friction downstream).
- **IN-04** `Layout`/`Shortcut` types imported by plan but not used as named casts in validator.

## Security Assessment — PASS

| Threat | Control | Status |
|--------|---------|--------|
| T-11-01 Config eval | no `eval`/`new Function` | Confirmed |
| T-11-02 Dynamic icon import | static `SHORTCUT_ICON_MAP` only | Confirmed |
| T-11-03 XSS via strings | no `dangerouslySetInnerHTML`; inert strings | Confirmed |
| T-11-04 Malformed JSON | `migrateConfig` rejects all structural failures | Confirmed |
| T-11-05 Future-version config | `version > CURRENT` rejected with update message | Confirmed |

`db.ts` unchanged — no Dexie version bump.

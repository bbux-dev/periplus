# Phase 11: Config Model, Schema & Storage — Research

**Researched:** 2026-06-17
**Domain:** TypeScript type design, JSON Schema spec, hand-rolled validation, Dexie key/value
storage, Heroicons allow-list pattern
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Config shape: `{ version, layouts: [{ name, icon?, shortcuts: [{ name, icon?, dslTemplate, confirm }] }] }`.
- JSON Schema is the source of truth (NOT Zod). The schema doubles as documentation for the shareable/hand-editable config format.
- Storage: the single config object lives in the existing Dexie `settings` key/value store (`src/services/db.ts`), which is currently unused.
- Versioning: a `version` field + a forward-compat migration path so an older exported config still imports into a newer app.
- Security: imported `dslTemplate`s only ever run through `parseDSL` (no `eval`); any `sourceUrl` produced still passes `isSafeUrl` at save.

### Claude's Discretion
All remaining implementation choices (validator approach, file layout, icon allow-list shape,
versioning strategy details) are at Claude's discretion.

### Deferred Ideas (OUT OF SCOPE)
Dashboard rendering, layout switcher, tap-to-capture, import/export UI, and the authoring
tool (Phases 12–15). The `version` field for v1 is integer `1`; string-keyed versioning is
not under consideration.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CFG-01 | Config shape persisted in Dexie `settings` store and read reactively | Dexie settings store (already in v2 schema), `useLiveQuery` pattern from entriesRepository |
| CFG-02 | Versioned JSON Schema is source of truth; configs validated whole-or-reject with human-readable reason | Hand-rolled validator recommendation, JSON Schema spec doc, ValidationResult type |
| CFG-03 | `version` field + forward-compat migration so older export loads in newer app | Reject-if-newer / migrate-if-older strategy, migration chain seam |
</phase_requirements>

---

## Summary

Phase 11 is purely foundational: define the TypeScript types, write a JSON Schema spec
document (the human-readable source of truth), implement a hand-rolled structural validator
with a forward-compat migration seam, and wire up read/write against the already-existing
Dexie `settings` store. No new runtime libraries are needed — everything the phase requires
is already in the dependency tree. No Dexie schema version bump is required either; the
`settings` key/value store went live in v0.1.0 Phase 2 and accepts arbitrary values under
arbitrary string keys.

The central decision — `ajv` vs. hand-rolled validator — is resolved clearly in favour of
hand-rolled. The schema is a stable, shallow, six-field structure for v1; AJV v8 would add
an estimated 28–35 KB gzip to the current 128 KB gzip bundle (~22–27% increase) for a tool
whose runtime is `new Function()`-based (a future CSP risk). A hand-rolled structural check
for this shape is approximately 70–90 lines, produces equally clear path-specific error
messages, and is consistent with the project's existing validation style (`isSafeUrl`,
`buildReviewDraft`). Reconsider AJV only if Phase 14 import error messages demand richer
schema-driven diagnostics or if the config schema grows to three or more distinct versions.

The JSON Schema document still ships as a spec artifact (`src/schemas/shortcut-config.v1.schema.json`).
It is not imported at runtime; it is the reference from which the hand-rolled validator is derived
and against which it can be diff-checked during future schema evolution.

**Primary recommendation:** Ship zero new runtime dependencies. Hand-roll the validator (~80
lines), use the JSON Schema document as authoritative spec, store the config under the fixed
key `'shortcutConfig'` in the existing `settings` store, and implement a migration-chain seam
that rejects configs newer than the app supports.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Config types (TS interfaces) | Config layer (`src/config/`) | — | Reused by all tiers; co-locate with ICON_MAP |
| JSON Schema spec document | Source artifact (`src/schemas/`) | — | Spec/doc only; not imported at runtime |
| Structural validation + migration | Service layer (`src/services/`) | — | Pure functions, no React dependency |
| Dexie read/write + reactive hook | Service layer (`src/services/`) | — | Mirrors `entriesRepository` pattern exactly |
| Icon allow-list map | Config layer (`src/config/`) | Service (via resolveIcon) | Static import from @heroicons/react; used by Dashboard (Phase 12) |

---

## Standard Stack

### Core (already installed — no new installs)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `dexie` | 4.4.3 | Key/value `settings` store persistence | [VERIFIED: package.json] |
| `dexie-react-hooks` | 4.4.0 | `useLiveQuery` reactive reads | [VERIFIED: package.json] |
| `@heroicons/react` | 2.2.0 | Static icon components for SHORTCUT_ICON_MAP | [VERIFIED: package.json] |

### Supporting (dev — already installed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `fake-indexeddb` | 6.2.5 | Auto-hoisted in `test-setup.ts` via `import 'fake-indexeddb/auto'` | [VERIFIED: package.json] |
| `vitest` | 4.1.9 | Unit tests for validator + repository | [VERIFIED: package.json] |

**No new packages are required for this phase.** The hand-rolled validator decision is why.

### Package Legitimacy Audit

> No new runtime or dev packages are installed in this phase. All libraries above are already
> in `package.json` at verified versions. Legitimacy audit is N/A.

| Package | Disposition |
|---------|-------------|
| (none new) | — |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled validator | `ajv` 8.x | AJV adds ~28–35 KB gzip (est.) to current 128 KB bundle; uses `new Function()` internally; setup requires a compile-step for standalone mode; error quality is equal for a schema this shallow. Reconsider in Phase 14 if import UX demands it. [ASSUMED — AJV bundle estimate from dist file analysis: core.js gzip ~6.5 KB; full runtime with codegen ~28–35 KB] |
| Hand-rolled validator | `zod` | Explicitly rejected by user (Zod DX disliked, per REQUIREMENTS.md + CONTEXT.md) |
| JSON Schema doc | TypeScript types only | Schema doubles as documentation + import spec; worth the extra file |

---

## Architecture Patterns

### System Architecture Diagram

```
[JSON.parse(rawString)]
         │
         ▼
[migrateConfig(raw)]        ← checks version field; rejects if version > CURRENT_VERSION;
         │                     applies migration chain if version < CURRENT_VERSION (v1: identity)
         │ { ok: true, config }
         ▼
[validateShortcutConfig(config)]  ← structural check: shape, required fields, types
         │                           returns ValidationResult = { ok: true, config } | { ok: false, reason }
         │ ok
         ▼
[configRepository.put(config)]    ← db.settings.put({ key: 'shortcutConfig', value: config })
         │
         ▼
[Dexie settings store]            ← IndexedDB, key='shortcutConfig'
         │
    [useLiveQuery]
         │
         ▼
[useShortcutConfig()]             ← reactive read, returns ShortcutConfig | undefined
         │
         ▼
[Phase 12+ components]            ← read config, resolve icons via resolveShortcutIcon(key)
```

### Recommended Project Structure

```
src/
  config/
    shortcutConfig.ts       # ShortcutConfig / Layout / Shortcut types; SHORTCUT_ICON_MAP; resolveShortcutIcon()
    shortcutConfig.test.ts  # ICON_MAP coverage: known keys → component; unknown key → fallback; undefined → fallback
  schemas/
    shortcut-config.v1.schema.json  # JSON Schema draft-07 — source-of-truth spec document (not imported at runtime)
  services/
    configValidator.ts      # validateShortcutConfig(); migrateConfig(); ValidationResult type; CURRENT_CONFIG_VERSION
    configValidator.test.ts # full matrix: valid config; each rejection path; version edge cases
    configRepository.ts     # configRepository.get() / .put(); useShortcutConfig() hook
    configRepository.test.tsx # Dexie round-trips (fake-indexeddb); reactive hook with act() + findByText
```

### Pattern 1: TypeScript Config Types (CFG-01)

**What:** Interfaces that mirror the JSON Schema exactly, plus a literal-type `version` field.
**When to use:** All type-safe usages of the config object.

```typescript
// Source: derived from REQUIREMENTS.md CFG-01 + CONTEXT.md config shape
// src/config/shortcutConfig.ts

import type { ComponentType, SVGProps } from 'react'
import {
  BanknotesIcon, FilmIcon, TvIcon, BookOpenIcon, MicrophoneIcon,
  MapPinIcon, CalendarDaysIcon, BoltIcon, QueueListIcon,
  HomeIcon, BriefcaseIcon, GlobeAltIcon, ShoppingBagIcon,
  ShoppingCartIcon, HeartIcon, StarIcon, AcademicCapIcon,
  TicketIcon, TruckIcon, TagIcon, BeakerIcon,
} from '@heroicons/react/24/outline'

type HeroIcon = ComponentType<SVGProps<SVGSVGElement> & { title?: string }>

// ─── Config types ────────────────────────────────────────────────────────────

export interface Shortcut {
  name: string        // non-empty; display label
  icon?: string       // key into SHORTCUT_ICON_MAP; undefined → fallback icon
  dslTemplate: string // non-empty; passed to parseDSL at capture time (never eval'd here)
  confirm: boolean    // false = one-tap direct save; true = route through ReviewPage
}

export interface Layout {
  name: string        // non-empty; display label for layout chip
  icon?: string       // key into SHORTCUT_ICON_MAP; optional
  shortcuts: Shortcut[]
}

export interface ShortcutConfig {
  version: 1          // literal type — only valid value is 1
  layouts: Layout[]
}

// ─── Icon allow-list ─────────────────────────────────────────────────────────
//
// ONLY keys in this map can be stored as `icon` values in the config.
// All keys match exact heroicons/24/outline export names (with "Icon" suffix).
// Unknown keys passed to resolveShortcutIcon() silently fall back to DefaultShortcutIcon.
// Extending this map does NOT require a config version bump (additive change).

export const DEFAULT_SHORTCUT_ICON = BoltIcon

export const SHORTCUT_ICON_MAP: Record<string, HeroIcon> = {
  BanknotesIcon,
  FilmIcon,
  TvIcon,
  BookOpenIcon,
  MicrophoneIcon,
  MapPinIcon,
  CalendarDaysIcon,
  BoltIcon,
  QueueListIcon,
  HomeIcon,
  BriefcaseIcon,
  GlobeAltIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  HeartIcon,
  StarIcon,
  AcademicCapIcon,
  TicketIcon,
  TruckIcon,
  TagIcon,
  BeakerIcon,
}

/** Resolve an icon string key to a HeroIcon component.
 *  Unknown keys and undefined → DEFAULT_SHORTCUT_ICON. Never throws. */
export function resolveShortcutIcon(key: string | undefined): HeroIcon {
  if (!key) return DEFAULT_SHORTCUT_ICON
  return SHORTCUT_ICON_MAP[key] ?? DEFAULT_SHORTCUT_ICON
}
```

[VERIFIED: all icons listed above confirmed present in `/node_modules/@heroicons/react/24/outline/`]

### Pattern 2: Hand-Rolled Validator + Migration Chain (CFG-02, CFG-03)

**What:** A pure `validateShortcutConfig()` that returns a discriminated union result; a
`migrateConfig()` wrapper that handles version routing. No runtime imports beyond TypeScript types.

```typescript
// Source: derived from CFG-02/CFG-03 requirements + exportEntries.ts pure-function pattern
// src/services/configValidator.ts

import type { ShortcutConfig, Layout, Shortcut } from '../config/shortcutConfig'

export type ValidationResult =
  | { ok: true;  config: ShortcutConfig }
  | { ok: false; reason: string }

/** The highest config version this build of the app can load. */
export const CURRENT_CONFIG_VERSION = 1

// ─── Structural validator ─────────────────────────────────────────────────────

export function validateShortcutConfig(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: 'Config must be a JSON object.' }
  }
  const obj = raw as Record<string, unknown>

  if (obj['version'] !== 1) {
    return { ok: false, reason: `Unsupported config version: ${obj['version']}. Expected 1.` }
  }
  if (!Array.isArray(obj['layouts'])) {
    return { ok: false, reason: '"layouts" must be an array.' }
  }

  for (let li = 0; li < (obj['layouts'] as unknown[]).length; li++) {
    const layout = (obj['layouts'] as unknown[])[li]
    if (typeof layout !== 'object' || layout === null || Array.isArray(layout)) {
      return { ok: false, reason: `layouts[${li}] must be an object.` }
    }
    const l = layout as Record<string, unknown>
    if (typeof l['name'] !== 'string' || l['name'].trim() === '') {
      return { ok: false, reason: `layouts[${li}].name must be a non-empty string.` }
    }
    if (l['icon'] !== undefined && typeof l['icon'] !== 'string') {
      return { ok: false, reason: `layouts[${li}].icon must be a string when present.` }
    }
    if (!Array.isArray(l['shortcuts'])) {
      return { ok: false, reason: `layouts[${li}].shortcuts must be an array.` }
    }
    for (let si = 0; si < (l['shortcuts'] as unknown[]).length; si++) {
      const sc = (l['shortcuts'] as unknown[])[si]
      if (typeof sc !== 'object' || sc === null || Array.isArray(sc)) {
        return { ok: false, reason: `layouts[${li}].shortcuts[${si}] must be an object.` }
      }
      const s = sc as Record<string, unknown>
      if (typeof s['name'] !== 'string' || s['name'].trim() === '') {
        return { ok: false, reason: `layouts[${li}].shortcuts[${si}].name must be a non-empty string.` }
      }
      if (s['icon'] !== undefined && typeof s['icon'] !== 'string') {
        return { ok: false, reason: `layouts[${li}].shortcuts[${si}].icon must be a string when present.` }
      }
      if (typeof s['dslTemplate'] !== 'string' || s['dslTemplate'].trim() === '') {
        return { ok: false, reason: `layouts[${li}].shortcuts[${si}].dslTemplate must be a non-empty string.` }
      }
      if (typeof s['confirm'] !== 'boolean') {
        return { ok: false, reason: `layouts[${li}].shortcuts[${si}].confirm must be a boolean.` }
      }
    }
  }
  return { ok: true, config: raw as ShortcutConfig }
}

// ─── Migration entry point (CFG-03) ──────────────────────────────────────────
//
// Strategy: reject if version > CURRENT_CONFIG_VERSION (app is too old);
//           migrate up if version < CURRENT_CONFIG_VERSION (chain of step functions).
// For v1: no prior versions exist, so the chain is empty after the guards.
// Adding v2: append `if (version === 1) { raw = migrateV1ToV2(raw) }` before validation.

export function migrateConfig(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: 'Config must be a JSON object.' }
  }
  const obj = raw as Record<string, unknown>
  const version = obj['version']

  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return { ok: false, reason: '"version" must be an integer.' }
  }
  if (version > CURRENT_CONFIG_VERSION) {
    return {
      ok: false,
      reason: `Config version ${version} requires a newer version of Life Log (this app supports up to version ${CURRENT_CONFIG_VERSION}). Please update the app.`,
    }
  }

  // Migration chain — add steps here as schema evolves:
  // if (version === 1) { raw = migrateV1ToV2(raw as V1Config); }

  return validateShortcutConfig(raw)
}
```

[ASSUMED — code sketch based on project patterns and requirements; planner should adjust to match
TypeScript strictness settings before finalising]

### Pattern 3: Dexie Repository + Reactive Hook (CFG-01)

**What:** A `configRepository` object (mirrors `entriesRepository`) and a `useShortcutConfig`
hook (mirrors `useEntries`). No Dexie schema version bump — settings store already exists in v2.

```typescript
// Source: entriesRepository.ts pattern + db.ts settings store
// src/services/configRepository.ts

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { ShortcutConfig } from '../config/shortcutConfig'

/** Fixed key under which the config is stored in the Dexie settings table. */
const CONFIG_KEY = 'shortcutConfig'

export const configRepository = {
  /** Returns the stored config, or undefined if none has been saved yet. */
  async get(): Promise<ShortcutConfig | undefined> {
    const row = await db.settings.get(CONFIG_KEY)
    return row?.value as ShortcutConfig | undefined
  },

  /** Replaces (upserts) the entire config atomically. */
  async put(config: ShortcutConfig): Promise<void> {
    await db.settings.put({ key: CONFIG_KEY, value: config })
  },
}

/**
 * Reactive hook: returns the ShortcutConfig from Dexie, or undefined while
 * Dexie is opening or no config has been saved yet.
 *
 * Callers treat undefined as "no config yet" (show a loading / empty state).
 * Phase 12 (Dashboard seeding) writes a default config on first render if
 * useShortcutConfig() returns undefined after Dexie has opened.
 */
export function useShortcutConfig(): ShortcutConfig | undefined {
  return useLiveQuery(
    () => configRepository.get(),
    [],
    // No default: undefined = Dexie opening or no config saved
  )
}
```

[VERIFIED: `db.settings` typed as `EntityTable<Setting, 'key'>` in db.ts v2 schema; `Setting.value` is `unknown`; `useLiveQuery` pattern from entriesRepository.ts]

### Pattern 4: JSON Schema Spec Document (CFG-02 source of truth)

**What:** A JSON Schema draft-07 document that lives at `src/schemas/shortcut-config.v1.schema.json`.
NOT imported at runtime. Used as authoritative spec for the hand-rolled validator, editor
tooling, and future AJV adoption path.

```jsonc
// src/schemas/shortcut-config.v1.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "shortcut-config.v1.schema.json",
  "title": "ShortcutConfig v1",
  "description": "Portable shortcut layout config for Life Log. Shareable/hand-editable.",
  "type": "object",
  "required": ["version", "layouts"],
  "additionalProperties": false,
  "properties": {
    "version": {
      "type": "integer",
      "const": 1,
      "description": "Schema version. Increment when the structure changes incompatibly."
    },
    "layouts": {
      "type": "array",
      "items": { "$ref": "#/$defs/Layout" }
    }
  },
  "$defs": {
    "Layout": {
      "type": "object",
      "required": ["name", "shortcuts"],
      "additionalProperties": false,
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "icon": { "type": "string", "description": "Key in SHORTCUT_ICON_MAP (e.g. 'BanknotesIcon')" },
        "shortcuts": { "type": "array", "items": { "$ref": "#/$defs/Shortcut" } }
      }
    },
    "Shortcut": {
      "type": "object",
      "required": ["name", "dslTemplate", "confirm"],
      "additionalProperties": false,
      "properties": {
        "name":        { "type": "string", "minLength": 1 },
        "icon":        { "type": "string", "description": "Key in SHORTCUT_ICON_MAP" },
        "dslTemplate": { "type": "string", "minLength": 1, "description": "DSL line template; empty slots are holes" },
        "confirm":     { "type": "boolean", "description": "false = one-tap save; true = route through ReviewPage" }
      }
    }
  }
}
```

[ASSUMED — spec sketch; planner should treat as the definitive shape for the file]

### Anti-Patterns to Avoid

- **Dynamic icon import by string name:** Do not do `import('@heroicons/react/24/outline')[iconName]` or any equivalent. This breaks tree-shaking, creates a dynamic code path in the module graph, and could import arbitrary modules from the package. Use the static `SHORTCUT_ICON_MAP` lookup only.

- **Partial-apply on invalid config:** If `validateShortcutConfig` returns `{ ok: false }`, reject the entire object. Do not attempt to extract valid sub-fields from an invalid config. CFG-02 requires whole-or-reject.

- **Defaulting `useShortcutConfig()` to `[]` or empty config:** A `useLiveQuery` with no default value correctly returns `undefined` during DB open. Phase 12 will handle seeding defaults; Phase 11 must not paper over the `undefined` state.

- **Dexie version bump for this phase:** The `settings` store already exists in version 2. Adding a new `key` within it is NOT a schema change. Never bump the version for a new key — that would force a destructive migration over an existing index.

- **Treating `dslTemplate` as trusted at import time:** The config stores DSL strings. They are inert strings until `parseDSL` is called at capture time. Do not call `parseDSL` in the validator — that is Phase 13's responsibility.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reactive Dexie reads | Custom subscription / polling | `useLiveQuery` (dexie-react-hooks) | Already used everywhere in the project; handles Dexie open/close lifecycle |
| Icon component lookup | `import()` with computed string | Static `SHORTCUT_ICON_MAP` object | Tree-shaking, bundle size, safety |
| IndexedDB upsert | Manual get + put sequence | `db.settings.put()` | Dexie `.put()` is already an atomic upsert |
| Config version increment | Any runtime mutation of `version` | Migration chain in `migrateConfig` | The migration chain transforms the stored object; `version` in the DB should reflect actual stored version |

**Key insight:** This phase does NOT need a single new npm package. Resistance to adding
dependencies is the main reason the hand-rolled validator wins.

---

## Common Pitfalls

### Pitfall 1: Calling parseDSL in the Config Validator

**What goes wrong:** Someone validates `dslTemplate` via `parseDSL` inside `validateShortcutConfig`, which couples the config layer to the DSL parser and adds side effects to what should be a pure structural check.

**Why it happens:** Wanting to "validate everything at import time."

**How to avoid:** `validateShortcutConfig` checks only that `dslTemplate` is a non-empty string. DSL correctness is verified at authoring time (Phase 15 / EDIT-04) and silently surfaced at capture time (Phase 13). The config validator is structural only.

**Warning signs:** Any import of `parseDSL` or `POSITIONAL_SCHEMA` in `configValidator.ts`.

### Pitfall 2: Dexie Schema Version Bump for New Settings Key

**What goes wrong:** Adding a `this.version(3).stores({ settings: 'key, ...' })` block because the settings store feels like it needs updating, which triggers IndexedDB migration for all users.

**Why it happens:** Confusing "adding a new row" with "changing the schema."

**How to avoid:** The `settings` store uses a generic `{ key: string; value: unknown }` shape. Writing `{ key: 'shortcutConfig', value: config }` is a data write, not a schema change. No version bump needed.

**Warning signs:** Any change to `src/services/db.ts` in this phase. The file should not be touched unless a genuine schema change is required (it is not).

### Pitfall 3: Assuming `useShortcutConfig()` Returns Defined

**What goes wrong:** Phase 12+ components skip the `undefined` guard and try to map over `config.layouts` while Dexie is still opening.

**Why it happens:** The `undefined` state is easy to forget when there's usually a config.

**How to avoid:** `useShortcutConfig()` returns `ShortcutConfig | undefined` (no default). Document this prominently. Phase 12 must handle both `undefined` (loading) and a config with an empty `layouts` array (no seeding yet).

**Warning signs:** `useShortcutConfig()!.layouts` or `useShortcutConfig() ?? { version: 1, layouts: [] }` in Phase 12+ code.

### Pitfall 4: Icon String Keys Not Matching SHORTCUT_ICON_MAP

**What goes wrong:** A default config seeded in Phase 12 uses `"banknotesIcon"` (lowercase) when the map key is `"BanknotesIcon"` — icon silently falls back to the default.

**Why it happens:** Case sensitivity in object key lookup.

**How to avoid:** Document the convention (keys match the heroicons export name verbatim, PascalCase with "Icon" suffix). Validate with a test: known keys return the expected component, not the fallback.

### Pitfall 5: Migration Chain Breaks on Unexpected Types

**What goes wrong:** `migrateConfig` receives `version: "1"` (a JSON string instead of integer) and the version equality check `=== 1` fails, routing to the "newer than supported" rejection.

**Why it happens:** Poorly hand-edited config files may stringify the version field.

**How to avoid:** The version check already guards on `typeof version !== 'number' || !Number.isInteger(version)` before the numeric comparisons. Test this case explicitly.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | N/A (local-only, no accounts) |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | **yes** | hand-rolled structural validator; whole-or-reject before any write |
| V6 Cryptography | no | N/A |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious `dslTemplate` string | Tampering | `parseDSL` does not eval; it is a pure parser that maps to `values: Record<string, string>`. The string itself is stored as inert data. No injection surface here. [VERIFIED: parser.ts — no `eval`, `new Function`, or DOM write] |
| Crafted `icon` string injecting arbitrary module | Tampering | Static `SHORTCUT_ICON_MAP` lookup; unknown keys return `DEFAULT_SHORTCUT_ICON`. No dynamic import path exists. [VERIFIED: resolveShortcutIcon pattern above] |
| Crafted `name`/`dslTemplate` string injecting XSS | Spoofing | Names are rendered via React JSX (string interpolation), not `dangerouslySetInnerHTML`. No XSS surface. [VERIFIED: DashboardPage.tsx, navigation.ts patterns] |
| Corrupt/oversized JSON crashing the app | DoS | `JSON.parse()` throws on malformed JSON; `migrateConfig` returns `{ ok: false }` on structural failures. Callers must handle the error branch before writing to Dexie. |
| `sourceUrl` XSS from DSL pipeline | Spoofing | `sourceUrl` is not stored in the config; it is only produced by `buildReviewDraft` and gated by `isSafeUrl` at save time (Phase 13 / CAP). Config layer never touches `sourceUrl`. [VERIFIED: urlUtils.ts] |

**New injection surface introduced by Phase 11:** None. The config is locally authored or imported from a file the user selects. All imported strings pass through the structural validator before Dexie write. At capture time, `dslTemplate` is parsed by `parseDSL` (no eval). Icon strings are mapped through a static allow-list.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 |
| Config file | `vite.config.ts` (test section; environment: jsdom) |
| Setup file | `src/test-setup.ts` (`fake-indexeddb/auto` — auto-hoisted; all Dexie tests work without extra setup) |
| Quick run | `pnpm exec vitest run src/config/shortcutConfig.test.ts src/services/configValidator.test.ts src/services/configRepository.test.tsx` |
| Full suite | `pnpm exec vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CFG-01 | `configRepository.get()` returns undefined before any write | unit | `pnpm exec vitest run src/services/configRepository.test.tsx` | ❌ Wave 0 |
| CFG-01 | `configRepository.put(config)` stores config; `.get()` returns it typed | unit | same | ❌ Wave 0 |
| CFG-01 | `useShortcutConfig()` re-renders on Dexie change (reactive) | unit (RTL + act) | same | ❌ Wave 0 |
| CFG-02 | `validateShortcutConfig` accepts a minimal valid v1 config | unit | `pnpm exec vitest run src/services/configValidator.test.ts` | ❌ Wave 0 |
| CFG-02 | Rejects non-object | unit | same | ❌ Wave 0 |
| CFG-02 | Rejects missing/wrong `version` | unit | same | ❌ Wave 0 |
| CFG-02 | Rejects missing `layouts` array | unit | same | ❌ Wave 0 |
| CFG-02 | Rejects layout with empty `name` | unit | same | ❌ Wave 0 |
| CFG-02 | Rejects shortcut with empty `dslTemplate` | unit | same | ❌ Wave 0 |
| CFG-02 | Rejects shortcut with non-boolean `confirm` | unit | same | ❌ Wave 0 |
| CFG-02 | Returns `{ ok: false, reason: string }` with path-specific message | unit | same | ❌ Wave 0 |
| CFG-03 | `migrateConfig` accepts version 1 → calls validateShortcutConfig | unit | same | ❌ Wave 0 |
| CFG-03 | `migrateConfig` rejects version > 1 with clear "update your app" message | unit | same | ❌ Wave 0 |
| CFG-03 | `migrateConfig` rejects non-integer version field | unit | same | ❌ Wave 0 |
| ICON   | `resolveShortcutIcon('BanknotesIcon')` returns `BanknotesIcon` component | unit | `pnpm exec vitest run src/config/shortcutConfig.test.ts` | ❌ Wave 0 |
| ICON   | `resolveShortcutIcon('UnknownIcon')` returns `DEFAULT_SHORTCUT_ICON` | unit | same | ❌ Wave 0 |
| ICON   | `resolveShortcutIcon(undefined)` returns `DEFAULT_SHORTCUT_ICON` | unit | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm exec vitest run src/services/configValidator.test.ts`
- **Per wave merge:** `pnpm exec vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

All three test files are new and must be created before implementation:

- [ ] `src/config/shortcutConfig.test.ts` — covers ICON resolution (REQ ICON)
- [ ] `src/services/configValidator.test.ts` — covers CFG-02, CFG-03 validation matrix
- [ ] `src/services/configRepository.test.tsx` — covers CFG-01 (Dexie round-trips + reactive hook)

No framework gaps — `fake-indexeddb/auto`, Vitest, and RTL are all installed and configured.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| AJV v4–v6 (sync `validate()`) | AJV v8 (async, code-gen, `new Function()`) | v8 has CSP implications; not adopted here |
| Zod for config validation | Explicitly rejected (user preference) | Hand-rolled is the chosen approach |
| Dexie 3.x — `table()` style | Dexie 4.x — `EntityTable<T, Key>` generics | Already used in db.ts; no migration needed |

**Deprecated / outdated:**
- `dexie-react-hooks` < 4.x: older versions have different `useLiveQuery` API. Project uses 4.4.0 — use as-is.
- JSON Schema draft-04 `$schema` URI: prefer draft-07 for `const`, `examples`, `$defs` support.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `pnpm` | Build / test runner | ✓ | 11.1.2 | — |
| `vitest` | Unit tests | ✓ | 4.1.9 | — |
| `fake-indexeddb` | Dexie tests in jsdom | ✓ | 6.2.5 | — |
| `dexie` | Config storage | ✓ | 4.4.3 | — |
| `@heroicons/react` | ICON_MAP | ✓ | 2.2.0 | — |

**Missing dependencies with no fallback:** None.

All tooling is present. No installs required before implementation.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | AJV v8 full runtime bundle is ~28–35 KB gzip (est.) when included via Vite | Alternatives Considered | If AJV is smaller, the bundle cost argument weakens — but the `new Function()` CSP risk and zero-dep project pattern still favour hand-rolled |
| A2 | Code sketch for `validateShortcutConfig` / `migrateConfig` is correct TypeScript under project's `strict` tsconfig | Pattern 2 | Planner must verify against tsconfig.json strict settings before finalising |
| A3 | The icon string keys in `SHORTCUT_ICON_MAP` (e.g. `'BanknotesIcon'`) are the correct convention for human-readable config | Pattern 1 | If the user prefers `'banknotes'` or kebab-case keys, the map and JSON Schema enum must be updated |

---

## Open Questions

1. **Seeding a default config**
   - What we know: Phase 12 (DASH-03) seeds default layouts (DayToDay / Travel / WorkTrip).
   - What's unclear: Should `configRepository.ts` expose a `seedDefault()` helper, or should Phase 12 call `configRepository.put(DEFAULT_CONFIG)` directly with its own constant?
   - Recommendation: Keep `configRepository.ts` free of business logic (data-only). Define `DEFAULT_SHORTCUT_CONFIG` in Phase 12's seeding code; call `configRepository.put()`.

2. **`icon` validation against SHORTCUT_ICON_MAP at import time**
   - What we know: CFG-02 requires rejection with a human-readable reason on invalid config.
   - What's unclear: Should the validator reject an unknown `icon` string (e.g. `'UnknownIcon'`), or silently accept it (the resolver falls back gracefully)?
   - Recommendation: Accept unknown icon strings in the validator (structural check only — is it a string?). `resolveShortcutIcon` handles the fallback gracefully at render time. This avoids breaking configs when new icons are added or removed from the app's allow-list.

---

## Sources

### Primary (HIGH confidence)
- `src/services/db.ts` — `settings` store typed as `EntityTable<Setting, 'key'>` in version(2); no bump needed [VERIFIED: codebase read]
- `src/services/entriesRepository.ts` — repository + `useLiveQuery` hook pattern; file extension convention for JSX hooks tests (.tsx) [VERIFIED: codebase read]
- `src/services/exportEntries.ts` — pure-function / side-effectful shim split; `ValidationResult` discriminated union pattern [VERIFIED: codebase read]
- `src/test-setup.ts` — `fake-indexeddb/auto` global setup confirms repository tests need no extra config [VERIFIED: codebase read]
- `package.json` — all required library versions confirmed [VERIFIED: codebase read]
- `node_modules/@heroicons/react/24/outline/` — all icons listed in SHORTCUT_ICON_MAP confirmed present [VERIFIED: filesystem check]

### Secondary (MEDIUM confidence)
- npm registry `ajv@8.20.0` metadata — confirmed version, creation date 2015, GitHub repo [VERIFIED: npm view]
- AJV dist file sizes — `core.js` gzip ~6.5 KB; all dist JS gzip ~55 KB (upper bound); realistic runtime estimate ~28–35 KB [ASSUMED: estimated from dist analysis, not a real Vite build measurement]

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| No new packages needed | HIGH | Verified against package.json and codebase patterns |
| No Dexie version bump needed | HIGH | Verified: settings store exists in v2, generic key/value shape |
| Hand-rolled validator recommendation | HIGH | Bundle estimate is ASSUMED but the project-pattern argument alone is decisive |
| Icon allow-list icons | HIGH | All icon names verified in installed @heroicons/react/24/outline/ |
| Validator code sketch correctness | MEDIUM | Reviewed against TypeScript patterns in project; not compiled/run |
| AJV bundle size | LOW | Estimated from dist analysis, not a real Vite build measurement |

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (stable libraries; Dexie API unlikely to change in 30 days)

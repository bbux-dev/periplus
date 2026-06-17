import type { ShortcutConfig } from '../config/shortcutConfig'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true;  config: ShortcutConfig }
  | { ok: false; reason: string }

/** The highest config version this build of the app can load. */
export const CURRENT_CONFIG_VERSION = 1

// ─── Structural validator ─────────────────────────────────────────────────────

/**
 * Validates a raw (unknown) value as a ShortcutConfig.
 *
 * Returns { ok: true, config } on success or { ok: false, reason } on the first
 * structural failure. Rejection is WHOLESALE — never partial-apply (CFG-02).
 *
 * Icon values are LENIENT: any string is accepted. resolveShortcutIcon()
 * falls back to the default icon at render time (RESEARCH Open Q2).
 *
 * Does NOT call parseDSL — dslTemplate is checked only as a non-empty string.
 * DSL correctness is Phase 13/15 (RESEARCH Pitfall 1).
 */
export function validateShortcutConfig(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: 'Config must be a JSON object.' }
  }
  const obj = raw as Record<string, unknown>

  if (obj['version'] !== 1) {
    return {
      ok: false,
      reason: `Unsupported config version: ${JSON.stringify(obj['version'])}. Expected 1.`,
    }
  }
  if (!Array.isArray(obj['layouts'])) {
    return { ok: false, reason: '"layouts" must be an array.' }
  }

  const layouts = obj['layouts'] as unknown[]
  for (let li = 0; li < layouts.length; li++) {
    const layout = layouts[li]
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

    const shortcuts = l['shortcuts'] as unknown[]
    for (let si = 0; si < shortcuts.length; si++) {
      const sc = shortcuts[si]
      if (typeof sc !== 'object' || sc === null || Array.isArray(sc)) {
        return { ok: false, reason: `layouts[${li}].shortcuts[${si}] must be an object.` }
      }
      const s = sc as Record<string, unknown>

      if (typeof s['name'] !== 'string' || s['name'].trim() === '') {
        return {
          ok: false,
          reason: `layouts[${li}].shortcuts[${si}].name must be a non-empty string.`,
        }
      }
      if (s['icon'] !== undefined && typeof s['icon'] !== 'string') {
        return {
          ok: false,
          reason: `layouts[${li}].shortcuts[${si}].icon must be a string when present.`,
        }
      }
      if (typeof s['dslTemplate'] !== 'string' || s['dslTemplate'].trim() === '') {
        return {
          ok: false,
          reason: `layouts[${li}].shortcuts[${si}].dslTemplate must be a non-empty string.`,
        }
      }
      if (typeof s['confirm'] !== 'boolean') {
        return {
          ok: false,
          reason: `layouts[${li}].shortcuts[${si}].confirm must be a boolean.`,
        }
      }
    }
  }

  return { ok: true, config: raw as ShortcutConfig }
}

// ─── Migration entry point (CFG-03) ──────────────────────────────────────────
//
// Strategy: reject if version > CURRENT_CONFIG_VERSION (app is too old to load it);
//           apply migration chain if version < CURRENT_CONFIG_VERSION (step functions).
// For v1: no prior versions exist, so the migration chain is empty.
// Adding v2: append `if (version === 1) { raw = migrateV1ToV2(raw as V1Config) }` below.

/**
 * Entry point for loading a config from external input (file import, hand-edited JSON).
 *
 * 1. Guards object + integer version.
 * 2. Rejects configs that require a newer app (version > CURRENT_CONFIG_VERSION).
 * 3. Applies the migration chain (empty for v1 — seam is exercised but is a no-op).
 * 4. Delegates to validateShortcutConfig for structural validation.
 */
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
      reason:
        `Config version ${version} requires a newer version of Life Log ` +
        `(this app supports up to version ${CURRENT_CONFIG_VERSION}). Please update the app.`,
    }
  }

  // Migration chain — add steps here as the schema evolves (CFG-03 seam):
  // if (version === 1) { raw = migrateV1ToV2(raw as V1Config) }

  return validateShortcutConfig(raw)
}

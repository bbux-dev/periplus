import type { ShortcutConfig } from '../config/shortcutConfig'
import { migrateConfig } from './configValidator'
import { configRepository } from './configRepository'

// Re-export triggerDownload so UI callers have a single import point (configPort)
// without duplicating the function body — the implementation stays in exportEntries.ts.
export { triggerDownload } from './exportEntries'

// ─── Export envelope shape (PORT-01) ─────────────────────────────────────────

export interface ConfigExportEnvelope {
  version: 1
  exportedAt: number  // epoch ms — INJECTED by caller; never read internally
  config: ShortcutConfig
}

// ─── Pure export function ─────────────────────────────────────────────────────
//
// exportedAt is injected by the caller so this function remains deterministic
// and testable without mocking Date. The caller is responsible for providing
// the current timestamp (e.g. pass Date.now() at the call site).
//
// Usage: buildConfigExportJson(config, Date.now())

/**
 * Pure function: shapes the shortcut config into the versioned export JSON string.
 *
 * @param config     The ShortcutConfig to export.
 * @param exportedAt Epoch ms timestamp — INJECTED by caller; NEVER called internally.
 */
export function buildConfigExportJson(config: ShortcutConfig, exportedAt: number): string {
  const envelope: ConfigExportEnvelope = { version: 1, exportedAt, config }
  return JSON.stringify(envelope, null, 2)
}

// ─── Import result type (PORT-02) ─────────────────────────────────────────────

export type ImportResult =
  | { ok: true }
  | { ok: false; reason: string }

// ─── Import function (parse → migrate → put, wholesale reject) ────────────────
//
// SECURITY: The raw file contents are DATA only — never eval'd, never executed.
// Structural validation happens entirely inside migrateConfig before any write.
// Wholesale reject — apply nothing on failure (no partial state).

/**
 * Reads a File, parses JSON, runs migrateConfig, and on success writes to
 * configRepository. Returns { ok: true } or { ok: false, reason } — NEVER
 * partially applies.
 *
 * NOTE: file.text() is the modern File API. It is supported in all target
 * browsers and in jsdom (fake it with `new File([json], 'f.json')`).
 */
export async function importConfig(file: File): Promise<ImportResult> {
  let raw: unknown
  try {
    const text = await file.text()
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'File is not valid JSON.' }
  }
  // Unwrap the export envelope { version, exportedAt, config } produced by
  // buildConfigExportJson so the round-trip works. A hand-edited bare config
  // (no `config` key) is passed through untouched.
  if (typeof raw === 'object' && raw !== null && 'config' in raw) {
    raw = (raw as { config: unknown }).config
  }
  const result = migrateConfig(raw)
  if (!result.ok) return { ok: false, reason: result.reason }
  try {
    await configRepository.put(result.config)
  } catch {
    // IndexedDB write failure (quota, blocked, etc.) — wholesale reject so the
    // caller surfaces an error instead of an unhandled rejection (WR-01).
    return { ok: false, reason: 'Failed to save the config. Please try again.' }
  }
  return { ok: true }
}


import type { LifeLogEntry } from './db'

export type { LifeLogEntry }

// ─── Export envelope shape (EXP-01) ─────────────────────────────────────────

export interface ExportEnvelope {
  version: 1
  exportedAt: number  // epoch ms — INJECTED by the caller; never read internally
  entries: LifeLogEntry[]
}

// ─── Pure function: shapes all entries into the export JSON string ────────────
//
// exportedAt is injected by the caller so this function remains deterministic
// and testable without mocking Date. The caller is responsible for providing
// the current timestamp (e.g. pass the epoch ms from the call site).
//
// Usage: buildExportJson(entries, epochMs)

/**
 * Pure function: shapes all entries into the versioned export JSON string.
 *
 * @param entries    All LifeLogEntry records to include.
 * @param exportedAt Epoch ms timestamp — INJECTED by caller; NEVER called internally.
 */
export function buildExportJson(entries: LifeLogEntry[], exportedAt: number): string {
  const envelope: ExportEnvelope = { version: 1, exportedAt, entries }
  return JSON.stringify(envelope, null, 2)
}

// ─── Side-effectful download shim (browser only) ────────────────────────────
//
// NOT pure. Creates a Blob, a temporary <a download> anchor, clicks it, and
// revokes the object URL. Mock URL.createObjectURL + HTMLAnchorElement.prototype.click
// in jsdom tests (see exportEntries.test.ts).

/**
 * Triggers a browser download of the given JSON string.
 *
 * @param json     JSON string from buildExportJson.
 * @param filename Default filename shown in the browser download dialog.
 */
export function triggerDownload(json: string, filename = 'life-log.json'): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

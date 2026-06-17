---
phase: 14-import-export-config
reviewed: 2026-06-17
depth: deep
files_reviewed: 9
findings:
  critical: 0
  high: 0
  warning: 2
  info: 2
  total: 4
status: findings
fixed:
  - WR-01 (importConfig now catches configRepository.put failures → wholesale reject with reason; handleFileChange wraps in try/finally so the file input always resets, even on throw)
  - WR-02 (handleFileChange clears importStatus before the async import to avoid stale success/error UI)
  - IN-01 (hidden file input given tabIndex={-1} — keyboard access routes through the visible Import button)
deferred:
  - IN-02 (migration-seam test exercises v1 no-op — correct today; revisit when CURRENT_CONFIG_VERSION bumps to 2)
---

# Phase 14: Code Review Report

**Status:** findings (0 Critical, 0 High; 2 Warnings, 2 Info). Both warnings + IN-01 fixed.

## Summary

`configPort.ts` service (pure export builder + import pipeline) and a `/settings` page wired into
App.tsx with a Dashboard cog link. Security-critical path `JSON.parse → migrateConfig →
configRepository.put` is correct: no eval/Function/dynamic import, no partial apply on any
failure, human-readable rejection reasons surfaced from the validator. Errors render via
`role="alert"` React text nodes (no `dangerouslySetInnerHTML`). Route registered before catch-all.
`triggerDownload` re-exported (not duplicated). Reactive reflect via `useLiveQuery`/`useShortcutConfig`
— no reload.

## Warnings (FIXED)

### WR-01 — `configRepository.put()` exception was unhandled; file input not reset
A Dexie write failure (quota/blocked) escaped `importConfig` as a rejected promise → silent
failure + `e.target.value=''` never reached, breaking same-file retry. Fixed: `importConfig`
wraps the `put` in try/catch → `{ ok:false, reason }`; `handleFileChange` uses try/catch/finally
so status is always set and the input always resets.

### WR-02 — Stale `importStatus` shown during in-flight import
Fixed: `setImportStatus(null)` before awaiting `importConfig`.

## Info

- **IN-01 (FIXED)** Hidden file input added `tabIndex={-1}` so sighted-keyboard users tab to the
  visible "Import JSON" button, not the invisible input.
- **IN-02 (deferred)** `configPort.test.ts` migration test exercises the v1 no-op seam (correct
  today). When `CURRENT_CONFIG_VERSION` bumps to 2 and a `migrateV1ToV2` lands, update it to send
  a v1 payload and assert the migrated v2 output.

## Security Assessment — PASS

- Import = JSON.parse + structural validation only; no eval/Function/dynamic import.
- Wholesale reject before any write (malformed JSON, schema-invalid, newer-version all rejected
  with a reason; nothing applied). Now also rejects cleanly on IndexedDB write failure.
- Error reason rendered as escaped React text (no `dangerouslySetInnerHTML`).
- No new dependencies; `triggerDownload` reused from exportEntries.ts.

---
phase: 14
slug: import-export-config
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-17
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + React Testing Library + fake-indexeddb |
| **Config file** | existing vitest config |
| **Quick run command** | `pnpm vitest run src/services src/pages src/components` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~5–20 seconds |

---

## Sampling Rate

- **After every task commit:** quick run scoped to changed files
- **After every plan wave:** full suite
- **Before verify:** full suite green + `pnpm tsc -b` clean
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|--------|
| 14-xx | 01 | 1 | PORT-01 | buildConfigExportJson pure (injected timestamp); export bytes == current config | unit | `pnpm vitest run src/services` | ⬜ |
| 14-xx | 01 | 1 | PORT-02 | import = JSON.parse → migrateConfig → put; invalid/malformed/newer rejected wholesale w/ reason; no eval | unit | `pnpm vitest run src/services` | ⬜ |
| 14-xx | 02 | 2 | PORT-01/02 | UI: Export downloads; file import applies valid + shows error on invalid; Dashboard reflects import reactively | RTL | `pnpm vitest run src/pages src/components` | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `configExport`/`configImport` service tests: export round-trip, valid import → put, malformed JSON rejected, schema-invalid rejected w/ reason, older-version migrates
- [x] Import/Export UI RTL: export triggers download (mock URL.createObjectURL + anchor click), file input valid→applied, invalid→visible error message

*Existing vitest+RTL+fake-indexeddb infra covers framework; new test files created within tasks (TDD).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native OS file picker + real download to disk | PORT-01/02 | Browser file dialog + filesystem are outside jsdom | Optional: export then re-import the file in a real browser |

*All import/export LOGIC is automatable (FileReader/Blob mocked in jsdom); only the native file dialog/disk write is manual and non-blocking.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

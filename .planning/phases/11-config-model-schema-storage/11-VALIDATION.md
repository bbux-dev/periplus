---
phase: 11
slug: config-model-schema-storage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-17
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vite.config.ts` / `vitest` config (existing — no install) |
| **Quick run command** | `pnpm test -- --run src/services src/schemas` |
| **Full suite command** | `pnpm test -- --run` |
| **Estimated runtime** | ~10–20 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command (scoped to changed service/schema files)
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green + `pnpm tsc -b` clean
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-xx | 01 | 1 | CFG-01 | — | Config types match schema shape; round-trips through Dexie settings without loss | unit | `pnpm test -- --run src/services` | ❌ W0 | ⬜ pending |
| 11-01-xx | 01 | 1 | CFG-02 | imported config never eval'd; only parseDSL/isSafeUrl downstream | Invalid config rejected wholesale with human-readable message before any write | unit | `pnpm test -- --run src/services` | ❌ W0 | ⬜ pending |
| 11-01-xx | 01 | 1 | CFG-03 | reject-if-newer prevents loading unknown future shapes | Older-version config migrates; newer-version config rejected with clear message | unit | `pnpm test -- --run src/services` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/services/configRepository.test.ts` — read/write/round-trip stubs for CFG-01
- [ ] `src/services/validateShortcutConfig.test.ts` — valid/invalid cases for CFG-02
- [ ] `src/services/migrateConfig.test.ts` — older→current migration + reject-if-newer for CFG-03

*Existing vitest infrastructure covers the framework; only new test files are needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| (none) | — | All Phase 11 behaviors are pure data/logic (types, validator, repository, migration) | — |

*All phase behaviors have automated verification — no UI in this phase.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
phase: 1
slug: foundation-app-shell
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-15
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Testing is the milestone validation gate (autonomous run).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + @testing-library/react + fake-indexeddb |
| **Config file** | `vite.config.ts` (test block) + `src/test-setup.ts` — installed in Wave 0 |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx tsc -b && npx vite build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run && npx tsc -b && npx vite build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-scaffold | 01 | 1 | SETUP-01, SETUP-02 | — | N/A | build | `npx tsc -b && npx vite build` | ❌ W0 | ⬜ pending |
| 1-layout | 01 | 1 | SETUP-03 | — | N/A | source | `test -d src/pages -a -d src/components/ui -a -d src/services` | ❌ W0 | ⬜ pending |
| 1-cn-button | 01 | 1 | SETUP-03 | — | N/A | unit | `npx vitest run src/components/ui` | ❌ W0 | ⬜ pending |
| 1-db | 02 | 1 | DEMO-01 | — | N/A | unit | `npx vitest run src/services` | ❌ W0 | ⬜ pending |
| 1-shell | 02 | 2 | SHELL-01 | — | N/A | unit | `npx vitest run src/pages` | ❌ W0 | ⬜ pending |
| 1-counter | 02 | 2 | DEMO-01 | — | N/A | unit | `npx vitest run src/pages` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vite.config.ts` test block + `src/test-setup.ts` — `import 'fake-indexeddb/auto'`, jsdom env
- [ ] Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `fake-indexeddb`
- [ ] Dexie counter store unit test stub (DEMO-01) — put/get upsert + reactive read
- [ ] Button + cn helper unit test stub (SETUP-03)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Counter value survives a full page refresh | DEMO-01 (SC4) | fake-indexeddb is in-memory and resets per test process — true cross-refresh persistence needs a real browser IndexedDB | Run dev server, increment counter to N, hard-refresh the page, confirm displayed value is still N |
| App loads on a phone-sized viewport | SHELL-01 (SC1) | Visual/viewport check | Open dev server, set device toolbar to a phone width, confirm "Life Log" welcome screen renders without horizontal scroll |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-15

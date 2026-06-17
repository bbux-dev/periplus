---
phase: 12
slug: dashboard-rendering-layout-switcher
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-17
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + React Testing Library |
| **Config file** | existing vitest config |
| **Quick run command** | `pnpm vitest run src/config src/services src/pages` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~5–20 seconds |

---

## Sampling Rate

- **After every task commit:** quick run (scoped to changed config/service/page files)
- **After every plan wave:** full suite
- **Before verify:** full suite green + `pnpm tsc -b` clean
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 12-xx | 01 | 1 | DASH-03 | Defaults seeded once; no double-seed; every default template parses via parseDSL | unit | `pnpm vitest run src/config src/services` | ❌ W0 | ⬜ pending |
| 12-xx | 01 | 1 | DASH-02 | Active layout persists across reload; missing-name falls back to first layout | unit/RTL | `pnpm vitest run src/services src/pages` | ❌ W0 | ⬜ pending |
| 12-xx | 01 | 1 | DASH-01 | Active layout's shortcuts render as rows w/ resolved Heroicons icon + name | RTL | `pnpm vitest run src/pages` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `DEFAULT_SHORTCUT_CONFIG` parse-validity test (every default template parses; icons in SHORTCUT_ICON_MAP)
- [x] active-layout repository/hook round-trip + fallback test
- [x] DashboardPage RTL tests: rows render for active layout, chip switch updates rows, fresh-install seeding

*Existing vitest+RTL infrastructure covers the framework; only new test files needed (created in tasks).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Horizontal chip scroll "feel" on a real phone | DASH-02 | Touch-scroll momentum/snap is device-specific | Optional: open on phone, swipe chips |

*Core DASH-01..03 behavior is automatable via RTL + Dexie (fake-indexeddb); only scroll feel is manual and non-blocking.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

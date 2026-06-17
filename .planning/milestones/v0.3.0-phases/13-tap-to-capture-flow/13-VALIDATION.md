---
phase: 13
slug: tap-to-capture-flow
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-17
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + React Testing Library + fake-indexeddb (+ fake timers for toast) |
| **Config file** | existing vitest config |
| **Quick run command** | `pnpm vitest run src/services src/hooks src/components src/pages` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~5–25 seconds |

---

## Sampling Rate

- **After every task commit:** quick run scoped to changed files
- **After every plan wave:** full suite
- **Before verify:** full suite green + `pnpm tsc -b` clean
- **Max feedback latency:** ~25 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|--------|
| 13-xx | 01 | 1 | CAP-01 | draftToEntry shared w/ ReviewPage; no eval; zero-hole confirm:false saves immediately via parseDSL→create | unit/RTL | `pnpm vitest run src/services` | ⬜ |
| 13-xx | 01 | 1 | CAP-04 | `{}` named-hole token survives parseDSL; stripped before buildReviewDraft; detected as hole | unit | `pnpm vitest run src/services` | ⬜ |
| 13-xx | 02 | 2 | CAP-02 | hole→sheet; keypad+presets update a live DSL preview matching the captured line | RTL | `pnpm vitest run src/components src/pages` | ⬜ |
| 13-xx | 02 | 2 | CAP-03 | confirm:true→ReviewPage; confirm:false→direct save + "Saved · Undo"; Undo calls entriesRepository.delete | RTL | `pnpm vitest run src/pages` | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `captureService.test.ts` — draftToEntry contract, hole detection (POSITIONAL_SCHEMA based), `{}` strip/detect, applyFills/buildDSLPreview
- [x] `useShortcutCapture` / capture-decision tests (zero-hole save, confirm→review, hole→sheet)
- [x] HoleSheet RTL (keypad, presets, live preview, Save disabled until valid)
- [x] SavedToast RTL + fake timers (appears on direct save, Undo deletes entry, auto-dismiss)

*Existing vitest+RTL+fake-indexeddb infra covers framework; new test files created within tasks (TDD).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| One-thumb keypad feel / sheet animation | CAP-02 | Touch ergonomics + animation are device-specific | Optional: tap an amount shortcut on a phone |

*All capture LOGIC (paths, save, undo, preview, hole detection) is automatable via RTL + fake-indexeddb + fake timers; only physical keypad feel is manual and non-blocking.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] No watch-mode flags
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

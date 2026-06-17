---
phase: 15
slug: authoring-tool
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-17
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + React Testing Library + fake-indexeddb |
| **Config file** | existing vitest config |
| **Quick run command** | `pnpm vitest run src/services src/pages src/components` |
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
| 15-xx | 01 | 1 | EDIT-01/02/04 | pure mutation helpers always produce a valid config; validateTemplate accepts holes, rejects malformed; no eval | unit | `pnpm vitest run src/services` | ⬜ |
| 15-xx | 02 | 2 | EDIT-01/02 | manage page: layout CRUD reflects in switcher; shortcut delete/reorder persist; Dashboard reflects | RTL | `pnpm vitest run src/pages` | ⬜ |
| 15-xx | 03 | 3 | EDIT-01/03/04 | shortcut form create/edit + icon picker; unparseable template blocks save; omnibar "Save as shortcut" prefills; "+ New" → /manage | RTL | `pnpm vitest run src/pages src/components` | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `shortcutMutations.test.ts` — add/update/delete/move shortcut; add/rename/delete layout; edge cases (last layout, duplicate name, bounds); validity predicate accepts holes + rejects malformed
- [x] ManageShortcutsPage RTL — layout list + chip select, shortcut list, delete, reorder (up/down), persistence + reactive Dashboard reflect
- [x] ShortcutFormPage RTL — create/edit, icon picker selection, parse-error blocks Save (EDIT-04), prefilled from omnibar state (EDIT-03)
- [x] LayoutChips "+ New" → onManage; QuickCapturePage "Save as Shortcut" navigates with state

*Existing vitest+RTL+fake-indexeddb infra covers framework; new test files created within tasks (TDD).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Reorder / form feel on a real phone | EDIT-02 | Touch ergonomics device-specific | Optional: create/edit/reorder shortcuts on a phone |

*All authoring LOGIC + flows are automatable via RTL + fake-indexeddb; only physical feel is manual and non-blocking.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] No watch-mode flags
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

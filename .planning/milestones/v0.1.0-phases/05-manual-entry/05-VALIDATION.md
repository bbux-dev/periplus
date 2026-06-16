---
phase: 5
slug: manual-entry
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-15
---

# Phase 5 — Validation Strategy

> Per-phase validation contract. Testing is the milestone validation gate (autonomous run). Derived from 05-RESEARCH.md "Validation Architecture". Manual entries reuse the Phase 4 ReviewPage→Save path (Option A-light: ReviewPage extended to a ReviewDraft).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + @testing-library/react + user-event + fake-indexeddb + MemoryRouter |
| **Config file** | `vite.config.ts` test block + `src/test-setup.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx tsc -b && npx vite build` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** `npx vitest run`
- **After every plan wave:** `npx vitest run && npx tsc -b && npx vite build`
- **Before `/gsd:verify-work`:** Full suite green (including the preserved Phase 4 ReviewPage/capture tests)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Req / SC | Test Type | Automated Command | Status |
|---------|----------|-----------|-------------------|--------|
| entry-fields | MAN-02 (source) | unit (ENTRY_FIELDS all 7 types + buildReviewDraft mapping) | `npx vitest run src/config/entryFields.test.ts` | ⬜ pending |
| review-extend | MAN-03 | regression (Phase 4 ReviewPage tests unchanged + ReviewDraft) | `npx vitest run src/pages/ReviewPage.test.tsx` | ⬜ pending |
| manual-page | MAN-01 / MAN-02 / SC1 / SC2 | RTL (reachability + per-type fields) | `npx vitest run src/pages/ManualEntryPage.test.tsx` | ⬜ pending |
| manual-save | MAN-03 / SC3 / SC4 | integration + fake-idb | `npx vitest run src/pages/ManualEntryPage.integration.test.tsx` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No new dependencies (pure TS/React; all tooling from Phase 4)
- [ ] New files: `src/config/entryFields.ts` (+ test), `src/pages/ManualEntryPage.tsx` (+ test + integration test)
- [ ] ReviewPage extended: `ReviewDraft` (optional amount/occurredAt/description/tags), new state vars, `handleSave` maps them — `ExtractedDraft` must stay structurally assignable so Phase 4 capture tests pass unchanged
- [ ] Fix carried from research: ReviewPage `tags: [] as string[]` → parsed tags (non-breaking for Phase 4)
- [ ] App.tsx `/d/:domain/:type/manual` route swapped from PlaceholderPage → ManualEntryPage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Manual form + per-type fields render correctly on a phone-sized viewport | MAN-02 layout | jsdom does not compute CSS layout/viewport | `npx vite dev` → choose a type → Enter Manually → confirm fields tappable, no horizontal scroll |

*MAN-01 reachability, per-type field rendering, and full manual→review→save persistence are ALL automated (unit + RTL + fake-indexeddb). Only the visual viewport is manual.*

---

## Validation Sign-Off

- [x] All automatable tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers entryFields config + ReviewPage extension + all new test files
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] Phase 4 non-regression explicitly tested (ReviewPage + capture flow)
- [x] Manual boundary (phone viewport) documented
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-15

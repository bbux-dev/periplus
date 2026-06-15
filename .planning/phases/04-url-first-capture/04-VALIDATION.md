---
phase: 4
slug: url-first-capture
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-15
---

# Phase 4 — Validation Strategy

> Per-phase validation contract. Testing is the milestone validation gate (autonomous run). Derived from 04-RESEARCH.md "Validation Architecture". The `extractMetadataFromUrl` pure function is the highest-risk unit and is the most heavily tested.

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
- **Before `/gsd:verify-work`:** Full suite green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Req / SC | Test Type | Automated Command | Status |
|---------|----------|-----------|-------------------|--------|
| primitives | SETUP-05 / SC5 | RTL (label assoc, aria) | `npx vitest run src/components/ui` | ⬜ pending |
| extract | CAPT-03 / CAPT-04 | unit (16 URL fixtures, incl. degrade cases) | `npx vitest run src/services/extractMetadataFromUrl.test.ts` | ⬜ pending |
| capture-page | CAPT-01 / CAPT-06 / SC1 | RTL | `npx vitest run src/pages/CaptureUrlPage.test.tsx` | ⬜ pending |
| capture-flow | CAPT-02 / SC2 | RTL integration | `npx vitest run src/pages/CaptureUrlPage.test.tsx` | ⬜ pending |
| review-save | CAPT-05 / SC4 | RTL + fake-idb | `npx vitest run src/pages/ReviewPage.test.tsx` | ⬜ pending |
| review-degrade | CAPT-04 / SC3 | RTL | `npx vitest run src/pages/ReviewPage.test.tsx` | ⬜ pending |
| routes | CAPT-01 (full) | tsc + RTL | `npx tsc -b && npx vitest run src/App.test.tsx` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No new dependencies (WHATWG `URL` API is built-in; React 19, Tailwind v4, react-router 7 already present)
- [ ] New test files: `src/components/ui/Input.test.tsx`, `src/components/ui/FormField.test.tsx`, `src/services/extractMetadataFromUrl.test.ts` (16 fixtures), `src/pages/CaptureUrlPage.test.tsx`, `src/pages/ReviewPage.test.tsx`
- [ ] Counter/WelcomePage/EntryTypePage removal: delete the 6 files (Counter.tsx+test, WelcomePage.tsx+test, EntryTypePage.tsx+test) and the now-stale `/d/:domain/:type/capture` stub test case in App.test.tsx — confirm grep shows no live imports first
- [ ] Draft passes via react-router `location.state`; ReviewPage guards direct navigation (no draft → redirect to capture)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Capture/Review forms render correctly on a phone-sized viewport | CAPT-01/05 layout | jsdom does not compute CSS layout/viewport | `npx vite dev` → DevTools ~375px → choose an entry type → confirm URL capture form + Review form are tappable, no horizontal scroll |
| Real offline capture end-to-end | (offline) | Requires installed SW from a production build | `npx vite build && npx vite preview` → DevTools offline → paste a Google Maps URL → import → edit → Save → confirm entry in Application → IndexedDB |

*The extraction logic, capture→review→save flow, and persistence are ALL automated (pure-function unit tests + RTL + fake-indexeddb). Only the visual viewport and the true-offline end-to-end are manual.*

---

## Validation Sign-Off

- [x] All automatable tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all new test files + removals
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] Highest-risk unit (extractMetadataFromUrl) covered by 16 fixtures incl. graceful-degradation (CAPT-04)
- [x] Manual boundary documented
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-15

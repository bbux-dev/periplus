---
phase: 3
slug: navigation-dashboard
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-15
---

# Phase 3 — Validation Strategy

> Per-phase validation contract. Testing is the milestone validation gate (autonomous run). Derived from 03-RESEARCH.md "Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + @testing-library/react + @testing-library/user-event + react-router MemoryRouter |
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
| nav-config | NAV-01..04 (source) | tsc compile | `npx tsc -b` | ⬜ pending |
| dashboard | NAV-01 / SC1 | RTL | `npx vitest run src/pages/DashboardPage.test.tsx` | ⬜ pending |
| domain-screen | NAV-02 / SC2 | RTL (media/trips/expenditures) | `npx vitest run src/pages/DomainPage.test.tsx` | ⬜ pending |
| routes-reachable | NAV-03 / SC3 | RTL all 7 routes | `npx vitest run src/App.test.tsx` | ⬜ pending |
| back-nav | NAV-04 / SC4 | RTL + user-event | `npx vitest run src/App.test.tsx` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/config/navigation.ts` — the domain→{label, icon, types[]} map (derived from db.ts EntryDomain/EntryType); must exist before tests import it
- [ ] Test files: `src/pages/DashboardPage.test.tsx`, `src/pages/DomainPage.test.tsx`, `src/App.test.tsx`
- [ ] RTL routing helper convention: pages calling `useNavigate`/`useParams` must be wrapped in `<MemoryRouter><Routes><Route .../></Routes></MemoryRouter>` (full wrapper, not bare MemoryRouter — react-router #12368)
- [ ] No new dependencies (react-router-dom 7.17.0 already installed)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Phone-sized layout — tiles tappable, content fits a narrow viewport | NAV-04 / SC3 layout | jsdom does not compute CSS layout/viewport | `npx vite dev` → DevTools mobile (~375px) → confirm dashboard + domain tiles are tappable, no horizontal scroll, content within max-w container |

*Routing reachability and back-navigation behavior ARE automated via RTL + MemoryRouter; only the visual/viewport check is manual.*

---

## Validation Sign-Off

- [x] All automatable tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers navigation config + all new test files
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] Manual boundary (phone viewport) documented
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-15

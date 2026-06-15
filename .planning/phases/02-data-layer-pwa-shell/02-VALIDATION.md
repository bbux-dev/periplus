---
phase: 2
slug: data-layer-pwa-shell
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-15
---

# Phase 2 — Validation Strategy

> Per-phase validation contract. Testing is the milestone validation gate (autonomous run). Derived from 02-RESEARCH.md "Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + @testing-library/react + fake-indexeddb (from Phase 1) |
| **Config file** | `vite.config.ts` test block + `src/test-setup.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx tsc -b && npx vite build` |
| **Estimated runtime** | ~25 seconds (build generates PWA artifacts) |

---

## Sampling Rate

- **After every task commit:** `npx vitest run`
- **After every plan wave:** `npx vitest run && npx tsc -b && npx vite build`
- **Before `/gsd:verify-work`:** Full suite green + build emits `dist/manifest.webmanifest` and `dist/sw.js`
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Requirement | Test Type | Automated Command | Status |
|---------|-------------|-----------|-------------------|--------|
| setup04-modules | SETUP-04 | unit | `npx vitest run src/state/common src/config` | ⬜ pending |
| data01-model | DATA-01 | tsc compile | `npx tsc -b` | ⬜ pending |
| data02-schema | DATA-02 | unit + fake-idb | `npx vitest run src/services/db.test.ts` | ⬜ pending |
| data03-repo-crud | DATA-03 / SC1 | unit + fake-idb | `npx vitest run src/services/entriesRepository.test.ts` | ⬜ pending |
| data04-unsynced | DATA-04 / SC3 | unit + fake-idb | `npx vitest run src/services/entriesRepository.test.ts` | ⬜ pending |
| data05-reactive | DATA-05 / SC2a | RTL + fake-idb | `npx vitest run` (component/hook test) | ⬜ pending |
| pwa01-factory | PWA-01 | unit | `npx vitest run src/pwa` | ⬜ pending |
| pwa02-manifest | PWA-02 / SC4a | build artifact | `npx vite build && test -f dist/manifest.webmanifest` | ⬜ pending |
| pwa03-sw | PWA-03 / SC4b | build artifact | `npx vite build && test -f dist/sw.js` | ⬜ pending |
| pwa03-register | PWA-03 | build artifact | `grep -rq "registerSW\|virtual:pwa" dist/ || grep -rq registerSW src/` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install `vite-plugin-pwa` (bundles workbox-build + workbox-window; no separate installs)
- [ ] `tsconfig.node.json` `include` adds `src/pwa/**` so `tsc -b` resolves the PWA config import from vite.config.ts
- [ ] New test files: `src/services/entriesRepository.test.ts`, `src/pwa/pwaConfig.test.ts`, `src/state/common/*.test.ts`, `src/config/*.test.ts`; extend `src/services/db.test.ts` with v2 schema tests
- [ ] PWA icon assets (`public/pwa-192x192.png`, `public/pwa-512x512.png`) — committed or generated in Wave 0

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Entries survive a page refresh | DATA-05 / SC2b | fake-indexeddb is in-memory; real IndexedDB persistence needs a browser | `npx vite dev` → create an entry → hard-refresh → entry still visible |
| App shell opens while offline | PWA-04 / SC4c | Requires an installed service worker from a production build | `npx vite build && npx vite preview` → DevTools → Network: Offline → navigate → shell renders |
| New entry persists while offline | PWA-05 / SC5 | Requires SC4c (offline shell) + IndexedDB write in a real browser | While offline (after SC4c), create an entry → appears in list → present in DevTools → Application → IndexedDB |

*Build-artifact assertions (manifest + sw.js present, registration code emitted) are the automated proxy for installability; the three rows above confirm the full end-to-end browser scenario.*

---

## Validation Sign-Off

- [x] All automatable tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all new test files + PWA infra
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] Manual boundary (SC2b/SC4c/SC5) documented with reproduction steps
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-15

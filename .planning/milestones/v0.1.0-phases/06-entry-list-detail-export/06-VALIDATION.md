---
phase: 6
slug: entry-list-detail-export
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-15
---

# Phase 6 — Validation Strategy

> Per-phase validation contract. Testing is the milestone validation gate (autonomous run). Final phase of v0.1.0. Derived from 06-RESEARCH.md "Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + @testing-library/react + user-event + fake-indexeddb + MemoryRouter |
| **Config file** | `vite.config.ts` test block + `src/test-setup.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx tsc -b && npx vite build` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** `npx vitest run`
- **After every plan wave:** `npx vitest run && npx tsc -b && npx vite build`
- **Before `/gsd:verify-work`:** Full suite green (incl. all prior phases' tests + the ReviewPage isSafeUrl import after extraction)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Req / SC | Test Type | Automated Command | Status |
|---------|----------|-----------|-------------------|--------|
| urlutils | (shared) isSafeUrl extraction | unit + Phase 4 regression | `npx vitest run src/services/urlUtils.test.ts src/pages/ReviewPage.test.tsx` | ⬜ pending |
| useEntry | VIEW-03 (source) | unit/RTL via detail | `npx vitest run src/services` | ⬜ pending |
| export-pure | EXP-01 (buildExportJson, injected exportedAt) | unit (no mocks) | `npx vitest run src/services/exportEntries.test.ts` | ⬜ pending |
| export-trigger | EXP-01 (triggerDownload) | unit (mocked URL/anchor) | `npx vitest run src/services/exportEntries.test.ts` | ⬜ pending |
| list-page | VIEW-01 / VIEW-02 / VIEW-04 / SC1 / SC2 | RTL + fake-idb | `npx vitest run src/pages/EntryListPage.test.tsx` | ⬜ pending |
| detail-page | VIEW-03 / SC3 | RTL + fake-idb | `npx vitest run src/pages/EntryDetailPage.test.tsx` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No new dependencies (all tooling present)
- [ ] New files: `src/services/urlUtils.ts`(+test), `src/services/exportEntries.ts`(+test), `src/pages/EntryListPage.tsx`(+test), `src/pages/EntryDetailPage.tsx`(+test)
- [ ] `useEntry(id)` added to entriesRepository.ts (useLiveQuery on db.entries.get(id), 3-state: undefined=loading, null=not found, entry=found)
- [ ] App.tsx: swap `/entries` + `/entries/:id` PlaceholderPage → EntryListPage + EntryDetailPage; DashboardPage gets a link to `/entries`
- [ ] isSafeUrl extracted to urlUtils.ts and ReviewPage updated to import it (Phase 4 ReviewPage tests stay green)
- [ ] Type label lookup is domain-scoped (getDomainConfig(domain).types.find) — NOT a flat cross-domain find (the 'expense' dual-domain hazard)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Entries persist after a true browser hard-refresh | VIEW-04 | fake-indexeddb is in-memory; real IndexedDB persistence needs a browser | `npx vite dev` → create entries → list shows them → hard-refresh → entries still listed |
| Export actually downloads a .json file | EXP-01 | jsdom mocks the download; a real Blob download needs a browser | `npx vite preview` → Export → confirm a .json file downloads with all entries |
| List/detail/export render on a phone-sized viewport | VIEW-01/03 layout | jsdom does not compute CSS layout | `npx vite dev` → DevTools ~375px → confirm list/detail/export are tappable, no horizontal scroll |

*Automated proxy for VIEW-04: the list reads persisted IndexedDB state via the repository. Automated proxy for EXP-01 download: buildExportJson is unit-tested for content; triggerDownload is tested with URL/anchor mocked.*

---

## Validation Sign-Off

- [x] All automatable tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all new files + the isSafeUrl extraction (Phase 4 regression)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] Export determinism: buildExportJson takes an injected exportedAt (no internal Date.now)
- [x] Manual boundary documented
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-15

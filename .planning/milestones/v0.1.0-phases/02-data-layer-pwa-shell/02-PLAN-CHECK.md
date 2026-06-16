# Phase 2 Plan Check — Data Layer & PWA Shell

**Checked:** 2026-06-15
**Plans:** 02-01-PLAN.md, 02-02-PLAN.md, 02-03-PLAN.md
**Phase goal:** `LifeLogEntry` records persist locally in IndexedDB through a repository with reactive reads, and the app becomes an installable, offline-capable PWA.
**Requirements in scope:** SETUP-04, DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, PWA-01, PWA-02, PWA-03, PWA-04, PWA-05

---

## Verdict: PASS WITH CONCERNS

**Blockers:** 0
**Warnings:** 3
**Info:** 1

The three plans are coherent, file-disjoint, and will achieve the phase goal and all five success criteria. No blocking issues. Three warnings are documented below; none prevent execution.

---

## Dimension 1: Requirement Coverage — PASS

All 11 requirement IDs appear in at least one plan's `requirements` frontmatter.

| Requirement | Covering Plan | Covering Task(s) | Status |
|-------------|--------------|-----------------|--------|
| SETUP-04 | 02-01 | Task 1 (requestState + assertNever), Task 2 (appBrand + publicEnv) | Covered |
| DATA-01 | 02-02 | Task 1 (LifeLogEntry type in db.ts) | Covered |
| DATA-02 | 02-02 | Task 1 (version(2) entries + settings stores) | Covered |
| DATA-03 | 02-02 | Task 2 (create/get/list/update/delete) | Covered |
| DATA-04 | 02-02 | Task 2 (listUnsynced filter scan) | Covered |
| DATA-05 | 02-02 | Task 3 (useEntries + RTL re-render test) | Covered |
| PWA-01 | 02-03 | Task 2 (createPwaOptions factory) | Covered |
| PWA-02 | 02-03 | Task 2 (manifest fields) + Task 3 (build artifact) | Covered |
| PWA-03 | 02-03 | Task 3 (sw.js + workbox precache, SW registration) | Covered |
| PWA-04 | 02-03 | Task 3 (navigateFallback + manual SC4c) | Covered |
| PWA-05 | 02-03 | Task 3 (manual SC5 — documented) | Covered |

---

## Dimension 2: Task Completeness — PASS

All 8 tasks across the three plans have: `<files>`, `<read_first>`, `<action>`, `<acceptance_criteria>`, `<verify><automated>`, `<done>`. Actions are specific (concrete file names, method signatures, exact Dexie calls). Verify commands are runnable. Done criteria are measurable.

| Plan | Task | type | files | read_first | action | acceptance_criteria | verify/automated | done |
|------|------|------|-------|------------|--------|---------------------|-----------------|------|
| 02-01 | 1 | auto/tdd | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 02-01 | 2 | auto/tdd | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 02-02 | 1 | auto/tdd | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 02-02 | 2 | auto/tdd | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 02-02 | 3 | auto/tdd | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 02-03 | 1 | auto | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 02-03 | 2 | auto/tdd | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 02-03 | 3 | auto | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Dimension 3: Dependency Correctness — PASS

All three plans are Wave 1 with `depends_on: []`. No cycles. No forward references. Wave assignment is consistent.

**File disjointness (parallel safety):**

| File | 02-01 | 02-02 | 02-03 |
|------|-------|-------|-------|
| src/state/common/* | ✅ | — | — |
| src/config/* | ✅ | — | — |
| src/services/* | — | ✅ | — |
| package.json / package-lock.json | — | — | ✅ |
| tsconfig.node.json | — | — | ✅ |
| vite.config.ts | — | — | ✅ |
| src/vite-env.d.ts | — | — | ✅ |
| src/main.tsx | — | — | ✅ |
| src/pwa/* | — | — | ✅ |
| scripts/* / public/pwa-* | — | — | ✅ |

Zero file overlap between any pair of plans. Fully safe for parallel execution.

---

## Dimension 4: Key Links Planned — PASS

| Plan | from | to | via | Task | Status |
|------|------|-----|-----|------|--------|
| 02-01 | requestState.test.ts | requestState.ts | Vitest co-located import | 1 | ✅ action explicit |
| 02-02 | entriesRepository.ts | db.entries | Dexie table ops (add/get/orderBy/filter) | 2, 3 | ✅ action explicit |
| 02-02 | entriesRepository.ts | useLiveQuery | dexie-react-hooks import | 3 | ✅ action explicit |
| 02-03 | vite.config.ts | src/pwa/pwaConfig.ts | createPwaOptions import | 3 | ✅ action explicit |
| 02-03 | src/main.tsx | virtual:pwa-register/react | useRegisterSW hook | 3 | ✅ action explicit |

All wiring is planned in task actions, not just listed as artifacts.

---

## Dimension 5: Scope Sanity — WARNING (1)

| Plan | Tasks | Files | Status |
|------|-------|-------|--------|
| 02-01 | 2 | 8 | ✅ within target |
| 02-02 | 3 | 4 | ✅ within target |
| 02-03 | 3 | 11 | ⚠️ 1 over warning threshold |

**WARNING 1 [scope_sanity]:** 02-03 lists 11 files in `files_modified`, one over the 10-file warning threshold. Mitigating factors: package.json + package-lock.json are a single npm install operation; public/pwa-192x192.png + pwa-512x512.png are binary outputs of a script (not hand-authored); src/vite-env.d.ts is a one-line addition. The three tasks are clearly scoped (install/config, factory, wire+build-verify). Risk of quality degradation is low. Execution can proceed.

---

## Dimension 6: Verification Derivation — PASS

`must_haves.truths` across all three plans are user-observable and testable, not implementation-focused:

- 02-01: "requestState helpers construct correctly-typed values" / "assertNever throws" / "appBrand exposes name + themeColor" — developer-observable API contracts, appropriate for utility primitives ✅
- 02-02: "A LifeLogEntry can be created via entriesRepository.create() and read back via get()" (SC1) / "Phase 1 counter store still works" / "listUnsynced() returns only entries whose syncedAt is null" (SC3) / "useEntries() re-renders on create" (SC2a) — all testable assertions against verifiable outcomes ✅
- 02-03: build-artifact truths (manifest + sw.js emitted) are concrete and checkable; the fifth truth is explicitly tagged "(manual)" ✅

Artifacts map to truths. Key links connect artifacts to functionality.

---

## Dimension 7: Context Compliance — PASS

CONTEXT.md grants full Claude's Discretion for implementation choices. All locked constraints honored:

| Constraint | Plan adherence |
|-----------|----------------|
| Stack LOCKED (React/Vite/TS/Dexie/useLiveQuery/Tailwind v4/heroicons) | No deviation in any plan ✅ |
| vite-plugin-pwa introduced in Phase 2 (not Phase 1) | 02-03 Task 1 installs it ✅ |
| Phase 1 counter preserved (not required to remove) | 02-02 Task 1 behavior explicitly: "counter store still works after v2 upgrade" ✅ |
| Deferred: no actual backend sync | No sync code in any plan; only the listUnsynced seam ✅ |

No deferred ideas are implemented. No contradictions with locked constraints.

---

## Dimension 7b: Scope Reduction — PASS

No scope-reduction language detected in any plan's task actions. All user requirements (SC1–SC5) are fully addressed:

- SC1 (write/read LifeLogEntry): fully automated in 02-02 Task 2 (create/get round-trip test)
- SC2a (reactive re-render): fully automated in 02-02 Task 3 (RTL test with act() + findByText)
- SC2b (cross-refresh): correctly classified as manual-only with documented reproduction steps
- SC3 (unsynced seam): fully automated in 02-02 Task 2 (listUnsynced filter test)
- SC4a/SC4b (manifest + sw.js build artifacts): fully automated in 02-03 Task 3
- SC4c (offline shell): correctly classified as manual-only
- SC5 (offline create): correctly classified as manual-only

No "static for now", "v1 placeholder", or "future enhancement" scope deferrals found.

---

## Dimension 7c: Architectural Tier Compliance — PASS

Architectural Responsibility Map in RESEARCH.md verified against task file targets:

| Capability | Expected Tier | Plan/Task | Assigned Tier | Match |
|-----------|--------------|-----------|--------------|-------|
| LifeLogEntry persistence | Database/IndexedDB via Dexie | 02-02 T1 | src/services/db.ts → Dexie | ✅ |
| Reactive entry list | Browser / dexie-react-hooks | 02-02 T3 | useLiveQuery hook in entriesRepository.ts | ✅ |
| Unsynced query seam | Database / Dexie filter | 02-02 T2 | `.filter(e => e.syncedAt == null)` in repository | ✅ |
| Repository CRUD | Application service src/services/ | 02-02 T2 | entriesRepository.ts | ✅ |
| PWA manifest + SW | Build tool (vite-plugin-pwa) | 02-03 T3 | vite.config.ts plugins | ✅ |
| SW registration | Browser (virtual:pwa-register) | 02-03 T3 | src/main.tsx PWARegistrar | ✅ |
| SETUP-04 utilities | Application (pure TS modules) | 02-01 T1,T2 | src/state/common/, src/config/ | ✅ |

No tier mismatches found.

---

## Dimension 8: Nyquist Compliance — PASS

VALIDATION.md exists at `.planning/phases/02-data-layer-pwa-shell/02-VALIDATION.md`. ✅

**8a — Automated Verify Presence:**

| Task | Plan | Automated Command | Status |
|------|------|-------------------|--------|
| T1 state/common prims | 02-01 | `npx vitest run src/state/common` | ✅ |
| T2 config prims | 02-01 | `npx vitest run src/config` | ✅ |
| T1 db.ts v2 schema | 02-02 | `npx vitest run src/services/db.test.ts` | ✅ |
| T2 entriesRepository CRUD | 02-02 | `npx vitest run src/services/entriesRepository.test.ts` | ✅ |
| T3 useEntries hook | 02-02 | `npx vitest run src/services/entriesRepository.test.ts` | ✅ |
| T1 install + icons + tsconfig | 02-03 | `node scripts/generate-pwa-icons.mjs && file ... && grep ...` | ✅ |
| T2 createPwaOptions factory | 02-03 | `npx vitest run src/pwa` | ✅ |
| T3 wire VitePWA + build verify | 02-03 | `npx tsc -b && npx vite build && test -f dist/sw.js && grep ...` | ✅ |

All 8 tasks have `<automated>` verify commands. No `MISSING` sentinel found.

**8b — Feedback Latency:** Unit test tasks are fast (seconds). 02-03 Task 3 includes `vite build` which may approach the 30s boundary. VALIDATION.md acknowledges ~25s estimated runtime. Borderline but acceptable given PWA artifact generation is inherently a build-time operation. No watch-mode flags.

**8c — Sampling Continuity:** All 8 tasks in Wave 1 have automated verify. No window of 3 consecutive tasks without automation. ✅

**8d — Wave 0 Completeness:** No `<automated>MISSING</automated>` patterns in any plan. TDD tasks create test files within the task action itself. ✅

**WARNING 2 [nyquist_feedback_latency]:** 02-03 Task 3's `vite build` step may exceed 30 seconds on first run (cold build with PWA plugin). This is unavoidable for SC4a/SC4b build-artifact assertions and is explicitly documented in VALIDATION.md. Execution can proceed.

---

## Dimension 9: Cross-Plan Data Contracts — PASS

The three plans are data-independent:
- 02-01 utility modules are consumed by future phases, not by 02-02 or 02-03 in Phase 2
- 02-03 pwaConfig.ts explicitly inlines APP_NAME/THEME_COLOR constants rather than importing from 02-01's appBrand.ts (documented reason: tsconfig.node.json scope boundary)

No shared data pipelines. No conflicting transforms. ✅

---

## Dimension 10: CLAUDE.md Compliance — SKIPPED

No `./CLAUDE.md` found in the working directory.

---

## Dimension 11: Research Resolution — WARNING

`02-RESEARCH.md` has a `## Open Questions` section (line 752) without the `(RESOLVED)` suffix. Individual questions have `Recommendation:` clauses but no inline `RESOLVED` markers.

**WARNING 3 [research_resolution]:** The three open questions in 02-RESEARCH.md are not formally marked resolved. However, all three are functionally resolved by the plans:

| Question | Recommendation | Plan Decision |
|---------|---------------|--------------|
| PNG icon generation | Node.js script | 02-03 Task 1: `scripts/generate-pwa-icons.mjs` ✅ |
| LifeLogEntry type location | Co-locate in db.ts | 02-02 Task 1: exports from `src/services/db.ts` ✅ |
| Counter removal timing | Leave in Phase 2 | 02-02 Task 1: counter preservation explicitly tested ✅ |

The RESEARCH ends with "Research complete. Planner can now create PLAN.md files for Phase 2." The missing (RESOLVED) suffix is a documentation gap only. The phase goal will not be impaired.

---

## Dimension 12: Pattern Compliance — SKIPPED

No `02-PATTERNS.md` found for this phase.

---

## Specific Check Results (from plan_check_context)

### All 11 requirement IDs appear across the plans
✅ Confirmed. See Dimension 1 table.

### Dexie schema upgrade is ADDITIVE — counter store preserved
✅ 02-02 Task 1 action explicitly states: "DO NOT modify or re-declare the existing `version(1).stores({ counter: 'id' })` block (mutating it throws Dexie.VersionError)." Task behavior: "The existing Phase 1 counter test still passes (counter store survives the upgrade)." The `version(2).stores()` block adds only `entries` and `settings` — the existing `counter` store is omitted from v2 (which means Dexie preserves it unchanged). Acceptance criteria require the original counter test to be among the green tests.

### LifeLogEntry uses string UUID primary key + filter-scan for unsynced
✅ Schema string: `entries: '&id, recordedAt, domain'` — `&id` is Dexie's unique primary key with caller-supplied string value. `create()` uses `crypto.randomUUID()`. `listUnsynced` uses `.filter(e => e.syncedAt == null).toArray()` — full scan. `syncedAt` is NOT declared as an index (correctly omitted). RESEARCH.md Anti-Patterns section explicitly warns against indexing syncedAt.

### Repository seam: create/get/list/listUnsynced/update/delete + fake-indexeddb tests
✅ 02-02 interfaces block lists all 6 methods. Task 2 action creates all 6. Task 2 acceptance criteria names all 6 in test coverage. Tests use `beforeEach db.delete()+db.open()` isolation from Phase 1 (fake-indexeddb is wired via `src/test-setup.ts` which already imports `fake-indexeddb/auto`).

### PWA infrastructure wiring
| Check | Plan/Task | Status |
|-------|-----------|--------|
| vite-plugin-pwa added to vite.config.ts plugins | 02-03 T3 | ✅ `VitePWA(createPwaOptions())` added to plugins array |
| SW registration in main.tsx | 02-03 T3 | ✅ `useRegisterSW` from `virtual:pwa-register/react` in PWARegistrar component |
| tsconfig.node.json adds `src/pwa/**` | 02-03 T1 | ✅ `"include": ["vite.config.ts", "src/pwa/**"]` |
| PNG icons as valid PNGs | 02-03 T1 | ✅ `scripts/generate-pwa-icons.mjs` generates 192×192 and 512×512; verify via `file` command |
| dist/manifest.webmanifest build artifact | 02-03 T3 | ✅ `grep -q '"name"' dist/manifest.webmanifest` in verify command |
| dist/sw.js build artifact | 02-03 T3 | ✅ `test -f dist/sw.js` in verify command |
| dist/workbox-*.js precache | 02-03 T3 | ✅ `ls dist/workbox-*.js` in verify command |

### Manual-only criteria correctly identified and NOT falsely automated
| Criterion | Plan | Classification | Verify Instructions |
|-----------|------|---------------|---------------------|
| SC2b cross-refresh persistence | 02-02 (verification section) | MANUAL ✅ | `npx vite dev` → create entry → hard-refresh → entry visible |
| SC4c offline shell | 02-03 (verification section + must_haves) | MANUAL ✅ | `vite build && vite preview` → DevTools offline → navigate |
| SC5 offline create | 02-03 (verification section + must_haves) | MANUAL ✅ | While offline, create entry → check IndexedDB in DevTools |

None of these are falsely automated — each has documented manual reproduction steps only.

### Every task has `<read_first>` and `<acceptance_criteria>`
✅ Confirmed for all 8 tasks. See Dimension 2 table.

### File disjointness across all three plans
✅ Confirmed — no file appears in more than one plan's `files_modified` list. See Dimension 3 table. Safe for parallel execution.

---

## Issues Summary

```yaml
issues:

  - plan: "02-03"
    dimension: "scope_sanity"
    severity: "warning"
    description: "02-03 lists 11 files in files_modified, one over the 10-file warning threshold."
    metrics:
      tasks: 3
      files: 11
    fix_hint: "No split needed — package-lock.json is a npm side-effect, PNGs are script outputs, vite-env.d.ts is a one-liner. Work is appropriately scoped across 3 tasks. Execution can proceed."

  - plan: "02-03"
    dimension: "nyquist_feedback_latency"
    severity: "warning"
    description: "Task 3 verify command includes `vite build` which may exceed 30s on first run."
    task: 3
    fix_hint: "Unavoidable for build-artifact assertions on PWA artifacts. VALIDATION.md already documents ~25s expected runtime. No action required."

  - plan: null
    dimension: "research_resolution"
    severity: "warning"
    description: "02-RESEARCH.md ## Open Questions section (line 752) lacks (RESOLVED) suffix; individual questions have 'Recommendation:' clauses but not 'RESOLVED:' markers."
    file: ".planning/phases/02-data-layer-pwa-shell/02-RESEARCH.md"
    unresolved_questions_per_dimension_11_format: false
    note: "All three questions are functionally resolved by plan decisions (Node.js script for icons, db.ts co-location for LifeLogEntry type, counter preserved). Documentation gap only. Phase goal is not at risk."
    fix_hint: "Rename section to '## Open Questions (RESOLVED)' and add 'RESOLVED: [decision]' inline to each question before or during execution. Does not block execution."

  - plan: null
    dimension: "info"
    severity: "info"
    description: "VALIDATION.md has wave_0_complete: false — pre-execution status indicator only. Test files are created within TDD task actions; no separate Wave 0 plan is needed."
    fix_hint: "No action required. Flag will be updated to true after Phase 2 executes."
```

---

## Coverage Summary

| Success Criterion | Automated Coverage | Manual Coverage | Verdict |
|-------------------|-------------------|----------------|---------|
| SC1: LifeLogEntry write/read roundtrip | 02-02 T2: create+get test | — | ✅ |
| SC2a: useLiveQuery re-render on create | 02-02 T3: RTL act()+findByText test | — | ✅ |
| SC2b: survive page refresh | — | Documented in 02-02 + VALIDATION.md | ✅ manual-only, correct |
| SC3: unsynced seam returns null-syncedAt entries | 02-02 T2: listUnsynced filter test | — | ✅ |
| SC4a: manifest.webmanifest emitted with name | 02-03 T3: build artifact grep | — | ✅ |
| SC4b: sw.js + workbox precache emitted | 02-03 T3: build artifact test -f + ls | — | ✅ |
| SC4c: app shell opens offline | — | Documented in 02-03 + VALIDATION.md | ✅ manual-only, correct |
| SC5: offline create persists | — | Documented in 02-03 + VALIDATION.md | ✅ manual-only, correct |

---

## Plan Summary

| Plan | Requirements | Tasks | Files | Wave | File Conflicts | Status |
|------|-------------|-------|-------|------|----------------|--------|
| 02-01 | SETUP-04 | 2 | 8 | 1 | None | ✅ Valid |
| 02-02 | DATA-01..05 | 3 | 4 | 1 | None | ✅ Valid |
| 02-03 | PWA-01..05 | 3 | 11 | 1 | None | ⚠️ 1 warning |

**Recommendation:** Proceed to execution. The three warnings are documentation/latency notes that do not block the phase goal. Run plans in declared Wave 1 order (or in parallel, since they are file-disjoint). Mark `## Open Questions (RESOLVED)` in RESEARCH.md at any convenient point during execution.

---

## PLAN CHECK COMPLETE

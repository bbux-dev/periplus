---
phase: 13-tap-to-capture-flow
verified: 2026-06-17T11:00:00Z
status: human_needed
score: 5/5
overrides_applied: 0
re_verification: false
human_verification:
  - test: "On a physical mobile device, tap a shortcut with an amount hole (e.g. Groceries). Verify the bottom sheet opens, the numeric keypad is thumb-reachable, the preset chips are large enough to tap accurately, and the sheet slides in with the expected animation."
    expected: "Sheet animates open from the bottom; keypad buttons are comfortably tappable one-handed; the live DSL preview updates in real time as keys are pressed."
    why_human: "Touch ergonomics and animation feel are device-specific and cannot be assessed via RTL + fake-indexeddb. All capture logic, preview updates, and save paths are fully automated."
---

# Phase 13: Tap-to-Capture Flow — Verification Report

**Phase Goal:** Tapping a shortcut triggers the correct capture path — immediate entry or fill-the-hole prompt — using the v0.2.0 parseDSL pipeline, with per-shortcut one-tap direct save + undo or ReviewPage routing.
**Verified:** 2026-06-17T11:00:00Z
**Status:** human_needed — all 5 success criteria VERIFIED; one non-blocking human item (touch ergonomics)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Zero-hole `confirm:false` shortcut saves immediately via parseDSL→buildReviewDraft→entriesRepository.create, no prompt | ✓ VERIFIED | `useShortcutCapture.ts:96-127` — confirm checked first; zero-hole path calls `create` and `showToast`. `DashboardPage.test.tsx` CAP-01 integration test (line 178-196): 1 entry in IndexedDB, no dialog rendered. |
| 2 | `confirm:true` shortcut routes through ReviewPage regardless of holes | ✓ VERIFIED | `useShortcutCapture.ts:102-107` — `shortcut.confirm` branch navigates and returns before hole detection (Pitfall 5 correctly avoided). `useShortcutCapture.test.ts:84-98` confirms no IndexedDB write. `DashboardPage.test.tsx` CAP-03 confirm test (line 236-250): `review-probe` rendered, `entriesRepository.list()` empty. |
| 3 | Shortcut with hole(s) opens fill-the-hole sheet; keypad + presets update live DSL preview before capture | ✓ VERIFIED | `HoleSheet.tsx`: 12-key `KEYPAD_KEYS`, 4 `AMOUNT_PRESETS`, live preview via `buildDSLPreview(type, applyFills(baseValues, fills))`. `HoleSheet.test.tsx`: "expense 12:food" after keys 1+2; "expense 20:food" after $20 preset. `DashboardPage.test.tsx` CAP-02 test (line 200-232): dialog opens, keypad works, entry persisted with `amount=12`. |
| 4 | After direct save, "Saved · Undo" toast appears; Undo calls `entriesRepository.delete` and entry is gone | ✓ VERIFIED | `SavedToast.tsx`: `role="status"` + "Saved" text + Undo button. `useShortcutCapture.ts:73-87` (WR-04 fixed): `await delete` succeeds before `setToastEntryId(null)`. `DashboardPage.test.tsx` CAP-03 undo test (line 254-280): toast gone, `entriesRepository.get(savedId) === undefined`. |
| 5 | Named-hole `{}` placeholder makes sheet ask for that named field; no literal `{}` persisted | ✓ VERIFIED | `captureService.ts`: `detectHoles` identifies `merchant:'{}'` as `named:['merchant']`; `cleanValues` strips `'{}'` before `buildReviewDraft`. `HoleSheet.tsx` renders text input (not keypad) for named holes. `DashboardPage.test.tsx` CAP-04 test (line 336-370): merchant input present, no keypad, `metadata.merchant === 'Acme'`, `JSON.stringify(metadata)` does not contain `'{}'`, `amount === 5` (template-provided amount preserved). |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/services/captureService.ts` | Exports `draftToEntry`, `detectHoles`, `cleanValues`, `applyFills`, `buildDSLPreview`, `HOLE_TOKEN`, `HoleMap`; min 60 lines; no default export | ✓ VERIFIED | 199 lines; all 7 named exports present; `grep -c "export default"` → 0; no `warning` string references in `detectHoles` (grep count 0) |
| `src/services/captureService.test.ts` | Unit coverage: zero-hole, positional hole, bare template, named-`{}` hole+strip, multi-hole ordering, buildDSLPreview equality, draftToEntry optional-field omission | ✓ VERIFIED | 357 lines; covers all behavior bullets including WR-01 (dedup) and WR-02 (escaping) fix tests; 40 unit tests |
| `src/pages/ReviewPage.tsx` | Imports and calls `draftToEntry`; inline entry literal removed; `isSafeUrl` gate preserved | ✓ VERIFIED | Line 10: `import { draftToEntry } from '../services/captureService'`; line 122: `entriesRepository.create(draftToEntry(formDraft, ...))`. No `domain: domain as EntryDomain` literal. `grep -c "isSafeUrl"` ≥ 1 |
| `src/components/dashboard/HoleSheet.tsx` | `role="dialog"`, `aria-modal`, `buildDSLPreview`, named export only; min 60 lines | ✓ VERIFIED | 230 lines; line 123: `role="dialog"`, `aria-modal="true"`, `aria-label="Fill in required fields"`; line 14: imports `buildDSLPreview`. No default export. CR-01 fix present: `isValidFill` with `!isNaN(parseFloat(v)) && isFinite(n)` (line 72-81). |
| `src/components/dashboard/HoleSheet.test.tsx` | RTL coverage: keypad/presets update preview; multi-hole ordering; Save disabled until valid (CAP-02); CR-01 lone `.` | ✓ VERIFIED | 169 lines; includes CR-01 tests (lone `.` keeps Save disabled; `.5` enables it) |
| `src/components/dashboard/SavedToast.tsx` | `role="status"`, `onUndo` prop; named export only | ✓ VERIFIED | 40 lines; line 22: `role="status"` + `aria-live="polite"`; `onUndo` called via button click. No default export. |
| `src/components/dashboard/SavedToast.test.tsx` | RTL: Saved text + Undo button render; clicking Undo fires `onUndo` | ✓ VERIFIED | 51 lines; 5 tests including `onUndo` called exactly once |
| `src/hooks/useShortcutCapture.ts` | Exports `useShortcutCapture`; `confirm` check before hole detection; `entriesRepository.create` and `.delete` calls; no default export; min 50 lines | ✓ VERIFIED | 172 lines; line 102: `shortcut.confirm` branch before `detectHoles`; lines 120+79: `entriesRepository.create` and `.delete`. No default export. |
| `src/hooks/useShortcutCapture.test.ts` | Hook decision-tree: bad-template no-op; confirm navigates; zero-hole saves; hole→sheetState; sheet save persists; undo deletes; 4s auto-dismiss | ✓ VERIFIED | 225 lines; 8 tests covering every behavior bullet |
| `src/pages/DashboardPage.tsx` | `useShortcutCapture` wired; `handleTap(s)` on ShortcutRow onClick; `<HoleSheet>` and `<SavedToast>` rendered from hook state | ✓ VERIFIED | Lines 15-17: imports all three. Lines 51-58: hook destructured. Line 77: `onClick={() => handleTap(s)}`. Lines 126-135: conditional `<SavedToast>` and `<HoleSheet>`. No `TODO Phase 13` remnant. |
| `src/pages/DashboardPage.test.tsx` | Integration tests: CAP-01 zero-hole, CAP-02 hole+keypad+preview, CAP-03 confirm route + undo + 4s dismiss, CAP-04 named hole + metadata | ✓ VERIFIED | Lines 176-371: 6 integration tests covering all 5 success criteria |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/pages/ReviewPage.tsx` | `src/services/captureService.ts` | `draftToEntry(formDraft, type, domain)` | ✓ WIRED | Line 10 import + line 122 call |
| `src/services/captureService.ts` | `src/config/entryFields.ts` | `POSITIONAL_SCHEMA[type].filter(...)` | ✓ WIRED | Line 92: `POSITIONAL_SCHEMA[type].filter(k => !cleanVals[k])` |
| `src/components/dashboard/HoleSheet.tsx` | `src/services/captureService.ts` | `buildDSLPreview(type, applyFills(baseValues, fills))` | ✓ WIRED | Line 14 import; lines 67-68: live preview computation |
| `src/pages/DashboardPage.tsx` | `src/hooks/useShortcutCapture.ts` | `const { handleTap, ... } = useShortcutCapture()` | ✓ WIRED | Line 15 import; line 51-58 destructure |
| `src/hooks/useShortcutCapture.ts` | `src/services/entriesRepository.ts` | `create()` on direct save, `delete()` on undo | ✓ WIRED | Line 120: `entriesRepository.create(entry)`; line 79: `entriesRepository.delete(id)` |
| `src/pages/DashboardPage.tsx` | `src/components/dashboard/HoleSheet.tsx` | `{sheetState && <HoleSheet .../>}` | ✓ WIRED | Line 16 import; lines 127-135 conditional render |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `DashboardPage.tsx` — shortcut rows | `activeLayout?.shortcuts` | `useShortcutConfig()` → Dexie `settings` store | Yes — reactive Dexie hook; seeded with `DEFAULT_SHORTCUT_CONFIG` if empty | ✓ FLOWING |
| `useShortcutCapture.ts` — direct save | entry from `draftToEntry(draft, type, domain)` | `parseDSL(template)` → `buildReviewDraft` → `entriesRepository.create` | Yes — persisted to Dexie `entries` store; ID returned in `saved.id` | ✓ FLOWING |
| `HoleSheet.tsx` — live preview | `preview` from `buildDSLPreview(type, applyFills(baseValues, fills))` | `fills` state from keypad/preset/text-input events; `baseValues` from `sheetState` (clean template values) | Yes — pure computation on real user input | ✓ FLOWING |
| `SavedToast.tsx` — visibility | `toastEntryId` (non-null) | `useShortcutCapture.showToast(saved.id)` after `create` | Yes — real IndexedDB-assigned ID | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript build clean | `pnpm tsc -b; echo "EXIT: $?"` | `EXIT: 0` (no output) | ✓ PASS |
| Full test suite green | `pnpm vitest run` | `412 passed (412)` in 5 test files for this phase, 36 total files | ✓ PASS |
| Phase test files specifically | `pnpm vitest run src/services/captureService.test.ts src/hooks/useShortcutCapture.test.ts src/components/dashboard/HoleSheet.test.tsx src/components/dashboard/SavedToast.test.tsx src/pages/DashboardPage.test.tsx` | `94 passed (94)` in 5 files | ✓ PASS |
| CR-01: lone `.` rejected | `HoleSheet.tsx isValidFill`: `parseFloat('.') → NaN; !isNaN(NaN) → false` | HoleSheet.test.tsx test "Save button remains disabled when amount is a lone '.' (CR-01)" passes | ✓ PASS |
| `captureService.ts` has no `warning` string inspection | `grep -c "warning" src/services/captureService.ts` | `0` — uses `POSITIONAL_SCHEMA` comparison exclusively | ✓ PASS |
| No default exports on named-export modules | `grep -c "export default"` on captureService, useShortcutCapture, HoleSheet, SavedToast | All return `0` | ✓ PASS |
| Inline entry literal removed from ReviewPage | `grep "domain: domain as EntryDomain" src/pages/ReviewPage.tsx` | No output | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CAP-01 | 13-01, 13-03 | Zero-hole shortcut captures directly via `parseDSL → buildReviewDraft` pipeline, no field prompt | ✓ SATISFIED | `useShortcutCapture.ts` zero-hole branch; `DashboardPage.test.tsx` CAP-01 integration test; `captureService.test.ts` `draftToEntry` shape tests |
| CAP-02 | 13-02, 13-03 | Hole(s) open fill-the-hole micro-prompt with amount keypad, presets, live DSL preview; multi-hole follows slot order | ✓ SATISFIED | `HoleSheet.tsx` + tests; `DashboardPage.test.tsx` CAP-02 test |
| CAP-03 | 13-02, 13-03 | `confirm:false` → direct save + "Saved · Undo" backed by `entriesRepository.delete`; `confirm:true` → ReviewPage | ✓ SATISFIED | `SavedToast.tsx` + tests; `useShortcutCapture.ts` confirm branch; `DashboardPage.test.tsx` CAP-03 confirm + undo + dismiss tests |
| CAP-04 | 13-01, 13-03 | Named-hole `{}` placeholder convention: detected, sheet asks for named field, `{}` never persisted | ✓ SATISFIED | `captureService.ts` `detectHoles` + `cleanValues`; `DashboardPage.test.tsx` CAP-04 test: `metadata.merchant === 'Acme'`, `amount === 5`, no `{}` in JSON |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/hooks/useShortcutCapture.ts` | 124, 150 | `// WR-05 (deferred): no user-visible error...` | ⚠️ Warning | Create failure is silent to the user (sheet stays open on create error; direct-save failure produces no feedback). Deferred by REVIEW-FIX with documented comments at both catch sites. Not a blocker: IndexedDB errors are rare in a local PWA and the deferred items are tracked. |
| `src/components/dashboard/HoleSheet.tsx` | 108 | `if (!isOpen) return null` (IN-01: unreachable — `isOpen` is always `true` at call site) | ℹ️ Info | Dead code — harmless, no correctness impact. Deferred in REVIEW-FIX. |
| `src/pages/DashboardPage.test.tsx` | 317-325 | Three hardcoded `await Promise.resolve()` yields for fake-timer drain (IN-04) | ℹ️ Info | Fragile test pattern — will break if `handleTap` gains additional `await` points. Deferred in REVIEW-FIX with comment. |

No `TBD`, `FIXME`, or `XXX` markers found in any file modified by this phase.

---

### Human Verification Required

#### 1. Mobile Keypad Ergonomics and Sheet Animation

**Test:** On a physical iOS or Android device, tap a shortcut with an amount hole (e.g. "Groceries" with template `expense :groceries`). Observe the bottom sheet.
**Expected:** The sheet slides in from the bottom with a smooth animation; the 12-key numeric keypad buttons are large enough for comfortable one-thumb tapping; the preset chips ($5, $10, $20, $50) are easy to target; the live DSL preview updates in real time as each key is pressed.
**Why human:** Touch ergonomics (button sizing, hit targets, animation smoothness) are device-specific and cannot be assessed via React Testing Library + fake-indexeddb. All capture logic (preview, save, hole detection) is already verified by automated tests. Per VALIDATION.md this check is explicitly marked non-blocking ("Optional: tap an amount shortcut on a phone").

---

### Gaps Summary

No gaps found. All five success criteria are verified with automated test evidence and source-code inspection. The only item requiring human attention is physical keypad ergonomics, which is non-blocking per the phase's own VALIDATION.md.

**Post-REVIEW fixes confirmed:** CR-01 (amount gate rejects lone `.`), WR-01 (detectHoles deduplication), WR-02 (buildDSLPreview double-quote escape), WR-03 (domain prop removed from HoleSheet), WR-04 (handleUndo dismisses toast only after successful delete), IN-02 (cleanValues called once), IN-03 (CAP-04 test asserts `amount === 5`) — all 7 applied fixes verified in code.

---

_Verified: 2026-06-17T11:00:00Z_
_Verifier: Claude (gsd-verifier)_

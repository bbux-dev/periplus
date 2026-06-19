---
status: passed
phase: 17
verified: 2026-06-18
score: 4/4 must-haves
---

# Phase 17 Verification — Editable & Deletable Saved Entries

Goal-backward check against ROADMAP success criteria (EEDIT-01..03). Evidence: 31 new tests
(full suite 559 passed / 44 files), `tsc -b` clean, `vite build` clean.

| # | Success Criterion | Verdict | Evidence |
|---|-------------------|---------|----------|
| 1 | Edit mode renders the capture field set (ENTRY_FIELDS + buildReviewDraft), pre-populated from the saved entry | ✅ | `EntryEditPage` loads via useEntry, lazy-inits from `formValuesFromEntry`; route `/entries/:id/edit` wired in App.tsx; RTL asserts pre-population |
| 2 | Editing metadata (incl. arbitrary stamped keys) persists via update; detail reflects it | ✅ | "Other metadata" section edits uncovered keys (e.g. `mode`); `buildEntryUpdate` merges; RTL: edit metadata + Save → detail shows new value |
| 3 | Core fields editable; recordedAt immutable | ✅ | amount/occurredAt/title/location editable; `buildEntryUpdate` never writes recordedAt/syncedAt/domain/type (doc + grep + RTL asserts recordedAt unchanged via repo.get) |
| 4 | Delete behind confirm via entriesRepository.delete, returns to entry list | ✅ | inline two-step confirm in EntryDetailPage; RTL: Confirm deletes (repo.get→undefined) + navigates /entries; Cancel is a no-op |

**Design integrity:** metadata MERGED not replaced — unknown keys (future Phase 18 `mode`/
`modeLabel`, URL/DSL capture keys) survive an edit and are themselves editable. Existing
persistence primitives sufficed; `entriesRepository` untouched (no clearing-semantics bug).

**Result:** PASSED — all 4 must-haves verified, no regressions (528 → 559 tests).

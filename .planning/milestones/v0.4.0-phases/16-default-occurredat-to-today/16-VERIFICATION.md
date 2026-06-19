---
status: passed
phase: 16
verified: 2026-06-18
score: 4/4 must-haves
---

# Phase 16 Verification — Default occurredAt to Today

Goal-backward check against ROADMAP success criteria (DATE-01). Evidence: 16 new tests
(full suite 528 passed / 43 files), `tsc -b` clean, `vite build` clean.

| # | Success Criterion | Verdict | Evidence |
|---|-------------------|---------|----------|
| 1 | ReviewPage pre-fills today's local date for a date-bearing type when the draft has no occurredAt | ✅ | `ReviewPage.test.tsx` — fake-timers test asserts the date input shows today's `toLocaleDateString('en-CA')` value |
| 2 | Default is not a lock — user can change or clear the date and the chosen/empty value saves | ✅ | `ReviewPage.test.tsx` — explicit-date preserved; cleared-date saves entry with `occurredAt` undefined |
| 3 | One-tap direct-save writes today's local-midnight epoch when type has a date field and DSL supplied none; local convention preserved | ✅ | `useShortcutCapture.test.tsx` — direct-save + sheet-save assert persisted `occurredAt === Date.parse(\`${today}T00:00:00\`)`; template with explicit `date=` keeps it |
| 4 | Types without an occurredAt field get no invented date | ✅ | `typeHasDateField` gate; `captureService.test.ts` covers unknown/date-less type returns false → `withDefaultOccurredAt` returns draft unchanged |

**Design integrity:** `draftToEntry` left neutral (no defaulting inside it) so the shared
ReviewPage.handleSave path still honors a deliberately cleared date — verified by the
cleared-date test and a grep that `todayLocalMidnight` appears only in the helper.

**Result:** PASSED — all 4 must-haves verified, no regressions.

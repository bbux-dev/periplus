# Phase 13: Tap-to-Capture Flow - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss); design contract = sketch 001 (Variant B amount sheet)

<domain>
## Phase Boundary

Tapping a shortcut triggers the correct capture path — immediate save or a fill-the-hole prompt
— using the v0.2.0 `parseDSL` pipeline, with per-shortcut one-tap direct save + undo OR
ReviewPage routing. Requirements CAP-01, CAP-02, CAP-03, CAP-04.

This phase replaces the Phase-12 placeholder `onClick` no-op on shortcut rows with the real
capture behavior. Import/export (Phase 14) and the authoring tool (Phase 15) remain out of scope.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
Choices at Claude's discretion, guided by ROADMAP goal/success criteria, the design note, the
winning sketch (Variant B amount sheet), and codebase conventions.

### The capture decision tree (per shortcut tap)
1. Parse the shortcut's `dslTemplate` with `parseDSL`.
2. Detect **holes** = empty positional slots (parser emits `empty "<field>" slot` warnings) PLUS
   any **named-hole placeholders** (CAP-04 — see below).
3. Route:
   - **`confirm: true`** → ALWAYS go through the existing `ReviewPage` (regardless of holes), via
     `navigate(`/d/${domain}/${type}/review`, { state: { draft } })` after filling any holes.
   - **`confirm: false` + zero holes** → **direct save** immediately (no prompt): parseDSL →
     buildReviewDraft → create the entry → show a "Saved · Undo" toast (CAP-01, CAP-03).
   - **`confirm: false` + holes** → open the **fill-the-hole sheet**; on submit, splice values into
     the line, then direct save + undo toast (CAP-02, CAP-03).

### Fill-the-hole sheet (CAP-02) — design = sketch 001 Variant B
- A mobile bottom sheet: big right-aligned amount display, quick-amount presets ($5/$10/$20/$50),
  a numeric keypad (one-thumb), and a **live DSL preview** of the resulting line (e.g.
  `expense 12.50:groceries`). Save disabled until a valid value is entered.
- Multi-hole: prompt holes in **template slot order** (then named holes). The amount keypad is the
  primary affordance for numeric/amount holes; non-amount text holes may use a simple text input
  (keep it minimal — the sheet is "good enough to feel", per the sketch, not final).

### Per-shortcut `confirm` + one-tap save + Undo (CAP-03, CAP-04)
- `confirm: false` deliberately bows out of the v0.2.0 "always Review" invariant for trusted
  shortcuts — pair it with an **undo affordance**: a transient "Saved · Undo" toast. Undo calls
  `entriesRepository.delete(id)` (the `create` return value provides the new entry's `id`).
- A headless save path is needed (no ReviewPage UI): turn the parsed `values` into a complete
  `LifeLogEntry` and `entriesRepository.create` it. Study how `ReviewPage` finalizes a draft into
  an entry (defaults like `occurredAt`/`createdAt`, domain/type) and reuse/extract that logic so
  direct save and ReviewPage stay consistent — do NOT duplicate divergent entry-building logic.

### CAP-04 — named-hole placeholder convention (DECIDE IN RESEARCH/PLANNING)
- Empty positional slots are natural holes. Prompting for a **named param** (e.g. `merchant`)
  needs an explicit placeholder token in the template. Pick ONE convention (the design note
  suggests `?` or `{}`); recommend and implement it (e.g. `expense :food?merchant={}` marks
  `merchant` as a hole the sheet asks for). It must NOT break `parseDSL` (the marker is stripped
  before parsing, or recognized as "empty/hole"). Document the chosen token.

</decisions>

<code_context>
## Existing Code Insights — reuse, do not reinvent

- **Parser:** `src/services/dsl/parser.ts` — `parseDSL(input, { defaultType? })` → `{ status,
  type, values, issues, warnings }`. Empty positional slot at index i → warning
  `empty "<schema[i]>" slot` (only when >1 slot present). `status: 'ok'` iff no `issues`.
- **Schemas/mapper:** `src/config/entryFields.ts` — `POSITIONAL_SCHEMA[type]` (slot→field-key
  order), `ENTRY_FIELDS[type]`, `buildReviewDraft(ENTRY_FIELDS[type], values)` → draft.
- **Omnibar reference:** `src/pages/QuickCapturePage.tsx` shows the canonical flow:
  `parseDSL(text)` → resolve `domain` for `parsed.type` → `buildReviewDraft(...)` →
  `navigate(`/d/${domain}/${parsed.type}/review`, { state: { draft } })`. Reuse the domain
  resolution (domain-config) for routing.
- **Review:** `src/pages/ReviewPage.tsx` reads `location.state.draft`, lets the user edit, and on
  save does `entriesRepository.create(entry)` then `navigate(`/d/${domain}`)`. Extract/reuse its
  draft→entry finalization for the headless direct-save path.
- **Repository:** `entriesRepository.create(entry): Promise<LifeLogEntry>` (returns the entry with
  its `id`), `entriesRepository.delete(id)` (for undo) — both already exist (v0.1.0 seam).
- **Shortcut row:** `src/components/dashboard/ShortcutRow.tsx` + `DashboardPage.tsx` (Phase 12)
  have the `onClick` placeholder to replace.
- Conventions: `useLiveQuery` reads; RTL + MemoryRouter tests; `var(--color-*)` tokens;
  mobile-first; `entriesRepository` tests reset Dexie in `beforeEach`.

</code_context>

<specifics>
## Specific Ideas

Deliverables: a capture orchestrator (given a `Shortcut`, decide save vs sheet vs Review and
execute it); the fill-the-hole bottom sheet (keypad + presets + live DSL preview); a "Saved ·
Undo" toast component + undo wiring (`entriesRepository.delete`); the headless direct-save path
(reuse ReviewPage's draft→entry finalize); the CAP-04 named-hole placeholder token + detection;
wire it all into the Phase-12 ShortcutRow tap. Tests must cover all 5 success criteria (zero-hole
direct save, confirm→Review, hole→sheet→save w/ live preview, undo deletes the entry, named-hole
prompt).

</specifics>

<deferred>
## Deferred Ideas

- Import / export config — Phase 14.
- Authoring tool ("+ New", create/edit/reorder, "Save current as shortcut") — Phase 15.
- A fully polished amount sheet (per-type field validation beyond amount, keyboard/keypad parity)
  is noted as a future refinement in the sketch — keep this phase's sheet minimal but functional.

</deferred>

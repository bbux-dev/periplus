# Phase 18: Active Mode Model + Instance Stamping - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped); enriched from design note

<domain>
## Phase Boundary

Build the data/service layer for the "active mode" concept and stamp captures with mode
provenance — BEFORE any navigation UI (that is Phase 19). A "Mode" is the existing v0.3.0
**Layout** reframed as a durable template; activating one starts a labeled **instance**. Persist
the active mode + instance label in Dexie `settings` (mirroring `activeLayoutRepository`). Stamp
every capture made while a mode is active with `metadata.mode` + `metadata.modeLabel` via the
single capture path (`draftToEntry`).

Source: `.planning/notes/active-mode-navigation-design.md`. North star: `seeds/fewest-buttons-slickest.md`.
</domain>

<decisions>
## Implementation Decisions

### Locked by design + codebase conventions
- **No wholesale Layout→Mode rename** (out of scope). "Mode" is the user-facing concept layered
  over `ShortcutConfig.layouts`; the available modes ARE the layout names.
- **Persistence mirrors `activeLayoutRepository`**: a new `settings` key (`activeMode`) storing
  `{ mode: string, label: string }`, with a repository + reactive `useActiveMode()` hook following
  the exact undefined-loading conventions already documented in configRepository.ts. `db.settings`
  accepts arbitrary keys — no schema bump.
- **Stamp in the single capture path**: thread an optional `activeMode` arg through
  `captureService.draftToEntry` so both one-tap save and ReviewPage inherit the stamp. Stamp ONLY
  when `activeMode.mode` is a non-empty string; when no mode is active, write NO `mode`/`modeLabel`
  keys (STAMP-01: no empty/placeholder values).
- **Default instance label** = `<Mode>-<Mon>-<Year>` (e.g. `Travel-Jun-2026`), a pure helper.
- Stamp merges OVER existing draft metadata; the Phase 17 metadata-merge edit path already
  preserves these keys and makes them editable (mis-stamp is fixable after the fact).

### Claude's Discretion
- Whether `activateMode`/`defaultInstanceLabel`/`listModes` live in the new `activeMode.ts` or are
  split; exact label month format (`Jun` short month is fine via `toLocaleString('en-US',{month:'short'})`).
- Reading the active mode at save time via the reactive `useActiveMode()` hook value (current) vs a
  fresh `activeModeRepository.get()` — hook value is acceptable.
</decisions>

<code_context>
## Existing Code Insights

- `src/services/configRepository.ts` — `activeLayoutRepository` (get/put under key `activeLayoutName`)
  + `useActiveLayoutName()` hook: the EXACT pattern to mirror for the new active-mode repo/hook.
- `src/services/db.ts` — `settings` table keyed by `key` (`Setting = {key, value}`); arbitrary keys OK.
- `src/config/shortcutConfig.ts` — `ShortcutConfig.layouts: Layout[]`, each `Layout.name`. The mode
  names derive from here.
- `src/services/captureService.ts` — `draftToEntry(draft, type, domain)` (L168-198) is the single
  entry-construction site; `metadata: draft.metadata ?? {}`. Add the optional stamp here.
- Capture sites that call draftToEntry: `src/pages/ReviewPage.tsx` handleSave (L122); 
  `src/hooks/useShortcutCapture.ts` direct-save (L118) + handleSheetSave (L143). The confirm:true
  path navigates to ReviewPage (no save) — ReviewPage stamps on its own save.
- Test harness: `src/services/configRepository.test.tsx` (db.delete()/open() beforeEach; fake-indexeddb
  auto-hoisted in test-setup). `EntryType`/`EntryDomain` unions in db.ts.
</code_context>

<specifics>
## Specific Ideas

- `ActiveMode = { mode: string; label: string }`. `activeModeRepository.get()` → `ActiveMode|undefined`.
- `defaultInstanceLabel(mode, now=new Date())` → `${mode}-${now.toLocaleString('en-US',{month:'short'})}-${now.getFullYear()}`.
- `activateMode(mode, label?)` → put `{ mode, label: label?.trim() || defaultInstanceLabel(mode) }`.
- `listModes(config)` → `config.layouts.map(l => l.name)` (anchors MODE-01 observably).
- draftToEntry stamp test: with activeMode `{mode:'Travel',label:'Oregon-Jun-2026'}`, the entry's
  metadata has mode/modeLabel; with undefined/empty-mode activeMode, neither key is present.
- Capture-site tests: persist an active mode, then a one-tap save / ReviewPage save produces an entry
  stamped with that mode+label; with no active mode, no stamp keys. (Dexie + fake-Date caveat:
  `toFake:['Date']` only, per Phase 16 note, to avoid hanging awaited writes.)
</specifics>

<deferred>
## Deferred Ideas

- Hamburger "Active Mode" menu + label prompt + app-bar display + dashboard-only-active-mode — all
  Phase 19 (this phase ships NO navigation UI).
- Converging the dashboard's existing `activeLayoutName` onto the active-mode model — Phase 19.
</deferred>

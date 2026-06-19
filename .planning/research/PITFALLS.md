# Pitfalls Research

**Domain:** UI rewrite to trip-only logger over preserved Dexie engine (v0.5.0)
**Researched:** 2026-06-19
**Confidence:** HIGH — all pitfalls sourced from direct code inspection of the live codebase

---

## Critical Pitfalls

### Pitfall 1: Dead test files cause full-suite failure when pages are deleted

**What goes wrong:**
Deleting the 13 page `.tsx` files without simultaneously deleting their `.test.tsx` counterparts causes Vitest module resolution to throw `Cannot find module` errors at the top of each test file. In Vitest's default runner this fails the entire test file, not just individual test cases — the whole suite turns red immediately. With 3,140 lines across 14 page test files, this wipes out a large chunk of the passing count at once. App.test.tsx is especially dangerous because it imports `DashboardPage`, `DomainPage`, `CaptureUrlPage`, `ReviewPage`, and others — all of which are being dropped.

**Why it happens:**
Developers think of deleting the implementation file as a separate PR step from "cleaning up tests later." In a green-CI discipline, deleting the impl without the test is a broken-state commit.

**How to avoid:**
Delete implementation and test files atomically in the same commit. The sequence within each phase should be: (1) delete old page + its test file together, (2) create new page + new test file, (3) run `npx vitest run` to confirm green. Never leave a page file deleted and its test file alive across a commit boundary. For `App.test.tsx` specifically: the entire file must be replaced with new route-coverage tests for the trip-only router in the same phase that rewrites `App.tsx`.

**Warning signs:**
`Cannot find module './pages/DashboardPage'` or similar at test-file import level. All tests in the file fail simultaneously rather than individual test cases.

**Phase to address:**
Phase 1 (UI wipe / route replacement). The delete-and-replace of all 13 page files and their tests must happen atomically in this phase.

---

### Pitfall 2: `useActiveMode() === undefined` conflates loading with no-trip-yet

**What goes wrong:**
`useActiveMode()` returns `undefined` in two distinct situations: (a) while Dexie is still opening its IndexedDB connection (transient), and (b) when no active mode has ever been persisted (the permanent "no trip" state). The new empty-state screen ("Create a Trip") must be shown only in case (b). If the component renders the "Create a Trip" screen whenever `activeMode === undefined`, it flashes briefly on every app load — even for users who have an active trip — until Dexie resolves. The existing code comment in `activeMode.ts` warns explicitly: "Callers MUST handle undefined — undefined means 'loading or no mode active'. Do NOT provide a default value."

**Why it happens:**
The natural implementation of "no active trip → show empty state" is `if (!activeMode) return <CreateTrip />`. This conflates loading with empty. The correct pattern distinguishes the two states with a loading skeleton.

**How to avoid:**
Show a neutral loading skeleton (e.g., a dimmed spinner or empty shell) when `activeMode === undefined`. Only show the "Create a Trip" screen once Dexie has resolved (i.e., after at least one render cycle where `useActiveMode()` is called and returns a defined value — including `undefined` that is distinguished as "Dexie-resolved-but-no-trip"). One pattern: use a `hasLoaded` boolean state set in a `useEffect` watching `activeMode`, or check `db.isOpen()` as a gate. A simpler acceptable pattern: render a brief loading skeleton that is barely perceptible on fast devices, accepting the flash. Do NOT use `const activeMode = useActiveMode() ?? SENTINEL` to mask loading state.

**Warning signs:**
Flash of the "Create a Trip" screen on load even when a trip exists. Tests that skip the loading state and go straight to active-trip content fail intermittently.

**Phase to address:**
Phase 1 (empty state / Trip Home skeleton) or whichever phase introduces the `useActiveMode()` gating logic.

---

### Pitfall 3: UTC midnight off-by-one reintroduced on expense/activity date default

**What goes wrong:**
Any new date-input initialization that uses `new Date().toISOString().substring(0, 10)` or `Date.UTC(...)` will be off by one day in UTC-behind timezones (US West Coast, US East Coast, most of the Americas). `toISOString()` returns UTC time; at 11 PM EST on June 19, it returns `2026-06-20`. The expense "occurred on" date would then default to tomorrow. This bug was discovered and fixed during v0.1.0 (PROJECT.md mentions it by name: "UTC-midnight date off-by-one").

**Why it happens:**
The fix is non-obvious. Developers instinctively reach for `toISOString()` or `new Date().toJSON()` because they look right. The locale-aware alternative (`toLocaleDateString('en-CA')`) is not well-known.

**How to avoid:**
Use the canonical helpers that already exist in `captureService.ts`:
- `todayLocalDate()` — returns a local `'YYYY-MM-DD'` string using `toLocaleDateString('en-CA')`
- `todayLocalMidnightEpoch()` — returns local midnight as epoch ms via `Date.parse(`${todayLocalDate()}T00:00:00`)`
- `withDefaultOccurredAt(draft, type)` — applies the default only when no date is set

Call `withDefaultOccurredAt()` when constructing the draft before calling `draftToEntry()`, mirroring the existing pattern. Do not re-implement date defaulting inline. Any new date input (`<input type="date">`) must be initialized with `todayLocalDate()`.

**Warning signs:**
Date displayed on expense modal is tomorrow's date when testing in US timezone in the evening. Tests using `vi.setSystemTime(new Date('2026-06-18T23:30:00'))` that then check `todayLocalDate()` return the wrong day.

**Phase to address:**
Expense capture phase (any phase that introduces the expense form with a date field).

---

### Pitfall 4: Floating-point money summation in category subtotals and trip totals

**What goes wrong:**
`LifeLogEntry.amount` is stored as a JavaScript `number` (IEEE 754 double-precision float). Summing expense amounts with `entries.reduce((acc, e) => acc + (e.amount ?? 0), 0)` produces floating-point representation errors: `10.10 + 5.20 = 15.299999999999999`. The Trip Detail category subtotals and grand total displays will show these ugly values.

**Why it happens:**
JS has no native decimal type. All arithmetic on fractional numbers is subject to IEEE 754 rounding. This affects addition more than multiplication and is especially bad at two decimal places (currency).

**How to avoid:**
At display time, always format with `amount.toFixed(2)` or `Number(amount.toFixed(2))` before rendering. Never display raw summation results. For the total calculation itself, round after summation: `Math.round(total * 100) / 100`. Do not introduce a cents-as-integer storage strategy mid-milestone — `amount` is already stored as `number` in the schema and changing it would require a Dexie version bump and data migration for existing entries.

**Warning signs:**
Trip total showing `$35.299999999999997` in the expense report. Tests that assert exact equality on summed amounts like `expect(total).toBe(35.30)` failing with floating-point mismatch.

**Phase to address:**
Trip Detail / expense report phase (whichever introduces the category subtotal + trip total UI).

---

### Pitfall 5: Trips with identical names produce merged data and no-unique-trip disambiguation

**What goes wrong:**
A "trip" is an active-mode instance stored as `{ mode: 'trip', label: '<trip name>' }`. Entries are tied to a trip solely by matching `metadata.modeLabel`. If a user creates two trips both named "Paris" (e.g., two separate trips in different years), all their entries share the label "Paris". The Previous Trips list will show one "Paris" entry, and the Trip Detail will intermix expenses and activities from both trips. There is no unique trip ID, no `createdAt` on the trip itself, and no way to disambiguate.

**Why it happens:**
The `activateMode` function does not validate uniqueness — it is an upsert-by-key. There is no trip registry; trips are derived entirely from entry labels.

**How to avoid:**
Generate trip names that include a temporal component by default — the existing `defaultInstanceLabel(mode)` already does this for the general mode pattern: `Travel-Jun-2026`. For trip creation, the default label should include the creation date (e.g., `Paris-Jun-2026`). Optionally, warn at create time if an identical label already appears in entry metadata. Do NOT rely on `activateMode` uniqueness — it has none. If a future milestone needs unique trips, the resolution is to add a trip UUID to metadata at creation time (out of scope for v0.5.0 but worth noting as a seam).

**Warning signs:**
"Previous Trips" list showing one trip when user created two with the same name. Expense totals in Trip Detail appearing higher than expected because they include entries from a different trip period.

**Phase to address:**
Trip creation phase (set the defaulting strategy at create time; document the limitation in the phase spec).

---

### Pitfall 6: `metadata` is unindexed — O(n) scans; avoid N+1 patterns on trip list

**What goes wrong:**
`db.ts` explicitly does NOT index `metadata`: the comment reads "syncedAt/tags/metadata are intentionally NOT indexed." Querying entries for a specific trip requires a full-table filter: `db.entries.filter(e => e.metadata.mode === 'trip' && e.metadata.modeLabel === tripName).toArray()`. This is O(n) over all entries. The Previous Trips list needs a distinct list of all trips (all distinct `modeLabel` values where `mode === 'trip'`) plus per-trip stats (entry count, date range, total expenses). An N+1 implementation that runs one filter per trip is O(trips × n).

**Why it happens:**
Developers model "get entries for trip X" as a parameterized query and call it in a loop over the trip list. Since there's no index, each call scans the full table.

**How to avoid:**
Derive the full trip list and per-trip stats in a single pass: `db.entries.toArray()`, then group by `metadata.modeLabel` in JavaScript. This is one O(n) scan that produces all trips simultaneously. `entriesRepository` already uses this single-pass pattern for `listDistinctValues`. For the Previous Trips page, implement a single `useLiveQuery` that reads all entries once and groups them. Do not implement a `getTripEntries(label)` helper that is called inside a `.map()` over trips.

**Warning signs:**
Multiple consecutive Dexie `.filter()` calls inside a React component's render. A Previous Trips list that visually loads each trip's stats separately (waterfall).

**Phase to address:**
Previous Trips + Trip Detail phase.

---

### Pitfall 7: `EntryType` union in `db.ts` doesn't include `'activity'` or `'trip'`

**What goes wrong:**
The current `EntryType` union in `db.ts` is `'show' | 'movie' | 'book' | 'podcast' | 'place' | 'event' | 'expense'`. The v0.5.0 spec adds `'trip'` (for the trip-creation entry) and `'activity'` (for activity log entries). Calling `draftToEntry(draft, 'activity', 'trips')` without updating the union produces a TypeScript compile error: `Argument of type '"activity"' is not assignable to parameter of type 'EntryType'`. The build and all `tsc -b` checks will fail.

**Why it happens:**
`db.ts` is the authoritative type source — changes cascade to `captureService.ts`, `entryFields.ts`, `navigation.ts`, all test files. Developers sometimes add usage before updating the type.

**How to avoid:**
Updating `db.ts` must be the first change in the first phase that introduces a new entry type. Add `'trip'` and `'activity'` to `EntryType` before writing any code that passes these strings as a type argument. Note: `type` is NOT indexed in Dexie (only `recordedAt` and `domain` are indexed), so adding to the union requires no Dexie schema version bump. Also update `entryFields.ts` so `ENTRY_FIELDS` and `POSITIONAL_SCHEMA` handle the new types (or explicitly guard unknown types with the existing `?? false` / optional-chaining patterns).

**Warning signs:**
`tsc -b` errors citing `'activity'` or `'trip'` as not assignable to `EntryType`. Tests for entry creation with the new types failing at type level before runtime.

**Phase to address:**
Phase 1 (schema / type updates) — the very first code change.

---

### Pitfall 8: `defaultDomainForType('expense')` returns `'expenditures'`, not `'trips'`

**What goes wrong:**
`navigation.ts` hardcodes `if (type === 'expense') return 'expenditures'` in `defaultDomainForType`. The comment in the same file warns: "A flat cross-domain lookup would silently return only the 'trips' instance and miss 'expenditures'." In v0.5.0, expense entries captured through the trip flow must have `domain: 'trips'`, not `domain: 'expenditures'`. If new expense-save code calls `defaultDomainForType` to derive the domain instead of hardcoding `'trips'`, every trip expense will land in the wrong domain, breaking any domain-scoped query.

**Why it happens:**
`defaultDomainForType` looks like a clean abstraction. It's tempting to use it rather than repeat the string `'trips'`.

**How to avoid:**
In the expense-save path inside the trip flow, always explicitly pass `'trips'` as the domain argument to `draftToEntry`. Never call `defaultDomainForType('expense')` in the trip capture path. The `navigation.ts` function is correct for the old multi-domain flow but incorrect for the trip-only flow. Document this in the phase spec as an explicit constraint.

**Warning signs:**
Trip expenses appearing in the `/entries` list under `domain: 'expenditures'` instead of `domain: 'trips'`. The Trip Detail expense report showing no entries because the filter is `e.domain === 'trips'` but stored entries have `e.domain === 'expenditures'`.

**Phase to address:**
Expense capture phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `configRepository` / `shortcutConfig` subsystem as dead code | No refactoring of `activeMode.ts`; tests stay green | ~6 service files + ~400 lines of config test code that test nothing used | Acceptable for v0.5.0 if decoupling is deferred; schedule explicit cleanup in v0.6.0 |
| Show "Create a Trip" on any `undefined` from `useActiveMode` | Simple conditional | Brief flash of empty state on every cold load | Acceptable if a loading skeleton is shown during the flash |
| `toFixed(2)` on display only, no integer-cents storage | No schema migration | Already-stored amounts unchanged | Always acceptable for display; never store cents mid-milestone |
| Reuse `HoleSheet` component as-is for expense amount keypad | No new component | DSL-preview coupling may bleed through | Acceptable only if `HoleSheet` is decoupled from DSL preview in the same phase |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `draftToEntry` + trip stamp | Passing `useActiveMode()` directly before Dexie opens (undefined) — stamps nothing | Gate the save button or check `activeMode != null` before calling `draftToEntry`; the function already guards on `activeMode?.mode` being non-empty |
| `activeModeRepository.put` in tests | Calling inside `act()` but without awaiting Dexie open — first test run returns stale data | Always `await db.delete(); await db.open()` in `beforeEach` before any `activeModeRepository` calls; mirror the pattern in `activeMode.test.tsx` |
| `useLiveQuery` for trip-entry queries | Using `[]` as the dependency array when the query depends on `tripLabel` — query never re-runs when the label changes | Pass `[tripLabel]` as the dependency array; any variable used inside the query factory must appear there |
| `AppShell` rewrite | Removing NAVIGATION imports without removing the hamburger-menu domain links that reference them | Rewrite AppShell completely in the same phase — do not do partial edits that leave dangling references |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 Dexie filter per trip on Previous Trips page | Each trip triggers a separate `filter()` — n trips × scan time | Single-pass grouping: `db.entries.toArray()` once, group in JS | Even at 200 entries and 10 trips this is noticeable on low-end mobile |
| `useEntries()` subscribed on every page that needs any entries | Every entry write (save expense) re-renders all pages that mounted the hook | Use targeted `useLiveQuery` per page (filter inside the query factory, not in render) | Not a correctness issue but causes visible re-render flicker on save |
| Full-config re-render on `useShortcutConfig()` if retained | Config reads on every keystroke in an expense form if AppShell is reading config reactively | Remove `useShortcutConfig` from AppShell when the config UI is gone | Low — only matters if config reactive hook is kept after the config UI is dropped |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No focus trap in expense modal | Keyboard Tab escapes modal to background content; mobile screen readers confused | Implement focus trap: intercept Tab/Shift-Tab within modal bounds; return focus to trigger on close |
| No `overflow: hidden` on body when modal open | Background scrolls behind modal on iOS Safari | Add `document.body.style.overflow = 'hidden'` on modal open, restore on close (or use a CSS class toggle) |
| Star rating built with `<div>` / `<span>` | Inaccessible by keyboard; VoiceOver reads nothing useful | Use `role="radiogroup"` + `role="radio"` with `aria-checked`; or `<button aria-label="N stars">` per star; arrow-key navigation between stars |
| Missing `aria-modal="true"` on the expense/activity modal | Screen reader reads behind the modal | Add `aria-modal="true"` + `role="dialog"` + `aria-label` on the modal container |
| Amount input type="text" instead of type="number" on mobile | No numeric keyboard on iOS | Use `inputMode="decimal"` on a `type="text"` input (not `type="number"` which shows steppers) |
| Tapping a star not registering on iOS | iOS requires a `cursor: pointer` CSS rule on non-`<a>`/non-`<button>` elements for click events | Use actual `<button>` elements for star targets — avoids the iOS tap-event omission on divs |

---

## "Looks Done But Isn't" Checklist

- [ ] **Page deletion:** All 13 page `.tsx` files deleted AND their paired `.test.tsx` files deleted in the same commit — verify `npx vitest run` is green immediately after.
- [ ] **App.test.tsx replacement:** Old route tests deleted, new trip-router tests written covering: `/` with no trip (empty state), `/` with active trip (trip home), previous trips route, trip detail route — not just "doesn't crash."
- [ ] **Expense date default:** Expense form date input initialized with `todayLocalDate()` from `captureService`, NOT `new Date().toISOString().substring(0,10)` — verify with a test that sets `vi.useFakeTimers({ toFake: ['Date'] })` and asserts the local date.
- [ ] **Trip total display:** All amount summations wrapped in `toFixed(2)` or `Math.round(x * 100) / 100` before render — verify by testing with amounts like `10.10` and `5.20` summing to `15.30` not `15.299999...`.
- [ ] **Modal focus trap:** Tab key from last focusable element in modal wraps to first; Escape closes; focus returns to trigger — verify with keyboard-only test using `userEvent.tab()`.
- [ ] **AppShell rewrite:** No remaining imports of `NAVIGATION`, `useShortcutConfig`, or `listModes` in the new AppShell — run `grep -r 'useShortcutConfig\|listModes\|NAVIGATION' src/components/layout/AppShell.tsx` after rewrite.
- [ ] **`EntryType` updated:** `db.ts` `EntryType` union includes `'trip'` and `'activity'` before any save-path code uses them — verify `tsc -b` clean.
- [ ] **Expense domain:** Saved expenses under a trip have `domain: 'trips'` not `domain: 'expenditures'` — add an integration test that saves an expense and asserts `entry.domain === 'trips'`.
- [ ] **Previous Trips single-pass:** Trip list derivation is a single `db.entries.toArray()` grouping, not a per-trip filter call — code review check, not just a passing test.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Dead test files after page deletion | LOW | Delete the test file(s), run suite again; no data loss |
| Floating-point totals already displayed | LOW | Add `.toFixed(2)` at display sites; stored data is fine as-is |
| UTC off-by-one on stored entries | MEDIUM | Cannot retroactively fix stored `occurredAt` values without a migration; fix at source, accept past entries have wrong dates |
| Trips with identical names causing merged data | MEDIUM | No automatic fix for existing entries; add a disambiguation UI in a later milestone (e.g., show `modeLabel + recordedAt range`) |
| Missed focus trap in modal shipped | LOW | CSS/JS-only fix; no data model changes required |
| Wrong domain on stored expenses | HIGH | Requires a data migration to update `domain` field for existing trip expenses; avoid by testing before shipping |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Dead test files on page deletion | Phase 1 (UI wipe) | `npx vitest run` green immediately after deletions |
| `useActiveMode` ambiguity (loading vs. empty) | Phase 1 (routing + empty state) | Test: `useActiveMode` returns undefined on first render, loading skeleton shown, no flash of empty state on active-trip load |
| UTC midnight off-by-one | Expense capture phase | Test with `vi.useFakeTimers({ toFake: ['Date'] })` at 23:00 UTC; assert local date is today |
| Floating-point money summation | Trip Detail / expense report phase | Test: sum `[10.10, 5.20]` → display `"15.30"` not `"15.299..."` |
| Identical trip names | Trip creation phase | Implement date-stamped default label; document known limitation |
| N+1 metadata scan on trip list | Previous Trips phase | Single `db.entries.toArray()` with JS grouping; code review check |
| `EntryType` union incomplete | Phase 1 (schema update) | `tsc -b` clean before any `'activity'` or `'trip'` type usage |
| `defaultDomainForType` used in trip expense save | Expense capture phase | Integration test: saved expense has `domain: 'trips'` |
| Full fake timers stalling Dexie | Every phase adding Dexie-touching tests | All new `vi.useFakeTimers()` calls use `{ toFake: ['Date'] }` option |
| AppShell still references old NAVIGATION | Phase 1 (AppShell rewrite) | `grep -r 'NAVIGATION\|useShortcutConfig'` returns no hits in AppShell after rewrite |
| Modal missing focus trap / a11y | Activity / expense modal phase | `userEvent.tab()` stays within modal; `axe` or manual keyboard test |
| Star rating inaccessible | Activity capture phase | `role="radio"` or `<button>` pattern; keyboard arrow navigation works |

---

## Sources

- Direct code inspection: `src/services/db.ts`, `src/services/activeMode.ts`, `src/services/captureService.ts`, `src/services/entriesRepository.ts`, `src/App.tsx`, `src/App.test.tsx`, `src/components/layout/AppShell.tsx`, `src/config/navigation.ts`
- Project memory: `MEMORY.md` — "Fake timers hang Dexie: Vitest full fake timers stall awaited IndexedDB writes; use `toFake: ['Date']`"
- Project history: `PROJECT.md` — UTC-midnight off-by-one bug documented as a known-and-fixed issue from v0.1.0
- Test file inventory: 14 page test files totaling 3,140 lines, all referencing pages to be dropped
- Existing test patterns: `src/services/activeMode.test.tsx` — demonstrates `{ toFake: ['Date'] }` pattern correctly

---
*Pitfalls research for: v0.5.0 Trips MVP UI Refactor — rewrite to trip-only logger over preserved engine*
*Researched: 2026-06-19*

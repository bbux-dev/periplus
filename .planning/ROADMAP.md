# Roadmap: Life Log

## Overview

Life Log is built bottom-up by dependency. **Milestone v0.1.0 is a tracer bullet** — Phase 1 stands up a runnable app shell with the locked stack and proves the UI → Dexie → IndexedDB → live-read loop with a throwaway counter, deliberately skipping PWA and the real data model. From there the full data layer and PWA/offline shell land together (Phase 2), then the navigation skeleton (Phase 3) that gives the app its spine. With those in place, the product's signature URL-first capture flow lands (Phase 4), followed by the secondary manual-entry path (Phase 5), and finally the read side — entry list, detail, and JSON export (Phase 6). Each phase delivers a coherent, verifiable capability and unblocks the next.

## Milestones

- **v0.1.0 — Tracer Bullet** (Phase 1): App shell + DB-backed counter. _Current._
- **v0.2.0+** (Phases 2–6): Full data layer + PWA, navigation, URL capture, manual entry, view/export.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Foundation & App Shell** — Scaffold the locked stack into a runnable app with a "Life Log" welcome screen and a DB-backed counter tracer _(v0.1.0)_
- [ ] **Phase 2: Data Layer & PWA Shell** — Dexie `LifeLogEntry` + repository with reactive reads, plus an installable, offline-capable PWA shell
- [ ] **Phase 3: Navigation & Dashboard** — Home dashboard, category screens, and routing across all 7 screens
- [ ] **Phase 4: URL-First Capture** — Default paste-URL → extract → review → save flow with offline create
- [ ] **Phase 5: Manual Entry** — Secondary `Enter Manually` path with type-specific forms
- [ ] **Phase 6: Entry List, Detail & Export** — Browse, filter, inspect, and JSON-export all saved entries

## Phase Details

### Phase 1: Foundation & App Shell
**Milestone**: v0.1.0 (tracer bullet)
**Goal**: A runnable app built on the locked stack shows a "Life Log" welcome screen and a counter whose value persists in IndexedDB via Dexie and updates reactively — proving the architecture end-to-end with the thinnest possible slice.
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SHELL-01, DEMO-01
**Success Criteria** (what must be TRUE):
  1. Developer runs the dev server and the app loads a "Life Log" welcome screen on a phone-sized viewport
  2. `tsc -b && vite build` succeeds with the template directory layout (`pages`, `components/ui`, `services`, `state/common`, `config`, `pwa`, `assets`) and the `cn` helper + `Button` primitive present
  3. Tapping the + / − heroicon buttons increments/decrements the counter, and the displayed value updates reactively (`useLiveQuery`)
  4. The counter value is persisted in a Dexie/IndexedDB store and survives a full page refresh
**Plans**: TBD
**UI hint**: yes
**Note**: The counter is a throwaway tracer demo, not a product requirement — it is removed once real capture lands.

### Phase 2: Data Layer & PWA Shell
**Milestone**: v0.2.0+
**Goal**: `LifeLogEntry` records persist locally in IndexedDB through a repository with reactive reads, and the app becomes an installable, offline-capable PWA.
**Depends on**: Phase 1
**Requirements**: SETUP-04, DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, PWA-01, PWA-02, PWA-03, PWA-04, PWA-05
**Success Criteria** (what must be TRUE):
  1. A `LifeLogEntry` can be written and read back from IndexedDB via `entriesRepository`
  2. Stored entries survive a page refresh, and a component using `useLiveQuery` re-renders when entries change
  3. An "unsynced entries" query returns local entries, proving the future-sync seam exists
  4. The app is installable (web manifest + registered service worker) and the app shell opens while offline
  5. A new entry can be created and persisted while offline
**Plans**: TBD

### Phase 3: Navigation & Dashboard
**Milestone**: v0.2.0+
**Goal**: A user can navigate from the home dashboard down to any entry type and back, across all screens.
**Depends on**: Phase 2
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. User sees a Home Dashboard with Media, Trips, and Expenditures root nodes
  2. Selecting a root node shows its entry types (Show/Movie/Book/Podcast, Place/Event/Expense, Expense)
  3. Every screen is reachable through the router on a phone-sized layout
  4. Browser back returns to the previous screen in the navigation tree
**Plans**: TBD
**UI hint**: yes

### Phase 4: URL-First Capture
**Milestone**: v0.2.0+
**Goal**: A user can capture an entry from a pasted URL via the default flow, review extracted metadata, and save it — even offline.
**Depends on**: Phase 2, Phase 3
**Requirements**: SETUP-05, CAPT-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05, CAPT-06
**Success Criteria** (what must be TRUE):
  1. After choosing an entry type, the URL Capture screen is shown by default with a visible (non-default) `Enter Manually` button
  2. Pasting a Google Maps URL and importing lands the user on a Review screen with extracted fields
  3. When extraction yields little, the URL is preserved and Review still opens with available fields
  4. Editing fields on Review and tapping Save persists a `LifeLogEntry` (e.g. a Trip Place from a Google Maps URL)
  5. The `Input` and `FormField` primitives back the capture/review forms
**Plans**: TBD
**UI hint**: yes

### Phase 5: Manual Entry
**Milestone**: v0.2.0+
**Goal**: A user can create any entry type through the secondary manual path with type-appropriate fields.
**Depends on**: Phase 4
**Requirements**: MAN-01, MAN-02, MAN-03
**Success Criteria** (what must be TRUE):
  1. The Manual Entry screen is only reachable by clicking `Enter Manually`
  2. The manual form shows fields appropriate to the entry type (e.g. amount/currency for expenses, name/address for places, creator for media)
  3. A user can create a Media Book entry manually and it saves
  4. A user can create a Trip Expense and an Expenditure Expense manually
**Plans**: TBD
**UI hint**: yes

### Phase 6: Entry List, Detail & Export
**Milestone**: v0.2.0+
**Goal**: A user can browse, filter, and inspect all saved entries and export the whole log as JSON.
**Depends on**: Phase 5
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04, EXP-01
**Success Criteria** (what must be TRUE):
  1. The Entry List shows all saved entries with title, type, date, and amount when present
  2. The user can filter the list by All / Media / Trips / Expenditures
  3. The Entry Detail screen shows the full entry including a metadata JSON preview
  4. Saved entries are still present after a page refresh
  5. The user can export all entries as a JSON file
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & App Shell | 0/TBD | Not started | - |
| 2. Data Layer & PWA Shell | 0/TBD | Not started | - |
| 3. Navigation & Dashboard | 0/TBD | Not started | - |
| 4. URL-First Capture | 0/TBD | Not started | - |
| 5. Manual Entry | 0/TBD | Not started | - |
| 6. Entry List, Detail & Export | 0/TBD | Not started | - |

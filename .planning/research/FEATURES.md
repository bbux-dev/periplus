# Feature Research

**Domain:** Minimal mobile trip logger + expense tracker (personal prototype)
**Researched:** 2026-06-19
**Confidence:** HIGH (spec is opinionated and tight; research validates spec choices and flags gaps)

---

## Context: What This Is and Is Not

v0.5.0 is a UI **rewrite** over an existing engine — not a greenfield product. The engine
(activeMode, entriesRepository, draftToEntry, Dexie/IndexedDB) already works. The research
question is: does the spec's feature set match what users expect from a fast travel cash-register/
logbook, and what must be kept out to prevent scope creep?

All features below are evaluated against the locked spec from PROJECT.md and the "ruthlessly
minimal" constraint. Engine reuse is noted where relevant.

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Engine Reuse | Notes |
|---------|--------------|------------|--------------|-------|
| Create/name a trip | Every travel app has trip-based grouping | LOW | `activeMode` service + `draftToEntry` stamp | Trip = activeMode instance; trip name = modeLabel |
| Empty-state "Create a Trip" screen | Without it the app is a blank wall on first run | LOW | — | Shown when no active mode/trip exists |
| Active trip shown prominently on home | User needs to know which trip is open at a glance | LOW | `useLiveQuery` on activeMode | App bar + Trip Home header |
| Log an expense (amount + category, mandatory) | Core logbook action; must be fast | MEDIUM | `draftToEntry` → `entriesRepository` | Amount and Category are the only required fields |
| Expense category as large tap targets | Category pickers on mobile should never be a dropdown; big buttons are universal convention | LOW | — | Grid of tap targets, not `<select>` |
| Amount entry opens numeric keypad | Universal in every expense logger (TravelSpend, Trail Wallet, Monefy) | LOW | `HoleSheet` component (already built) | `inputmode="decimal"` or existing keypad sheet |
| Date defaults to today | Traveler logs the expense immediately; re-entering today's date every time is a known friction killer | LOW | Already in engine since v0.4.0 (`occurredAt` default) | No date picker needed on fast path |
| Trip defaults to active trip | User should never have to pick "which trip" during steady-state use | LOW | Engine stamps `metadata.mode` + `metadata.modeLabel` automatically via `draftToEntry` | — |
| Log an activity (type → name, optional rating/notes) | Activities are the "logbook" half; without this the app is only a ledger | MEDIUM | `draftToEntry` → `entriesRepository` | Type first (big targets), then form |
| 1-5 star rating on activity | Universally expected "how was it?" signal; star tap-targets are the platform convention | LOW | — | Optional field; tapping a star sets rating |
| Previous trips list (name, date range, total, count) | "What did I spend on my last trip?" is the primary post-trip question | MEDIUM | `entriesRepository` queries + `useLiveQuery` | Newest first; summary row only |
| Per-trip expense report: total + grouped by category | Standard for any expense tracker; users expect subtotals per category | MEDIUM | `entriesRepository` + compute in component | Group by `metadata.category`; subtotal each |
| Expandable category rows in expense report | Drill-down without overwhelming the summary view | LOW | — | Tap to expand; show individual entries |
| Edit/delete entries from trip detail | Mistakes happen; fix-in-place is expected | LOW | `entriesRepository.update` / `.delete` — already built in v0.4.0 | Reuse existing edit/delete flow |

### Differentiators (What Makes This Fast, Not Just Feature-Complete)

These are not required by convention but are what make the prototype feel like a *fast cash-register*
rather than a generic expense form.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Two-tap expense path (Amount → Category → Save) | TravelSpend is cited as the gold standard for this pattern; any more taps and users stop logging by day 3 | LOW | Vendor and Notes are secondary fields, below-fold or collapsed by default |
| Activity type chosen first (big tap targets before form) | Avoids a generic form with a type dropdown; type-first feels intentional and fast | LOW | Hike / Show / Restaurant / Cafe / Other as full-width buttons |
| "Other" activity type adds a required free-text Type field | Handles the long tail without inflating the type list | LOW | Spec already defines this |
| Expense total shown on Trip Home (live) | Instant feedback; no need to navigate to report to see "how am I doing?" | LOW | Reactive query; sums all expense entries for active trip |
| Recent entries on Trip Home | Confirms the last log was saved correctly without navigating away | LOW | Last N entries for active trip; `useLiveQuery` |
| Activity count on Previous Trips list row | Summary at a glance without drilling in | LOW | Count of activity entries per trip |

### Anti-Features (Explicitly Out of Scope for MVP)

These are features that travel apps commonly include and that **will be requested** but must be
explicitly excluded to keep v0.5.0 shippable. Noting them here prevents scope creep during
roadmap and implementation.

| Feature | Why Requested | Why It Is Scope Creep for MVP | What to Do Instead |
|---------|---------------|-------------------------------|-------------------|
| Multi-currency support | International travel involves different currencies | Requires currency conversion API or static table, currency picker on every entry, conversion math in reports — significant complexity | Single currency (user's local currency). Note is an explicit Out of Scope item. |
| Receipt scanning / OCR | "I could just photograph receipts" | Already listed as Out of Scope in PROJECT.md; requires camera API + OCR service; no backend | Manual entry is intentional for cost awareness |
| Budget / spending limits per trip | "How much do I have left?" | Adds budget input on trip creation, threshold warnings, over-budget state — doubles the surface area | Show total spent; leave budget comparison for a future milestone |
| Category percentage breakdown on report | Nice visualization | Adds bar chart / pie chart dependency (recharts, etc.) or manual SVG; not worth it for MVP | Show subtotals in the grouped list; percentages are inferable |
| Daily spending breakdown / chart | Per-day visualization | Same as above; charting dependency | Entries have `occurredAt`; this is a report view for a future milestone |
| Custom expense categories | "I want to add my own" | Requires category management UI, storage schema change, validation — doubles the category surface area | Fixed 7 categories cover the common cases; Other is the escape hatch |
| Split-expense / group travel | "We split the hotel" | Single-user prototype; splitting requires multiple payers, proportional math, a contacts concept | Out of scope; PROJECT.md is explicit about single-user |
| Photo attachments on entries | "I want to attach the receipt photo" | Requires File/Blob storage in IndexedDB, image rendering, and entry schema change | Out of scope for MVP; noted in PROJECT.md |
| Export to CSV or PDF | "I need this for reimbursement" | JSON export already exists; CSV/PDF requires formatting library | Use JSON export for now; CSV is a post-MVP add |
| Mileage / distance tracking | Road trips, "how far did I drive" | Requires GPS or manual odometer input; separate concept from expenses | Out of scope |
| Trip notes / description field | Free-form trip journal | Adds another entry type or meta-field on the trip record | The trip name is the only trip-level metadata; individual entries carry notes |
| Push notifications | "Remind me to log expenses" | PWA push requires a backend (VAPID server); out of scope per PROJECT.md | — |
| Trip duplication / templates | "Clone my last road trip setup" | No per-trip config to clone; trips are just labelled entry groups | Create a new trip with the same name if needed |
| Social sharing / export to friends | "Show my travel budget to my partner" | Single-user, no backend; PROJECT.md is explicit | JSON export is the sharing primitive |
| In-app map / location visualization | "Show me where I spent money" | Requires map library (Leaflet, Mapbox) and geolocation; significant scope | Location is a text field on activities; map view is future |

---

## Expense Categories: Validation

The spec fixes 7 categories: **Hotel, Rental Car, Flight, Taxi/Uber, Food, Gas, Other**.

Research across Trail Wallet, TravelSpend, Trabee Pocket, and standard corporate travel frameworks
confirms this set covers the primary travel spend buckets. Analysis of commonly expected additions:

| Category | Verdict | Rationale |
|----------|---------|-----------|
| **Parking** | CONSIDER adding | Road-trip travel often generates significant parking costs distinct from Gas; commonly its own line in travel expense reports. Parking in "Other" works for MVP but may feel like a misfit. Adding Parking as an 8th category is low-cost and high-value for road-trip users. |
| Groceries (distinct from Food) | Defer | For MVP "Food" covers both restaurant and grocery spend. Sub-categorization is a future feature. |
| Entertainment / Sightseeing | Not needed | Activities are tracked separately as first-class entries. Admission costs can go under Food/Other. |
| Shopping / Souvenirs | Not needed | "Other" is the correct catch-all for non-travel-essential spend. |
| Laundry / Tips / Tolls | Not needed | All absorbed by "Other" without friction. |

**Recommendation:** Ship with the 7 spec categories. If the codebase makes adding an 8th trivial
(it will — it's a string enum), add **Parking** as a category 7a before the Rental Car/Gas cluster.
This is the one missing category that road-trip users will notice immediately. Decision is LOW risk
and LOW complexity.

---

## Feature Dependencies

```
[Create a Trip / activeMode]
    └──required-by──> [Log Expense]
    └──required-by──> [Log Activity]
    └──required-by──> [Trip Home: Expense Total + Recent Entries]
    └──required-by──> [Previous Trips List]
                          └──required-by──> [Trip Detail / Expense Report]
                                               └──required-by──> [Edit/Delete Entries in Report]

[Engine: draftToEntry + metadata.mode stamp]  ──enables──> [Log Expense]
[Engine: draftToEntry + metadata.mode stamp]  ──enables──> [Log Activity]
[Engine: entriesRepository.update/.delete]    ──enables──> [Edit/Delete Entries]
[Engine: entriesRepository + useLiveQuery]    ──enables──> [Trip Home live total + recent]
[Engine: exportEntries]                        ──already-exists──> (no new work needed)
```

### Dependency Notes

- **Trip creation must come first:** All expense and activity logging depends on an active trip
  being set. The empty-state screen is the gating condition.
- **Engine reuse is the key:** `draftToEntry` with `metadata.mode="trip"` and
  `metadata.modeLabel=<trip name>` stamps every entry — no new save path is needed.
- **Previous Trips list depends on query-by-modeLabel:** `entriesRepository` must support
  filtering by `metadata.mode="trip"` and grouping by `metadata.modeLabel`. This is a new
  query pattern over existing data, not a schema change.
- **Expense report grouping is pure compute:** No new storage needed; group/sum happens in the
  component layer over the existing entry shape.

---

## MVP Definition

### Launch With (v0.5.0)

Minimum set to make the Trips MVP usable end-to-end.

- [x] Empty state → Create a Trip (name input → save → activate → Trip Home)
- [x] Trip Home: active trip name, live expense total, recent entries, Expense + Activity buttons
- [x] Log Expense: Amount (numeric keypad, required) → Category (tap targets, required) → save; Vendor + Notes optional
- [x] Expense categories: Hotel, Rental Car, Flight, Taxi/Uber, Food, Gas, Other (+ consider Parking)
- [x] Log Activity: Type (tap targets) → Name (required) + Location/Rating/Notes (optional); Other adds free-text type
- [x] Activity rating: 1-5 stars, tap to set, optional
- [x] Previous Trips list: newest first, name + date range + total expenses + activity count
- [x] Trip Detail: category-grouped expense report (subtotals + grand total), expandable rows, timeline of all entries
- [x] Edit/delete entries from trip detail (reuse existing v0.4.0 edit/delete flow)
- [x] UI rewrite: drop all non-trip screens, reuse engine + `components/ui/*`

### Add After Validation (v0.5.x or v0.6.0)

- [ ] Parking as a dedicated expense category — add if road-trip use is confirmed
- [ ] Per-day expense grouping in trip detail — natural next drill-down
- [ ] End-trip / deactivate-trip action — current model leaves trips open indefinitely

### Future Consideration (v0.7.0+)

- [ ] Budget per trip (set at creation; compare to actuals in report)
- [ ] Category percentage visualization (bar chart on report)
- [ ] CSV / PDF export for reimbursement
- [ ] Multi-currency (requires currency picker + conversion table)
- [ ] Filter entries across all trips (the STAMP-01 provenance enables this)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Create a Trip + empty state | HIGH | LOW | P1 |
| Trip Home screen | HIGH | LOW | P1 |
| Log Expense (fast path) | HIGH | MEDIUM | P1 |
| Expense category tap targets | HIGH | LOW | P1 |
| Log Activity (type first) | HIGH | MEDIUM | P1 |
| 1-5 star rating widget | MEDIUM | LOW | P1 |
| Previous Trips list | HIGH | MEDIUM | P1 |
| Trip Detail + expense report | HIGH | MEDIUM | P1 |
| Expandable category rows | MEDIUM | LOW | P1 |
| Edit/delete in trip detail | MEDIUM | LOW | P1 (engine already built) |
| Parking category | MEDIUM | LOW | P2 |
| Per-day grouping in report | MEDIUM | MEDIUM | P3 |
| Budget / spending limits | MEDIUM | HIGH | P3 (future milestone) |
| Charts / visualization | LOW | HIGH | P3 (future milestone) |
| Multi-currency | MEDIUM | HIGH | P3 (future milestone) |

---

## UX Conventions: Fast-Path Expense Entry

Based on research across TravelSpend, Trail Wallet, and Monefy, the industry-validated
fast-path pattern is:

1. **Tap "Expense" button** (Trip Home) → modal or sheet opens
2. **Amount field is focused immediately** — numeric keypad opens automatically (`inputmode="decimal"`)
3. **Category shown as a grid of tap targets** (not a dropdown) — 3-4 items per row, large touch targets
4. **Date = today** (pre-filled, not shown prominently on fast path — user changes only if needed)
5. **Vendor and Notes are secondary** — below category, collapsed or faint; not blocking the fast path
6. **Save button is always visible** — never buried; accessible after amount + category

The two-tap ideal (TravelSpend's benchmark): amount → category → save. Every additional mandatory
field above these two is a friction point that causes users to stop logging.

The existing `HoleSheet` component (built in v0.3.0 for the shortcut keypad) directly implements
the numeric keypad sheet pattern. It should be adapted or reused for expense amount entry.

---

## UX Conventions: Category-Grouped Expense Report

Industry standard across all surveyed apps (TravelSpend, Trabee Pocket, Trail Wallet):

1. **Grand total prominent at top** — largest number, most visible element
2. **Category rows below** — each row shows: category name, category subtotal
3. **Expandable rows** — tap a category to reveal individual entries (amount, vendor, date, notes)
4. **Entries in chronological order within category** — newest first or oldest first; either works,
   newest first matches the Previous Trips list convention
5. **No charts in MVP** — subtotals in text form are sufficient; charting is a P3 addition

Percentage of total per category (e.g., "Food 34%") is a common nice-to-have but is explicitly
deferred as scope creep for this MVP.

---

## UX Conventions: Previous Trips List

Standard pattern from surveyed apps:

1. **Newest first** — the trip you just took is the one you care about
2. **Summary row only** — name, date range (first entry date → last entry date), total spent, activity count
3. **Tap to drill in** — no swipe actions on the list row in MVP; actions are in the detail view
4. **Active trip distinguished** — the current open trip should be visually distinct (badge, bold, or
   moved to top) so the user knows which trip is still open

---

## Sources

- [TravelSpend Review — The Traveler](https://www.thetraveler.org/travelspend-review-the-best-budget-app-for-long-term-travelers/) — fast-path UX, category grouping, manual-entry philosophy
- [Trail Wallet App Review — The Trek](https://thetrek.co/appalachian-trail/trail-wallet-app-review/) — category set (accommodation, food, transport, entertainment, misc), 2-tap entry
- [TravelSpend vs Spentrip — Spentrip Blog](https://spentrip.app/blog/2025/05/01/travelspend-vs-spentrip-choosing-the-right-travel-expense-tracker) — comparison of minimal travel budget apps
- [Best Travel Budget Apps 2026 — DroidLore](https://droidlore.com/travel/travel-budget-tracking-apps) — overview of category conventions across multiple apps
- [Travel Expense Categorization — FasterCapital](https://fastercapital.com/content/Travel-Expenses--Managing-Travel-Expenses-with-Expense-Categorization.html) — standard category taxonomy
- [Trabee Pocket — TrabeePocket.com](https://trabeepocket.com/) — customizable categories, report patterns
- [7 Best Group Travel Expense Apps 2026 — Moneyku](https://www.moneyku.com/en/blog/7-best-apps-for-group-travel-expense-tracking-in-2026) — quick-tap category pattern
- PROJECT.md — locked spec constraints, existing engine capabilities, Out of Scope list

---

*Feature research for: v0.5.0 Trips MVP UI (Life Log)*
*Researched: 2026-06-19*

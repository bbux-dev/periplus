---
phase: 02-data-layer-pwa-shell
reviewed: 2026-06-15T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/services/db.ts
  - src/services/entriesRepository.ts
  - src/pwa/pwaConfig.ts
  - src/main.tsx
  - src/config/appBrand.ts
  - src/config/publicEnv.ts
  - src/state/common/requestState.ts
  - src/state/common/assertNever.ts
  - vite.config.ts
  - tsconfig.node.json
  - scripts/generate-pwa-icons.mjs
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-15
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Reviewed the Phase 2 data layer and PWA shell implementation: Dexie v2 additive schema upgrade, `entriesRepository` CRUD + sync seam, `useEntries` reactive hook, vite-plugin-pwa config, shared primitives (`requestState`, `assertNever`, `appBrand`, `publicEnv`), and the PNG icon generator.

The Dexie v2 upgrade is structurally correct — omitting `counter` from the `version(2).stores()` call is the proper Dexie pattern for additive upgrades; unlisted stores are preserved automatically. The UUID primary key (`&id` + `crypto.randomUUID()`), the `listUnsynced` null-filter seam (`== null` is intentionally permissive, defended by the comment), `useEntries` with `useLiveQuery`, and the hand-rolled PNG generator are all correct.

Two warnings were found: a silent-failure edge case in `update()`, and a missing manifest attribute that causes Chrome's PWA installability audit to degrade. Two informational findings cover a leftover template asset and a redundant manifest field.

No critical issues.

---

## Warnings

### WR-01: `entriesRepository.update()` silently ignores updates to non-existent entries

**File:** `src/services/entriesRepository.ts:43-45`

**Issue:** `Dexie.Table.update(key, changes)` returns `Promise<number>` — the count of records modified. When the given `id` does not exist in the store, Dexie returns `0` without throwing. The repository wrapper discards this return value and declares `Promise<void>`, making it impossible for callers to distinguish "entry was updated" from "entry did not exist". In practice this means a UI calling `update()` after a concurrent delete (even from another tab) will receive a resolved promise and may display stale state as if the update succeeded.

**Fix:** Return the Dexie count to callers, or throw if no record was matched:

```ts
// Option A — expose the count (callers can decide)
async update(id: string, changes: Partial<Omit<LifeLogEntry, 'id'>>): Promise<number> {
  return db.entries.update(id, changes)
}

// Option B — throw on not-found (fail-fast; simpler caller contract)
async update(id: string, changes: Partial<Omit<LifeLogEntry, 'id'>>): Promise<void> {
  const count = await db.entries.update(id, changes)
  if (count === 0) throw new Error(`entriesRepository.update: entry not found (id=${id})`)
}
```

Option B matches the expectation set by the `get()` API (`undefined` for not-found) and keeps callers from having to check a numeric return in every call site.

---

### WR-02: PWA manifest icons lack `purpose: 'maskable'` — Chrome installability audit fails

**File:** `src/pwa/pwaConfig.ts:21-33`

**Issue:** Neither icon entry in the manifest declares a `purpose` field. Chrome's "installable as PWA" audit (and the Lighthouse PWA category) require at least one icon with `purpose: 'maskable'` or `'any maskable'`. Without it, Chrome degrades the install prompt on Android, and Lighthouse reports a failing PWA audit item. The generated `pwa-512x512.png` is a solid-colour square that is inherently safe for masking (the colour fills edge-to-edge).

**Fix:** Add `purpose: 'any maskable'` to the 512 px icon, which satisfies both the generic display case and the maskable requirement:

```ts
icons: [
  {
    src: 'pwa-192x192.png',
    sizes: '192x192',
    type: 'image/png',
  },
  {
    src: 'pwa-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any maskable',   // ← add this
  },
],
```

---

## Info

### IN-01: `vite.svg` in `includeAssets` is an unreferenced template artifact

**File:** `src/pwa/pwaConfig.ts:11`

**Issue:** `includeAssets: ['favicon.ico', 'vite.svg']` instructs vite-plugin-pwa to explicitly add `vite.svg` to the Workbox precache manifest. The file exists in `public/` (carried over from the Vite scaffold) but is not imported or referenced anywhere in `App.tsx` or any other source file. It will be hashed, injected into the SW precache list, and stored in the user's Cache Storage on every install — wasted space and an extra cache entry to invalidate on each build.

**Fix:** Remove `vite.svg` from `includeAssets` and delete `public/vite.svg`:

```ts
includeAssets: ['favicon.ico'],
```

---

### IN-02: `short_name` duplicates `name` in the web manifest

**File:** `src/pwa/pwaConfig.ts:14-15`

**Issue:** Both `name` and `short_name` are set to `'Life Log'`. The manifest `short_name` is displayed where space is constrained (Android home screen labels, iOS spotlight). Setting it to the same value as `name` is harmless (8 characters is within the 12-character guideline), but it wastes the opportunity to distinguish the two and provides no benefit over omitting `short_name` entirely.

**Fix:** Either omit `short_name` (browsers fall back to `name`) or use a distinct shorter string if branding ever requires one:

```ts
name: APP_NAME,           // 'Life Log'
short_name: 'LifeLog',    // no space saves 1 char; omit entirely if not needed
```

---

_Reviewed: 2026-06-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

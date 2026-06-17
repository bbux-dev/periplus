# End-to-end tests (Playwright)

Browser-level verification for Life Log, as an **intermediate check between the Vitest
unit/RTL suite and full manual testing**. Conventions mirror `patrimonium/apps/e2e`,
adapted for a single Vite app with no backend and no auth.

## Layout

```
e2e/
├── test/
│   ├── fixtures/
│   │   └── test.ts          # re-exports @playwright/test base + expect + buildUniqueText
│   ├── helpers/
│   │   └── quickCapture.ts   # domain helpers that drive the UI and return data
│   └── smoke/
│       └── *.spec.ts         # the smoke suite
└── tsconfig.json             # standalone (NOT part of `tsc -b`); type-checks the specs
playwright.config.ts          # at the repo root (mirrors patrimonium)
```

- **File naming:** `*.spec.ts` (Playwright) vs `*.test.ts(x)` (Vitest, co-located in `src/`).
  Vitest is configured to ignore `e2e/**`, and Playwright's `testDir` is `./e2e`, so the two
  suites never overlap.
- **No `setup` project / no `storageState`:** the app has no auth. (Patrimonium has an
  `auth.setup.ts` project; we don't need one.)
- **No data cleanup:** every test gets a fresh browser context, so IndexedDB starts empty.

## Running

```bash
npm run e2e:install      # one-time: download browser binaries (chromium covers both projects)
npm run e2e:smoke        # the smoke suite on mobile (Pixel 7) + chromium  ← default
npm run e2e:smoke:all    # all projects: mobile, chromium, firefox, webkit
npm run e2e:headed       # chromium, headed (watch it run)
npm run e2e:debug        # Playwright Inspector
npm run e2e:report       # open the last HTML report
npm run e2e:codegen      # record selectors against the running app
```

The config's `webServer` starts `npm run dev` automatically (and reuses an already-running
dev server locally). To run against a deployed/preview build instead, set `E2E_BASE_URL`:

```bash
E2E_BASE_URL=https://my-preview.example npm run e2e:smoke
```

## Conventions

- **Projects:** `mobile` (Pixel 7) is primary — Life Log is a mobile-first PWA — plus
  `chromium`; `firefox`/`webkit` run only in `e2e:smoke:all`. CI-aware retries/workers/timeouts.
- **Selectors (accessibility-first, in order of preference):** `getByRole`, then `getByLabel`
  for form inputs, then `getByText`. `getByTestId` (default `data-testid`) only for dynamic
  content with no better handle. Use regex for case-insensitive matches (`/Review & Save/i`).
- **Helpers over Page Objects:** small functions in `helpers/*.ts` that drive the UI and
  return data for composition (matching patrimonium).
- **Wait for the app's own signals.** Saving is async (IndexedDB write → redirect). Always
  wait for the post-save redirect (`await expect(page).toHaveURL(/\/d\/expenditures$/)`)
  before navigating away, or the write is aborted. Prefer web-first assertions
  (`toBeVisible`, `toHaveURL`) over manual waits.
- **Artifacts:** traces/screenshots/video are retained on failure under `test-results/`;
  the HTML report lands in `playwright-report/`. Both are gitignored.

## Current coverage

`smoke/quick-capture.spec.ts` — the v0.2.0 Quick-Capture DSL omnibar end to end: dashboard
entry point, live parse preview, save through the Review screen and persistence in the
entries list, type-token suggestions (the `p` collision), ambiguous/error states blocking
save, and history-backed value suggestions.

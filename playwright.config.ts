import { defineConfig, devices } from '@playwright/test'

// Conventions mirror patrimonium/apps/e2e/playwright.config.ts, adapted for Life Log:
// a single Vite app at the repo root, no backend and no auth — so there is no `setup`
// project, no storageState, and a single dev server. IndexedDB is isolated per browser
// context, and Playwright gives every test a fresh context, so no data cleanup is needed.

const isCi = Boolean(process.env.CI)

// Overridable so the same specs can run against a preview/deploy: E2E_BASE_URL=...
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 2 : 1,
  timeout: isCi ? 60_000 : 45_000,
  expect: { timeout: isCi ? 10_000 : 7_500 },
  outputDir: 'test-results',
  reporter: isCi
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: isCi ? 15_000 : 10_000,
    navigationTimeout: isCi ? 20_000 : 15_000,
  },

  projects: [
    // Mobile-first PWA: the Pixel viewport is the primary target.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Cross-browser coverage — opt in via `npm run e2e:smoke:all`.
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  // Start the Vite dev server unless one is already running (or E2E_BASE_URL points elsewhere).
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm exec vite --host 127.0.0.1 --port 5173',
        url: baseURL,
        reuseExistingServer: !isCi,
        timeout: isCi ? 180_000 : 120_000,
      },
})

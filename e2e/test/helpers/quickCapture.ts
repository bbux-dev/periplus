import { expect, type Page } from '@playwright/test'

// Domain helpers for the Quick-Capture omnibar flow (mirrors patrimonium's
// helpers/*.ts pattern: functions that drive the UI and return data for composition).

const SHORTHAND_LABEL = 'Quick capture shorthand'

/** Open the Quick-Capture omnibar from the dashboard tile. */
export async function openQuickCapture(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('link', { name: /Quick Capture/i }).click()
  await expect(page.getByLabel(SHORTHAND_LABEL)).toBeVisible()
}

/** Type a DSL string into the omnibar (replacing any existing value). */
export async function typeShorthand(page: Page, text: string): Promise<void> {
  const input = page.getByLabel(SHORTHAND_LABEL)
  await input.fill(text)
}

/**
 * Drive a full Quick-Capture → Review → Save for an expense, returning the title the
 * entry is saved under. The DSL has no title slot for expenses, so we set one on the
 * Review screen before saving (Review is always the confirm step).
 */
export async function captureExpense(
  page: Page,
  shorthand: string,
  title: string,
): Promise<string> {
  await openQuickCapture(page)
  await typeShorthand(page, shorthand)

  // Live preview must report a clean parse before Review & Save is enabled.
  await expect(page.getByText('ok', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Review & Save/i }).click()

  // Pre-filled Review screen — set a title, then save.
  await expect(page.getByRole('heading', { name: /Review/i })).toBeVisible()
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: /^Save$/i }).click()

  // Wait for the post-save redirect so the async IndexedDB write is committed before
  // the caller navigates elsewhere.
  await expect(page).toHaveURL(/\/d\/expenditures$/)

  return title
}

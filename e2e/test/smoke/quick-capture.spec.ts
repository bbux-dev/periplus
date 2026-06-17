import { test, expect, buildUniqueText } from '../fixtures/test'
import {
  openQuickCapture,
  typeShorthand,
  captureExpense,
} from '../helpers/quickCapture'

// End-to-end coverage of the Quick-Capture DSL omnibar (v0.2.0). Each test runs in a
// fresh browser context, so IndexedDB starts empty — no cleanup needed.

test.describe('Quick-Capture omnibar', () => {
  test('dashboard exposes the Quick Capture entry point', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Life Log' })).toBeVisible()
    const link = page.getByRole('link', { name: /Quick Capture/i })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/capture$/)
    await expect(page.getByLabel('Quick capture shorthand')).toBeVisible()
  })

  test('valid shorthand parses live, then saves via the Review screen', async ({ page }) => {
    await openQuickCapture(page)
    await typeShorthand(page, 'expense 12.50:food?merchant=Blue Bottle')

    // Live preview reflects the parse. Use exact matches — the page's help text shows
    // the same example shorthand in a <code> block, so loose text would be ambiguous.
    await expect(page.getByText('ok', { exact: true })).toBeVisible()
    await expect(page.getByText('▸ expense')).toBeVisible()
    await expect(page.getByText('12.50', { exact: true })).toBeVisible()
    await expect(page.getByText('food', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /Review & Save/i }).click()

    // Pre-filled Review screen (the only save path).
    await expect(page.getByRole('heading', { name: /Review/i })).toBeVisible()
    const title = buildUniqueText('e2e-coffee')
    await page.getByLabel('Title').fill(title)
    await page.getByRole('button', { name: /^Save$/i }).click()

    // Wait for the app's own post-save redirect before navigating — otherwise we race
    // the async IndexedDB write and abort it by leaving the page.
    await expect(page).toHaveURL(/\/d\/expenditures$/)

    // Entry persisted — visible in the entries list.
    await page.goto('/entries')
    await expect(page.getByText(title)).toBeVisible()
  })

  test('type-token suggestions resolve the p collision', async ({ page }) => {
    await openQuickCapture(page)
    await typeShorthand(page, 'p')
    await expect(page.getByRole('option', { name: /place/ })).toBeVisible()
    await expect(page.getByRole('option', { name: /podcast/ })).toBeVisible()

    await page.getByRole('option', { name: /place/ }).click()
    await expect(page.getByLabel('Quick capture shorthand')).toHaveValue('place ')
  })

  test('ambiguous input disables Review & Save', async ({ page }) => {
    await openQuickCapture(page)
    await typeShorthand(page, 'p coffee:5')
    await expect(page.getByText('ambiguous', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Review & Save/i })).toBeDisabled()
  })

  test('malformed input surfaces an error and blocks save', async ({ page }) => {
    await openQuickCapture(page)
    await typeShorthand(page, 'book "Dune:Herbert')
    await expect(page.getByText('error', { exact: true })).toBeVisible()
    await expect(page.getByText(/unterminated quote/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Review & Save/i })).toBeDisabled()
  })

  test('value suggestions surface a previously-used category', async ({ page }) => {
    // Seed history by capturing one expense with category "groceries".
    await captureExpense(page, 'expense 9.99:groceries', buildUniqueText('e2e-seed'))

    // Start a new capture; typing the category prefix should suggest the prior value.
    await openQuickCapture(page)
    await typeShorthand(page, 'expense 12:gro')
    const suggestion = page.getByRole('option', { name: /groceries/ })
    await expect(suggestion).toBeVisible()

    await suggestion.click()
    await expect(page.getByLabel('Quick capture shorthand')).toHaveValue('expense 12:groceries')
    await expect(page.getByText('ok', { exact: true })).toBeVisible()
  })
})

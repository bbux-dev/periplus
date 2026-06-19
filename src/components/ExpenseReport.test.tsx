import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import type { LifeLogEntry } from '../services/db'
import { ExpenseReport } from './ExpenseReport'

// Factory — no Dexie needed; pass plain LifeLogEntry arrays to the component
function makeExpense(
  id: string,
  amount: number,
  category?: string,
  merchant?: string,
  title = `Entry ${id}`,
): LifeLogEntry {
  return {
    id,
    domain: 'trips',
    type: 'expense',
    title,
    recordedAt: Date.now(),
    tags: [],
    metadata: {
      ...(category !== undefined ? { category } : {}),
      ...(merchant !== undefined ? { merchant } : {}),
    },
    syncedAt: null,
    amount,
  }
}

describe('ExpenseReport', () => {
  it('renders category subtotals and float-safe grand total ($15.30 for 10.10 + 5.20)', () => {
    const entries: LifeLogEntry[] = [
      makeExpense('e1', 10.1, 'Food'),
      makeExpense('e2', 5.2, 'Hotel'),
    ]
    render(<ExpenseReport entries={entries} />)
    expect(screen.getByText('$10.10')).toBeInTheDocument() // Food subtotal
    expect(screen.getByText('$5.20')).toBeInTheDocument()  // Hotel subtotal
    expect(screen.getByText('$15.30')).toBeInTheDocument() // Grand total (float-safe)
  })

  it('renders categories in EXPENSE_CATEGORIES canonical order (Hotel before Food)', () => {
    const entries: LifeLogEntry[] = [
      makeExpense('e1', 10, 'Food'),
      makeExpense('e2', 5, 'Hotel'),
    ]
    render(<ExpenseReport entries={entries} />)
    const buttons = screen.getAllByRole('button')
    const hotelIdx = buttons.findIndex((b) => b.textContent?.includes('Hotel'))
    const foodIdx = buttons.findIndex((b) => b.textContent?.includes('Food'))
    expect(hotelIdx).toBeLessThan(foodIdx) // Hotel (index 0) < Food (index 4) in EXPENSE_CATEGORIES
  })

  it('does not render categories with no expense entries', () => {
    const entries: LifeLogEntry[] = [makeExpense('e1', 10, 'Food')]
    render(<ExpenseReport entries={entries} />)
    expect(screen.queryByText('Gas')).not.toBeInTheDocument()
    expect(screen.queryByText('Parking')).not.toBeInTheDocument()
    expect(screen.queryByText('Flight')).not.toBeInTheDocument()
  })

  it('renders Uncategorized bucket for expenses with no/non-string category', () => {
    const entries: LifeLogEntry[] = [makeExpense('e1', 7)] // no category
    render(<ExpenseReport entries={entries} />)
    expect(screen.getByText('Uncategorized')).toBeInTheDocument()
    // $7.00 appears both as the Uncategorized subtotal and as the grand total footer
    expect(screen.getAllByText('$7.00').length).toBeGreaterThanOrEqual(1)
  })

  it('clicking a category row reveals individual expense entries (merchant shown first)', async () => {
    const user = userEvent.setup()
    const entries: LifeLogEntry[] = [
      makeExpense('e1', 10.1, 'Food', 'Pizza Palace'),
    ]
    render(<ExpenseReport entries={entries} />)

    // Individual entry is hidden initially (not expanded)
    expect(screen.queryByText('Pizza Palace')).not.toBeInTheDocument()

    // Click the Food category button
    const foodButton = screen.getByRole('button', { name: /food/i })
    await user.click(foodButton)

    // Merchant name is now visible
    expect(screen.getByText('Pizza Palace')).toBeInTheDocument()
  })

  it('falls back to entry title when merchant is not a string', async () => {
    const user = userEvent.setup()
    const entries: LifeLogEntry[] = [
      makeExpense('e1', 15, 'Food', undefined, 'Grocery run'),
    ]
    render(<ExpenseReport entries={entries} />)
    await user.click(screen.getByRole('button', { name: /food/i }))
    expect(screen.getByText('Grocery run')).toBeInTheDocument()
  })

  it('category button aria-expanded is false initially, true after click', async () => {
    const user = userEvent.setup()
    const entries: LifeLogEntry[] = [makeExpense('e1', 10, 'Food')]
    render(<ExpenseReport entries={entries} />)
    const btn = screen.getByRole('button', { name: /food/i })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  it('grand total equals sum of subtotals (float-safe)', () => {
    const entries: LifeLogEntry[] = [
      makeExpense('e1', 10.1, 'Food'),
      makeExpense('e2', 5.2, 'Hotel'),
      makeExpense('e3', 7.0, 'Food'), // accumulates with e1
    ]
    render(<ExpenseReport entries={entries} />)
    // Food subtotal: 10.1 + 7.0 = 17.1 → $17.10
    // Hotel subtotal: 5.2 → $5.20
    // Grand total: 22.3 → $22.30
    expect(screen.getByText('$17.10')).toBeInTheDocument()
    expect(screen.getByText('$5.20')).toBeInTheDocument()
    expect(screen.getByText('$22.30')).toBeInTheDocument()
  })

  it('renders $0.00 grand total gracefully for empty entries', () => {
    render(<ExpenseReport entries={[]} />)
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('non-expense entries (activity, trip) are excluded from report', () => {
    const entries: LifeLogEntry[] = [
      {
        id: 'a1',
        domain: 'trips',
        type: 'activity',
        title: 'Hike',
        recordedAt: Date.now(),
        tags: [],
        metadata: {},
        syncedAt: null,
      },
    ]
    render(<ExpenseReport entries={entries} />)
    // No category rows, grand total is $0.00
    expect(screen.getByText('$0.00')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

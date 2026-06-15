/**
 * Integration tests: ManualEntryPage → ReviewPage → IndexedDB persistence
 *
 * Tests use fake-indexeddb (auto-imported via test-setup.ts) and drive the full
 * fill-in-form → Review → Save flow against a real in-memory IndexedDB.
 *
 * SC3: Book manual entry persists title/description in core fields,
 *      creator/rating in metadata.
 * SC4: Trip Expense manual entry persists entries[0].amount === 45, domain 'trips'.
 * SC4: Expenditure Expense manual entry persists entries[0].amount === 120.5, domain 'expenditures'.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../services/db'
import { entriesRepository } from '../services/entriesRepository'
import { ManualEntryPage } from './ManualEntryPage'
import { ReviewPage } from './ReviewPage'

// ─── DB reset ────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await db.delete()
  await db.open()
})

// ─── Probe component ──────────────────────────────────────────────────────────

/** Renders after Save navigates to /d/:domain */
function DomainProbe() {
  return <div data-testid="domain-probe">Domain Page</div>
}

// ─── Render helper ────────────────────────────────────────────────────────────

function renderManualFlow(domain: string, type: string) {
  return render(
    <MemoryRouter initialEntries={[`/d/${domain}/${type}/manual`]}>
      <Routes>
        <Route path="/d/:domain/:type/manual" element={<ManualEntryPage />} />
        <Route path="/d/:domain/:type/review" element={<ReviewPage />} />
        <Route path="/d/:domain" element={<DomainProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ─── SC3: Book manual → review → save ────────────────────────────────────────

describe('ManualEntryPage integration — SC3: Book manual entry', () => {
  it('persists title/description in core fields and creator/rating in metadata', async () => {
    const user = userEvent.setup()
    renderManualFlow('media', 'book')

    // Fill in the book form on ManualEntryPage
    const titleInput = await screen.findByLabelText('Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Dune')

    const authorInput = screen.getByLabelText('Author')
    await user.clear(authorInput)
    await user.type(authorInput, 'Frank Herbert')

    const ratingInput = screen.getByLabelText('Rating')
    await user.clear(ratingInput)
    await user.type(ratingInput, '5')

    const notesInput = screen.getByLabelText('Notes')
    await user.clear(notesInput)
    await user.type(notesInput, 'A masterpiece of science fiction')

    // Navigate to ReviewPage
    await user.click(screen.getByRole('button', { name: 'Review' }))

    // ReviewPage renders — wait for Save button
    await screen.findByRole('button', { name: 'Save' })

    // Save the entry
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Navigate to domain probe
    await screen.findByTestId('domain-probe')

    // Assert persistence
    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(1)

    const entry = entries[0]
    // Core fields (SC3)
    expect(entry.title).toBe('Dune')
    expect(entry.description).toBe('A masterpiece of science fiction')
    expect(entry.domain).toBe('media')
    expect(entry.type).toBe('book')

    // Metadata fields (SC3) — creator + rating in metadata bag
    expect(entry.metadata.creator).toBe('Frank Herbert')
    expect(entry.metadata.rating).toBe(5)            // stored as number, not string

    // Amount must NOT be set (book has no amount field — Pitfall 1 guard)
    expect(entry.amount).toBeUndefined()
  })
})

// ─── SC4: Trip Expense manual → review → save ────────────────────────────────

describe('ManualEntryPage integration — SC4: Trip Expense manual entry', () => {
  it('persists entries[0].amount === 45 in core field, domain trips', async () => {
    const user = userEvent.setup()
    renderManualFlow('trips', 'expense')

    // Fill in the expense form on ManualEntryPage
    const titleInput = await screen.findByLabelText('Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Coffee')

    const amountInput = screen.getByLabelText('Amount')
    await user.clear(amountInput)
    await user.type(amountInput, '45')

    // Navigate to ReviewPage
    await user.click(screen.getByRole('button', { name: 'Review' }))

    // ReviewPage renders — wait for Save button
    await screen.findByRole('button', { name: 'Save' })

    // Save the entry
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Navigate to domain probe
    await screen.findByTestId('domain-probe')

    // Assert persistence
    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(1)

    const entry = entries[0]
    expect(entry.title).toBe('Coffee')
    // SC4: amount must be on the CORE field, not only in metadata (Pitfall 1)
    expect(entry.amount).toBe(45)
    expect(entry.domain).toBe('trips')
    expect(entry.type).toBe('expense')
  })
})

// ─── SC4: Expenditure Expense manual → review → save ─────────────────────────

describe('ManualEntryPage integration — SC4: Expenditure Expense manual entry', () => {
  it('persists entries[0].amount === 120.5 in core field, domain expenditures', async () => {
    const user = userEvent.setup()
    renderManualFlow('expenditures', 'expense')

    // Fill in the expense form on ManualEntryPage
    const titleInput = await screen.findByLabelText('Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Groceries')

    const amountInput = screen.getByLabelText('Amount')
    await user.clear(amountInput)
    await user.type(amountInput, '120.5')

    // Navigate to ReviewPage
    await user.click(screen.getByRole('button', { name: 'Review' }))

    // ReviewPage renders — wait for Save button
    await screen.findByRole('button', { name: 'Save' })

    // Save the entry
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Navigate to domain probe
    await screen.findByTestId('domain-probe')

    // Assert persistence
    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(1)

    const entry = entries[0]
    expect(entry.title).toBe('Groceries')
    // SC4: amount must be on the CORE field (Pitfall 1)
    expect(entry.amount).toBe(120.5)
    expect(entry.domain).toBe('expenditures')
    expect(entry.type).toBe('expense')
  })
})

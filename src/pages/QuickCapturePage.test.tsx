import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { QuickCapturePage } from './QuickCapturePage'
import { db } from '../services/db'
import { entriesRepository } from '../services/entriesRepository'
import type { ReviewDraft } from '../services/extractMetadataFromUrl'

// ─── Shortcut form probe ──────────────────────────────────────────────────────

function ShortcutFormProbe() {
  const loc = useLocation()
  const state = loc.state as { dslTemplate?: string } | null
  return (
    <div>
      <span data-testid="form-probe">ShortcutForm</span>
      <span data-testid="form-state">{JSON.stringify(state)}</span>
    </div>
  )
}

function renderPageWithShortcutRoute() {
  return render(
    <MemoryRouter initialEntries={['/capture']}>
      <Routes>
        <Route path="/capture" element={<QuickCapturePage />} />
        <Route path="/manage/shortcut" element={<ShortcutFormProbe />} />
        <Route path="/d/:domain/:type/review" element={<ReviewProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

// Probe surfaces the route + the draft passed via location.state.
function ReviewProbe() {
  const loc = useLocation()
  const draft = (loc.state as { draft?: ReviewDraft } | null)?.draft
  return (
    <div>
      <span data-testid="path">{loc.pathname}</span>
      <span data-testid="draft">{JSON.stringify(draft)}</span>
    </div>
  )
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/capture']}>
      <Routes>
        <Route path="/capture" element={<QuickCapturePage />} />
        <Route path="/d/:domain/:type/review" element={<ReviewProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('QuickCapturePage (OMNI-01..04)', () => {
  it('renders the shorthand input', () => {
    renderPage()
    expect(screen.getByLabelText('Quick capture shorthand')).toBeInTheDocument()
  })

  it('shows a live ok preview with parsed fields for a valid expense', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Quick capture shorthand'), 'expense 12.50:food')
    expect(screen.getByText('ok')).toBeInTheDocument()
    expect(screen.getByText('▸ expense')).toBeInTheDocument()
    expect(screen.getByText('12.50')).toBeInTheDocument()
    expect(screen.getByText('food')).toBeInTheDocument()
  })

  it('Review & Save pre-fills the Review screen with the parsed draft', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Quick capture shorthand'), 'expense 12.50:food?merchant=Cafe')
    await user.click(screen.getByRole('button', { name: /Review & Save/i }))

    expect(screen.getByTestId('path').textContent).toBe('/d/expenditures/expense/review')
    const draft = JSON.parse(screen.getByTestId('draft').textContent || '{}') as ReviewDraft
    expect(draft.amount).toBe(12.5)
    expect(draft.metadata).toMatchObject({ category: 'food', merchant: 'Cafe' })
  })

  it('offers type suggestions that resolve single-letter collisions', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Quick capture shorthand'), 'p')
    expect(screen.getByRole('option', { name: /place/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /podcast/ })).toBeInTheDocument()

    await user.click(screen.getByRole('option', { name: /place/ }))
    expect(screen.getByLabelText('Quick capture shorthand')).toHaveValue('place ')
  })

  it('disables Review & Save for ambiguous input', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Quick capture shorthand'), 'p coffee:5')
    expect(screen.getByText('ambiguous')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Review & Save/i })).toBeDisabled()
  })

  it('disables Review & Save and shows the issue for malformed input', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Quick capture shorthand'), 'book "Dune:Herbert')
    expect(screen.getByText('error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Review & Save/i })).toBeDisabled()
  })

  it('suggests category values from prior entries (OMNI-04)', async () => {
    await entriesRepository.create({
      domain: 'expenditures', type: 'expense', title: 'x', recordedAt: 1,
      tags: [], metadata: { category: 'food' }, syncedAt: null,
    })
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Quick capture shorthand'), 'expense 12:fo')

    const option = await screen.findByRole('option', { name: /food/ })
    expect(option).toBeInTheDocument()
    await user.click(option)
    expect(screen.getByLabelText('Quick capture shorthand')).toHaveValue('expense 12:food')
    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument())
  })
})

// ─── EDIT-03: Save as Shortcut button ────────────────────────────────────────

describe('QuickCapturePage — EDIT-03 Save as Shortcut', () => {
  it('Save as Shortcut button is disabled when input is empty', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /Save as Shortcut/i })).toBeDisabled()
  })

  it('Save as Shortcut button is disabled for malformed input (status=error)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Quick capture shorthand'), 'book "Dune:Herbert')
    expect(screen.getByRole('button', { name: /Save as Shortcut/i })).toBeDisabled()
  })

  it('Save as Shortcut button is enabled for a parseable, typed line (status=ok, type!=null)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Quick capture shorthand'), 'expense :food')
    expect(screen.getByRole('button', { name: /Save as Shortcut/i })).not.toBeDisabled()
  })

  it('Save as Shortcut navigates to /manage/shortcut with state { dslTemplate: text } (EDIT-03)', async () => {
    const user = userEvent.setup()
    renderPageWithShortcutRoute()
    await user.type(screen.getByLabelText('Quick capture shorthand'), 'expense :food')
    await user.click(screen.getByRole('button', { name: /Save as Shortcut/i }))

    expect(await screen.findByTestId('form-probe')).toBeInTheDocument()
    const state = JSON.parse(screen.getByTestId('form-state').textContent || '{}')
    expect(state.dslTemplate).toBe('expense :food')
  })
})

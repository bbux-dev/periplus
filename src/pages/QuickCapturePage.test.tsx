import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { QuickCapturePage } from './QuickCapturePage'
import { db } from '../services/db'
import { entriesRepository } from '../services/entriesRepository'
import type { ReviewDraft } from '../services/extractMetadataFromUrl'

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

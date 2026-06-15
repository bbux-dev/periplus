import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { CaptureUrlPage } from './CaptureUrlPage'
import { ManualEntryPage } from './ManualEntryPage'

// ─── MAN-01: reachability ─────────────────────────────────────────────────────

describe('ManualEntryPage — MAN-01 reachability', () => {
  it('clicking "Enter Manually" on CaptureUrlPage navigates to ManualEntryPage', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/d/trips/expense']}>
        <Routes>
          <Route path="/d/:domain/:type" element={<CaptureUrlPage />} />
          <Route path="/d/:domain/:type/manual" element={<ManualEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    // Wait for CaptureUrlPage to render with the Enter Manually button
    const enterManuallyBtn = await screen.findByRole('button', { name: 'Enter Manually' })
    await user.click(enterManuallyBtn)

    // ManualEntryPage should now render — confirm by heading and Review button
    expect(await screen.findByRole('heading', { name: /add expense/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument()
  })
})

// ─── MAN-02: per-type field rendering ────────────────────────────────────────

describe('ManualEntryPage — MAN-02 per-type field rendering', () => {
  it('expense: shows Amount and Currency fields', async () => {
    render(
      <MemoryRouter initialEntries={['/d/trips/expense/manual']}>
        <Routes>
          <Route path="/d/:domain/:type/manual" element={<ManualEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByLabelText('Amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Currency')).toBeInTheDocument()
  })

  it('place: shows Name and Address — does NOT show Title or Location', async () => {
    render(
      <MemoryRouter initialEntries={['/d/trips/place/manual']}>
        <Routes>
          <Route path="/d/:domain/:type/manual" element={<ManualEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Address')).toBeInTheDocument()
    // Place uses 'Name' not 'Title', and 'Address' not 'Location'
    expect(screen.queryByLabelText('Title')).toBeNull()
    expect(screen.queryByLabelText('Location')).toBeNull()
  })

  it('book: shows Author field', async () => {
    render(
      <MemoryRouter initialEntries={['/d/media/book/manual']}>
        <Routes>
          <Route path="/d/:domain/:type/manual" element={<ManualEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByLabelText('Author')).toBeInTheDocument()
  })
})

// ─── WR-01: required field validation ────────────────────────────────────────

describe('ManualEntryPage — WR-01: required field validation', () => {
  it('blocks navigation and shows error when required field is empty', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/d/media/book/manual']}>
        <Routes>
          <Route path="/d/:domain/:type/manual" element={<ManualEntryPage />} />
          <Route path="/d/:domain/:type/review" element={<div data-testid="review-probe">Review</div>} />
        </Routes>
      </MemoryRouter>,
    )

    // Leave the required Title field empty
    await screen.findByRole('button', { name: 'Review' })
    await user.click(screen.getByRole('button', { name: 'Review' }))

    // Navigation must NOT have happened
    expect(screen.queryByTestId('review-probe')).not.toBeInTheDocument()

    // Validation error must appear
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/required/i)
    expect(alert).toHaveTextContent(/title/i)
  })

  it('allows navigation when required field is filled', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/d/media/book/manual']}>
        <Routes>
          <Route path="/d/:domain/:type/manual" element={<ManualEntryPage />} />
          <Route path="/d/:domain/:type/review" element={<div data-testid="review-probe">Review</div>} />
        </Routes>
      </MemoryRouter>,
    )

    const titleInput = await screen.findByLabelText('Title')
    await user.type(titleInput, 'Dune')
    await user.click(screen.getByRole('button', { name: 'Review' }))

    expect(await screen.findByTestId('review-probe')).toBeInTheDocument()
  })
})

// ─── Guards: unknown domain / type ───────────────────────────────────────────

describe('ManualEntryPage — guards', () => {
  it('renders graceful error for unknown domain (no form rendered)', async () => {
    render(
      <MemoryRouter initialEntries={['/d/fakeDomain/book/manual']}>
        <Routes>
          <Route path="/d/:domain/:type/manual" element={<ManualEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText(/unknown domain/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Review' })).toBeNull()
  })

  it('renders graceful error for unknown type (no form rendered)', async () => {
    render(
      <MemoryRouter initialEntries={['/d/trips/fakeType/manual']}>
        <Routes>
          <Route path="/d/:domain/:type/manual" element={<ManualEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText(/unknown type/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Review' })).toBeNull()
  })
})

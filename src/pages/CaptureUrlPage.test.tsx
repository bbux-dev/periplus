import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { CaptureUrlPage } from './CaptureUrlPage'

// ─── Inline probe routes ──────────────────────────────────────────────────────
// ReviewPage and ManualPage are built in parallel plans 04-04 / 04-05.
// These lightweight probes assert that navigation reached the correct route
// and that location.state carries the expected draft (CAPT-02 / SC2).

function ReviewProbe() {
  const location = useLocation()
  const state = location.state as {
    draft?: { title?: string; sourceUrl?: string }
  } | null
  const draft = state?.draft
  return (
    <div>
      <span data-testid="review-title">{draft?.title ?? ''}</span>
      <span data-testid="review-source-url">{draft?.sourceUrl ?? ''}</span>
    </div>
  )
}

function ManualProbe() {
  return <div data-testid="manual-route-reached">Manual Entry</div>
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2944813,17z'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderAtPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/d/:domain/:type" element={<CaptureUrlPage />} />
        <Route path="/d/:domain/:type/review" element={<ReviewProbe />} />
        <Route path="/d/:domain/:type/manual" element={<ManualProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CaptureUrlPage', () => {
  // CAPT-01 / SC1: Render — heading, URL input, both action buttons visible
  it('renders "Add Place" heading, URL textbox, Import button, and Enter Manually button', async () => {
    renderAtPath('/d/trips/place')
    expect(
      await screen.findByRole('heading', { name: /add place/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /url/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /import from url/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /enter manually/i }),
    ).toBeInTheDocument()
  })

  // CAPT-01: Import button disabled while URL is empty; enabled once URL is typed
  it('Import button is disabled when URL field is empty and enabled after typing', async () => {
    const user = userEvent.setup()
    renderAtPath('/d/trips/place')
    const importBtn = await screen.findByRole('button', {
      name: /import from url/i,
    })
    expect(importBtn).toBeDisabled()

    await user.type(screen.getByRole('textbox', { name: /url/i }), 'https://example.com')
    expect(importBtn).toBeEnabled()
  })

  // CAPT-02 / SC2: Import → navigate to review with extracted draft in location.state
  it('typing a Google Maps URL and clicking Import carries the extracted draft to the review route', async () => {
    const user = userEvent.setup()
    renderAtPath('/d/trips/place')
    await screen.findByRole('heading', { name: /add place/i })

    await user.type(
      screen.getByRole('textbox', { name: /url/i }),
      GOOGLE_MAPS_URL,
    )
    await user.click(screen.getByRole('button', { name: /import from url/i }))

    // ReviewProbe renders the draft passed via location.state
    expect(await screen.findByTestId('review-title')).toHaveTextContent(
      'Eiffel Tower',
    )
    expect(screen.getByTestId('review-source-url')).toHaveTextContent(
      GOOGLE_MAPS_URL,
    )
  })

  // CAPT-06: "Enter Manually" navigates to the manual route (secondary action)
  it('"Enter Manually" navigates to the manual route; both buttons are rendered (Import is the primary action)', async () => {
    const user = userEvent.setup()
    renderAtPath('/d/trips/place')
    await screen.findByRole('heading', { name: /add place/i })

    // Assert both buttons are present before any interaction
    expect(
      screen.getByRole('button', { name: /import from url/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /enter manually/i }),
    ).toBeInTheDocument()

    // Type a URL to confirm Import becomes the enabled primary action
    await user.type(screen.getByRole('textbox', { name: /url/i }), 'https://example.com')
    expect(
      screen.getByRole('button', { name: /import from url/i }),
    ).toBeEnabled()

    // Click Enter Manually — navigate to the manual probe route
    await user.click(screen.getByRole('button', { name: /enter manually/i }))
    expect(await screen.findByTestId('manual-route-reached')).toBeInTheDocument()
  })
})

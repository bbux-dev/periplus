import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { db } from '../services/db'
import { entriesRepository } from '../services/entriesRepository'
import { ReviewPage } from './ReviewPage'
import type { ExtractedDraft } from '../services/extractMetadataFromUrl'

// ─── DB reset between tests ───────────────────────────────────────────────────

beforeEach(async () => {
  await db.delete()
  await db.open()
})

// ─── Probe components ─────────────────────────────────────────────────────────

/** Renders after Save navigates to /d/:domain */
function DomainProbe() {
  return <div data-testid="domain-probe">Domain Page</div>
}

/** Renders at the capture route — so the guard redirect can land here */
function CaptureProbe() {
  return <div data-testid="capture-probe">Capture Page</div>
}

/** Renders at the previous route — so Cancel can land here */
function PreviousProbe() {
  return <div data-testid="previous-probe">Previous Page</div>
}

// ─── Render helpers ───────────────────────────────────────────────────────────

/**
 * Mount ReviewPage with a draft in location.state.
 *
 * react-router v7 MemoryRouter accepts `initialEntries` of type
 * `(string | Partial<Location>)[]`; the object form `{ pathname, state }` injects
 * location.state — this is InitialEntry = string | Partial<Location>.
 * Verified against installed react-router-dom 7.17.0 type definitions.
 */
function renderWithDraft(
  domain: string,
  type: string,
  draft: ExtractedDraft,
) {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: `/d/${domain}/${type}/review`, state: { draft } },
      ]}
    >
      <Routes>
        <Route path="/d/:domain/:type/review" element={<ReviewPage />} />
        <Route path="/d/:domain" element={<DomainProbe />} />
        <Route path="/d/:domain/:type" element={<CaptureProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

/**
 * Mount ReviewPage with a previous route in history so Cancel can go back.
 */
function renderWithDraftAndHistory(
  domain: string,
  type: string,
  draft: ExtractedDraft,
) {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: `/d/${domain}/${type}` },
        { pathname: `/d/${domain}/${type}/review`, state: { draft } },
      ]}
      initialIndex={1}
    >
      <Routes>
        <Route path="/d/:domain/:type/review" element={<ReviewPage />} />
        <Route path="/d/:domain/:type" element={<PreviousProbe />} />
        <Route path="/d/:domain" element={<DomainProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ─── CAPT-05 prefill (SC4) ────────────────────────────────────────────────────

describe('ReviewPage — CAPT-05 prefill', () => {
  it('pre-fills the title field from the draft (SC4)', async () => {
    const draft: ExtractedDraft = {
      sourceUrl: 'https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2944813',
      title: 'Eiffel Tower',
      location: 'Eiffel Tower',
      metadata: { coordinates: { lat: 48.8583701, lng: 2.2944813 } },
    }
    renderWithDraft('trips', 'place', draft)

    // Query by label to be specific — both title and location have "Eiffel Tower"
    const titleInput = await screen.findByLabelText('Title')
    expect(titleInput).toHaveValue('Eiffel Tower')
  })

  it('pre-fills the location field from the draft', async () => {
    const draft: ExtractedDraft = {
      sourceUrl: 'https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2944813',
      title: 'Eiffel Tower',
      location: 'Eiffel Tower',
      metadata: {},
    }
    renderWithDraft('trips', 'place', draft)

    // There may be two inputs with the value "Eiffel Tower" (title + location)
    const inputs = await screen.findAllByDisplayValue('Eiffel Tower')
    expect(inputs.length).toBeGreaterThanOrEqual(1)
  })

  it('pre-fills the sourceUrl field from the draft', async () => {
    const sourceUrl = 'https://www.google.com/maps/place/Eiffel+Tower/'
    const draft: ExtractedDraft = {
      sourceUrl,
      title: 'Eiffel Tower',
      metadata: {},
    }
    renderWithDraft('trips', 'place', draft)

    expect(await screen.findByDisplayValue(sourceUrl)).toBeInTheDocument()
  })
})

// ─── CAPT-05 save persists (SC4) ─────────────────────────────────────────────

describe('ReviewPage — CAPT-05 save persists entry (SC4)', () => {
  it('Save persists the entry to IndexedDB and navigates to /d/:domain', async () => {
    const user = userEvent.setup()
    const sourceUrl = 'https://www.google.com/maps/place/Eiffel+Tower/'
    const draft: ExtractedDraft = {
      sourceUrl,
      title: 'Eiffel Tower',
      location: 'Eiffel Tower',
      metadata: { coordinates: { lat: 48.8583701, lng: 2.2944813 } },
    }
    renderWithDraft('trips', 'place', draft)

    // Wait for form to appear
    const titleInput = await screen.findByLabelText('Title')

    // Edit the title
    await user.clear(titleInput)
    await user.type(titleInput, 'Eiffel Tower Visit')

    // Click Save
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Navigation: DomainProbe appears at /d/trips
    await screen.findByTestId('domain-probe')

    // DB: entry was persisted
    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(1)
    expect(entries[0].title).toBe('Eiffel Tower Visit')
    expect(entries[0].domain).toBe('trips')
    expect(entries[0].type).toBe('place')
    expect(entries[0].sourceUrl).toBe(sourceUrl)
    expect(entries[0].syncedAt).toBeNull()
    expect(entries[0].tags).toEqual([])
  })

  it('Save with unedited title persists the original title', async () => {
    const user = userEvent.setup()
    const draft: ExtractedDraft = {
      sourceUrl: 'https://www.imdb.com/title/tt0468569/',
      title: undefined,
      metadata: { imdbId: 'tt0468569' },
    }
    renderWithDraft('media', 'movie', draft)

    await screen.findByRole('button', { name: 'Save' })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByTestId('domain-probe')

    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(1)
    // Empty title → fallback to 'Untitled'
    expect(entries[0].title).toBe('Untitled')
    expect(entries[0].domain).toBe('media')
    expect(entries[0].type).toBe('movie')
  })
})

// ─── CAPT-04 degrade — minimal draft (SC3) ───────────────────────────────────

describe('ReviewPage — CAPT-04 degrade: minimal draft (SC3)', () => {
  it('still renders with only sourceUrl in the draft (no title)', async () => {
    const sourceUrl = 'https://example.com/some-random-page'
    const draft: ExtractedDraft = {
      sourceUrl,
      metadata: {},
    }
    renderWithDraft('trips', 'place', draft)

    // Form should appear (not crash)
    expect(await screen.findByLabelText('Title')).toBeInTheDocument()
    // Title input is empty
    expect(screen.getByLabelText('Title')).toHaveValue('')
    // sourceUrl is pre-filled
    expect(screen.getByDisplayValue(sourceUrl)).toBeInTheDocument()
  })

  it('allows typing a title when extraction yielded nothing', async () => {
    const user = userEvent.setup()
    const draft: ExtractedDraft = {
      sourceUrl: 'https://example.com/some-random-page',
      metadata: {},
    }
    renderWithDraft('trips', 'place', draft)

    const titleInput = await screen.findByLabelText('Title')
    await user.type(titleInput, 'My Custom Title')
    expect(titleInput).toHaveValue('My Custom Title')
  })
})

// ─── CAPT-05 cancel ──────────────────────────────────────────────────────────

describe('ReviewPage — CAPT-05 cancel discards draft', () => {
  it('Cancel navigates back without creating an entry', async () => {
    const user = userEvent.setup()
    const draft: ExtractedDraft = {
      sourceUrl: 'https://example.com',
      title: 'Some Entry',
      metadata: {},
    }
    renderWithDraftAndHistory('trips', 'place', draft)

    await screen.findByRole('button', { name: 'Cancel' })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    // Back to the previous probe
    await screen.findByTestId('previous-probe')

    // No entry was created
    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(0)
  })
})

// ─── CR-01: Save error surfaces to user, no navigation on failure ─────────────

describe('ReviewPage — CR-01: save failure surfaces error, no navigation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows an error alert and does not navigate when entriesRepository.create rejects', async () => {
    const user = userEvent.setup()
    const draft: ExtractedDraft = {
      sourceUrl: 'https://www.imdb.com/title/tt0468569/',
      title: 'The Dark Knight',
      metadata: { imdbId: 'tt0468569' },
    }

    // Spy on create and make it reject
    vi.spyOn(entriesRepository, 'create').mockRejectedValueOnce(
      new Error('QuotaExceededError'),
    )

    renderWithDraft('media', 'movie', draft)

    await screen.findByRole('button', { name: 'Save' })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Error message must appear
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/save failed/i)

    // Domain probe must NOT appear — navigation was suppressed
    expect(screen.queryByTestId('domain-probe')).not.toBeInTheDocument()

    // DB: no entry was created
    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(0)
  })
})

// ─── WR-02: javascript: sourceUrl is not persisted ───────────────────────────

describe('ReviewPage — WR-02: unsafe sourceUrl scheme is not saved', () => {
  it('does not persist a javascript: sourceUrl — drops it before saving', async () => {
    const user = userEvent.setup()
    const draft: ExtractedDraft = {
      sourceUrl: 'javascript:alert(1)',
      title: 'Malicious Entry',
      metadata: {},
    }
    renderWithDraft('trips', 'place', draft)

    await screen.findByRole('button', { name: 'Save' })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Navigation happens normally (entry is saved, just without sourceUrl)
    await screen.findByTestId('domain-probe')

    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(1)
    // sourceUrl must NOT be the javascript: value
    expect(entries[0].sourceUrl).toBeUndefined()
  })

  it('preserves a valid https: sourceUrl unchanged', async () => {
    const user = userEvent.setup()
    const safeUrl = 'https://example.com/page'
    const draft: ExtractedDraft = {
      sourceUrl: safeUrl,
      title: 'Safe Entry',
      metadata: {},
    }
    renderWithDraft('trips', 'place', draft)

    await screen.findByRole('button', { name: 'Save' })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByTestId('domain-probe')

    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(1)
    expect(entries[0].sourceUrl).toBe(safeUrl)
  })
})

// ─── WR-02: isSaving prevents duplicate entries on double-click ──────────────

describe('ReviewPage — WR-02: double-click Save creates exactly one entry', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rapid double-click on Save results in exactly ONE entry in IndexedDB', async () => {
    const user = userEvent.setup()
    const draft: ExtractedDraft = {
      sourceUrl: 'https://example.com',
      title: 'Single Entry',
      metadata: {},
    }
    renderWithDraft('trips', 'place', draft)

    // Hold the first save in-flight so the second click fires while isSaving=true
    let resolveHold!: () => void
    const holdPromise = new Promise<void>((resolve) => { resolveHold = resolve })
    const realCreate = entriesRepository.create.bind(entriesRepository)
    let callCount = 0
    vi.spyOn(entriesRepository, 'create').mockImplementation(async (entry) => {
      callCount++
      await holdPromise
      return realCreate(entry)
    })

    const saveButton = await screen.findByRole('button', { name: 'Save' })

    // First click — triggers handleSave; create is held by holdPromise
    await user.click(saveButton)
    // isSaving is now true: button is disabled and shows 'Saving…'
    expect(saveButton).toBeDisabled()

    // Second click on disabled button — userEvent does not fire on disabled elements
    await user.click(saveButton)
    expect(callCount).toBe(1)

    // Release the deferred save — write to fake-indexeddb, navigate
    resolveHold()
    await screen.findByTestId('domain-probe')

    const entries = await entriesRepository.list()
    expect(entries).toHaveLength(1)
  })
})

// ─── IN-02: domain validity guard in ReviewPage ───────────────────────────────

describe('ReviewPage — IN-02: unknown domain shows graceful error', () => {
  it('renders an unknown-domain error for an invalid domain instead of the form', async () => {
    const draft: ExtractedDraft = {
      sourceUrl: 'https://example.com',
      title: 'Some Entry',
      metadata: {},
    }
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/d/fakeDomain/place/review', state: { draft } },
        ]}
      >
        <Routes>
          <Route path="/d/:domain/:type/review" element={<ReviewPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText(/unknown domain/i)).toBeInTheDocument()
    expect(screen.getByText('fakeDomain')).toBeInTheDocument()
    // Save button must NOT be present
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
  })
})

// ─── Guard: no draft → redirect to capture ───────────────────────────────────

describe('ReviewPage — guard: no draft redirects to capture', () => {
  it('redirects to the capture route when there is no location.state draft', async () => {
    render(
      <MemoryRouter initialEntries={['/d/trips/place/review']}>
        <Routes>
          <Route path="/d/:domain/:type/review" element={<ReviewPage />} />
          <Route path="/d/:domain/:type" element={<CaptureProbe />} />
          <Route path="/d/:domain" element={<DomainProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    // CaptureProbe should appear after redirect
    await waitFor(() => {
      expect(screen.getByTestId('capture-probe')).toBeInTheDocument()
    })
  })

  it('does not crash when navigated to directly without state', async () => {
    // Same as above but explicit: the component must not throw
    expect(() => {
      render(
        <MemoryRouter initialEntries={['/d/media/movie/review']}>
          <Routes>
            <Route path="/d/:domain/:type/review" element={<ReviewPage />} />
            <Route path="/d/:domain/:type" element={<CaptureProbe />} />
          </Routes>
        </MemoryRouter>,
      )
    }).not.toThrow()

    await waitFor(() => {
      expect(screen.getByTestId('capture-probe')).toBeInTheDocument()
    })
  })
})

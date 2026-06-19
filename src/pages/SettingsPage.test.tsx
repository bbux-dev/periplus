import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { triggerDownload } from '../services/exportEntries'
import { SettingsPage } from './SettingsPage'

// Mock triggerDownload so jsdom does not throw on Blob/URL.createObjectURL.
vi.mock('../services/exportEntries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/exportEntries')>()
  return {
    ...actual,
    triggerDownload: vi.fn(),
  }
})

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it
beforeEach(async () => {
  await db.delete()
  await db.open()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

// ─── Test 1: renders page controls ───────────────────────────────────────────

describe('SettingsPage — page controls', () => {
  it('renders Settings heading and Export JSON button; no Import UI present', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: /Settings/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export JSON/i })).toBeInTheDocument()
    // No import button or file input present
    expect(screen.queryByText(/Import JSON/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Choose config file/i)).not.toBeInTheDocument()
  })
})

// ─── Test 2: Export triggers download ────────────────────────────────────────

describe('SettingsPage — Export (UI-03)', () => {
  it('calls triggerDownload with life-log.json filename when Export JSON is clicked', async () => {
    renderPage()
    await screen.findByRole('heading', { name: /Settings/i })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Export JSON/i }))

    expect(vi.mocked(triggerDownload)).toHaveBeenCalledOnce()
    const [, filenameArg] = vi.mocked(triggerDownload).mock.calls[0]
    expect(filenameArg).toBe('life-log.json')
  })
})

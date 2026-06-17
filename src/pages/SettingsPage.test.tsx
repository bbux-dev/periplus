import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { configRepository } from '../services/configRepository'
import { triggerDownload } from '../services/configPort'
import type { ShortcutConfig } from '../config/shortcutConfig'
import { SettingsPage } from './SettingsPage'

// Mock triggerDownload so jsdom does not throw on Blob/URL.createObjectURL.
// Keep the real buildConfigExportJson and importConfig so they are fully exercised.
vi.mock('../services/configPort', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/configPort')>()
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

/** Minimal valid ShortcutConfig for seeding and import tests. */
function makeValidConfig(overrides?: Partial<ShortcutConfig>): ShortcutConfig {
  return {
    version: 1,
    layouts: [
      {
        name: 'TestLayout',
        shortcuts: [],
      },
    ],
    ...overrides,
  }
}

/** Construct a File containing the JSON of any value — jsdom supports new File([...], name). */
function makeConfigFile(config: unknown): File {
  return new File([JSON.stringify(config)], 'shortcuts.json', {
    type: 'application/json',
  })
}

// ─── Test 1: renders page controls ───────────────────────────────────────────

describe('SettingsPage — page controls', () => {
  it('renders heading, Export JSON button, and Import JSON button with labelled file input', async () => {
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })

    renderPage()

    expect(
      await screen.findByRole('heading', { name: /Shortcuts Config/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export JSON/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Import JSON/i })).toBeInTheDocument()
    // Hidden file input — findable by aria-label (sr-only hides it visually, not from AT)
    expect(screen.getByLabelText(/Choose config file/i)).toBeInTheDocument()
  })
})

// ─── Test 2: Export (PORT-01) ─────────────────────────────────────────────────

describe('SettingsPage — Export (PORT-01)', () => {
  it('calls triggerDownload once with config-derived JSON and filename life-log-shortcuts.json', async () => {
    const config = makeValidConfig()
    await act(async () => {
      await configRepository.put(config)
    })

    renderPage()
    await screen.findByRole('heading', { name: /Shortcuts Config/i })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Export JSON/i }))

    expect(vi.mocked(triggerDownload)).toHaveBeenCalledOnce()
    const [jsonArg, filenameArg] = vi.mocked(triggerDownload).mock.calls[0]
    expect(filenameArg).toBe('life-log-shortcuts.json')
    // buildConfigExportJson wraps the config in an envelope — layout name appears in the JSON
    expect(jsonArg).toContain('TestLayout')
  })
})

// ─── Test 3: Valid import (PORT-02) ───────────────────────────────────────────

describe('SettingsPage — Import valid config (PORT-02)', () => {
  it('shows success message and persists the imported config reactively', async () => {
    // Seed an initial config so the page renders (not "Loading…")
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })

    renderPage()
    await screen.findByRole('heading', { name: /Shortcuts Config/i })

    // Import a different config (raw ShortcutConfig — what migrateConfig validates)
    const importedConfig = makeValidConfig({
      layouts: [{ name: 'ImportedLayout', shortcuts: [] }],
    })
    const file = makeConfigFile(importedConfig)

    const user = userEvent.setup()
    const fileInput = screen.getByLabelText(/Choose config file/i)
    await user.upload(fileInput, file)

    // Success message appears after async importConfig resolves
    expect(await screen.findByText(/Config imported\./i)).toBeInTheDocument()

    // Config was persisted to Dexie — reactive reflect via useShortcutConfig
    const stored = await configRepository.get()
    expect(stored?.layouts[0].name).toBe('ImportedLayout')
  })
})

// ─── Test 4: Invalid import (PORT-02) ────────────────────────────────────────

describe('SettingsPage — Import invalid config (PORT-02)', () => {
  it('shows a visible role="alert" error and writes nothing on malformed file', async () => {
    const initialConfig = makeValidConfig()
    await act(async () => {
      await configRepository.put(initialConfig)
    })

    renderPage()
    await screen.findByRole('heading', { name: /Shortcuts Config/i })

    // Upload a file with malformed JSON (not parseable at all)
    const file = new File(['not valid json!!!'], 'bad.json', {
      type: 'application/json',
    })

    const user = userEvent.setup()
    const fileInput = screen.getByLabelText(/Choose config file/i)
    await user.upload(fileInput, file)

    // Error rendered with role="alert" (T-14-07)
    const alert = await screen.findByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert.textContent).toBeTruthy()

    // Config unchanged — wholesale reject, nothing written
    const stored = await configRepository.get()
    expect(stored?.layouts[0].name).toBe('TestLayout')
  })
})

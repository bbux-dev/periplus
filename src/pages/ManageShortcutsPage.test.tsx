import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../services/db'
import { configRepository } from '../services/configRepository'
import type { ShortcutConfig } from '../config/shortcutConfig'
import { ManageShortcutsPage } from './ManageShortcutsPage'

// fake-indexeddb/auto is already hoisted in src/test-setup.ts — do NOT re-import it

beforeEach(async () => {
  await db.delete()
  await db.open()
})

function makeValidConfig(overrides?: Partial<ShortcutConfig>): ShortcutConfig {
  return {
    version: 1,
    layouts: [{ name: 'TestLayout', shortcuts: [] }],
    ...overrides,
  }
}

function makeConfigWithShortcuts(): ShortcutConfig {
  return {
    version: 1,
    layouts: [
      {
        name: 'TestLayout',
        shortcuts: [
          { name: 'Alpha', dslTemplate: 'expense :food', confirm: false },
          { name: 'Beta', dslTemplate: 'expense :coffee', confirm: false },
          { name: 'Gamma', dslTemplate: 'expense :taxi', confirm: false },
        ],
      },
    ],
  }
}

function ShortcutFormProbe() {
  return <div data-testid="form-probe">Shortcut Form</div>
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ManageShortcutsPage />
    </MemoryRouter>,
  )
}

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/manage']}>
      <Routes>
        <Route path="/manage" element={<ManageShortcutsPage />} />
        <Route path="/manage/shortcut" element={<ShortcutFormProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ─── Test 1: Page renders ─────────────────────────────────────────────────────

describe('ManageShortcutsPage — rendering', () => {
  it('renders "Manage Shortcuts" heading after config loads', async () => {
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    renderPage()
    await screen.findByRole('heading', { name: /Manage Shortcuts/i })
  })
})

// ─── Test 2: EDIT-02 create layout ────────────────────────────────────────────

describe('ManageShortcutsPage — EDIT-02 create layout', () => {
  it('creates a layout and shows the new chip in the layout switcher', async () => {
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    renderPage()
    await screen.findByRole('heading', { name: /Manage Shortcuts/i })

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/New layout name/i), 'MyNewLayout')
    await user.click(screen.getByRole('button', { name: /^Create$/i }))

    // New chip should appear in the LayoutChips switcher
    await screen.findByRole('button', { name: 'MyNewLayout' })
  })
})

// ─── Test 3: EDIT-02 rename layout ────────────────────────────────────────────

describe('ManageShortcutsPage — EDIT-02 rename layout', () => {
  it('renames a layout and reflects the new name in the chip switcher', async () => {
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    renderPage()
    await screen.findByRole('heading', { name: /Manage Shortcuts/i })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Rename TestLayout/i }))

    // Inline rename input replaces the button
    const renameInput = screen.getByLabelText(/Rename TestLayout/i)
    await user.clear(renameInput)
    await user.type(renameInput, 'RenamedLayout')
    await user.click(screen.getByRole('button', { name: /^Save$/i }))

    // New chip name appears; old chip name gone
    await screen.findByRole('button', { name: 'RenamedLayout' })
    expect(screen.queryByRole('button', { name: 'TestLayout' })).not.toBeInTheDocument()
  })
})

// ─── Test 4: EDIT-02 delete layout ────────────────────────────────────────────

describe('ManageShortcutsPage — EDIT-02 delete layout', () => {
  it('disables the delete-layout button when only one layout remains', async () => {
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    renderPage()
    await screen.findByRole('heading', { name: /Manage Shortcuts/i })

    expect(
      screen.getByRole('button', { name: /Delete layout TestLayout/i }),
    ).toBeDisabled()
  })

  it('deletes a layout and removes its chip when multiple layouts exist', async () => {
    await act(async () => {
      await configRepository.put(
        makeValidConfig({
          layouts: [
            { name: 'Layout1', shortcuts: [] },
            { name: 'Layout2', shortcuts: [] },
          ],
        }),
      )
    })
    renderPage()
    await screen.findByRole('heading', { name: /Manage Shortcuts/i })
    await screen.findByRole('button', { name: 'Layout1' }) // wait for chips

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Delete layout Layout1/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Layout1' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Layout2' })).toBeInTheDocument()
  })
})

// ─── Test 5: EDIT-02 reorder shortcuts ────────────────────────────────────────

describe('ManageShortcutsPage — EDIT-02 reorder shortcuts', () => {
  it('moves a shortcut up and persists the new order (configRepository.get reflects change)', async () => {
    await act(async () => {
      await configRepository.put(makeConfigWithShortcuts())
    })
    renderPage()
    await screen.findByRole('heading', { name: /Manage Shortcuts/i })
    await screen.findByText('Beta') // wait for shortcut rows

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Move Beta up/i }))

    // DOM signal: Beta is now first → Move Beta up is disabled
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Move Beta up/i })).toBeDisabled(),
    )

    const stored = await configRepository.get()
    expect(stored!.layouts[0].shortcuts.map((s) => s.name)).toEqual([
      'Beta',
      'Alpha',
      'Gamma',
    ])
  })

  it('moves a shortcut down and persists the new order', async () => {
    await act(async () => {
      await configRepository.put(makeConfigWithShortcuts())
    })
    renderPage()
    await screen.findByRole('heading', { name: /Manage Shortcuts/i })
    await screen.findByText('Alpha')

    const user = userEvent.setup()
    // Alpha is at index 0; move it down → Alpha goes to index 1
    await user.click(screen.getByRole('button', { name: /Move Alpha down/i }))

    // DOM signal: Alpha's move-up is now enabled (it was disabled when Alpha was first)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Move Alpha up/i })).not.toBeDisabled(),
    )

    const stored = await configRepository.get()
    expect(stored!.layouts[0].shortcuts.map((s) => s.name)).toEqual([
      'Beta',
      'Alpha',
      'Gamma',
    ])
  })

  it('disables move-up on the first shortcut and move-down on the last shortcut', async () => {
    await act(async () => {
      await configRepository.put(makeConfigWithShortcuts())
    })
    renderPage()
    await screen.findByRole('heading', { name: /Manage Shortcuts/i })
    await screen.findByText('Alpha')

    // Boundary checks
    expect(screen.getByRole('button', { name: /Move Alpha up/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Move Gamma down/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Move Alpha down/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /Move Gamma up/i })).not.toBeDisabled()
  })
})

// ─── Test 6: EDIT-01 delete shortcut ─────────────────────────────────────────

describe('ManageShortcutsPage — EDIT-01 delete shortcut', () => {
  it('deletes a shortcut and removes its row from the list', async () => {
    await act(async () => {
      await configRepository.put(makeConfigWithShortcuts())
    })
    renderPage()
    await screen.findByRole('heading', { name: /Manage Shortcuts/i })
    await screen.findByText('Alpha') // wait for shortcut rows

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Delete Alpha/i }))

    await waitFor(() => {
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    })
    // Other shortcuts remain
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
  })
})

// ─── Test 7: Error paths ──────────────────────────────────────────────────────

describe('ManageShortcutsPage — error paths', () => {
  it('shows role="alert" when creating a layout with a duplicate name', async () => {
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    renderPage()
    await screen.findByRole('heading', { name: /Manage Shortcuts/i })

    const user = userEvent.setup()
    // 'TestLayout' already exists
    await user.type(screen.getByLabelText(/New layout name/i), 'TestLayout')
    await user.click(screen.getByRole('button', { name: /^Create$/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert.textContent).toBeTruthy()
  })
})

// ─── Test 8: Navigation to shortcut form ─────────────────────────────────────

describe('ManageShortcutsPage — navigation', () => {
  it('navigates to /manage/shortcut when "Add Shortcut" is clicked', async () => {
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    renderWithRoutes()
    await screen.findByRole('heading', { name: /Manage Shortcuts/i })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Add Shortcut/i }))

    await screen.findByTestId('form-probe')
  })
})

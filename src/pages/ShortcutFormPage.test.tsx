/**
 * ShortcutFormPage tests — EDIT-01/03/04 RTL coverage.
 *
 * Uses fake-indexeddb (auto-imported via test-setup.ts) + MemoryRouter.
 * Covers: Pitfall 4 (null state), EDIT-03 (omnibar prefill), edit-mode prefill,
 * EDIT-04 (malformed blocks / hole enables Save), EDIT-01 create flow,
 * icon selection via IconPicker.
 */

import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../services/db'
import { configRepository } from '../services/configRepository'
import type { ShortcutConfig, Shortcut } from '../config/shortcutConfig'
import { ShortcutFormPage } from './ShortcutFormPage'

// fake-indexeddb/auto hoisted in src/test-setup.ts — do NOT re-import

beforeEach(async () => {
  await db.delete()
  await db.open()
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeValidConfig(overrides?: Partial<ShortcutConfig>): ShortcutConfig {
  return {
    version: 1,
    layouts: [{ name: 'TestLayout', shortcuts: [] }],
    ...overrides,
  }
}

/** Probe component for post-save /manage navigation assert. */
function ManageProbe() {
  return <div data-testid="manage-probe">Manage Page</div>
}

function renderFormPage(initialState?: object | null) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/manage/shortcut', state: initialState ?? null }]}
    >
      <Routes>
        <Route path="/manage/shortcut" element={<ShortcutFormPage />} />
        <Route path="/manage" element={<ManageProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ─── Pitfall 4: null state → no crash ────────────────────────────────────────

describe('ShortcutFormPage — null state (direct navigation, Pitfall 4)', () => {
  it('renders "New Shortcut" heading with null state without crashing', async () => {
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    renderFormPage(null)
    await screen.findByRole('heading', { name: /New Shortcut/i })
    expect(screen.getByRole('heading', { name: /New Shortcut/i })).toBeInTheDocument()
  })
})

// ─── EDIT-03: omnibar prefill ─────────────────────────────────────────────────

describe('ShortcutFormPage — EDIT-03 omnibar prefill', () => {
  it('pre-fills dslTemplate field from location.state.dslTemplate and shows "New Shortcut" title', async () => {
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    renderFormPage({ dslTemplate: 'expense :food' })
    await screen.findByRole('heading', { name: /New Shortcut/i })
    expect(screen.getByLabelText(/DSL Template/i)).toHaveValue('expense :food')
  })
})

// ─── Edit mode prefill ────────────────────────────────────────────────────────

describe('ShortcutFormPage — edit mode', () => {
  it('pre-fills name and dslTemplate, shows "Edit Shortcut" title', async () => {
    const shortcut: Shortcut = {
      name: 'Coffee',
      icon: 'BoltIcon',
      dslTemplate: 'expense 5:coffee',
      confirm: false,
    }
    await act(async () => {
      await configRepository.put(
        makeValidConfig({
          layouts: [{ name: 'TestLayout', shortcuts: [shortcut] }],
        }),
      )
    })
    renderFormPage({ layoutName: 'TestLayout', shortcut })
    await screen.findByRole('heading', { name: /Edit Shortcut/i })
    expect(screen.getByLabelText(/Name/i)).toHaveValue('Coffee')
    expect(screen.getByLabelText(/DSL Template/i)).toHaveValue('expense 5:coffee')
  })
})

// ─── EDIT-04: malformed template blocks Save ──────────────────────────────────

describe('ShortcutFormPage — EDIT-04 validation gate', () => {
  it('malformed template shows inline error and disables Save', async () => {
    const user = userEvent.setup()
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    renderFormPage(null)
    await screen.findByRole('heading', { name: /New Shortcut/i })

    // Fill a valid name and a malformed template
    await user.type(screen.getByLabelText(/Name/i), 'Test')
    // 'colour' is an unknown metadata field for expense → parseDSL status='error'
    await user.type(screen.getByLabelText(/DSL Template/i), 'expense 12:food?colour=blue')

    // Inline error rendered via FormField error prop
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.length).toBeGreaterThan(0)
    // Save button disabled
    expect(screen.getByRole('button', { name: /Save Shortcut/i })).toBeDisabled()
  })

  it('hole template "expense :food" enables Save when name is set (EDIT-04)', async () => {
    const user = userEvent.setup()
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    renderFormPage(null)
    await screen.findByRole('heading', { name: /New Shortcut/i })

    await user.type(screen.getByLabelText(/Name/i), 'Lunch')
    await user.type(screen.getByLabelText(/DSL Template/i), 'expense :food')

    expect(screen.getByRole('button', { name: /Save Shortcut/i })).not.toBeDisabled()
  })

  it('hole template "expense 5:food?merchant={}" enables Save when name is set (EDIT-04)', async () => {
    const user = userEvent.setup()
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    renderFormPage(null)
    await screen.findByRole('heading', { name: /New Shortcut/i })

    await user.type(screen.getByLabelText(/Name/i), 'Shop')
    // Note: {{}} in user.type() produces the literal string '{}'
    // (userEvent uses { } for key descriptors; {{ }} escape to literals)
    await user.type(screen.getByLabelText(/DSL Template/i), 'expense 5:food?merchant={{}}')

    expect(screen.getByRole('button', { name: /Save Shortcut/i })).not.toBeDisabled()
  })
})

// ─── EDIT-01: create shortcut ─────────────────────────────────────────────────

describe('ShortcutFormPage — EDIT-01 create', () => {
  it('saves shortcut to config via addShortcut+validate+put and navigates to /manage', async () => {
    const user = userEvent.setup()
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    renderFormPage(null)
    await screen.findByRole('heading', { name: /New Shortcut/i })

    await user.type(screen.getByLabelText(/Name/i), 'Coffee')
    await user.type(screen.getByLabelText(/DSL Template/i), 'expense 5:coffee')
    await user.click(screen.getByRole('button', { name: /Save Shortcut/i }))

    // Navigated to /manage probe
    expect(await screen.findByTestId('manage-probe')).toBeInTheDocument()

    // Fresh config read shows the new shortcut (T-15-05 freshRead)
    const saved = await configRepository.get()
    const shortcuts = saved?.layouts[0].shortcuts ?? []
    expect(shortcuts).toHaveLength(1)
    expect(shortcuts[0].name).toBe('Coffee')
    expect(shortcuts[0].dslTemplate).toBe('expense 5:coffee')
    expect(shortcuts[0].confirm).toBe(false)
  })
})

// ─── WR-02: cross-layout move ─────────────────────────────────────────────────

describe('ShortcutFormPage — WR-02 cross-layout move', () => {
  it('moving a shortcut to a different layout removes it from the old and adds it to the new', async () => {
    const user = userEvent.setup()
    const shortcut: Shortcut = {
      name: 'Coffee',
      dslTemplate: 'expense 5:coffee',
      confirm: false,
    }
    await act(async () => {
      await configRepository.put({
        version: 1,
        layouts: [
          { name: 'Alpha', shortcuts: [shortcut] },
          { name: 'Beta', shortcuts: [] },
        ],
      })
    })

    // Open edit form pre-filled with the shortcut in layout 'Alpha'
    renderFormPage({ layoutName: 'Alpha', shortcut })
    await screen.findByRole('heading', { name: /Edit Shortcut/i })

    // Change layout select to 'Beta'
    await user.selectOptions(screen.getByRole('combobox'), 'Beta')

    // Save
    await user.click(screen.getByRole('button', { name: /Update Shortcut/i }))
    await screen.findByTestId('manage-probe')

    // Verify persisted state
    const saved = await configRepository.get()
    const alpha = saved?.layouts.find((l) => l.name === 'Alpha')
    const beta  = saved?.layouts.find((l) => l.name === 'Beta')
    expect(alpha?.shortcuts).toHaveLength(0)
    expect(beta?.shortcuts).toHaveLength(1)
    expect(beta?.shortcuts[0].name).toBe('Coffee')
  })
})

// ─── Icon selection ───────────────────────────────────────────────────────────

describe('ShortcutFormPage — icon selection', () => {
  it('clicking an icon button in IconPicker sets icon key on saved shortcut', async () => {
    const user = userEvent.setup()
    await act(async () => {
      await configRepository.put(makeValidConfig())
    })
    renderFormPage(null)
    await screen.findByRole('heading', { name: /New Shortcut/i })

    // Click the 'Banknotes' icon button (BanknotesIcon → label 'Banknotes')
    await user.click(screen.getByRole('button', { name: 'Banknotes' }))

    await user.type(screen.getByLabelText(/Name/i), 'Expense')
    await user.type(screen.getByLabelText(/DSL Template/i), 'expense :food')
    await user.click(screen.getByRole('button', { name: /Save Shortcut/i }))

    await screen.findByTestId('manage-probe')
    const saved = await configRepository.get()
    expect(saved?.layouts[0].shortcuts[0].icon).toBe('BanknotesIcon')
  })
})

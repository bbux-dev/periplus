import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HoleSheet } from './HoleSheet'
import type { HoleMap } from '../../services/captureService'

// ── Shared fixture: single amount hole (expense :food) ─────────────────────────

const amountHoleMap: HoleMap = { positional: ['amount'], named: [], hasHoles: true }

const baseProps = {
  isOpen: true,
  type: 'expense' as const,
  domain: 'expenditures' as const,
  baseValues: { category: 'food' },
  holeMap: amountHoleMap,
  onSave: vi.fn(),
  onCancel: vi.fn(),
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HoleSheet', () => {
  // ── Dialog semantics ────────────────────────────────────────────────────────

  it('renders a dialog with aria-modal="true" and label "Fill in required fields"', () => {
    render(<HoleSheet {...baseProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Fill in required fields')
  })

  // ── Amount hole: keypad ──────────────────────────────────────────────────────

  it('renders keypad digits 1-9, decimal, 0, and Backspace for an amount hole', () => {
    render(<HoleSheet {...baseProps} />)
    for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      expect(screen.getByRole('button', { name: d })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: '.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Backspace' })).toBeInTheDocument()
  })

  // ── Amount hole: presets ─────────────────────────────────────────────────────

  it('renders quick preset buttons $5, $10, $20, $50', () => {
    render(<HoleSheet {...baseProps} />)
    expect(screen.getByRole('button', { name: '$5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '$10' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '$20' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '$50' })).toBeInTheDocument()
  })

  // ── Live DSL preview ─────────────────────────────────────────────────────────

  it('preview shows "expense 12:food" after tapping keypad 1 then 2', async () => {
    const user = userEvent.setup()
    render(<HoleSheet {...baseProps} />)
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: '2' }))
    expect(screen.getByText(/expense 12:food/)).toBeInTheDocument()
  })

  it('preview shows "expense 20:food" after tapping the $20 preset', async () => {
    const user = userEvent.setup()
    render(<HoleSheet {...baseProps} />)
    await user.click(screen.getByRole('button', { name: '$20' }))
    expect(screen.getByText(/expense 20:food/)).toBeInTheDocument()
  })

  // ── Save gate ────────────────────────────────────────────────────────────────

  it('Save button is disabled when the amount hole is empty', () => {
    render(<HoleSheet {...baseProps} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('Save button is enabled once the amount hole has a value', async () => {
    const user = userEvent.setup()
    render(<HoleSheet {...baseProps} />)
    await user.click(screen.getByRole('button', { name: '5' }))
    expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled()
  })

  // ── Callbacks ────────────────────────────────────────────────────────────────

  it('clicking Save calls onSave with the collected fills', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<HoleSheet {...baseProps} onSave={onSave} />)
    await user.click(screen.getByRole('button', { name: '5' }))
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith({ amount: '5' })
  })

  it('clicking Cancel calls onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<HoleSheet {...baseProps} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('clicking the overlay calls onCancel', () => {
    const onCancel = vi.fn()
    render(<HoleSheet {...baseProps} onCancel={onCancel} />)
    const overlay = document.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(overlay).toBeInTheDocument()
    fireEvent.click(overlay)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // ── Non-amount text hole ─────────────────────────────────────────────────────

  it('renders a labelled text input for a non-amount named hole', () => {
    render(
      <HoleSheet
        isOpen
        type="expense"
        domain="expenditures"
        baseValues={{ amount: '12', category: 'food' }}
        holeMap={{ positional: [], named: ['merchant'], hasHoles: true }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByLabelText(/merchant/i)).toBeInTheDocument()
  })

  // ── Multi-hole ordering ──────────────────────────────────────────────────────

  it('multi-hole sheet: shows amount keypad (positional) and text input (named) in order', () => {
    render(
      <HoleSheet
        isOpen
        type="expense"
        domain="expenditures"
        baseValues={{ category: 'food' }}
        holeMap={{ positional: ['amount'], named: ['merchant'], hasHoles: true }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    // Positional amount hole → keypad buttons present
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    // Named merchant hole → text input present
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByLabelText(/merchant/i)).toBeInTheDocument()
  })
})

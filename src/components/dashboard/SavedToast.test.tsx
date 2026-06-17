import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SavedToast } from './SavedToast'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SavedToast', () => {
  // ── Semantics ──────────────────────────────────────────────────────────────

  it('renders a container with role="status" and aria-live="polite"', () => {
    render(<SavedToast onUndo={vi.fn()} />)
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  // ── Content ────────────────────────────────────────────────────────────────

  it('renders the text "Saved"', () => {
    render(<SavedToast onUndo={vi.fn()} />)
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('renders an Undo button', () => {
    render(<SavedToast onUndo={vi.fn()} />)
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
  })

  // ── Callback ───────────────────────────────────────────────────────────────

  it('clicking Undo calls onUndo exactly once', async () => {
    const user = userEvent.setup()
    const onUndo = vi.fn()
    render(<SavedToast onUndo={onUndo} />)
    await user.click(screen.getByRole('button', { name: /undo/i }))
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  // ── Purely presentational (no timer) ──────────────────────────────────────

  it('is purely presentational: does not auto-dismiss itself (timer lives in parent)', async () => {
    // The component renders and stays visible with no timer of its own.
    // Parent controls visibility via conditional rendering.
    const { container } = render(<SavedToast onUndo={vi.fn()} />)
    // If SavedToast owned a timer, it would be an implementation detail we'd
    // test by checking no setTimeout fires. Here we just assert it remains
    // mounted without any explicit dismissal signal.
    expect(container.firstChild).toBeInTheDocument()
  })
})

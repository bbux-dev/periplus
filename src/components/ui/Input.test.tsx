import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input', () => {
  it('renders an <input> element', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('forwards value and onChange — typing fires onChange and reflects controlled value', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Input value="" onChange={handleChange} />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'hello')
    expect(handleChange).toHaveBeenCalled()
  })

  it('forwards placeholder — getByPlaceholderText finds the input', () => {
    render(<Input placeholder="Enter URL..." />)
    expect(screen.getByPlaceholderText('Enter URL...')).toBeInTheDocument()
  })

  it('forwards disabled — the input is disabled when disabled prop is set', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('merges a custom className without dropping base classes', () => {
    render(<Input className="my-custom-class" />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('border-[var(--color-border)]')
    expect(input.className).toContain('my-custom-class')
  })
})

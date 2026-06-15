import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { cn } from './cn'
import { Button } from './Button'

describe('cn', () => {
  it('merges conflicting Tailwind classes (last-wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('drops falsy entries from clsx', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c')
  })
})

describe('Button', () => {
  it('renders with ghost variant and icon size classes', () => {
    render(<Button variant="ghost" size="icon" />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-transparent')
    expect(btn.className).toContain('h-10')
    expect(btn.className).toContain('w-10')
  })

  it('forwards onClick handler', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('forwards aria-label prop', () => {
    render(<Button aria-label="increment" />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'increment')
  })

  it('defaults to primary variant and md size', () => {
    render(<Button />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-[var(--color-primary)]')
    expect(btn.className).toContain('h-10')
    expect(btn.className).toContain('px-4')
  })
})

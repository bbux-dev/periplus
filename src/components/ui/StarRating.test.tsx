import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StarRating } from './StarRating'

describe('StarRating', () => {
  it('renders 5 buttons with aria-labels', () => {
    render(<StarRating value={0} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '1 star' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2 stars' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5 stars' })).toBeInTheDocument()
  })

  it('tap star N calls onChange(N)', async () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '3 stars' }))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('tap currently-selected star calls onChange(0) to clear', async () => {
    const onChange = vi.fn()
    render(<StarRating value={3} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '3 stars' }))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('ArrowRight increases rating based on value (not focused button)', async () => {
    const onChange = vi.fn()
    render(<StarRating value={3} onChange={onChange} />)
    screen.getByRole('button', { name: '3 stars' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('ArrowLeft decreases rating based on value (not focused button)', async () => {
    const onChange = vi.fn()
    render(<StarRating value={2} onChange={onChange} />)
    screen.getByRole('button', { name: '2 stars' }).focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('ArrowRight clamps at 5 when value is already 5', async () => {
    const onChange = vi.fn()
    render(<StarRating value={5} onChange={onChange} />)
    screen.getByRole('button', { name: '5 stars' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('ArrowLeft clamps at 0 when value is 1', async () => {
    const onChange = vi.fn()
    render(<StarRating value={1} onChange={onChange} />)
    screen.getByRole('button', { name: '1 star' }).focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('buttons have aria-pressed reflecting current value', () => {
    render(<StarRating value={3} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '3 stars' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '4 stars' })).toHaveAttribute('aria-pressed', 'false')
  })
})

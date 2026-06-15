import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../services/db'
import { Counter } from './Counter'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('Counter', () => {
  it('displays 0 on initial render (default while Dexie opens)', async () => {
    render(<Counter />)
    // value may not appear immediately; wait for it
    expect(await screen.findByText('0')).toBeInTheDocument()
  })

  it('increments value on + button click', async () => {
    const user = userEvent.setup()
    render(<Counter />)
    await screen.findByText('0')
    await act(async () => {
      await user.click(screen.getByLabelText('increment'))
    })
    expect(await screen.findByText('1')).toBeInTheDocument()
  })

  it('increments twice gives 2', async () => {
    const user = userEvent.setup()
    render(<Counter />)
    await screen.findByText('0')
    await act(async () => {
      await user.click(screen.getByLabelText('increment'))
    })
    await screen.findByText('1')
    await act(async () => {
      await user.click(screen.getByLabelText('increment'))
    })
    expect(await screen.findByText('2')).toBeInTheDocument()
  })

  it('decrements value on - button click', async () => {
    const user = userEvent.setup()
    render(<Counter />)
    await screen.findByText('0')
    await act(async () => {
      await user.click(screen.getByLabelText('increment'))
    })
    await screen.findByText('1')
    await act(async () => {
      await user.click(screen.getByLabelText('decrement'))
    })
    expect(await screen.findByText('0')).toBeInTheDocument()
  })
})

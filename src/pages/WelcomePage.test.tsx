import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { WelcomePage } from './WelcomePage'

describe('WelcomePage', () => {
  it('renders the Life Log heading', () => {
    render(
      <MemoryRouter>
        <WelcomePage />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: /Life Log/i })).toBeInTheDocument()
  })
})

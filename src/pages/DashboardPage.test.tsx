import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { DashboardPage } from './DashboardPage'

describe('DashboardPage', () => {
  function renderDashboard() {
    return render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
  }

  it('shows the Media domain tile', () => {
    renderDashboard()
    expect(screen.getByText('Media')).toBeInTheDocument()
  })

  it('shows the Trips domain tile', () => {
    renderDashboard()
    expect(screen.getByText('Trips')).toBeInTheDocument()
  })

  it('shows the Expenditures domain tile', () => {
    renderDashboard()
    expect(screen.getByText('Expenditures')).toBeInTheDocument()
  })

  it('renders exactly 3 domain links', () => {
    renderDashboard()
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('media link targets /d/media', () => {
    renderDashboard()
    const links = screen.getAllByRole('link')
    const mediaLink = links.find((l) => l.textContent?.includes('Media'))
    expect(mediaLink?.getAttribute('href')).toBe('/d/media')
  })
})

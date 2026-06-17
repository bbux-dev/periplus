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

  it('renders Quick Capture + 3 domain links + View All Entries (5 total)', () => {
    renderDashboard()
    expect(screen.getAllByRole('link')).toHaveLength(5)
  })

  it('Quick Capture link targets /capture', () => {
    renderDashboard()
    const links = screen.getAllByRole('link')
    const captureLink = links.find((l) => l.textContent?.includes('Quick Capture'))
    expect(captureLink?.getAttribute('href')).toBe('/capture')
  })

  it('media link targets /d/media', () => {
    renderDashboard()
    const links = screen.getAllByRole('link')
    const mediaLink = links.find((l) => l.textContent?.includes('Media'))
    expect(mediaLink?.getAttribute('href')).toBe('/d/media')
  })

  it('View All Entries link targets /entries', () => {
    renderDashboard()
    const links = screen.getAllByRole('link')
    const entriesLink = links.find((l) => l.textContent?.includes('View All Entries'))
    expect(entriesLink?.getAttribute('href')).toBe('/entries')
  })
})

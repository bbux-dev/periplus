import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../services/db'
import { createAndActivateTrip } from '../services/tripService'
import { ActivityFormPage } from './ActivityFormPage'

// fake-indexeddb/auto hoisted in src/test-setup.ts — do NOT re-import

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})

// Helper: render at /activity/:type with probes at / and /create-trip
function renderAtType(type: string) {
  return render(
    <MemoryRouter initialEntries={[`/activity/${type}`]}>
      <Routes>
        <Route path="/activity/:type" element={<ActivityFormPage />} />
        <Route path="/" element={<div data-testid="home-probe" />} />
        <Route path="/create-trip" element={<div data-testid="create-probe" />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ActivityFormPage — save path', () => {
  it('saves entry with type=activity, domain=trips, metadata.activityType, local-date occurredAt', async () => {
    // MEMORY.md: full fake timers stall Dexie — use { toFake: ['Date'] } only
    vi.useFakeTimers({ toFake: ['Date'] })
    const trip = await createAndActivateTrip('Paris')

    renderAtType('hike')
    await userEvent.type(await screen.findByLabelText(/name/i), 'Montmartre walk')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await screen.findByTestId('home-probe')

    const entries = await db.entries.toArray()
    const activity = entries.find((e) => e.type === 'activity')
    expect(activity).toBeDefined()
    expect(activity!.domain).toBe('trips')
    expect(activity!.title).toBe('Montmartre walk')
    expect(activity!.metadata.activityType).toBe('Hike')
    expect(activity!.metadata.tripId).toBe(trip.id)
    // occurredAt must be LOCAL midnight epoch (not UTC — PITFALLS Pitfall 3)
    const localMidnight = Date.parse(
      `${new Date().toLocaleDateString('en-CA')}T00:00:00`,
    )
    expect(activity!.occurredAt).toBe(localMidnight)
  })

  it('saves entry with local midnight occurredAt even at 23:30 local', async () => {
    // Set fake clock to 23:30 local time — occurredAt must still be TODAY's local midnight
    vi.useFakeTimers({ toFake: ['Date'] })
    const localToday = new Date().toLocaleDateString('en-CA') // 'YYYY-MM-DD'
    const fakeNow = new Date(`${localToday}T23:30:00`)
    vi.setSystemTime(fakeNow)

    await createAndActivateTrip('Late Trip')
    renderAtType('hike')
    await userEvent.type(await screen.findByLabelText(/name/i), 'Evening walk')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await screen.findByTestId('home-probe')

    const entries = await db.entries.toArray()
    const activity = entries.find((e) => e.type === 'activity')
    const expectedMidnight = Date.parse(`${localToday}T00:00:00`)
    expect(activity!.occurredAt).toBe(expectedMidnight)
  })
})

describe('ActivityFormPage — Other type', () => {
  it('shows Type field only for other slug', async () => {
    await createAndActivateTrip('Paris')
    renderAtType('other')
    expect(await screen.findByLabelText(/^type/i)).toBeInTheDocument()
  })

  it('blocks save when Other + Type is empty (shows role=alert)', async () => {
    await createAndActivateTrip('Paris')
    renderAtType('other')
    await userEvent.type(await screen.findByLabelText(/name/i), 'Mystery thing')
    // Do NOT fill Type field
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    // Still on the form — home-probe absent
    expect(screen.queryByTestId('home-probe')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('saves Other entry with free-text activityType in metadata', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await createAndActivateTrip('Paris')
    renderAtType('other')
    await userEvent.type(await screen.findByLabelText(/name/i), 'Bike ride')
    await userEvent.type(screen.getByLabelText(/^type/i), 'Cycling')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await screen.findByTestId('home-probe')
    const entries = await db.entries.toArray()
    const activity = entries.find((e) => e.type === 'activity')
    expect(activity!.metadata.activityType).toBe('Cycling')
  })
})

describe('ActivityFormPage — Name required', () => {
  it('blocks save when Name is empty (shows role=alert)', async () => {
    await createAndActivateTrip('Paris')
    renderAtType('hike')
    // Do NOT fill Name field
    await userEvent.click(await screen.findByRole('button', { name: /save/i }))
    // Still on the form — home-probe absent
    expect(screen.queryByTestId('home-probe')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('ActivityFormPage — redirect when no active trip', () => {
  it('redirects to /create-trip when no active trip (settled)', async () => {
    // No trip created → no active mode persisted
    renderAtType('hike')
    expect(await screen.findByTestId('create-probe')).toBeInTheDocument()
  })
})

import { describe, it, expect } from 'vitest'
import { NAVIGATION, getDomainConfig } from './navigation'

describe('NAVIGATION config', () => {
  it('has exactly three domains in order: media, trips, expenditures', () => {
    expect(NAVIGATION.map((d) => d.domain)).toEqual(['media', 'trips', 'expenditures'])
  })

  it('media domain types are: show, movie, book, podcast', () => {
    const media = NAVIGATION.find((d) => d.domain === 'media')
    expect(media?.types.map((t) => t.type)).toEqual(['show', 'movie', 'book', 'podcast'])
  })

  it('trips domain types are: place, event, expense', () => {
    const trips = NAVIGATION.find((d) => d.domain === 'trips')
    expect(trips?.types.map((t) => t.type)).toEqual(['place', 'event', 'expense'])
  })

  it('expenditures domain types are: expense', () => {
    const expenditures = NAVIGATION.find((d) => d.domain === 'expenditures')
    expect(expenditures?.types.map((t) => t.type)).toEqual(['expense'])
  })

  it('getDomainConfig returns the correct label for a known domain', () => {
    expect(getDomainConfig('trips')?.label).toBe('Trips')
  })

  it('getDomainConfig returns undefined for an unknown domain', () => {
    expect(getDomainConfig('bogus')).toBeUndefined()
  })
})

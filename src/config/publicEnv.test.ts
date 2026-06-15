import { describe, it, expect } from 'vitest'
import { publicEnv } from './publicEnv'

describe('publicEnv', () => {
  it('is an object', () => {
    expect(typeof publicEnv).toBe('object')
  })

  it('is not null', () => {
    expect(publicEnv).not.toBeNull()
  })

  it('is not an array', () => {
    expect(Array.isArray(publicEnv)).toBe(false)
  })
})

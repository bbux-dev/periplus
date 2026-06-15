import { describe, it, expect } from 'vitest'
import { appBrand } from './appBrand'

describe('appBrand', () => {
  it('name is Life Log', () => {
    expect(appBrand.name).toBe('Life Log')
  })

  it('shortName is Life Log', () => {
    expect(appBrand.shortName).toBe('Life Log')
  })

  it('themeColor is the expected hex value', () => {
    expect(appBrand.themeColor).toBe('#1e40af')
  })

  it('themeColor is a non-empty hex string', () => {
    expect(appBrand.themeColor).toBeTruthy()
    expect(appBrand.themeColor).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('description is a non-empty string', () => {
    expect(appBrand.description).toBeTruthy()
    expect(typeof appBrand.description).toBe('string')
  })
})

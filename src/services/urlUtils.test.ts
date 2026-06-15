import { describe, it, expect } from 'vitest'
import { isSafeUrl } from './urlUtils'

describe('isSafeUrl', () => {
  it('returns true for https: URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true)
  })

  it('returns true for http: URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(true)
  })

  it('returns false for javascript: URLs', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
  })

  it('returns false for ftp: URLs', () => {
    expect(isSafeUrl('ftp://example.com')).toBe(false)
  })

  it('returns false for non-URL strings', () => {
    expect(isSafeUrl('not a url')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isSafeUrl('')).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { validateTemplate, isValidTemplate } from './templateValidator'

// ─── validateTemplate ─────────────────────────────────────────────────────────

describe('validateTemplate', () => {
  it('positional-hole template is valid (expense :food)', () => {
    const r = validateTemplate('expense :food')
    expect(r.valid).toBe(true)
    expect(r.error).toBeUndefined()
  })

  it('trailing-slot hole template is valid (movie :)', () => {
    const r = validateTemplate('movie :')
    expect(r.valid).toBe(true)
    expect(r.error).toBeUndefined()
  })

  it('{} named-hole token template is valid (expense 5:food?merchant={})', () => {
    const r = validateTemplate('expense 5:food?merchant={}')
    expect(r.valid).toBe(true)
    expect(r.error).toBeUndefined()
  })

  it('complete template (no holes) is valid (expense 5:coffee)', () => {
    const r = validateTemplate('expense 5:coffee')
    expect(r.valid).toBe(true)
    expect(r.error).toBeUndefined()
  })

  it('unknown field is invalid and error matches /unknown field/ (expense 12:food?colour=blue)', () => {
    const r = validateTemplate('expense 12:food?colour=blue')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/unknown field/)
  })

  it('unterminated quote is invalid and error is present (book "Dune:Herbert)', () => {
    const r = validateTemplate('book "Dune:Herbert')
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('too many positional slots is invalid (expense 1:2:3)', () => {
    const r = validateTemplate('expense 1:2:3')
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('no type token (no default) is invalid (12.50:food)', () => {
    const r = validateTemplate('12.50:food')
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('never throws on any string input — catches parse errors as return values', () => {
    expect(() => validateTemplate('')).not.toThrow()
    expect(() => validateTemplate('"unclosed')).not.toThrow()
    expect(() => validateTemplate('expense 1:2:3:4:5')).not.toThrow()
  })
})

// ─── isValidTemplate ──────────────────────────────────────────────────────────

describe('isValidTemplate', () => {
  it('returns true for a positional-hole template (expense :food)', () => {
    expect(isValidTemplate('expense :food')).toBe(true)
  })

  it('returns true for a {} named-hole template (expense 5:food?merchant={})', () => {
    expect(isValidTemplate('expense 5:food?merchant={}')).toBe(true)
  })

  it('returns false for an unknown-field template', () => {
    expect(isValidTemplate('expense 12:food?colour=blue')).toBe(false)
  })

  it('returns false when no type is given (12.50:food)', () => {
    expect(isValidTemplate('12.50:food')).toBe(false)
  })

  it('returns the boolean of validateTemplate(...).valid', () => {
    const template = 'expense :food'
    expect(isValidTemplate(template)).toBe(validateTemplate(template).valid)
  })
})

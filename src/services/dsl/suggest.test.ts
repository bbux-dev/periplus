import { describe, it, expect } from 'vitest'
import { typeMatches, suggestionContext, applyValueSuggestion, quoteValue } from './suggest'
import { POSITIONAL_SCHEMA } from '../../config/entryFields'

describe('typeMatches (OMNI-03)', () => {
  it('resolves single-letter collisions to a menu', () => {
    expect(typeMatches('p').sort()).toEqual(['place', 'podcast'])
    expect(typeMatches('e').sort()).toEqual(['event', 'expense'])
  })
  it('matches a unique prefix', () => {
    expect(typeMatches('mo')).toEqual(['movie'])
    expect(typeMatches('boo')).toEqual(['book'])
  })
  it('includes alias matches (exp → expense)', () => {
    expect(typeMatches('exp')).toContain('expense')
  })
  it('empty prefix returns all types', () => {
    expect(typeMatches('').length).toBe(Object.keys(POSITIONAL_SCHEMA).length)
  })
})

describe('suggestionContext (OMNI-03/04)', () => {
  it('typing the first alphabetic token → type menu', () => {
    expect(suggestionContext('p', null)).toEqual({ kind: 'type', prefix: 'p' })
    expect(suggestionContext('exp', null)).toEqual({ kind: 'type', prefix: 'exp' })
  })

  it('a leading number is not a type attempt', () => {
    expect(suggestionContext('12', null)).toEqual({ kind: 'none' })
  })

  it('active expense category slot → value suggestions', () => {
    expect(suggestionContext('expense 12:fo', 'expense')).toEqual({
      kind: 'value', field: 'category', prefix: 'fo',
    })
    // empty prefix once the colon is typed → suggest all categories
    expect(suggestionContext('expense 12:', 'expense')).toEqual({
      kind: 'value', field: 'category', prefix: '',
    })
  })

  it('amount slot (slot 0) is not suggestable', () => {
    expect(suggestionContext('expense 12', 'expense')).toEqual({ kind: 'none' })
  })

  it('book title/creator slots are not history-suggestable', () => {
    expect(suggestionContext('book Du', 'book')).toEqual({ kind: 'none' })
    expect(suggestionContext('book Dune:Herb', 'book')).toEqual({ kind: 'none' })
  })

  it('merchant= param → value suggestions; unknown/non-distinct params → none', () => {
    expect(suggestionContext('expense 12:food?merchant=Blu', 'expense')).toEqual({
      kind: 'value', field: 'merchant', prefix: 'Blu',
    })
    expect(suggestionContext('expense 12:food?currency=US', 'expense')).toEqual({ kind: 'none' })
  })

  it('tags= param → value suggestions (quoted prefix stripped)', () => {
    expect(suggestionContext('expense 12:food?tags="tra', 'expense')).toEqual({
      kind: 'value', field: 'tags', prefix: 'tra',
    })
  })

  it('typing a param key (no =) → none', () => {
    expect(suggestionContext('expense 12:food?mer', 'expense')).toEqual({ kind: 'none' })
  })

  it('domain-inferred expense (no type token) suggests category in slot 2', () => {
    expect(suggestionContext('12:co', 'expense')).toEqual({
      kind: 'value', field: 'category', prefix: 'co',
    })
  })

  it('empty input → none', () => {
    expect(suggestionContext('', null)).toEqual({ kind: 'none' })
  })
})

describe('quoteValue', () => {
  it('quotes only when a delimiter is present', () => {
    expect(quoteValue('food')).toBe('food')
    expect(quoteValue('Blue Bottle')).toBe('"Blue Bottle"')
    expect(quoteValue('a,b')).toBe('"a,b"')
    expect(quoteValue('he said "hi"')).toBe('"he said \\"hi\\""')
  })
})

describe('applyValueSuggestion', () => {
  it('replaces the active positional slot value', () => {
    expect(applyValueSuggestion('expense 12:fo', 'food')).toBe('expense 12:food')
    expect(applyValueSuggestion('expense 12:', 'coffee')).toBe('expense 12:coffee')
    expect(applyValueSuggestion('12:co', 'coffee')).toBe('12:coffee')
  })
  it('quotes a multi-word suggestion', () => {
    expect(applyValueSuggestion('expense 12:food?merchant=Blu', 'Blue Bottle'))
      .toBe('expense 12:food?merchant="Blue Bottle"')
  })
})

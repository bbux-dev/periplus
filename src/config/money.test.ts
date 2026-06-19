// src/config/money.test.ts
import { describe, it, expect } from 'vitest'
import { formatUSD } from './money'

describe('formatUSD', () => {
  it('formats a whole number with two decimal places', () => {
    expect(formatUSD(123.4)).toBe('$123.40')
  })

  it('formats zero as $0.00', () => {
    expect(formatUSD(0)).toBe('$0.00')
  })

  it('formats a large number with thousands separator', () => {
    expect(formatUSD(1234.56)).toBe('$1,234.56')
  })

  it('is float-safe: 10.10 + 5.20 renders as $15.30 not $15.29', () => {
    expect(formatUSD(10.10 + 5.20)).toBe('$15.30')
  })

  it('is float-safe: 15.299999999999999 rounds to $15.30', () => {
    expect(formatUSD(15.299999999999999)).toBe('$15.30')
  })
})

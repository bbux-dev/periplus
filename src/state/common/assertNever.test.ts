import { describe, it, expect } from 'vitest'
import { assertNever } from './assertNever'

describe('assertNever', () => {
  it('throws when called with a value (cast as never)', () => {
    expect(() => assertNever('unexpected' as never)).toThrow()
  })

  it('throws an Error (not another type)', () => {
    expect(() => assertNever(42 as never)).toThrowError(Error)
  })

  it('includes the stringified value in the error message', () => {
    expect(() => assertNever('unexpected' as never)).toThrow('"unexpected"')
  })

  it('includes a non-empty message with numeric value', () => {
    expect(() => assertNever(99 as never)).toThrow('99')
  })
})

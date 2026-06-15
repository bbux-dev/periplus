import { describe, it, expect } from 'vitest'
import { idle, loading, success, failure } from './requestState'

describe('requestState', () => {
  describe('idle', () => {
    it('has status idle', () => {
      expect(idle.status).toBe('idle')
    })

    it('equals the idle literal shape', () => {
      expect(idle).toEqual({ status: 'idle' })
    })
  })

  describe('loading', () => {
    it('has status loading', () => {
      expect(loading.status).toBe('loading')
    })

    it('equals the loading literal shape', () => {
      expect(loading).toEqual({ status: 'loading' })
    })
  })

  describe('success()', () => {
    it('returns success state with numeric data', () => {
      expect(success(42)).toEqual({ status: 'success', data: 42 })
    })

    it('returns success state with string data', () => {
      expect(success('hello')).toEqual({ status: 'success', data: 'hello' })
    })

    it('returns success state with object data', () => {
      expect(success({ x: 1 })).toEqual({ status: 'success', data: { x: 1 } })
    })
  })

  describe('failure()', () => {
    it('returns error state with the provided Error', () => {
      const error = new Error('something went wrong')
      const result = failure(error)
      expect(result).toEqual({ status: 'error', error })
    })

    it('status is error', () => {
      expect(failure(new Error('x')).status).toBe('error')
    })
  })
})

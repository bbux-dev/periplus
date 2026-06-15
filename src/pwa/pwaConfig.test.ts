import { describe, it, expect } from 'vitest'
import { createPwaOptions } from './pwaConfig'

describe('createPwaOptions', () => {
  it('returns registerType autoUpdate', () => {
    expect(createPwaOptions().registerType).toBe('autoUpdate')
  })

  it('manifest has required PWA fields', () => {
    const { manifest } = createPwaOptions()
    expect(manifest?.name).toBeTruthy()
    expect(manifest?.short_name).toBeTruthy()
    expect(manifest?.icons).toHaveLength(2)
    const sizes = manifest?.icons?.map((i) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })

  it('workbox config has navigateFallback for SPA offline', () => {
    expect(createPwaOptions().workbox?.navigateFallback).toBe('/index.html')
  })
})

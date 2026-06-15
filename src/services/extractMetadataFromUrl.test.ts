import { describe, it, expect } from 'vitest'
import { extractMetadataFromUrl } from './extractMetadataFromUrl'

describe('extractMetadataFromUrl', () => {
  // ─── Google Maps ──────────────────────────────────────────────────────────────

  describe('Google Maps', () => {
    it('extracts place name and coordinates from Eiffel Tower URL', () => {
      const url =
        'https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2944813,17z'
      const result = extractMetadataFromUrl(url, 'place')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBe('Eiffel Tower')
      expect(result.location).toBe('Eiffel Tower')
      expect(result.metadata).toEqual({
        coordinates: { lat: 48.8583701, lng: 2.2944813 },
      })
    })

    it('decodes percent-encoded place name with + spaces (Café de Flore)', () => {
      const url =
        'https://www.google.com/maps/place/Caf%C3%A9+de+Flore/@48.8542,2.3325,17z'
      const result = extractMetadataFromUrl(url, 'place')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBe('Café de Flore')
      expect(result.location).toBe('Café de Flore')
      expect(result.metadata).toEqual({
        coordinates: { lat: 48.8542, lng: 2.3325 },
      })
    })

    it('extracts place name without coordinates (Machu Picchu)', () => {
      const url = 'https://www.google.com/maps/place/Machu+Picchu'
      const result = extractMetadataFromUrl(url, 'place')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBe('Machu Picchu')
      expect(result.location).toBe('Machu Picchu')
      expect(result.metadata).toEqual({})
    })

    it('gracefully degrades for maps.app.goo.gl short link (CAPT-04)', () => {
      const url = 'https://maps.app.goo.gl/abc123XYZ'
      const result = extractMetadataFromUrl(url, 'place')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBeUndefined()
      expect(result.location).toBeUndefined()
      expect(result.metadata).toEqual({
        extractionNote: 'shortened-link-unresolvable-offline',
      })
    })
  })

  // ─── IMDb ─────────────────────────────────────────────────────────────────────

  describe('IMDb', () => {
    it('extracts imdbId from title URL', () => {
      const url = 'https://www.imdb.com/title/tt0468569/'
      const result = extractMetadataFromUrl(url, 'movie')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBeUndefined()
      expect(result.metadata).toEqual({ imdbId: 'tt0468569' })
    })

    it('extracts imdbId from mobile IMDb title URL', () => {
      const url = 'https://m.imdb.com/title/tt0111161/?ref_=ext_shr_lnk'
      const result = extractMetadataFromUrl(url, 'movie')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBeUndefined()
      expect(result.metadata).toEqual({ imdbId: 'tt0111161' })
    })

    it('returns empty metadata for IMDb person (name) URL', () => {
      const url = 'https://www.imdb.com/name/nm0000288/'
      const result = extractMetadataFromUrl(url, 'movie')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBeUndefined()
      expect(result.metadata).toEqual({})
    })
  })

  // ─── Books ────────────────────────────────────────────────────────────────────

  describe('Books', () => {
    it('extracts title from Goodreads book URL (The Pragmatic Programmer)', () => {
      const url =
        'https://www.goodreads.com/book/show/5470-the-pragmatic-programmer'
      const result = extractMetadataFromUrl(url, 'book')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBe('The Pragmatic Programmer')
      expect(result.metadata).toEqual({})
    })

    it('extracts title from Goodreads book URL (A Brief History Of Time)', () => {
      const url =
        'https://www.goodreads.com/book/show/100-a-brief-history-of-time'
      const result = extractMetadataFromUrl(url, 'book')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBe('A Brief History Of Time')
      expect(result.metadata).toEqual({})
    })

    it('IN-01: decodes percent-encoded non-ASCII slug on Goodreads (é)', () => {
      // URL.pathname preserves percent-encoding; decodeURIComponent converts it
      const url =
        'https://www.goodreads.com/book/show/12345-le-p%C3%A9tit-prince'
      const result = extractMetadataFromUrl(url, 'book')
      expect(result.sourceUrl).toBe(url)
      // Should decode %C3%A9 → é and title-case: "Le Pétit Prince"
      expect(result.title).toBe('Le Pétit Prince')
    })

    it('extracts titlecased title from Amazon URL with slug before /dp/', () => {
      const url =
        'https://www.amazon.com/Pragmatic-Programmer-journey-mastery-Anniversary/dp/0135957052/'
      const result = extractMetadataFromUrl(url, 'book')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBe('Pragmatic Programmer Journey Mastery Anniversary')
      expect(result.metadata).toEqual({})
    })

    it('returns undefined title for Amazon URL with no slug (bare /dp/)', () => {
      const url = 'https://www.amazon.com/dp/0135957052'
      const result = extractMetadataFromUrl(url, 'book')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBeUndefined()
      expect(result.metadata).toEqual({})
    })

    it('extracts title from Amazon co.uk URL', () => {
      const url = 'https://www.amazon.co.uk/Some-Book/dp/B09XYZ'
      const result = extractMetadataFromUrl(url, 'book')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBe('Some Book')
      expect(result.metadata).toEqual({})
    })
  })

  // ─── Podcasts ─────────────────────────────────────────────────────────────────

  describe('Podcasts', () => {
    it('extracts title from Apple Podcasts URL (The Daily)', () => {
      const url =
        'https://podcasts.apple.com/us/podcast/the-daily/id1200361736'
      const result = extractMetadataFromUrl(url, 'podcast')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBe('The Daily')
      expect(result.metadata).toEqual({})
    })

    it('extracts title from Apple Podcasts GB URL (Serial)', () => {
      const url = 'https://podcasts.apple.com/gb/podcast/serial/id917918570'
      const result = extractMetadataFromUrl(url, 'podcast')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBe('Serial')
      expect(result.metadata).toEqual({})
    })

    it('extracts spotifyId and kind from Spotify show URL', () => {
      const url = 'https://open.spotify.com/show/3T3y3KW1mFKNmmNHBjfxpd'
      const result = extractMetadataFromUrl(url, 'podcast')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBeUndefined()
      expect(result.metadata).toEqual({
        spotifyId: '3T3y3KW1mFKNmmNHBjfxpd',
        kind: 'show',
      })
    })

    it('extracts spotifyId and kind from Spotify episode URL', () => {
      const url = 'https://open.spotify.com/episode/55bVQcJnXvpJFb1dPSqU30'
      const result = extractMetadataFromUrl(url, 'podcast')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBeUndefined()
      expect(result.metadata).toEqual({
        spotifyId: '55bVQcJnXvpJFb1dPSqU30',
        kind: 'episode',
      })
    })
  })

  // ─── Graceful degradation (CAPT-04) ──────────────────────────────────────────

  describe('Graceful degradation (CAPT-04)', () => {
    it('preserves sourceUrl for unrecognized domain without throwing', () => {
      const url = 'https://example.com/some-random-page'
      const result = extractMetadataFromUrl(url, 'place')
      expect(result.sourceUrl).toBe(url)
      expect(result.title).toBeUndefined()
      expect(result.metadata).toEqual({})
    })

    it('returns base draft for invalid URL string without throwing', () => {
      const url = 'not-a-url'
      const result = extractMetadataFromUrl(url, 'place')
      expect(result.sourceUrl).toBe('not-a-url')
      expect(result.title).toBeUndefined()
      expect(result.metadata).toEqual({})
    })
  })

  // ─── WR-01: lookalike hostname rejection ──────────────────────────────────────

  describe('WR-01: lookalike hostnames fall through to base draft', () => {
    it('evil-google.com does NOT trigger Google Maps extractor', () => {
      const url = 'https://evil-google.com/maps/place/Eiffel+Tower'
      const result = extractMetadataFromUrl(url, 'place')
      // Falls through to base draft: no title, no location, no coordinates
      expect(result.title).toBeUndefined()
      expect(result.location).toBeUndefined()
      expect(result.metadata).toEqual({})
    })

    it('notimdb.com does NOT trigger IMDb extractor', () => {
      const url = 'https://notimdb.com/title/tt0468569/'
      const result = extractMetadataFromUrl(url, 'movie')
      expect(result.metadata).toEqual({})
    })

    it('notgoodreads.com does NOT trigger Goodreads extractor', () => {
      const url = 'https://notgoodreads.com/book/show/5470-the-pragmatic-programmer'
      const result = extractMetadataFromUrl(url, 'book')
      expect(result.title).toBeUndefined()
    })

    it('notamazon.com does NOT trigger Amazon extractor', () => {
      const url = 'https://notamazon.com/Some-Book/dp/B09XYZ'
      const result = extractMetadataFromUrl(url, 'book')
      expect(result.title).toBeUndefined()
    })

    it('xpodcasts.apple.com does NOT trigger Apple Podcasts extractor', () => {
      const url = 'https://xpodcasts.apple.com/us/podcast/the-daily/id1200361736'
      const result = extractMetadataFromUrl(url, 'podcast')
      expect(result.title).toBeUndefined()
    })
  })
})

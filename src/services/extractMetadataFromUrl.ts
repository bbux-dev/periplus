import type { EntryType } from './db'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ExtractedDraft {
  sourceUrl: string                  // ALWAYS set — CAPT-04 guarantee
  title?: string                     // when derivable from the URL string
  location?: string                  // google_maps: decoded place name
  metadata: Record<string, unknown>  // domain-specific extras (imdbId, coordinates, …)
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Convert a hyphen-separated slug into Title Case.
 * "the-pragmatic-programmer" → "The Pragmatic Programmer"
 */
function slugToTitle(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Decode a Google Maps path segment where `+` encodes space (non-standard,
 * query-string convention used by Google in path segments).
 *
 * The WHATWG URL API does NOT decode `+` in pathnames — it is only decoded in
 * `application/x-www-form-urlencoded` contexts.  We must replace `+` → `%20`
 * before calling `decodeURIComponent`.
 */
function decodeGoogleMapsName(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, '%20')).trim()
  } catch {
    // Malformed percent-encoding fallback
    return raw.replace(/\+/g, ' ').trim()
  }
}

// ─── Per-domain extractors ────────────────────────────────────────────────────

/**
 * maps.app.goo.gl short links cannot be resolved offline (CAPT-04).
 * Return a graceful base draft with an explanatory note in metadata.
 */
function extractGoogleMapsShort(url: string): ExtractedDraft {
  return {
    sourceUrl: url,
    metadata: { extractionNote: 'shortened-link-unresolvable-offline' },
  }
}

/**
 * Full Google Maps place URL:
 *   https://www.google.com/maps/place/<Place+Name>/@lat,lng,zoomz
 */
function extractGoogleMaps(url: string, parsed: URL): ExtractedDraft {
  const { pathname } = parsed

  // Place name: segment between /place/ and the next / or @
  const placeMatch = pathname.match(/\/maps\/place\/([^/@]+)/)
  const placeName = placeMatch ? decodeGoogleMapsName(placeMatch[1]) : undefined

  // Coordinates — primary: /@lat,lng,zoom in pathname
  const coordMatch = pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  // Fallback: !3dLAT!4dLNG encoded in the `data` search parameter
  const dataStr = parsed.searchParams.get('data') ?? ''
  const dataCoordMatch = dataStr.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)

  const lat = coordMatch?.[1] ?? dataCoordMatch?.[1]
  const lng = coordMatch?.[2] ?? dataCoordMatch?.[2]

  return {
    sourceUrl: url,
    title: placeName,
    location: placeName,
    metadata:
      lat && lng
        ? { coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) } }
        : {},
  }
}

/**
 * IMDb title URL:
 *   https://www.imdb.com/title/tt0468569/
 *   https://m.imdb.com/title/tt0111161/   (mobile)
 * Person URLs (/name/) carry no imdbId.
 */
function extractImdb(url: string, parsed: URL): ExtractedDraft {
  const imdbMatch = parsed.pathname.match(/\/title\/(tt\d+)/)
  const imdbId = imdbMatch?.[1]
  return {
    sourceUrl: url,
    metadata: imdbId ? { imdbId } : {},
  }
}

/**
 * Goodreads book URL:
 *   https://www.goodreads.com/book/show/5470-the-pragmatic-programmer
 */
function extractGoodreads(url: string, parsed: URL): ExtractedDraft {
  const match = parsed.pathname.match(/\/book\/show\/\d+-(.+)/)
  const slug = match?.[1]
  // decodeURIComponent for symmetry with extractAmazon — handles non-ASCII book titles
  const title = slug ? slugToTitle(decodeURIComponent(slug)) : undefined
  return { sourceUrl: url, title, metadata: {} }
}

/**
 * Amazon book URL:
 *   https://www.amazon.com/<Title-Slug>/dp/<ASIN>/
 *   https://www.amazon.com/dp/<ASIN>         (no slug — title is undefined)
 *   https://www.amazon.co.uk/<Slug>/dp/<ASIN>
 *
 * IMPORTANT: the fixture expects titlecasing on the slug — apply the same
 * slugToTitle helper used for Goodreads/Apple.
 */
function extractAmazon(
  url: string,
  parsed: URL,
  base: ExtractedDraft,
): ExtractedDraft {
  const { pathname } = parsed
  const dpIdx = pathname.indexOf('/dp/')
  if (dpIdx === -1) return base // unrecognised Amazon URL pattern

  const beforeDp = pathname.slice(0, dpIdx)
  const segments = beforeDp.split('/').filter(Boolean)
  const titleSlug = segments.pop() // last segment before /dp/

  const title = titleSlug ? slugToTitle(decodeURIComponent(titleSlug)) : undefined

  return { sourceUrl: url, title, metadata: {} }
}

/**
 * Apple Podcasts URL:
 *   https://podcasts.apple.com/us/podcast/the-daily/id1200361736
 */
function extractApplePodcasts(url: string, parsed: URL): ExtractedDraft {
  const match = parsed.pathname.match(/\/podcast\/([^/]+)\/id\d+/)
  const slug = match?.[1]
  const title = slug ? slugToTitle(slug) : undefined
  return { sourceUrl: url, title, metadata: {} }
}

/**
 * Spotify URL:
 *   https://open.spotify.com/show/<id>
 *   https://open.spotify.com/episode/<id>
 * No title is available in the URL — user fills it in on Review.
 */
function extractSpotify(url: string, parsed: URL): ExtractedDraft {
  const match = parsed.pathname.match(/\/(show|episode)\/([^/]+)/)
  const kind = match?.[1]
  const spotifyId = match?.[2]
  return {
    sourceUrl: url,
    metadata: spotifyId ? { spotifyId, kind } : {},
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Pure, offline URL-string metadata extractor.
 *
 * Dispatches by hostname first (more reliable than type-first), then falls back
 * to type-based heuristics (currently a no-op — `_type` is reserved for future
 * type-based dispatch).  ALWAYS returns an `ExtractedDraft` with `sourceUrl`
 * set — never throws (CAPT-04).
 */
export function extractMetadataFromUrl(
  url: string,
  _type: EntryType,
): ExtractedDraft {
  const base: ExtractedDraft = { sourceUrl: url, metadata: {} }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return base // CAPT-04: invalid URL string → return base, preserve sourceUrl
  }

  const { hostname } = parsed

  // Short-link check before general google.com check
  if (hostname === 'maps.app.goo.gl') return extractGoogleMapsShort(url)
  // google.com — allow www + any subdomain, but not evil-google.com
  if (
    (hostname === 'google.com' || hostname.endsWith('.google.com')) &&
    parsed.pathname.startsWith('/maps')
  )
    return extractGoogleMaps(url, parsed)
  // imdb.com — www and mobile only; not notimdb.com
  if (hostname === 'www.imdb.com' || hostname === 'm.imdb.com')
    return extractImdb(url, parsed)
  // goodreads.com — apex and www; not notgoodreads.com
  if (hostname === 'goodreads.com' || hostname === 'www.goodreads.com')
    return extractGoodreads(url, parsed)
  // amazon — regional TLDs (amazon.com, amazon.co.uk, amazon.de …); not notamazon.com
  if (
    hostname === 'amazon.com' ||
    /^(?:www\.)?amazon\.[a-z]{2,3}(?:\.[a-z]{2})?$/.test(hostname)
  )
    return extractAmazon(url, parsed, base)
  // podcasts.apple.com — exact; not xpodcasts.apple.com
  if (hostname === 'podcasts.apple.com')
    return extractApplePodcasts(url, parsed)
  if (hostname === 'open.spotify.com') return extractSpotify(url, parsed)

  return base // CAPT-04: unrecognised domain → return base, sourceUrl preserved
}

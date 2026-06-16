# Phase 4: URL-First Capture — Research

**Researched:** 2026-06-15
**Domain:** Offline URL-string heuristics · React 19 UI primitives · React Router v7 state passing
**Confidence:** HIGH (all decisions verified against codebase; no new external packages)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Offline-first extraction**: `extractMetadataFromUrl(url, type)` MUST parse the URL string/domain itself — NO network fetch. Heuristics per CAPT-03 for `google_maps`, `imdb`, `book_url`, `podcast_url`. Best-effort: when little is extractable, preserve the URL and open Review with whatever fields exist (CAPT-04).
- **URL-first is the DEFAULT path**: after choosing an entry type the URL Capture screen is shown by default. `Enter Manually` is a clearly visible SECONDARY action — NOT the default. Manual entry itself lands in Phase 5; in Phase 4 the button must exist and route to the manual path stub.
- **SETUP-05 primitives**: add `Input` and `FormField` to `components/ui/` mirroring the `Button`/`cn` convention (Tailwind v4, no `forwardRef` in React 19).
- **Review screen**: edit all visible extracted fields; Save persists a `LifeLogEntry` via `entriesRepository.create()` and navigates to the domain/category screen; Cancel discards and navigates back. Entry detail is Phase 6.
- **Counter removal**: remove Counter, WelcomePage and their tests in this phase. Remove cleanly; do not leave dead code.

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss skipped per `workflow.skip_discuss=true`. Specifics: routing topology, draft-state passing mechanism, extractor function design, exact file names, wave decomposition.

### Deferred Ideas (OUT OF SCOPE)
Manual-entry form = Phase 5. Entry detail/list/export = Phase 6. Network-based rich metadata fetching is explicitly OUT of scope (offline-first; URL-string heuristics only).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-05 | `components/ui/` adds `Input` and `FormField` primitives for entry forms | Input/FormField design section; mirrors Button.tsx convention exactly |
| CAPT-01 | After choosing an entry type, the URL Capture screen is shown by default (title `Add {Entry Type}`, URL input, `Import from URL`, `Enter Manually`) | Routing: transform `/d/:domain/:type` route; CaptureUrlPage replaces EntryTypePage |
| CAPT-02 | User pastes a URL, app infers metadata, navigates to Review Entry screen | `extractMetadataFromUrl` → `navigate(reviewPath, { state: { draft } })` |
| CAPT-03 | `services/extractMetadataFromUrl(url, type)` returns partial draft via URL/domain heuristics for `google_maps`, `imdb`, `book_url`, `podcast_url` | Heuristics section with concrete URL fixtures and expected outputs |
| CAPT-04 | If extraction yields little/fails, URL is preserved and Review opens with available fields | Graceful degradation: always return `{ sourceUrl: url, metadata: {} }` as base |
| CAPT-05 | Review Entry screen lets user edit all visible fields; Save persists `LifeLogEntry`, Cancel discards | ReviewPage: controlled form over location.state draft; `entriesRepository.create()` |
| CAPT-06 | `Enter Manually` button is clearly visible as a secondary action; manual entry is NOT the default | CaptureUrlPage: `Enter Manually` uses `variant="secondary"` Button; Import button is `variant="primary"` |
</phase_requirements>

---

## Summary

Phase 4 is the first user-facing feature phase. It transforms the existing `EntryTypePage` stub into a full URL Capture → Review → Save flow, adds `Input`/`FormField` UI primitives, implements an offline URL-string metadata extractor, and removes the Phase 1 throwaway counter. No new npm packages are required — all functionality is covered by the LOCKED stack already installed.

The core technical risk is the URL-string heuristics (`extractMetadataFromUrl`): the function must parse the URL itself without any network fetch, cover four domains (Google Maps, IMDb, Goodreads/Amazon, Apple Podcasts/Spotify), degrade gracefully when parsing fails, and be thoroughly unit-tested. Every other piece — routing, state passing, form, persistence — uses patterns already demonstrated in the codebase.

The routing design is minimal: the existing `/d/:domain/:type` route becomes the URL Capture screen (replacing the `EntryTypePage` placeholder). Draft state passes from Capture to Review via `react-router` location state — one `navigate()` call, one `useLocation()` read, no extra store.

**Primary recommendation:** One wave per logical boundary: (Wave 1) delete dead code + add Input/FormField primitives + unit-test the extraction function; (Wave 2) CaptureUrlPage + ReviewPage + App.tsx rewiring + integration test.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| URL metadata extraction | Client (pure TS service) | — | Offline-first; no server; pure function on URL string |
| URL Capture screen | Browser / Client | — | Local React component at `/d/:domain/:type` route |
| Draft state transport (Capture → Review) | Browser / Client (router state) | — | react-router location.state — transient, survives route change, lost on refresh (intentional for a draft) |
| Review form fields | Browser / Client | — | Controlled React form over draft; no server |
| Entry persistence (Save) | Browser / Client → IndexedDB | Dexie repository | `entriesRepository.create()` already established in Phase 2 |
| Navigation after Save | Browser / Client (router) | — | `navigate(-1)` for Cancel; `navigate(/d/:domain)` for Save |
| UI primitives (Input, FormField) | Browser / Client | — | Tailwind v4 + cn, mirrors Button; no server concern |

---

## Standard Stack

### Core (all already installed — LOCKED)

| Library | Version (verified) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| react | 19.2.7 | Component model; ref-as-prop (no forwardRef) | LOCKED |
| react-router-dom | 7.17.0 | Routing, `useParams`, `useNavigate`, `useLocation` | LOCKED |
| dexie | 4.4.3 | IndexedDB persistence via `entriesRepository.create()` | LOCKED |
| fake-indexeddb | 6.2.5 | In-memory IndexedDB for tests (already in devDependencies) | LOCKED |
| vitest + @testing-library/react | 4.1.9 / 16.3.2 | Test harness, already configured in vite.config.ts | LOCKED |
| WHATWG URL API | Built into browser + Node.js 22 + jsdom | URL parsing for heuristics | No package needed; native |

[VERIFIED: npm registry] — all versions confirmed via `npm view <pkg> version` in this session.

### Supporting (in-repo patterns)

| Pattern | Source | Purpose |
|---------|--------|---------|
| `cn` helper | `src/components/ui/cn.ts` | Tailwind class merging for new primitives |
| `useBackOrHome` | `src/hooks/useBackOrHome.ts` | Back navigation with PWA deep-link fallback |
| `getDomainConfig` | `src/config/navigation.ts` | Resolve domain/type labels in new pages |
| `entriesRepository.create()` | `src/services/entriesRepository.ts` | Persistence; already tested with fake-indexeddb |

### Alternatives Considered

| Instead of | Could Use | Why Standard is Better Here |
|------------|-----------|----------------------------|
| react-router location.state | Zustand or Context store | No new dep; draft is transient (no persistence needed across refresh); idiomatic RR |
| react-router location.state | URL query params | Avoids URL length limits and base64 encoding of draft objects |
| WHATWG URL API | `url-parse` npm package | Built-in; available in browser + jsdom; no supply-chain risk |

**Installation:** No new packages required.

---

## Package Legitimacy Audit

No new packages are introduced in Phase 4. All required capabilities are served by the LOCKED stack already in `package.json`.

| Package | Registry | Status |
|---------|----------|--------|
| (none) | — | Phase adds zero new dependencies |

**slopcheck verdict:** N/A (no packages to check). slopcheck was unavailable at research time; this is moot.

---

## Architecture Patterns

### System Architecture Diagram

```
DomainPage (/d/:domain)
   [user taps entry-type tile]
          │
          ▼
CaptureUrlPage (/d/:domain/:type)          ← DEFAULT route for entry type
  ┌─────────────────────────────────┐
  │  heading: "Add {EntryType}"     │
  │  <Input> url                    │
  │  [Import from URL]  (primary)   │
  │  [Enter Manually]   (secondary) │
  └─────────────────────────────────┘
          │                  │
  [paste + Import]     [Enter Manually]
          │                  │
          ▼                  ▼
  extractMetadataFromUrl   /d/:domain/:type/manual (Phase 5 stub)
  (pure, offline)
          │
  navigate(reviewPath, { state: { draft } })
          │
          ▼
ReviewPage (/d/:domain/:type/review)
  ┌─────────────────────────────────┐
  │  pre-filled <FormField>s        │
  │  [Save]   [Cancel]              │
  └─────────────────────────────────┘
          │            │
        [Save]      [Cancel]
          │            │
          ▼            ▼
  entriesRepository  navigate(-1)
     .create(draft)    (back to CaptureUrlPage)
          │
  navigate(/d/:domain)
  (DomainPage — Phase 6 adds detail)
```

### Recommended Project Structure (Phase 4 additions)

```
src/
├── components/
│   ├── ui/
│   │   ├── cn.ts                        (existing)
│   │   ├── Button.tsx                   (existing)
│   │   ├── Input.tsx                    (NEW — SETUP-05)
│   │   └── FormField.tsx                (NEW — SETUP-05)
│   └── Counter.tsx                      (DELETE — Phase 1 dead code)
├── pages/
│   ├── DashboardPage.tsx                (existing)
│   ├── DomainPage.tsx                   (existing)
│   ├── EntryTypePage.tsx                (DELETE — replaced by CaptureUrlPage)
│   ├── EntryTypePage.test.tsx           (DELETE — replaced)
│   ├── CaptureUrlPage.tsx               (NEW — CAPT-01, CAPT-02, CAPT-06)
│   ├── CaptureUrlPage.test.tsx          (NEW)
│   ├── ReviewPage.tsx                   (NEW — CAPT-05)
│   ├── ReviewPage.test.tsx              (NEW)
│   ├── WelcomePage.tsx                  (DELETE — Phase 1 dead code, not in any route)
│   └── WelcomePage.test.tsx             (DELETE)
└── services/
    ├── extractMetadataFromUrl.ts        (NEW — CAPT-03, CAPT-04)
    └── extractMetadataFromUrl.test.ts   (NEW)
```

### Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Import CaptureUrlPage+ReviewPage; change route at `/d/:domain/:type`; remove `/capture` stub; update `/review` stub |
| `src/App.test.tsx` | Remove/update test case for `/d/media/book/capture` (route is removed); heading test at `/d/media/book` still passes ("add book" heading unchanged) |

### Pattern 1: Routing — CaptureUrlPage as the `/d/:domain/:type` Default

`EntryTypePage` is deleted. `CaptureUrlPage` takes its place at the same route.

```tsx
// src/App.tsx (after Phase 4)
import { CaptureUrlPage } from './pages/CaptureUrlPage'
import { ReviewPage }      from './pages/ReviewPage'

<Route path="/d/:domain/:type"        element={<CaptureUrlPage />} />
// Remove: <Route path="/d/:domain/:type/capture" element={...} />
<Route path="/d/:domain/:type/review" element={<ReviewPage />} />
<Route path="/d/:domain/:type/manual" element={<PlaceholderPage title="Manual Entry" />} />
```

[ASSUMED] — the `/capture` sub-route is removed (not redirected). The App.test.tsx test case for `/d/media/book/capture` must be removed or repurposed (the test for `/d/media/book` still passes; the heading is "Add Book").

### Pattern 2: Draft State — React Router Location State

No Zustand, no Context. One navigate call, one useLocation read.

```tsx
// In CaptureUrlPage — after extraction:
// Source: react-router-dom v7 docs
const navigate = useNavigate()
const draft = extractMetadataFromUrl(url, type as EntryType)
navigate(`/d/${domain}/${type}/review`, { state: { draft } })

// In ReviewPage — receive draft:
const location = useLocation()
const initialDraft = (location.state as { draft?: ExtractedDraft } | null)?.draft

// Guard: if no draft (direct URL navigation, bookmark), redirect to capture
if (!initialDraft) {
  navigate(`/d/${domain}/${type}`, { replace: true })
  return null
}
```

[CITED: reactrouter.com/api/location — location.state is the recommended mechanism for transient cross-route data]

### Pattern 3: Input Primitive (React 19, no forwardRef)

React 19 deprecated `forwardRef`; refs are now plain props. Mirrors `Button.tsx` style.

```tsx
// src/components/ui/Input.tsx
// Source: React 19 docs — ref as prop (forwardRef deprecated)
import type { InputHTMLAttributes, Ref } from 'react'
import { cn } from './cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>
}

export function Input({ ref, className, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-[var(--color-border)]',
        'bg-[var(--color-background)] px-3 py-2 text-sm',
        'placeholder:text-[var(--color-foreground)] placeholder:opacity-40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
```

[ASSUMED] — React 19 ref-as-prop pattern; confirmed per React 19 changelog in training data. Existing `@types/react` 19.x should include `Ref<T>` in the type for function components.

### Pattern 4: FormField Primitive

```tsx
// src/components/ui/FormField.tsx
import type { InputHTMLAttributes, Ref } from 'react'
import { Input } from './Input'
import { cn } from './cn'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
  helpText?: string
  ref?: Ref<HTMLInputElement>
}

export function FormField({ id, label, error, helpText, ref, className, ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium text-[var(--color-foreground)]"
      >
        {label}
      </label>
      <Input
        id={id}
        ref={ref}
        aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
        aria-invalid={!!error}
        className={cn(error && 'border-red-500 focus-visible:ring-red-500', className)}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      {!error && helpText && (
        <p id={`${id}-help`} className="text-sm text-[var(--color-foreground)] opacity-60">
          {helpText}
        </p>
      )}
    </div>
  )
}
```

Key accessibility: `htmlFor`/`id` association; `aria-invalid` on error; `aria-describedby` for error/help; `role="alert"` on error paragraph.

### Pattern 5: CaptureUrlPage Structure

```tsx
// src/pages/CaptureUrlPage.tsx (skeleton)
export function CaptureUrlPage() {
  const { domain = '', type = '' } = useParams<{ domain: string; type: string }>()
  const navigate = useNavigate()
  const goBack = useBackOrHome(`/d/${domain}`)
  const config = getDomainConfig(domain)
  const typeConfig = config?.types.find((t) => t.type === type)

  const [url, setUrl] = useState('')

  const handleImport = () => {
    const draft = extractMetadataFromUrl(url.trim(), type as EntryType)
    navigate(`/d/${domain}/${type}/review`, { state: { draft } })
  }

  const handleManual = () => {
    navigate(`/d/${domain}/${type}/manual`)
  }

  // Guard: unknown domain (mirrors EntryTypePage guard)
  if (!config) { /* same error UI as EntryTypePage */ }

  return (
    /* ... */
    <h1>Add {typeConfig?.label ?? type}</h1>
    <FormField id="capture-url" label="URL" placeholder="Paste a URL..." value={url} onChange={e => setUrl(e.target.value)} />
    <Button variant="primary" onClick={handleImport} disabled={!url.trim()}>Import from URL</Button>
    <Button variant="secondary" onClick={handleManual}>Enter Manually</Button>
  )
}
```

`Import from URL` is disabled when URL field is empty — prevents navigation to Review with no input.

### Pattern 6: ReviewPage Structure

```tsx
// src/pages/ReviewPage.tsx (skeleton)
export function ReviewPage() {
  const { domain = '', type = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const initialDraft = (location.state as { draft?: ExtractedDraft } | null)?.draft

  // Guard: no draft (direct navigation / refresh)
  useEffect(() => {
    if (!initialDraft) navigate(`/d/${domain}/${type}`, { replace: true })
  }, [])

  const [title, setTitle] = useState(initialDraft?.title ?? '')
  const [location_, setLocation_] = useState(initialDraft?.location ?? '')
  // ... other fields

  const handleSave = async () => {
    const entry: Omit<LifeLogEntry, 'id'> = {
      domain: domain as EntryDomain,
      type: type as EntryType,
      title: title.trim() || 'Untitled',
      sourceUrl: initialDraft?.sourceUrl,
      location: location_ || undefined,
      tags: [],
      metadata: initialDraft?.metadata ?? {},
      recordedAt: Date.now(),
      syncedAt: null,
    }
    await entriesRepository.create(entry)
    navigate(`/d/${domain}`)
  }

  const handleCancel = () => navigate(-1)
  // ...
}
```

### Anti-Patterns to Avoid

- **Dispatching extractMetadataFromUrl by entry TYPE alone**: many URLs don't match their type neatly (e.g. a user captures a `place` via a non-Google URL). Dispatch by hostname first, fall through to type-based heuristic if no hostname match, then return base.
- **Calling `decodeURIComponent` without replacing `+` first on Google Maps paths**: `decodeURIComponent('Eiffel+Tower')` returns `'Eiffel+Tower'` — the `+` is NOT decoded. Must do `raw.replace(/\+/g, '%20')` before decoding, or `.replace(/\+/g, ' ')` after.
- **Letting `new URL(invalidInput)` throw unhandled**: always wrap URL construction in try/catch and return the base draft on failure.
- **Using `forwardRef` in React 19**: it is deprecated. Accept `ref` as a plain prop (already supported by `@types/react` 19.x).
- **Deleting `/d/:domain/:type/capture` without updating App.test.tsx**: the test file has a case asserting `/d/media/book/capture` shows "URL Capture" heading. That test case must be removed when the route is deleted.
- **Not guarding ReviewPage for direct navigation**: `useLocation().state` is `null` when navigating directly to the URL. Without a guard, the form crashes on accessing `null.draft`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL parsing | Regex on raw string | `new URL(urlString)` (WHATWG) | Handles protocol, edge cases, throws on invalid — then apply field-specific regex to `url.pathname`, `url.hostname` etc. |
| Class merging | Custom string concat | `cn()` from `src/components/ui/cn.ts` | Already handles Tailwind v4 conflicts via `tailwind-merge` |
| Back navigation | `window.history.back()` | `useBackOrHome(fallback)` from `src/hooks/useBackOrHome.ts` | Already handles PWA deep-link (no prior history) case |
| Entry persistence | Direct Dexie call | `entriesRepository.create(entry)` | Encapsulates UUID gen, schema validation; already tested |
| Input accessibility | Plain `<input>` without label | `FormField` (label + input + error) | `htmlFor`/`id` association required for screen readers |

**Key insight:** The WHATWG `URL` API is the correct parser for the first step of every heuristic. Use `url.hostname`, `url.pathname`, `url.searchParams` — then apply targeted regex on those already-parsed fields. Never regex-match against the raw full URL string for structural parsing.

---

## Offline URL Heuristics — Concrete Design

### Function Signature

```typescript
// src/services/extractMetadataFromUrl.ts

import type { EntryType } from './db'

export interface ExtractedDraft {
  sourceUrl: string                    // always set — CAPT-04 guarantee
  title?: string                       // when derivable from URL
  location?: string                    // google_maps: place name
  metadata: Record<string, unknown>    // domain-specific extras (imdbId, coordinates, etc.)
}

export function extractMetadataFromUrl(url: string, type: EntryType): ExtractedDraft
```

The function is PURE — no side effects, no network, no DOM. Takes a URL string + entry type, returns `ExtractedDraft`. Fully unit-testable.

### Dispatch Strategy

1. Try `new URL(url)` — if invalid, return `{ sourceUrl: url, metadata: {} }` immediately (CAPT-04).
2. Inspect `parsed.hostname` — dispatch to the appropriate heuristic by hostname.
3. Fall back to entry-type-based dispatch if no hostname match.
4. Base case (nothing matches): return `{ sourceUrl: url, metadata: {} }` — Review still opens with sourceUrl preserved.

```typescript
export function extractMetadataFromUrl(url: string, type: EntryType): ExtractedDraft {
  const base: ExtractedDraft = { sourceUrl: url, metadata: {} }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return base  // CAPT-04: invalid URL → preserve as-is
  }

  const { hostname } = parsed

  // Hostname-first dispatch (more reliable than type-first)
  if (hostname === 'maps.app.goo.gl') return extractGoogleMapsShort(url, base)
  if (hostname.includes('google.com') && parsed.pathname.startsWith('/maps')) return extractGoogleMaps(url, parsed, base)
  if (hostname.includes('imdb.com')) return extractImdb(url, parsed, base)
  if (hostname.includes('goodreads.com')) return extractGoodreads(url, parsed, base)
  if (hostname.includes('amazon.')) return extractAmazon(url, parsed, base)
  if (hostname.includes('podcasts.apple.com')) return extractApplePodcasts(url, parsed, base)
  if (hostname === 'open.spotify.com') return extractSpotify(url, parsed, base)

  return base  // CAPT-04: unrecognized → return base, sourceUrl preserved
}
```

### Google Maps Heuristic

**URL anatomy:**
- `hostname`: `www.google.com`, `maps.google.com`, `google.com`
- `pathname`: `/maps/place/Place+Name/@lat,lng,zoomz/data=!3m1...`

**Place name extraction:** Path segment after `/place/`, before `/@`.

**CRITICAL decoding:** `+` in Google Maps path segments represents space (query-style, non-standard). The WHATWG `URL` API does NOT decode `+` in pathnames — it only decodes `%XX` sequences. Must replace `+` before decoding:

```typescript
function decodeGoogleMapsName(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, '%20')).trim()
  } catch {
    return raw.replace(/\+/g, ' ').trim()  // fallback for malformed percent-encoding
  }
}

function extractGoogleMaps(url: string, parsed: URL, base: ExtractedDraft): ExtractedDraft {
  const { pathname } = parsed

  // Place name: segment between /place/ and the next / or @
  const placeMatch = pathname.match(/\/maps\/place\/([^/@]+)/)
  const placeName = placeMatch ? decodeGoogleMapsName(placeMatch[1]) : undefined

  // Coords from @lat,lng,zoomz
  const coordMatch = pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  // Fallback: !3dLAT!4dLNG in data param
  const dataStr = parsed.searchParams.get('data') ?? ''
  const dataCoordMatch = dataStr.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)

  const lat = coordMatch?.[1] ?? dataCoordMatch?.[1]
  const lng = coordMatch?.[2] ?? dataCoordMatch?.[2]

  return {
    sourceUrl: url,
    title: placeName,
    location: placeName,
    metadata: {
      ...(lat && lng ? { coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) } } : {}),
    },
  }
}

function extractGoogleMapsShort(url: string, base: ExtractedDraft): ExtractedDraft {
  // maps.app.goo.gl short links CANNOT be resolved offline — degrade gracefully (CAPT-04)
  return {
    sourceUrl: url,
    metadata: { extractionNote: 'shortened-link-unresolvable-offline' },
  }
}
```

### IMDb Heuristic

**URL anatomy:** `hostname` includes `imdb.com`; title ID is `tt\d+` in path; no human-readable title in URL.

```typescript
function extractImdb(url: string, parsed: URL, base: ExtractedDraft): ExtractedDraft {
  const imdbMatch = parsed.pathname.match(/\/title\/(tt\d+)/)
  const imdbId = imdbMatch?.[1]
  return {
    sourceUrl: url,
    // title is NOT in the URL — user must fill in on Review
    metadata: { ...(imdbId ? { imdbId } : {}) },
  }
}
```

**Design note:** IMDb URLs carry no title string — the Review screen must prompt the user to type the title. This is an intentional "flow over fidelity" tradeoff per spec.

### Book Heuristics

**Goodreads:** `/book/show/<numeric-id>-<slug>` — slug contains title as hyphenated lowercase.

```typescript
function extractGoodreads(url: string, parsed: URL, base: ExtractedDraft): ExtractedDraft {
  // /book/show/5470-the-pragmatic-programmer → "The Pragmatic Programmer"
  const match = parsed.pathname.match(/\/book\/show\/\d+-(.+)/)
  const slug = match?.[1]
  const title = slug
    ? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : undefined
  return { sourceUrl: url, title, metadata: {} }
}
```

**Amazon:** Path may be `/<Title-Slug>/dp/<ASIN>/` or `/dp/<ASIN>` (no title).

```typescript
function extractAmazon(url: string, parsed: URL, base: ExtractedDraft): ExtractedDraft {
  const { pathname } = parsed
  const dpIdx = pathname.indexOf('/dp/')
  if (dpIdx === -1) return base  // unrecognized Amazon URL

  // Segment before /dp/ may contain a title slug
  const beforeDp = pathname.slice(0, dpIdx)
  const segments = beforeDp.split('/').filter(Boolean)
  const titleSlug = segments.pop()  // last segment before /dp/

  const title = titleSlug
    ? decodeURIComponent(titleSlug).replace(/-/g, ' ')
    : undefined

  return { sourceUrl: url, title, metadata: {} }
}
```

**Design note:** Amazon title slugs are often truncated/SEO-modified. Result is best-effort; user corrects on Review.

### Podcast Heuristics

**Apple Podcasts:** `podcasts.apple.com/*/podcast/<slug>/id<digits>` — slug contains show name.

```typescript
function extractApplePodcasts(url: string, parsed: URL, base: ExtractedDraft): ExtractedDraft {
  // /us/podcast/the-daily/id1200361736 → "The Daily"
  const match = parsed.pathname.match(/\/podcast\/([^/]+)\/id\d+/)
  const slug = match?.[1]
  const title = slug
    ? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : undefined
  return { sourceUrl: url, title, metadata: {} }
}
```

**Spotify:** `open.spotify.com/{show|episode}/<opaque-id>` — no title in URL.

```typescript
function extractSpotify(url: string, parsed: URL, base: ExtractedDraft): ExtractedDraft {
  const match = parsed.pathname.match(/\/(show|episode)\/([^/]+)/)
  const kind = match?.[1]
  const spotifyId = match?.[2]
  return {
    sourceUrl: url,
    // title not in URL — user fills in on Review
    metadata: { ...(spotifyId ? { spotifyId, kind } : {}) },
  }
}
```

---

## Test Fixtures — Concrete URL Examples

The planner MUST turn these into test fixtures in `extractMetadataFromUrl.test.ts`.

### Google Maps

| Input URL | Expected title | Expected location | Expected metadata |
|-----------|---------------|-------------------|-------------------|
| `https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2944813,17z` | `"Eiffel Tower"` | `"Eiffel Tower"` | `{ coordinates: { lat: 48.8583701, lng: 2.2944813 } }` |
| `https://www.google.com/maps/place/Caf%C3%A9+de+Flore/@48.8542,2.3325,17z` | `"Café de Flore"` | `"Café de Flore"` | `{ coordinates: { lat: 48.8542, lng: 2.3325 } }` |
| `https://www.google.com/maps/place/Machu+Picchu` (no coords) | `"Machu Picchu"` | `"Machu Picchu"` | `{}` |
| `https://maps.app.goo.gl/abc123XYZ` (short link) | `undefined` | `undefined` | `{ extractionNote: 'shortened-link-unresolvable-offline' }` |

**Encoding note:** For `Caf%C3%A9+de+Flore`, the WHATWG URL API stores the `%C3%A9` portion decoded in `pathname` (confirmed: `URL` normalises `%C3%A9` → `é` in the internal URL record but exposes it percent-encoded in `.pathname`). Safer to always run `decodeURIComponent(segment.replace(/\+/g, '%20'))`.

[ASSUMED] — The exact behavior of `URL.pathname` for non-ASCII percent-encoded characters is implementation-dependent at the boundary. The `decodeURIComponent` + `replace(+)` approach is safe regardless.

### IMDb

| Input URL | Expected title | Expected metadata.imdbId |
|-----------|---------------|--------------------------|
| `https://www.imdb.com/title/tt0468569/` | `undefined` | `"tt0468569"` |
| `https://m.imdb.com/title/tt0111161/?ref_=ext_shr_lnk` | `undefined` | `"tt0111161"` |
| `https://www.imdb.com/name/nm0000288/` (person, not title) | `undefined` | `undefined` |

### Books

| Input URL | Expected title |
|-----------|---------------|
| `https://www.goodreads.com/book/show/5470-the-pragmatic-programmer` | `"The Pragmatic Programmer"` |
| `https://www.goodreads.com/book/show/100-a-brief-history-of-time` | `"A Brief History Of Time"` |
| `https://www.amazon.com/Pragmatic-Programmer-journey-mastery-Anniversary/dp/0135957052/` | `"Pragmatic Programmer Journey Mastery Anniversary"` |
| `https://www.amazon.com/dp/0135957052` (no title slug) | `undefined` |
| `https://www.amazon.co.uk/Some-Book/dp/B09XYZ` | `"Some Book"` |

### Podcasts

| Input URL | Expected title | Expected metadata |
|-----------|---------------|-------------------|
| `https://podcasts.apple.com/us/podcast/the-daily/id1200361736` | `"The Daily"` | `{}` |
| `https://podcasts.apple.com/gb/podcast/serial/id917918570` | `"Serial"` | `{}` |
| `https://open.spotify.com/show/3T3y3KW1mFKNmmNHBjfxpd` | `undefined` | `{ spotifyId: "3T3y3KW1mFKNmmNHBjfxpd", kind: "show" }` |
| `https://open.spotify.com/episode/55bVQcJnXvpJFb1dPSqU30` | `undefined` | `{ spotifyId: "55bVQcJnXvpJFb1dPSqU30", kind: "episode" }` |

### Graceful Degradation (CAPT-04)

| Input URL | Expected sourceUrl | Expected title | Expected metadata |
|-----------|-------------------|---------------|-------------------|
| `https://example.com/some-random-page` (unrecognized) | (input URL) | `undefined` | `{}` |
| `not-a-url` (invalid) | `"not-a-url"` | `undefined` | `{}` |
| `https://maps.app.goo.gl/abc123` (short link) | (input URL) | `undefined` | `{ extractionNote: 'shortened-link-unresolvable-offline' }` |

All three must still navigate to ReviewPage with whatever is available — `sourceUrl` is always preserved.

---

## Counter Removal — Exact File Manifest

The Phase 1 counter is dead code: `App.tsx` routes `/` to `DashboardPage` (not `WelcomePage`). No live file imports `Counter` or `WelcomePage`. Safe to delete entirely.

| File | Action | Reason |
|------|--------|--------|
| `src/components/Counter.tsx` | DELETE | Only used by WelcomePage (itself deleted) |
| `src/components/Counter.test.tsx` | DELETE | Tests dead component |
| `src/pages/WelcomePage.tsx` | DELETE | Not in any App.tsx route since Phase 3 |
| `src/pages/WelcomePage.test.tsx` | DELETE | Tests dead page |
| `src/pages/EntryTypePage.tsx` | DELETE | Replaced by CaptureUrlPage |
| `src/pages/EntryTypePage.test.tsx` | DELETE | Tests replaced by CaptureUrlPage.test.tsx |

**Verification before deletion:** Run `grep -r "WelcomePage\|Counter\|EntryTypePage" src/` — confirm only the files themselves contain these names (no live imports).

---

## Common Pitfalls

### Pitfall 1: `+` in Google Maps Paths Not Decoded by WHATWG URL

**What goes wrong:** `new URL(gmapsUrl).pathname` returns `'/maps/place/Eiffel+Tower/@...'`. Calling `decodeURIComponent('Eiffel+Tower')` returns `'Eiffel+Tower'` — `+` is a valid URI character and is NOT converted to space by `decodeURIComponent`. The place name displays with literal `+` characters.

**Why it happens:** `+`-as-space is a query-string convention (application/x-www-form-urlencoded), not a general URL path convention. The WHATWG URL spec does not apply this decoding to path segments. Google Maps uses `+`-as-space in paths non-standardly.

**How to avoid:** Always pre-process: `decodeURIComponent(raw.replace(/\+/g, '%20'))`. The `replace` converts `+` to `%20`, then `decodeURIComponent` converts `%20` to space.

**Warning signs:** Extracted place names contain `+` characters (e.g., `"Eiffel+Tower"` instead of `"Eiffel Tower"`).

### Pitfall 2: `new URL()` Throws on Invalid Input — Unhandled

**What goes wrong:** User pastes a partial URL (`example.com/path` without `https://`) or a non-URL string. `new URL('example.com/path')` throws `TypeError: Invalid URL`. If uncaught, the entire component crashes.

**Why it happens:** WHATWG URL requires a protocol-including URL string (or a base URL parameter).

**How to avoid:** Always wrap in try/catch. Return `{ sourceUrl: url, metadata: {} }` on catch. Never call `new URL()` outside a try block in this service.

**Warning signs:** Console error "Invalid URL" during testing with edge-case inputs.

### Pitfall 3: ReviewPage Direct-Navigation Crash

**What goes wrong:** User pastes `/d/trips/place/review` into the browser address bar or refreshes. `useLocation().state` is `null`. Accessing `null.draft` throws.

**Why it happens:** React Router location state is a session-time mechanism — it exists only when you navigate with `{ state: ... }`. Refreshes lose it.

**How to avoid:** Guard at the top of ReviewPage: check `!initialDraft` → `navigate(captureRoute, { replace: true })`. This sends the user back to capture cleanly.

**Warning signs:** RTL test fails when ReviewPage is rendered without setting router state.

### Pitfall 4: App.test.tsx Still Expects `/d/media/book/capture` to Render "URL Capture"

**What goes wrong:** Phase 4 removes the `/d/:domain/:type/capture` stub route. The App.test.tsx `it.each(routes)` test still includes `{ path: '/d/media/book/capture', expectedHeading: /url capture/i }`. After route removal, this path hits the catch-all `<PlaceholderPage title="Page Not Found" />`, failing the heading assertion.

**Why it happens:** Phase 3 added the `/capture` stub for future use; Phase 4 supersedes it.

**How to avoid:** Remove (or update) the `/d/media/book/capture` test case from App.test.tsx when removing the route. The `/d/media/book` test (`expectedHeading: /add book/i`) still passes — CaptureUrlPage renders "Add Book".

**Warning signs:** `App.test.tsx` fails after App.tsx route changes.

### Pitfall 5: `entriesRepository.create()` Expects `Omit<LifeLogEntry, 'id'>` — Every Field Required

**What goes wrong:** ReviewPage builds a partial draft and passes it directly to `create()`. TypeScript complains (or at runtime a required field like `recordedAt` or `syncedAt` is undefined).

**Why it happens:** `create()` signature is `(entry: Omit<LifeLogEntry, 'id'>): Promise<LifeLogEntry>`. All fields except `id` are required (non-optional ones: `domain`, `type`, `title`, `recordedAt`, `tags`, `metadata`, `syncedAt`).

**How to avoid:** ReviewPage's `handleSave` must construct the full `Omit<LifeLogEntry, 'id'>` object, filling in defaults: `recordedAt: Date.now()`, `tags: []`, `metadata: draft.metadata ?? {}`, `syncedAt: null`. Optional fields (`description`, `occurredAt`, `sourceUrl`, `amount`, `location`) are set only when available.

**Warning signs:** TypeScript compile error `Argument of type 'ExtractedDraft' is not assignable to parameter of type 'Omit<LifeLogEntry, "id">'`.

### Pitfall 6: IMDb URL Recognition — Mobile Subdomain

**What goes wrong:** `m.imdb.com` URLs (mobile IMDb, commonly shared from the IMDb app) are not matched by a check for `hostname === 'www.imdb.com'`.

**Why it happens:** IMDb app shares use `m.imdb.com` subdomain.

**How to avoid:** Use `hostname.includes('imdb.com')` rather than `hostname === 'imdb.com'`. Covers `www.imdb.com`, `m.imdb.com`, `imdb.com` (naked).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `forwardRef` for ref forwarding | `ref` as a plain prop in function components | React 19 (2024) | `forwardRef` deprecated; omit wrapper in all new Phase 4 components |
| React Router v5 `useHistory` + `location.state` | React Router v7 `useNavigate` + `useLocation().state` | RR v6+ | Already used in codebase; no change needed |

**Deprecated/outdated:**
- `React.forwardRef(...)` wrapper: deprecated in React 19; still works but unnecessary. New components should not use it.
- `WelcomePage` and `Counter`: Phase 1 tracer artifacts — explicitly marked for removal in Phase 4 per CONTEXT.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | React 19 accepts `ref` as a plain prop in function component signatures (no `forwardRef`) | Input/FormField patterns | If wrong: add `forwardRef` wrapper; low impact since existing codebase's Button.tsx doesn't use ref at all |
| A2 | `/d/:domain/:type/capture` stub route is removed and its App.test.tsx test case is dropped | Routing pattern, App.tsx | If keeping the route is preferred: keep it as a redirect to `/d/:domain/:type` and update test expectation |
| A3 | WHATWG `URL.pathname` exposes non-ASCII percent sequences as `%XX` (not decoded) in jsdom/Node 22 | Google Maps pitfall, decoding approach | If jsdom auto-decodes: `decodeURIComponent` call is idempotent and safe regardless |
| A4 | Amazon title-slug approach is `segment.before('/dp/').lastSegment` → replace `-` with space | Amazon extractor | Amazon URL structures vary; this is best-effort; user fixes on Review per CAPT-04 |
| A5 | `handleImport` in CaptureUrlPage is disabled when URL field is empty | CaptureUrlPage pattern | If empty-URL submit should be allowed (shows Review with just sourceUrl = empty string), remove `disabled` guard |

---

## Open Questions

1. **Should the `/d/:domain/:type/capture` route be removed or kept as an alias?** (RESOLVED)
   - RESOLVED: Remove it. The URL Capture screen lives at `/d/:domain/:type` (the existing route). The sub-route `/capture` served as a Phase 3 stub; Phase 4 supersedes it. Remove from App.tsx and remove the corresponding App.test.tsx test case. Rationale: simpler routing, fewer routes, CAPT-01 says capture is shown "after choosing entry type" (i.e., at the entry-type route itself).

2. **How does ReviewPage handle direct navigation (no location.state)?** (RESOLVED)
   - RESOLVED: Guard with `useEffect` + `navigate(captureRoute, { replace: true })`. Return `null` while the effect runs. This is idiomatic React Router — no external library needed.

3. **Should Save navigate to `/d/:domain` (DomainPage) or to a placeholder detail?** (RESOLVED)
   - RESOLVED: Navigate to `/d/${domain}` (DomainPage). Entry detail is Phase 6. DomainPage is a real, tested page. The CONTEXT confirms: "navigate to the domain/category screen (entry detail is Phase 6)".

4. **Which fields does ReviewPage show, given entry types vary?** (RESOLVED)
   - RESOLVED: Show all fields returned by `ExtractedDraft` (sourceUrl, title, location, plus an expandable metadata section). Minimum for Phase 4: `title` (required, user fills in) + `sourceUrl` (read-only or editable) + `location` (for place) + `description` (optional free text). Phase 5 adds type-specific fields for the manual path. Keep Review minimal but functional.

5. **Does `FormField` accept a `textarea` as well as `input`?** (RESOLVED)
   - RESOLVED: No — Phase 4 uses only `<input>` fields. Phase 5 can extend FormField or add a separate `TextareaField` if needed. Keep YAGNI for Phase 4.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest, npm | ✓ | v22.22.3 | — |
| WHATWG URL API | extractMetadataFromUrl | ✓ | Built into Node 22 + jsdom | — |
| fake-indexeddb | ReviewPage.test.tsx (entriesRepository) | ✓ | 6.2.5 (in devDependencies, auto-loaded via test-setup.ts) | — |
| Vitest | Test harness | ✓ | 4.1.9 (via `npx vitest run`) | — |

All 106 existing tests pass green. No missing dependencies.

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` → treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 + @testing-library/react 16.3.2 |
| Config file | `vite.config.ts` (test block: `environment: 'jsdom'`, `setupFiles: ['./src/test-setup.ts']`) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` (same — no separate full suite) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| SETUP-05 | `Input` renders with correct classes and accessible attributes | unit/RTL | `npx vitest run src/components/ui/` | ❌ Wave 0 |
| SETUP-05 | `FormField` associates label with input via htmlFor/id | RTL | `npx vitest run src/components/ui/` | ❌ Wave 0 |
| CAPT-01 | CaptureUrlPage renders "Add {Type}" heading by default | RTL | `npx vitest run src/pages/CaptureUrlPage.test.tsx` | ❌ Wave 0 |
| CAPT-01 | CaptureUrlPage shows URL input and Import button | RTL | same | ❌ Wave 0 |
| CAPT-02 | Pasting Google Maps URL + Import → navigates to ReviewPage with extracted fields | RTL (integration) | `npx vitest run src/pages/CaptureUrlPage.test.tsx` | ❌ Wave 0 |
| CAPT-03/google_maps | extractMetadataFromUrl with Eiffel Tower URL → place name + coords | unit | `npx vitest run src/services/extractMetadataFromUrl.test.ts` | ❌ Wave 0 |
| CAPT-03/google_maps | extractMetadataFromUrl with percent-encoded name (Café) → decoded | unit | same | ❌ Wave 0 |
| CAPT-03/imdb | extractMetadataFromUrl with IMDb URL → imdbId extracted | unit | same | ❌ Wave 0 |
| CAPT-03/imdb | extractMetadataFromUrl with mobile IMDb URL → imdbId extracted | unit | same | ❌ Wave 0 |
| CAPT-03/book_url | extractMetadataFromUrl with Goodreads URL → title from slug | unit | same | ❌ Wave 0 |
| CAPT-03/book_url | extractMetadataFromUrl with Amazon URL (with slug) → title | unit | same | ❌ Wave 0 |
| CAPT-03/podcast_url | extractMetadataFromUrl with Apple Podcasts URL → title from slug | unit | same | ❌ Wave 0 |
| CAPT-03/podcast_url | extractMetadataFromUrl with Spotify URL → spotifyId in metadata | unit | same | ❌ Wave 0 |
| CAPT-04 | extractMetadataFromUrl with unrecognized URL → sourceUrl preserved, no crash | unit | same | ❌ Wave 0 |
| CAPT-04 | extractMetadataFromUrl with `not-a-url` → returns base (no throw) | unit | same | ❌ Wave 0 |
| CAPT-04 | extractMetadataFromUrl with maps.app.goo.gl → sourceUrl preserved, graceful note | unit | same | ❌ Wave 0 |
| CAPT-04 | ReviewPage opens with only sourceUrl when extraction yields nothing | RTL | `npx vitest run src/pages/ReviewPage.test.tsx` | ❌ Wave 0 |
| CAPT-05 | ReviewPage pre-fills fields from location.state draft | RTL | same | ❌ Wave 0 |
| CAPT-05 | Editing title + Save calls entriesRepository.create(), entry is in DB | RTL + fake-indexeddb | same | ❌ Wave 0 |
| CAPT-05 | After Save, navigates to `/d/:domain` | RTL | same | ❌ Wave 0 |
| CAPT-05 | Cancel navigates back to CaptureUrlPage | RTL | same | ❌ Wave 0 |
| CAPT-06 | CaptureUrlPage has visible "Enter Manually" secondary button | RTL | `npx vitest run src/pages/CaptureUrlPage.test.tsx` | ❌ Wave 0 |
| CAPT-06 | "Enter Manually" navigates to `/d/:domain/:type/manual` | RTL | same | ❌ Wave 0 |

### Success Criteria → Test Mapping

| SC | Acceptance Statement | Primary Test |
|----|---------------------|--------------|
| SC1 | URL Capture shown by default; Enter Manually visible as secondary | `CaptureUrlPage.test.tsx` — check heading, URL input, both buttons rendered |
| SC2 | Google Maps URL + Import → ReviewPage with extracted fields | `CaptureUrlPage.test.tsx` integration — render with MemoryRouter, fill input, click Import, assert ReviewPage fields |
| SC3 | Extraction yields little → URL preserved, Review opens | `extractMetadataFromUrl.test.ts` (unit, unrecognized URL) + `ReviewPage.test.tsx` (sourceUrl visible) |
| SC4 | Edit + Save → LifeLogEntry in DB, navigate to domain | `ReviewPage.test.tsx` — fake-indexeddb, fill form, click Save, `entriesRepository.get()` confirms entry |
| SC5 | Input + FormField back forms | `Input.test.tsx` / `FormField.test.tsx` — render, check label association, aria attributes |

### Integration Test Pattern (RTL, Capture→Review→Save)

This test pattern mirrors the existing `DomainPage.test.tsx` `initialEntries` approach:

```tsx
// src/pages/ReviewPage.test.tsx (sketch)
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { db } from '../services/db'
import { entriesRepository } from '../services/entriesRepository'
import { ReviewPage } from './ReviewPage'
import { DomainPage } from './DomainPage'

beforeEach(async () => { await db.delete(); await db.open() })

function renderReviewWithDraft(domain: string, type: string, draft: object) {
  return render(
    <MemoryRouter
      initialEntries={[
        `/d/${domain}/${type}/review`,
      ]}
      future={{ v7_startTransition: true }}
    >
      <Routes>
        <Route
          path="/d/:domain/:type/review"
          element={<ReviewPage />}
          // inject state via MemoryRouter initialEntries state option
          // Note: MemoryRouter v7 supports { pathname, state } entries
        />
        <Route path="/d/:domain" element={<DomainPage />} />
      </Routes>
    </MemoryRouter>
  )
}
```

[ASSUMED] — React Router v7 MemoryRouter supports `{ pathname, state }` objects in `initialEntries` to inject location state. The pattern is: `initialEntries={[{ pathname: '/d/trips/place/review', state: { draft } }]}`. Verify against react-router-dom v7 MemoryRouter API before coding.

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose` (full suite, ~2s)
- **Per wave merge:** same
- **Phase gate:** Full suite green before `/gsd:verify-work` — currently 106 tests; will grow to ~130+ with Phase 4 additions

### Wave 0 Gaps

All test files are new (none exist yet):
- [ ] `src/services/extractMetadataFromUrl.test.ts` — covers CAPT-03 (all 4 domains), CAPT-04
- [ ] `src/services/extractMetadataFromUrl.ts` — must exist before test can run
- [ ] `src/components/ui/Input.tsx` + `Input.test.tsx` — covers SETUP-05 (Input)
- [ ] `src/components/ui/FormField.tsx` — covers SETUP-05 (FormField); can share test file
- [ ] `src/pages/CaptureUrlPage.tsx` + `CaptureUrlPage.test.tsx` — covers CAPT-01, CAPT-02, CAPT-06
- [ ] `src/pages/ReviewPage.tsx` + `ReviewPage.test.tsx` — covers CAPT-04 (UI), CAPT-05

No new framework install needed — existing test infrastructure covers all Phase 4 requirements.

---

## Security Domain

> `security_enforcement` is absent from `.planning/config.json` → treated as enabled. However this is a local-only offline PWA — threat surface is minimal.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in this app |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | Single-user, local-only |
| V5 Input Validation | Yes (limited) | WHATWG `URL` API try/catch on user input; React JSX auto-escapes all rendered output |
| V6 Cryptography | No | No encryption needed; UUIDs via `crypto.randomUUID()` (already in entriesRepository) |

### Threat Patterns for Offline URL Parsing

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User pastes malformed URL to crash extractor | DoS (local) | `try { new URL(input) } catch { return base }` — already in design |
| XSS via crafted URL title containing `<script>` | Spoofing/Tampering | React JSX renders all extracted strings as text nodes (auto-escaped) — no `dangerouslySetInnerHTML` |
| IndexedDB pollution via crafted entry data | Tampering | Dexie/IndexedDB stores structured data; no eval/exec path |

No server, no auth, no network — ASVS threat surface for this phase is contained entirely to input validation of the URL string and XSS prevention in React output (both handled by stdlib/framework).

---

## Sources

### Primary (HIGH confidence — verified against codebase this session)

- Codebase read: `src/services/db.ts` — `LifeLogEntry` model, `EntryType` union, all field types
- Codebase read: `src/services/entriesRepository.ts` — `create(entry: Omit<LifeLogEntry, 'id'>)` signature
- Codebase read: `src/App.tsx` — current routes including placeholder stubs for Phase 4
- Codebase read: `src/App.test.tsx` — existing test assertions that must be preserved or updated
- Codebase read: `src/components/ui/Button.tsx` — exact pattern for Input/FormField to mirror
- Codebase read: `src/pages/EntryTypePage.tsx` — heading pattern (`Add {typeConfig?.label ?? type}`) to carry forward
- Codebase read: `src/pages/DomainPage.test.tsx`, `src/pages/EntryTypePage.test.tsx` — RTL + MemoryRouter + Routes test patterns
- Codebase read: `src/services/entriesRepository.test.tsx` — fake-indexeddb + `beforeEach(db.delete/db.open)` pattern
- Codebase read: `src/test-setup.ts` — confirms `fake-indexeddb/auto` loaded globally for all tests
- `npm view` output: react 19.2.7, react-router-dom 7.17.0, dexie 4.4.3, vitest 4.1.9 — all verified
- `npx vitest run`: 106 tests pass green — confirmed clean baseline

### Secondary (MEDIUM confidence — cited from documentation/spec knowledge)

- [CITED: reactrouter.com] — `useLocation().state` is the idiomatic mechanism for transient cross-route data in React Router v6/v7
- [CITED: developer.mozilla.org/en-US/docs/Web/API/URL] — WHATWG `URL` API: `hostname`, `pathname`, `searchParams`; throws `TypeError` on invalid URL; available in browsers + Node.js + jsdom
- [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent] — `decodeURIComponent` does NOT decode `+` as space; that is query-string behavior only

### Tertiary (LOW confidence — training knowledge, not verified in this session)

- [ASSUMED] React 19 `ref`-as-prop (no `forwardRef`) — consistent with React 19 changelog claims; `@types/react` 19.x installs in this project
- [ASSUMED] Google Maps URL format for place names with `+`-encoded spaces — based on training knowledge of observed Google Maps URLs; the extraction design is robust regardless (falls back to base if match fails)
- [ASSUMED] Goodreads `/book/show/<id>-<slug>` URL pattern — training knowledge; pattern is well-established but Goodreads URLs could vary
- [ASSUMED] Apple Podcasts `/podcast/<slug>/id<digits>` URL pattern — training knowledge
- [ASSUMED] Spotify `open.spotify.com/{show|episode}/<id>` URL pattern — training knowledge

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via `npm view`, codebase read
- Architecture / routing: HIGH — codebase fully analyzed; routing design is minimal evolution of existing patterns
- URL heuristics: MEDIUM — patterns from training knowledge; robust fallback (CAPT-04) means failures degrade gracefully
- Pitfalls: HIGH — derived directly from code analysis and known URL API behavior

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (stable stack; 30-day window)

---

## RESEARCH COMPLETE

**Phase:** 04 — URL-First Capture
**Confidence:** HIGH

### Key Findings

- **No new packages required.** All Phase 4 functionality is covered by the LOCKED stack: WHATWG URL API (built-in), react-router-dom location state, fake-indexeddb (already in devDeps), entriesRepository (Phase 2).
- **CaptureUrlPage replaces EntryTypePage at the same route.** The route `/d/:domain/:type` becomes the URL Capture screen. The "Add {Type}" heading satisfies CAPT-01 and the existing App.test.tsx assertion for that path. The `/capture` stub sub-route is removed; its App.test.tsx case must be deleted.
- **Counter and WelcomePage are fully safe to delete.** `App.tsx` already routes `/` to `DashboardPage` (Phase 3). No live imports of Counter or WelcomePage remain.
- **`extractMetadataFromUrl` is the core risk — test it thoroughly.** It's a pure function covering 4 URL domains with a strict offline contract. 16 concrete test fixtures are specified above. The `+`-decoding pitfall for Google Maps and the `maps.app.goo.gl` short-link degradation are the two most likely points of failure.
- **Draft state passes via react-router `location.state`.** One `navigate()` call with `{ state: { draft } }`, one `useLocation().state` read in ReviewPage. Transient (survives route change, lost on refresh — acceptable for a draft). Guard ReviewPage against direct navigation (`!draft → redirect to capture`).

### File Created

`.planning/phases/04-url-first-capture/04-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All packages verified against registry; zero new deps |
| Routing Architecture | HIGH | Codebase fully read; design is minimal evolution of Phase 3 patterns |
| URL Heuristics | MEDIUM | Training-knowledge patterns; fallback design is robust (CAPT-04) |
| Input/FormField Design | HIGH | Direct mirror of existing Button.tsx convention; React 19 confirmed |
| Counter Removal | HIGH | Grep-confirmed no live imports; safe to delete |
| Testing Strategy | HIGH | Mirrors established codebase patterns (fake-indexeddb, RTL, MemoryRouter) |

### Open Questions

All open questions are RESOLVED — see "Open Questions" section above.

### Ready for Planning

Research complete. Planner can now create PLAN.md files.

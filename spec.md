# Prototype Spec: Personal Life Log PWA

## Goal

Build a mobile-first PWA prototype for personal life logging. The app is not intended for public release. It should provide a fast way to capture structured personal events on a phone, especially while traveling.

The core concept is an append-only-ish personal event log. Trips, media consumption, and expenditures are user-facing categories, but all saved records should become typed entries in a single event log that other apps can later read from.

## Product Shape

The home screen is a dashboard with three root nodes:

* Media
* Trips
* Expenditures

Each root node opens a type-selection screen.

Media types:

* Show
* Movie
* Book
* Podcast

Trip types:

* Place
* Event
* Expense

Expenditure types:

* Expense

## Primary UX Rule

For each entry type, the default capture path should be **From URL**.

Manual entry should be available as a secondary action via a clearly visible button labeled:

`Enter Manually`

The normal flow should be:

```text
Home Dashboard
→ Select root node
→ Select entry type
→ From URL capture screen
→ Review/edit extracted metadata
→ Save
```

Manual fallback:

```text
Home Dashboard
→ Select root node
→ Select entry type
→ From URL capture screen
→ Enter Manually
→ Manual form
→ Save
```

For expenses, support manual entry prominently, but still keep the screen consistent with the URL-first pattern.

## PWA Requirements

Build as a mobile-first installable PWA.

Requirements:

* React + TypeScript preferred.
* Works on phone-sized screens first.
* App shell loads offline.
* Entries can be created offline.
* Persist entries locally using IndexedDB.
* Use a service worker for offline app shell caching.
* No login/auth needed for prototype.
* No backend required for prototype.
* Include JSON export of all entries.

## Data Model

Use one primary stored record type: `LifeLogEntry`.

```ts
type LifeLogDomain = "media" | "trips" | "expenditures";

type LifeLogType =
  | "media.show"
  | "media.movie"
  | "media.book"
  | "media.podcast"
  | "trip.place"
  | "trip.event"
  | "trip.expense"
  | "expenditure.expense";

type Money = {
  amount: number;
  currency: string;
};

type Location = {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  url?: string;
};

type LifeLogEntry = {
  id: string;
  domain: LifeLogDomain;
  type: LifeLogType;
  title: string;
  description?: string;
  occurredAt?: string;
  recordedAt: string;
  sourceUrl?: string;
  amount?: Money;
  location?: Location;
  tags: string[];
  metadata: Record<string, unknown>;
};
```

## Storage

Use IndexedDB.

Suggested object stores:

* `entries`
* `settings`

The `entries` store should be keyed by `id`.

For now, no sync engine is required. However, structure the code so a future sync layer could read unsynced local entries and push them elsewhere.

## Screens

### 1. Home Dashboard

Shows three large buttons/cards:

* Media
* Trips
* Expenditures

### 2. Category Screen

Shows the available entry types for the selected root.

Examples:

Trips screen:

* Place
* Event
* Expense

Media screen:

* Show
* Movie
* Book
* Podcast

### 3. URL Capture Screen

Default screen after choosing an entry type.

Fields/actions:

* Title: `Add {Entry Type}`
* URL input
* Primary button: `Import from URL`
* Secondary button: `Enter Manually`

Behavior:

* User pastes a URL.
* App attempts to infer metadata.
* App navigates to Review Entry screen.
* If metadata extraction fails, preserve the URL and still go to Review Entry with whatever fields are available.

### 4. Manual Entry Screen

Provide a simple form based on entry type.

Common fields:

* Title
* Description
* Occurred At
* Tags

Expense fields:

* Amount
* Currency
* Category
* Merchant/location
* Notes

Place fields:

* Place name
* Address
* Notes
* Tags

Media fields:

* Title
* Creator/author/show
* Date consumed
* Rating/favorite optional
* Notes

### 5. Review Entry Screen

Shows the generated or manually entered entry before saving.

The user can edit all visible fields.

Actions:

* Save Entry
* Cancel

On save:

* Create a `LifeLogEntry`
* Persist to IndexedDB
* Navigate to Entry Detail or back to the category screen

### 6. Entry List Screen

Provide a simple list of saved entries.

Minimum filters:

* All
* Media
* Trips
* Expenditures

Each row should show:

* Title
* Type
* Occurred/recorded date
* Amount if present

### 7. Entry Detail Screen

Shows the full entry.

Include:

* Title
* Type
* Description
* Source URL
* Amount
* Location
* Tags
* Metadata JSON preview

## URL Metadata Extraction

For prototype, do not require complex scraping.

Implement a simple `extractMetadataFromUrl(url, type)` function.

It should use URL/domain heuristics and return a partial entry draft.

Examples:

Google Maps URL for Trip Place:

```ts
{
  title: "Imported place",
  sourceUrl: url,
  location: {
    url
  },
  metadata: {
    importSource: "google_maps"
  }
}
```

IMDb URL for Movie/Show:

```ts
{
  title: "Imported movie",
  sourceUrl: url,
  metadata: {
    importSource: "imdb"
  }
}
```

Goodreads/Amazon/OpenLibrary URL for Book:

```ts
{
  title: "Imported book",
  sourceUrl: url,
  metadata: {
    importSource: "book_url"
  }
}
```

Podcast URL:

```ts
{
  title: "Imported podcast episode",
  sourceUrl: url,
  metadata: {
    importSource: "podcast_url"
  }
}
```

The important part is the flow, not perfect extraction. The review screen should let the user fix weak imported metadata.

## Navigation Tree

```text
Home
├── Media
│   ├── Show
│   ├── Movie
│   ├── Book
│   └── Podcast
├── Trips
│   ├── Place
│   ├── Event
│   └── Expense
└── Expenditures
    └── Expense
```

## Acceptance Criteria

* User can install/open the app like a mobile PWA.
* User can open the app while offline.
* User can create a Media Book entry manually.
* User can create a Trip Place entry from a pasted Google Maps URL.
* User can create a Trip Expense entry.
* User can create a general Expenditure Expense entry.
* Saved entries persist after refresh.
* User can view a list of all saved entries.
* User can export all entries as JSON.
* Manual entry is not the default; it requires clicking `Enter Manually`.

## Non-Goals

Do not implement for prototype:

* User accounts
* Backend sync
* Receipt OCR
* Real third-party API integrations
* Perfect metadata scraping
* Multi-user support
* Public sharing
* Payments
* Complex analytics
* Native Android app
* Push notifications

## Implementation Preference

Use:

* React
* TypeScript
* Vite
* IndexedDB wrapper such as Dexie
* React Router
* PWA plugin/service worker support

Keep the code simple and prototype-oriented. Prioritize the capture flow and local persistence over polish.


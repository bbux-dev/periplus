// Source: src/services/db.ts — EntryDomain / EntryType types (single source of truth)
import type { ComponentType, SVGProps } from 'react'
import type { EntryDomain, EntryType } from '../services/db'

import {
  FilmIcon,
  TvIcon,
  BookOpenIcon,
  MicrophoneIcon,
  MapPinIcon,
  CalendarDaysIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'

// Heroicons are React components that accept standard SVG props
type HeroIcon = ComponentType<SVGProps<SVGSVGElement> & { title?: string }>

export interface EntryTypeConfig {
  type: EntryType
  label: string
  icon: HeroIcon
}

export interface DomainConfig {
  domain: EntryDomain
  label: string
  icon: HeroIcon
  types: EntryTypeConfig[]
}

// NOTE: 'expense' intentionally appears in both 'trips' and 'expenditures' (see db.ts).
// All type lookups MUST be scoped to a specific domain's .types array.
// A flat cross-domain lookup — e.g. NAVIGATION.flatMap(d => d.types).find(t => t.type === 'expense')
// — would silently return only the 'trips' instance and miss 'expenditures'. Keep lookups domain-scoped.
export const NAVIGATION: DomainConfig[] = [
  {
    domain: 'media',
    label: 'Media',
    icon: FilmIcon,
    types: [
      { type: 'show',    label: 'Show',    icon: TvIcon },
      { type: 'movie',   label: 'Movie',   icon: FilmIcon },
      { type: 'book',    label: 'Book',    icon: BookOpenIcon },
      { type: 'podcast', label: 'Podcast', icon: MicrophoneIcon },
    ],
  },
  {
    domain: 'trips',
    label: 'Trips',
    icon: MapPinIcon,
    types: [
      { type: 'place',   label: 'Place',   icon: MapPinIcon },
      { type: 'event',   label: 'Event',   icon: CalendarDaysIcon },
      { type: 'expense', label: 'Expense', icon: BanknotesIcon },
    ],
  },
  {
    domain: 'expenditures',
    label: 'Expenditures',
    icon: BanknotesIcon,
    types: [
      { type: 'expense', label: 'Expense', icon: BanknotesIcon },
    ],
  },
]

/** Look up a DomainConfig by its domain key. Returns undefined for unknown strings. */
export function getDomainConfig(domain: string): DomainConfig | undefined {
  return NAVIGATION.find((d) => d.domain === domain)
}

/**
 * The canonical domain a Quick-Capture entry of `type` lands in. `expense` lives in
 * both 'trips' and 'expenditures' — a bare expense defaults to 'expenditures'. All
 * other types belong to exactly one domain.
 */
export function defaultDomainForType(type: EntryType): EntryDomain {
  if (type === 'expense') return 'expenditures'
  const config = NAVIGATION.find((d) => d.types.some((t) => t.type === type))
  return config?.domain ?? 'media'
}

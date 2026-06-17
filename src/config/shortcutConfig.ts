import type { ComponentType, SVGProps } from 'react'
import {
  BanknotesIcon,
  FilmIcon,
  TvIcon,
  BookOpenIcon,
  MicrophoneIcon,
  MapPinIcon,
  CalendarDaysIcon,
  BoltIcon,
  QueueListIcon,
  HomeIcon,
  BriefcaseIcon,
  GlobeAltIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  HeartIcon,
  StarIcon,
  AcademicCapIcon,
  TicketIcon,
  TruckIcon,
  TagIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline'

// ─── Types ────────────────────────────────────────────────────────────────────

type HeroIcon = ComponentType<SVGProps<SVGSVGElement> & { title?: string }>

export interface Shortcut {
  name: string        // non-empty; display label
  icon?: string       // key into SHORTCUT_ICON_MAP; undefined → fallback icon
  dslTemplate: string // non-empty; passed to parseDSL at capture time (never eval'd here)
  confirm: boolean    // false = one-tap direct save; true = route through ReviewPage
}

export interface Layout {
  name: string        // non-empty; display label for layout chip
  icon?: string       // key into SHORTCUT_ICON_MAP; optional
  shortcuts: Shortcut[]
}

export interface ShortcutConfig {
  version: 1          // literal type — only valid value is 1
  layouts: Layout[]
}

// ─── Icon allow-list ──────────────────────────────────────────────────────────
//
// Curated set of icons offered in the config authoring UI. Configs may store ANY
// string as an `icon` value (the structural validator is intentionally lenient);
// unknown keys passed to resolveShortcutIcon() silently fall back to
// DEFAULT_SHORTCUT_ICON at render time — so removing a key here never breaks a
// stored config. All keys match exact heroicons/24/outline export names ("Icon" suffix).
// Extending this map does NOT require a config version bump (additive change).

export const DEFAULT_SHORTCUT_ICON = BoltIcon

export const SHORTCUT_ICON_MAP: Record<string, HeroIcon> = {
  BanknotesIcon,
  FilmIcon,
  TvIcon,
  BookOpenIcon,
  MicrophoneIcon,
  MapPinIcon,
  CalendarDaysIcon,
  BoltIcon,
  QueueListIcon,
  HomeIcon,
  BriefcaseIcon,
  GlobeAltIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  HeartIcon,
  StarIcon,
  AcademicCapIcon,
  TicketIcon,
  TruckIcon,
  TagIcon,
  BeakerIcon,
}

// ─── Icon resolver ────────────────────────────────────────────────────────────

/** Resolve an icon string key to a HeroIcon component.
 *  Unknown keys and undefined → DEFAULT_SHORTCUT_ICON. Never throws. */
export function resolveShortcutIcon(key: string | undefined): HeroIcon {
  if (!key) return DEFAULT_SHORTCUT_ICON
  return SHORTCUT_ICON_MAP[key] ?? DEFAULT_SHORTCUT_ICON
}

// ─── Default config (DASH-03) ─────────────────────────────────────────────────
//
// Seed data for a fresh install. Written to Dexie settings on first mount of
// DashboardPage when no config is stored (Phase 12 seeding effect). Plain inert
// data — parseDSL is NOT called at module load; validity is asserted in tests.

export const DEFAULT_SHORTCUT_CONFIG: ShortcutConfig = {
  version: 1,
  layouts: [
    {
      name: 'DayToDay',
      icon: 'HomeIcon',
      shortcuts: [
        // Zero holes — one-tap direct save (Phase 13)
        { name: 'Coffee',    icon: 'BoltIcon',         dslTemplate: 'expense 5:coffee',   confirm: false },
        // Amount hole — fill sheet (Phase 13)
        { name: 'Groceries', icon: 'ShoppingCartIcon', dslTemplate: 'expense :groceries', confirm: false },
        { name: 'Lunch',     icon: 'BanknotesIcon',    dslTemplate: 'expense :food',      confirm: false },
        // Text hole — ReviewPage (Phase 13)
        { name: 'New Movie', icon: 'FilmIcon',         dslTemplate: 'movie :',            confirm: true  },
      ],
    },
    {
      name: 'Travel',
      icon: 'GlobeAltIcon',
      shortcuts: [
        { name: 'Trip Expense',  icon: 'BanknotesIcon', dslTemplate: 'expense :food',    confirm: false },
        { name: 'Taxi',          icon: 'TruckIcon',     dslTemplate: 'expense :transit', confirm: false },
        { name: 'Place Visited', icon: 'MapPinIcon',    dslTemplate: 'place :',          confirm: true  },
      ],
    },
    {
      name: 'WorkTrip',
      icon: 'BriefcaseIcon',
      shortcuts: [
        // Multi-value tag param MUST be quoted to avoid DSL comma-splitting
        { name: 'Work Meal',     icon: 'BanknotesIcon', dslTemplate: 'expense :meals?tags="work"',   confirm: false },
        { name: 'Work Taxi',     icon: 'TruckIcon',     dslTemplate: 'expense :transit?tags="work"', confirm: false },
        { name: 'Client Dinner', icon: 'BriefcaseIcon', dslTemplate: 'expense :dining?tags="work"',  confirm: true  },
      ],
    },
  ],
}

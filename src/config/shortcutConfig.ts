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
// Only keys in this map can be stored as `icon` values in the config.
// All keys match exact heroicons/24/outline export names (with "Icon" suffix).
// Unknown keys passed to resolveShortcutIcon() silently fall back to DEFAULT_SHORTCUT_ICON.
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

// src/config/activityTypes.ts
// Single source of truth for activity types — imported by ActivityTypePage and ActivityFormPage.
// No React / component imports — keep it import-light.

/**
 * Ordered list of activity types for the trip activity flow.
 * Route slug is the lowercase form (e.g. 'Hike' → '/activity/hike').
 * Canonical label recovery in the form:
 *   ACTIVITY_TYPES.find(t => t.toLowerCase() === slug)
 */
export const ACTIVITY_TYPES = [
  'Hike',
  'Show',
  'Restaurant',
  'Cafe',
  'Other',
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

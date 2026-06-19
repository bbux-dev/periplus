---
title: Default occurredAt to today's date for date entities
date: 2026-06-18
priority: medium
context: /gsd:explore session — slick-capture quick win
---

# Default `occurredAt` to today's date

## What

When capturing an entry whose type has a date field (`occurredAt`), **default the date to
today** instead of leaving it blank. Most life-log events are logged the day they happen, so
an empty date field is a needless interaction.

## Why

Supports the "fewest interactions" north star ([[fewest-buttons-slickest]]): one less field
to fill on the common path. Today the date is left `undefined` unless the user types it.

## Where

- `src/pages/ReviewPage.tsx` (~lines 43-48) — form state inits `occurredAt` empty; default it
  to today via `new Date().toLocaleDateString('en-CA')` ('YYYY-MM-DD').
- `src/services/captureService.ts` (`draftToEntry`, ~lines 168-198) — for the one-tap
  direct-save path (no ReviewPage), default `occurredAt` to today's local midnight epoch when
  the type has a date field and none was supplied.
- Confirm behavior against `entryFields.ts` so it only applies to types with an `occurredAt`
  field.

## Notes

- Keep it a **default**, not a lock — the user can still edit/clear the date.
- Watch the existing local-midnight convention (`Date.parse(\`${d}T00:00:00\`)`), not UTC.
- Pairs with editable entries ([[editable-saved-entries-design]]) so a wrong default is
  trivially fixable.

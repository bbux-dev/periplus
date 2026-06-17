# Sketch Manifest

## Design Direction

Customizable one-tap shortcut buttons on the Life Log Dashboard, grouped into switchable
**layouts** (DayToDay / Travel / WorkTrip), built on the v0.2.0 Quick-Capture DSL. A shortcut
is a saved DSL template with empty-slot "holes"; tapping it captures in seconds. The feel
should be **fast, calm, and mobile-first**, matching the real app's tokens (currently light;
a Midnight dark theme is included to explore). The key tension to feel: one-tap direct-save
(with undo) vs routing through the Review screen, decided per shortcut.

## Reference Points

- The existing app's look (`src/index.css` tokens) — light, blue primary, system font.
- The v0.2.0 Quick-Capture omnibar (`/capture`) and Review screen it feeds.
- iOS quick-action / segmented-control patterns; budgeting-app "add expense" sheets.

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | dashboard-shortcut-layouts | How should layout switching read, and how fast does tap→fill→save feel? | B (chips + rows) | dashboard, shortcuts, layouts, quick-capture, mobile |

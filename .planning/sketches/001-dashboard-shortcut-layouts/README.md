---
sketch: 001
name: dashboard-shortcut-layouts
question: "How should layout switching read, and how fast does tap→fill→save feel?"
winner: "B"
tags: [dashboard, shortcuts, layouts, quick-capture, mobile]
---

# Sketch 001: Dashboard shortcut layouts

## Design Question

Two things, felt together:
1. **How should switching between layouts** (DayToDay / Travel / WorkTrip) read on a
   phone-sized Dashboard?
2. **How fast/safe does tap→fill→save feel**, and how legible is the per-shortcut
   difference between one-tap direct save, fill-the-amount, and route-to-Review?

## How to View

```
open .planning/sketches/001-dashboard-shortcut-layouts/index.html
```

Tap shortcuts to feel the real behavior. Use the bottom-right toolbar to flip the
**theme** (Light = the actual app tokens; Midnight = a possible dark mode). Each variant
starts on a different layout so the switch is visible immediately.

## Variants

- **A: Segmented + cards** — iOS-style segmented control for layouts; 2-column shortcut
  cards (icon, name, DSL template hint, mode badge). Calm, scannable.
- **B: Chips + rows** — horizontally scrollable layout chips (+ "New layout"); full-width
  list rows with icon, name, template, and a trailing affordance. Scales to many layouts.
- **C: Dropdown + dense** — compact `<select>` for layouts; dense 3-column tile grid. Most
  shortcuts visible at once, least chrome.

All three share the same interactive flow:
- ⚡ **one-tap** (`Daily Coffee`, `Parking`) → saves immediately → **"Saved · Undo"** toast.
- ✎ **amount** (`Trip Expense`, `Groceries`) → bottom-sheet with a big amount field → Save → toast.
- ✓ **review** (`New Movie`, `Place Visited`) → opens the pre-filled **Review** sheet (the
  `confirm: true` path) for fields that vary.

## Decision (2026-06-17)

**Winner: Variant B (chips + rows).** Scales to many layouts (horizontal scroll + "New"),
and full-width rows are the most tappable/legible on a phone.

Refinements applied after the first pass (shared across all variants):
- **Icons:** replaced the cheesy emoji with clean **Heroicons-style outline SVGs**, reusing
  the app's real icon vocabulary (`BanknotesIcon`, `FilmIcon`, `MapPinIcon` from
  `navigation.ts`) where they fit, and matching-style custom outlines (cup, fork, fuel)
  where Heroicons has no equivalent. *Real build → use `@heroicons/react`.*
- **Fill-the-amount sheet:** rebuilt as a proper mobile entry — big right-aligned amount
  display, **quick-amount presets** ($5/$10/$20/$50), a **numeric keypad** (one-thumb), and
  a **live DSL preview** (`expense 12.50:groceries`) that ties the action back to the DSL.
  Save is disabled until a valid amount is entered.

Still open / noted for the build:
- The amount sheet is "good enough to feel," not final — real version wants validation,
  per-type field beyond amount, and keyboard/keypad parity.
- **Authoring tool** (create/edit/reorder shortcuts + layouts, assign icon + `confirm` flag)
  is explicitly wanted — see note `dashboard-shortcut-layouts-design` and the seed's phase 5.
  The "+ New" chip is a placeholder entry point for it.

## What to Look For

- Does the **layout switcher** read instantly, or compete with the shortcuts? Which scales
  if you have 5+ layouts?
- Is the **mode badge** (⚡/✎/✓) enough to know what a tap will do *before* you tap? Does
  one-tap-save feel reckless or fine-with-undo?
- Does the **fill-the-amount sheet** feel fast (big field, autofocus) — like "tap, type
  12.50, save"?
- Does showing the **DSL template** on each card help (reinforces "it's a saved DSL line")
  or add noise?
- Flip to **Midnight** — does the concept hold in dark mode (the brief assumed dark; the app
  currently ships light)?

/**
 * Shortcut config mutation helpers: pure immutable functions for authoring tool
 * CRUD operations (EDIT-01, EDIT-02).
 *
 * Each helper:
 *   - accepts the current ShortcutConfig and mutation parameters
 *   - returns a NEW ShortcutConfig (input is never mutated)
 *   - throws Error on invalid preconditions (not-found, duplicate, last-layout)
 *
 * Write path for callers:
 *   const next = helper(current, ...)
 *   const vr   = validateShortcutConfig(next)
 *   if (!vr.ok) { showError(vr.reason); return }
 *   await configRepository.put(vr.config)
 *
 * Pure-function module (named exports only, no class, no default export).
 * Mirror: src/services/captureService.ts
 */

import type { ShortcutConfig, Layout, Shortcut } from '../config/shortcutConfig'

// ─── Shortcut mutations ───────────────────────────────────────────────────────

/**
 * Adds a shortcut to the named layout.
 * Throws if layout not found or a shortcut with the same name already exists
 * within that layout (cross-layout duplicates are allowed).
 */
export function addShortcut(
  config: ShortcutConfig,
  layoutName: string,
  shortcut: Shortcut,
): ShortcutConfig {
  const layoutExists = config.layouts.some((l) => l.name === layoutName)
  if (!layoutExists) {
    throw new Error(`Layout "${layoutName}" not found.`)
  }

  const layouts = config.layouts.map((l) => {
    if (l.name !== layoutName) return l
    if (l.shortcuts.some((s) => s.name === shortcut.name)) {
      throw new Error(
        `Shortcut "${shortcut.name}" already exists in layout "${layoutName}".`,
      )
    }
    return { ...l, shortcuts: [...l.shortcuts, shortcut] }
  })

  return { ...config, layouts }
}

/**
 * Replaces a shortcut identified by its current name with new data.
 * Throws if layout not found or shortcut not found.
 * If the name changes, verifies no duplicate name exists in the layout.
 */
export function updateShortcut(
  config: ShortcutConfig,
  layoutName: string,
  originalName: string,
  updates: Shortcut,
): ShortcutConfig {
  const layoutExists = config.layouts.some((l) => l.name === layoutName)
  if (!layoutExists) {
    throw new Error(`Layout "${layoutName}" not found.`)
  }

  const layouts = config.layouts.map((l) => {
    if (l.name !== layoutName) return l

    const idx = l.shortcuts.findIndex((s) => s.name === originalName)
    if (idx === -1) {
      throw new Error(`Shortcut "${originalName}" not found in layout "${layoutName}".`)
    }

    // If renaming, check for duplicate (excluding the original slot)
    if (updates.name !== originalName && l.shortcuts.some((s) => s.name === updates.name)) {
      throw new Error(
        `Shortcut "${updates.name}" already exists in layout "${layoutName}".`,
      )
    }

    const shortcuts = l.shortcuts.map((s, i) => (i === idx ? updates : s))
    return { ...l, shortcuts }
  })

  return { ...config, layouts }
}

/**
 * Removes a shortcut by name from the named layout.
 * Throws if layout not found or shortcut not found.
 */
export function deleteShortcut(
  config: ShortcutConfig,
  layoutName: string,
  shortcutName: string,
): ShortcutConfig {
  const layoutExists = config.layouts.some((l) => l.name === layoutName)
  if (!layoutExists) {
    throw new Error(`Layout "${layoutName}" not found.`)
  }

  const layouts = config.layouts.map((l) => {
    if (l.name !== layoutName) return l

    const idx = l.shortcuts.findIndex((s) => s.name === shortcutName)
    if (idx === -1) {
      throw new Error(`Shortcut "${shortcutName}" not found in layout "${layoutName}".`)
    }

    const shortcuts = l.shortcuts.filter((_, i) => i !== idx)
    return { ...l, shortcuts }
  })

  return { ...config, layouts }
}

/**
 * Moves a shortcut one position up or down within its layout.
 * Clamps at array bounds — returns config UNCHANGED (deep-equal) when already at boundary.
 * Throws if layout or shortcut not found.
 */
export function moveShortcut(
  config: ShortcutConfig,
  layoutName: string,
  shortcutName: string,
  direction: 'up' | 'down',
): ShortcutConfig {
  const layoutExists = config.layouts.some((l) => l.name === layoutName)
  if (!layoutExists) {
    throw new Error(`Layout "${layoutName}" not found.`)
  }

  const layouts = config.layouts.map((l) => {
    if (l.name !== layoutName) return l

    const idx = l.shortcuts.findIndex((s) => s.name === shortcutName)
    if (idx === -1) {
      throw new Error(`Shortcut "${shortcutName}" not found in layout "${layoutName}".`)
    }

    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= l.shortcuts.length) return l // at boundary — noop

    const shortcuts = [...l.shortcuts]
    ;[shortcuts[idx], shortcuts[newIdx]] = [shortcuts[newIdx], shortcuts[idx]]
    return { ...l, shortcuts }
  })

  return { ...config, layouts }
}

// ─── Layout mutations ─────────────────────────────────────────────────────────

/**
 * Adds a new layout.
 * Throws if a layout with the same name already exists.
 */
export function addLayout(
  config: ShortcutConfig,
  layout: Layout,
): ShortcutConfig {
  if (config.layouts.some((l) => l.name === layout.name)) {
    throw new Error(`Layout "${layout.name}" already exists.`)
  }
  return { ...config, layouts: [...config.layouts, layout] }
}

/**
 * Renames a layout.
 * Throws if layout not found or new name duplicates an existing layout.
 * Does NOT update activeLayoutName in Dexie — that is the caller's concern.
 */
export function renameLayout(
  config: ShortcutConfig,
  oldName: string,
  newName: string,
): ShortcutConfig {
  // No-op when renaming to the same name — mirrors updateShortcut self-name guard
  if (oldName === newName) return { ...config }

  const layoutExists = config.layouts.some((l) => l.name === oldName)
  if (!layoutExists) {
    throw new Error(`Layout "${oldName}" not found.`)
  }
  if (config.layouts.some((l) => l.name === newName)) {
    throw new Error(`Layout "${newName}" already exists.`)
  }

  const layouts = config.layouts.map((l) =>
    l.name !== oldName ? l : { ...l, name: newName },
  )
  return { ...config, layouts }
}

/**
 * Deletes a layout.
 * Throws 'Cannot delete the only remaining layout.' when layouts.length === 1.
 * Throws if layout not found.
 */
export function deleteLayout(
  config: ShortcutConfig,
  layoutName: string,
): ShortcutConfig {
  if (config.layouts.length === 1) {
    throw new Error('Cannot delete the only remaining layout.')
  }
  if (!config.layouts.some((l) => l.name === layoutName)) {
    throw new Error(`Layout "${layoutName}" not found.`)
  }

  return { ...config, layouts: config.layouts.filter((l) => l.name !== layoutName) }
}

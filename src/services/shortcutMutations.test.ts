import { describe, it, expect } from 'vitest'
import type { ShortcutConfig } from '../config/shortcutConfig'
import {
  addShortcut,
  updateShortcut,
  deleteShortcut,
  moveShortcut,
  addLayout,
  renameLayout,
  deleteLayout,
} from './shortcutMutations'

// ─── Factory helper ───────────────────────────────────────────────────────────

function makeConfig(shortcutNames: string[]): ShortcutConfig {
  return {
    version: 1,
    layouts: [
      {
        name: 'DayToDay',
        shortcuts: shortcutNames.map((name) => ({
          name,
          dslTemplate: 'expense 5:coffee',
          confirm: false,
        })),
      },
    ],
  }
}

function makeMultiLayoutConfig(): ShortcutConfig {
  return {
    version: 1,
    layouts: [
      {
        name: 'DayToDay',
        shortcuts: [
          { name: 'Coffee', dslTemplate: 'expense 5:coffee', confirm: false },
          { name: 'Lunch',  dslTemplate: 'expense :food',    confirm: false },
        ],
      },
      {
        name: 'Travel',
        shortcuts: [
          { name: 'Taxi', dslTemplate: 'expense :transit', confirm: false },
        ],
      },
    ],
  }
}

// ─── addShortcut ──────────────────────────────────────────────────────────────

describe('addShortcut', () => {
  it('appends the shortcut to the named layout', () => {
    const config = makeConfig(['Alpha'])
    const newShortcut = { name: 'Beta', dslTemplate: 'expense :food', confirm: false }
    const result = addShortcut(config, 'DayToDay', newShortcut)
    expect(result.layouts[0].shortcuts).toHaveLength(2)
    expect(result.layouts[0].shortcuts[1].name).toBe('Beta')
  })

  it('throws when layout not found', () => {
    const config = makeConfig(['Alpha'])
    expect(() =>
      addShortcut(config, 'NoSuchLayout', { name: 'Beta', dslTemplate: 'expense :food', confirm: false }),
    ).toThrow()
  })

  it('throws when shortcut name duplicates an existing within that layout', () => {
    const config = makeConfig(['Alpha', 'Beta'])
    expect(() =>
      addShortcut(config, 'DayToDay', { name: 'Alpha', dslTemplate: 'expense :food', confirm: false }),
    ).toThrow()
  })

  it('allows same shortcut name in a different layout', () => {
    const config = makeMultiLayoutConfig()
    expect(() =>
      addShortcut(config, 'Travel', { name: 'Coffee', dslTemplate: 'expense :coffee', confirm: false }),
    ).not.toThrow()
  })

  it('does not mutate the input config', () => {
    const config = makeConfig(['Alpha'])
    const original = JSON.parse(JSON.stringify(config))
    addShortcut(config, 'DayToDay', { name: 'Beta', dslTemplate: 'expense :food', confirm: false })
    expect(config).toEqual(original)
  })
})

// ─── updateShortcut ───────────────────────────────────────────────────────────

describe('updateShortcut', () => {
  it('replaces the shortcut identified by originalName', () => {
    const config = makeConfig(['Alpha', 'Beta'])
    const updates = { name: 'Alpha', dslTemplate: 'movie :', confirm: true }
    const result = updateShortcut(config, 'DayToDay', 'Alpha', updates)
    const sc = result.layouts[0].shortcuts.find((s) => s.name === 'Alpha')
    expect(sc?.dslTemplate).toBe('movie :')
    expect(sc?.confirm).toBe(true)
  })

  it('allows renaming when the new name does not duplicate another in the same layout', () => {
    const config = makeConfig(['Alpha', 'Beta'])
    const result = updateShortcut(config, 'DayToDay', 'Alpha', {
      name: 'Gamma',
      dslTemplate: 'expense :food',
      confirm: false,
    })
    const names = result.layouts[0].shortcuts.map((s) => s.name)
    expect(names).toContain('Gamma')
    expect(names).not.toContain('Alpha')
  })

  it('throws on duplicate name within layout when renaming', () => {
    const config = makeConfig(['Alpha', 'Beta'])
    expect(() =>
      updateShortcut(config, 'DayToDay', 'Alpha', {
        name: 'Beta',
        dslTemplate: 'expense :food',
        confirm: false,
      }),
    ).toThrow()
  })

  it('throws when layout not found', () => {
    const config = makeConfig(['Alpha'])
    expect(() =>
      updateShortcut(config, 'NoSuchLayout', 'Alpha', {
        name: 'Alpha',
        dslTemplate: 'expense :food',
        confirm: false,
      }),
    ).toThrow()
  })

  it('throws when shortcut not found in layout', () => {
    const config = makeConfig(['Alpha'])
    expect(() =>
      updateShortcut(config, 'DayToDay', 'NoSuchShortcut', {
        name: 'NoSuchShortcut',
        dslTemplate: 'expense :food',
        confirm: false,
      }),
    ).toThrow()
  })

  it('does not mutate the input config', () => {
    const config = makeConfig(['Alpha', 'Beta'])
    const original = JSON.parse(JSON.stringify(config))
    updateShortcut(config, 'DayToDay', 'Alpha', { name: 'Alpha', dslTemplate: 'movie :', confirm: true })
    expect(config).toEqual(original)
  })
})

// ─── deleteShortcut ───────────────────────────────────────────────────────────

describe('deleteShortcut', () => {
  it('removes the shortcut by name from the named layout', () => {
    const config = makeConfig(['Alpha', 'Beta'])
    const result = deleteShortcut(config, 'DayToDay', 'Alpha')
    expect(result.layouts[0].shortcuts.map((s) => s.name)).toEqual(['Beta'])
  })

  it('throws when layout not found', () => {
    const config = makeConfig(['Alpha'])
    expect(() => deleteShortcut(config, 'NoSuchLayout', 'Alpha')).toThrow()
  })

  it('throws when shortcut not found in layout', () => {
    const config = makeConfig(['Alpha'])
    expect(() => deleteShortcut(config, 'DayToDay', 'NoSuchShortcut')).toThrow()
  })

  it('does not mutate the input config', () => {
    const config = makeConfig(['Alpha', 'Beta'])
    const original = JSON.parse(JSON.stringify(config))
    deleteShortcut(config, 'DayToDay', 'Alpha')
    expect(config).toEqual(original)
  })
})

// ─── moveShortcut ─────────────────────────────────────────────────────────────

describe('moveShortcut', () => {
  it('moves a shortcut up by swapping with the previous', () => {
    const config = makeConfig(['Alpha', 'Beta', 'Gamma'])
    const result = moveShortcut(config, 'DayToDay', 'Beta', 'up')
    expect(result.layouts[0].shortcuts.map((s) => s.name)).toEqual(['Beta', 'Alpha', 'Gamma'])
  })

  it('moves a shortcut down by swapping with the next', () => {
    const config = makeConfig(['Alpha', 'Beta', 'Gamma'])
    const result = moveShortcut(config, 'DayToDay', 'Beta', 'down')
    expect(result.layouts[0].shortcuts.map((s) => s.name)).toEqual(['Alpha', 'Gamma', 'Beta'])
  })

  it('noop (deep-equal to input) when moving first shortcut up', () => {
    const config = makeConfig(['Alpha', 'Beta'])
    const result = moveShortcut(config, 'DayToDay', 'Alpha', 'up')
    expect(result).toEqual(config)
  })

  it('noop (deep-equal to input) when moving last shortcut down', () => {
    const config = makeConfig(['Alpha', 'Beta'])
    const result = moveShortcut(config, 'DayToDay', 'Beta', 'down')
    expect(result).toEqual(config)
  })

  it('throws when layout not found', () => {
    const config = makeConfig(['Alpha'])
    expect(() => moveShortcut(config, 'NoSuchLayout', 'Alpha', 'up')).toThrow()
  })

  it('throws when shortcut not found in layout', () => {
    const config = makeConfig(['Alpha'])
    expect(() => moveShortcut(config, 'DayToDay', 'NoSuchShortcut', 'up')).toThrow()
  })

  it('does not mutate the input config', () => {
    const config = makeConfig(['Alpha', 'Beta', 'Gamma'])
    const original = JSON.parse(JSON.stringify(config))
    moveShortcut(config, 'DayToDay', 'Beta', 'up')
    expect(config).toEqual(original)
  })
})

// ─── addLayout ────────────────────────────────────────────────────────────────

describe('addLayout', () => {
  it('appends the new layout to the layouts array', () => {
    const config = makeConfig([])
    const result = addLayout(config, { name: 'Travel', shortcuts: [] })
    expect(result.layouts).toHaveLength(2)
    expect(result.layouts[1].name).toBe('Travel')
  })

  it('throws when a layout with the same name already exists', () => {
    const config = makeConfig([])
    expect(() => addLayout(config, { name: 'DayToDay', shortcuts: [] })).toThrow()
  })

  it('does not mutate the input config', () => {
    const config = makeConfig([])
    const original = JSON.parse(JSON.stringify(config))
    addLayout(config, { name: 'Travel', shortcuts: [] })
    expect(config).toEqual(original)
  })
})

// ─── renameLayout ─────────────────────────────────────────────────────────────

describe('renameLayout', () => {
  it('renames the specified layout', () => {
    const config = makeConfig([])
    const result = renameLayout(config, 'DayToDay', 'Everyday')
    expect(result.layouts[0].name).toBe('Everyday')
  })

  it('does not touch shortcuts when renaming', () => {
    const config = makeConfig(['Alpha', 'Beta'])
    const result = renameLayout(config, 'DayToDay', 'Everyday')
    expect(result.layouts[0].shortcuts.map((s) => s.name)).toEqual(['Alpha', 'Beta'])
  })

  it('throws when layout not found (oldName mismatch)', () => {
    const config = makeConfig([])
    expect(() => renameLayout(config, 'NoSuchLayout', 'NewName')).toThrow()
  })

  it('throws when newName duplicates an existing layout', () => {
    const config = makeMultiLayoutConfig()
    expect(() => renameLayout(config, 'DayToDay', 'Travel')).toThrow()
  })

  it('does not mutate the input config', () => {
    const config = makeConfig([])
    const original = JSON.parse(JSON.stringify(config))
    renameLayout(config, 'DayToDay', 'Everyday')
    expect(config).toEqual(original)
  })

  it('returns equivalent config (no-op) when oldName === newName — WR-01', () => {
    const config = makeConfig(['Alpha', 'Beta'])
    const result = renameLayout(config, 'DayToDay', 'DayToDay')
    expect(result).toEqual(config)
  })
})

// ─── deleteLayout ─────────────────────────────────────────────────────────────

describe('deleteLayout', () => {
  it('removes the specified layout from the layouts array', () => {
    const config = makeMultiLayoutConfig()
    const result = deleteLayout(config, 'Travel')
    expect(result.layouts).toHaveLength(1)
    expect(result.layouts[0].name).toBe('DayToDay')
  })

  it('throws "Cannot delete the only remaining layout." when layouts.length === 1', () => {
    const config = makeConfig([])
    expect(() => deleteLayout(config, 'DayToDay')).toThrow(
      'Cannot delete the only remaining layout.',
    )
  })

  it('throws when layout not found', () => {
    const config = makeMultiLayoutConfig()
    expect(() => deleteLayout(config, 'NoSuchLayout')).toThrow()
  })

  it('does not mutate the input config', () => {
    const config = makeMultiLayoutConfig()
    const original = JSON.parse(JSON.stringify(config))
    deleteLayout(config, 'Travel')
    expect(config).toEqual(original)
  })
})

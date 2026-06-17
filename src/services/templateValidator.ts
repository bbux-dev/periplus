/**
 * Template validator: EDIT-04 predicate over parseDSL.
 *
 * Determines whether a dslTemplate string is saveable as a shortcut.
 * Holes (empty positional slots, {} named-hole token) are VALID — they are
 * the authoring-time placeholder convention and produce only parser warnings,
 * never errors.
 *
 * Pure-function module (named exports only, no class, no default export).
 * Mirror: src/services/captureService.ts
 */

import { parseDSL } from './dsl/parser'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplateValidationResult {
  valid: boolean
  /** Human-readable parse error; undefined when valid. */
  error?: string
}

// ─── validateTemplate ─────────────────────────────────────────────────────────

/**
 * Validates whether a dslTemplate string is saveable as a shortcut.
 *
 * Valid = parseable (status !== 'error') AND has a resolvable type (type !== null).
 * Warnings (empty slots, trailing '?') are ACCEPTABLE — they are the "holes."
 * The {} HOLE_TOKEN is treated as an ordinary string value by parseDSL and
 * does NOT need to be stripped before calling this function.
 *
 * Returns { valid: true } for templates with holes (EDIT-04 requirement).
 * Returns { valid: false, error: string } for unterminated quotes, unknown fields,
 * too many slots, missing '=', ambiguous/no type.
 */
export function validateTemplate(template: string): TemplateValidationResult {
  const result = parseDSL(template)
  if (result.status === 'error') {
    return { valid: false, error: result.issues[0] ?? 'Invalid DSL template.' }
  }
  if (result.type === null) {
    // status === 'ambiguous': no type resolved
    return {
      valid: false,
      error: result.issues[0] ?? 'Add a type token (e.g. expense, movie, book).',
    }
  }
  return { valid: true }
}

// ─── isValidTemplate ──────────────────────────────────────────────────────────

/** Convenience boolean. */
export function isValidTemplate(template: string): boolean {
  return validateTemplate(template).valid
}

// Mirrors patrimonium/apps/e2e/test/fixtures/test.ts: re-export the Playwright base
// test + expect, plus small shared utilities. (No custom test.extend fixtures — Life
// Log has no auth/storageState to inject.)
import { test as base, expect } from '@playwright/test'

export const test = base
export { expect }

/** A label/value that is unique per run, to avoid collisions across repeated tests. */
export function buildUniqueText(prefix: string): string {
  return `${prefix}-${Date.now()}`
}

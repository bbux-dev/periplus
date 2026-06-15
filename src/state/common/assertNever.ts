/**
 * assertNever — exhaustiveness check helper.
 *
 * Call in the `default` branch of a discriminated-union switch to make TypeScript
 * enforce that all cases are handled. At runtime, throws if an unhandled value
 * reaches this point.
 *
 * Note: JSON.stringify(value) echoes runtime input in the error message. This
 * is dev-time exhaustiveness only and never reaches a user-facing surface (T-02-02).
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminant: ${JSON.stringify(value)}`)
}

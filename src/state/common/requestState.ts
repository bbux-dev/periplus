/**
 * RequestState<T> — discriminated union for async data fetching.
 * Used by hooks and store slices to represent the lifecycle of a request.
 */
export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

/** Represents no request in progress. */
export const idle = { status: 'idle' } as const

/** Represents an in-flight request. */
export const loading = { status: 'loading' } as const

/** Wraps resolved data in a success state. */
export function success<T>(data: T): RequestState<T> {
  return { status: 'success', data }
}

/** Wraps a thrown Error in a failure state. */
export function failure(error: Error): RequestState<never> {
  return { status: 'error', error }
}

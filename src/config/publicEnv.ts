/**
 * Public (non-secret) environment variables read from import.meta.env.
 *
 * No env vars are consumed in Phase 2. This is an extensible placeholder:
 * future phases should add typed keys here for any non-secret VITE_* variables
 * that the app needs (e.g. VITE_API_URL for a future sync backend).
 *
 * IMPORTANT: Never expose secret values here — only expose `import.meta.env`
 * keys whose values are safe to ship in the browser bundle (T-02-01).
 */
export const publicEnv = {} as const

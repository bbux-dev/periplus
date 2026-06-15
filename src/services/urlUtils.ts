/** Returns true only for http: and https: URLs — guards against javascript: XSS vectors. */
export function isSafeUrl(raw: string): boolean {
  try {
    const { protocol } = new URL(raw)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

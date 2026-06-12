// localStorage-backed cache with a TTL, plus an in-flight dedupe map.
//
// The cache lives in the plugin's sandbox iframe, so it persists across plugin
// reloads and is shared across graphs — which is what we want, since branch and
// issue status is global to GitHub, not graph-specific. Reads are synchronous
// and sub-millisecond; they never block Logseq's editor thread.
//
// Entries are generic over their payload (branch results, issue results, …);
// distinct cache-key namespaces keep the different kinds from colliding.

interface CacheEntry<T> {
  result: T
  fetchedAt: number
}

const PREFIX = 'gfw-cache:'

// Coalesces concurrent fetches for the same key into one request, so N blocks
// referencing the same branch/issue at startup cost a single API call.
const inflight = new Map<string, Promise<unknown>>()

export const cacheKey = (owner: string, repo: string, ref: string): string =>
  `${owner}/${repo}/${ref}`

export const getCached = <T>(key: string, ttlMs: number): T | null => {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() - entry.fetchedAt > ttlMs) return null
    return entry.result
  } catch {
    return null
  }
}

// Return a cached value regardless of its age. Used as an offline fallback:
// when a refetch fails we'd still rather show the last known state than an
// error. Returns null only if nothing was ever cached (or it can't be parsed).
export const getCachedStale = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    return (JSON.parse(raw) as CacheEntry<T>).result
  } catch {
    return null
  }
}

export const setCached = <T>(key: string, result: T): void => {
  try {
    const entry: CacheEntry<T> = { result, fetchedAt: Date.now() }
    localStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch {
    // Quota or serialization failure — caching is best-effort, ignore.
  }
}

export const clearCached = (key: string): void => {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // ignore
  }
}

// Run `fn` unless an identical fetch is already in flight, in which case share
// its promise.
export const dedupe = <T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) return existing
  const p = fn().finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

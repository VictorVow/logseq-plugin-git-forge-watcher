import type { BranchResult } from './github'

// localStorage-backed cache with a TTL, plus an in-flight dedupe map.
//
// The cache lives in the plugin's sandbox iframe, so it persists across plugin
// reloads and is shared across graphs — which is what we want, since branch
// status is global to GitHub, not graph-specific. Reads are synchronous and
// sub-millisecond; they never block Logseq's editor thread.

interface CacheEntry {
  result: BranchResult
  fetchedAt: number
}

const PREFIX = 'gfw-cache:'

// Coalesces concurrent fetches for the same branch into one request, so N
// blocks referencing the same branch at startup cost a single API call.
const inflight = new Map<string, Promise<BranchResult>>()

export const cacheKey = (owner: string, repo: string, branch: string): string =>
  `${owner}/${repo}/${branch}`

export const getCached = (key: string, ttlMs: number): BranchResult | null => {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() - entry.fetchedAt > ttlMs) return null
    return entry.result
  } catch {
    return null
  }
}

export const setCached = (key: string, result: BranchResult): void => {
  try {
    const entry: CacheEntry = { result, fetchedAt: Date.now() }
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
export const dedupe = (
  key: string,
  fn: () => Promise<BranchResult>,
): Promise<BranchResult> => {
  const existing = inflight.get(key)
  if (existing) return existing
  const p = fn().finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

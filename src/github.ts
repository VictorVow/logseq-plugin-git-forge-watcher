import type { BranchRef } from './parse-branch'

export type BranchStatus = 'active' | 'stale' | 'deleted'

export type PrState = 'open' | 'closed' | 'merged' | 'draft'

export interface PrInfo {
  number: number
  state: PrState
  url: string
  title: string
}

export interface BranchResult {
  status: BranchStatus
  prs: PrInfo[]
  /** ISO date of the last commit on the branch, when known. */
  lastCommit?: string
}

// Thrown when GitHub returns a non-OK response we can't treat as "missing".
// `rateLimited` flags the unauthenticated-limit / abuse case (HTTP 403/429
// with no remaining quota) so the UI can prompt for a token.
export class GitHubError extends Error {
  status: number
  rateLimited: boolean
  constructor(status: number, rateLimited: boolean, message: string) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
    this.rateLimited = rateLimited
  }
}

const isRateLimited = (res: Response): boolean =>
  (res.status === 403 || res.status === 429) &&
  res.headers.get('x-ratelimit-remaining') === '0'

const errorFor = (res: Response, what: string): GitHubError => {
  const limited = isRateLimited(res)
  return new GitHubError(
    res.status,
    limited,
    limited
      ? `GitHub rate limit exceeded while fetching ${what}`
      : `GitHub ${what} request failed: ${res.status}`,
  )
}

const apiHeaders = (token?: string): HeadersInit => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

const prStateOf = (pr: {
  state: string
  draft?: boolean
  merged_at?: string | null
}): PrState => {
  if (pr.merged_at) return 'merged'
  if (pr.state === 'closed') return 'closed'
  if (pr.draft) return 'draft'
  return 'open'
}

// Look up branch status and any pull requests whose head is this branch.
// `staleDays` controls when an existing branch is considered stale rather
// than active (based on the last commit date).
export const fetchBranchResult = async (
  ref: BranchRef,
  staleDays: number,
  token?: string,
): Promise<BranchResult> => {
  const { owner, repo, branch } = ref
  const headers = apiHeaders(token)
  const base = `https://api.github.com/repos/${owner}/${repo}`

  // 1. Does the branch still exist, and when was it last touched?
  let status: BranchStatus = 'deleted'
  let lastCommit: string | undefined
  const branchRes = await fetch(
    `${base}/branches/${encodeURIComponent(branch)}`,
    { headers },
  )
  if (branchRes.ok) {
    const data = await branchRes.json()
    lastCommit = data?.commit?.commit?.committer?.date
    const ageMs = lastCommit ? Date.now() - new Date(lastCommit).getTime() : 0
    const staleMs = staleDays * 24 * 60 * 60 * 1000
    status = lastCommit && ageMs > staleMs ? 'stale' : 'active'
  } else if (branchRes.status !== 404) {
    throw errorFor(branchRes, 'branch')
  }

  // 2. Pull requests originating from this branch (any state).
  const prRes = await fetch(
    `${base}/pulls?head=${encodeURIComponent(`${owner}:${branch}`)}&state=all&per_page=100`,
    { headers },
  )
  // A failed PR lookup must throw rather than silently yield an empty list —
  // otherwise a transient rate limit gets cached as "no PRs".
  if (!prRes.ok) throw errorFor(prRes, 'pull requests')

  const list = (await prRes.json()) as Array<{
    number: number
    state: string
    draft?: boolean
    merged_at?: string | null
    html_url: string
    title: string
  }>
  const prs: PrInfo[] = list.map((pr) => ({
    number: pr.number,
    state: prStateOf(pr),
    url: pr.html_url,
    title: pr.title,
  }))

  return { status, prs, lastCommit }
}

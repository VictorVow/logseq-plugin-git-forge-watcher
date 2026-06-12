import type { BranchRef } from './parse-branch'
import type { IssueRef } from './parse-issue'
import type { PrRef } from './parse-pr'
import type { RepoRef } from './parse-repo'

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

// Look up the current state of a single pull request.
export const fetchPrResult = async (
  ref: PrRef,
  token?: string,
): Promise<PrInfo> => {
  const { owner, repo, number } = ref
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
    { headers: apiHeaders(token) },
  )
  if (!res.ok) throw errorFor(res, 'pull request')

  const data = (await res.json()) as {
    number: number
    state: string
    draft?: boolean
    merged_at?: string | null
    html_url: string
    title: string
  }
  return {
    number: data.number,
    state: prStateOf(data),
    url: data.html_url,
    title: data.title,
  }
}

// An issue is `open`, closed as `completed`, or closed as `not_planned`.
export type IssueState = 'open' | 'completed' | 'not_planned'

export interface IssueResult {
  state: IssueState
  title: string
  url: string
  number: number
}

const issueStateOf = (issue: {
  state: string
  state_reason?: string | null
}): IssueState => {
  if (issue.state === 'open') return 'open'
  return issue.state_reason === 'not_planned' ? 'not_planned' : 'completed'
}

// Look up the current state of a single issue.
export const fetchIssueResult = async (
  ref: IssueRef,
  token?: string,
): Promise<IssueResult> => {
  const { owner, repo, number } = ref
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${number}`,
    { headers: apiHeaders(token) },
  )
  if (!res.ok) throw errorFor(res, 'issue')

  const data = (await res.json()) as {
    state: string
    state_reason?: string | null
    html_url: string
    title: string
    number: number
  }
  return {
    state: issueStateOf(data),
    title: data.title,
    url: data.html_url,
    number: data.number,
  }
}

export interface RepoResult {
  stars: number
  /** Open issues only — pull requests excluded, matching GitHub's UI. */
  openIssues: number
  openPrs: number
  defaultBranch: string
  /** ISO date the repo was last pushed to (its most recent commit). */
  lastCommit?: string
  url: string
}

// Count open pull requests via the search API (`total_count`). GitHub's repo
// endpoint folds PRs into `open_issues_count`, so we query PRs separately and
// subtract to get the issue-only figure the repo page shows.
const fetchOpenPrCount = async (
  owner: string,
  repo: string,
  headers: HeadersInit,
): Promise<number> => {
  const q = encodeURIComponent(`repo:${owner}/${repo} is:pr is:open`)
  const res = await fetch(
    `https://api.github.com/search/issues?q=${q}&per_page=1`,
    { headers },
  )
  if (!res.ok) throw errorFor(res, 'pull request count')
  const data = (await res.json()) as { total_count: number }
  return data.total_count ?? 0
}

// Look up repository-level facts: stars, open issue/PR counts, default branch
// and the date of the most recent push (used as "last commit").
export const fetchRepoResult = async (
  ref: RepoRef,
  token?: string,
): Promise<RepoResult> => {
  const { owner, repo } = ref
  const headers = apiHeaders(token)

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
  })
  if (!res.ok) throw errorFor(res, 'repository')

  const data = (await res.json()) as {
    stargazers_count: number
    open_issues_count: number
    default_branch: string
    pushed_at?: string | null
    html_url: string
  }

  const openPrs = await fetchOpenPrCount(owner, repo, headers)
  // `open_issues_count` includes PRs; subtract them for the issues-only count.
  const openIssues = Math.max(0, (data.open_issues_count ?? 0) - openPrs)

  return {
    stars: data.stargazers_count ?? 0,
    openIssues,
    openPrs,
    defaultBranch: data.default_branch || 'main',
    lastCommit: data.pushed_at ?? undefined,
    url: data.html_url,
  }
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

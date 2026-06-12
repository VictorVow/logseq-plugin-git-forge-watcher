import {
  cacheKey,
  dedupe,
  getCached,
  getCachedStale,
  setCached,
} from './cache'
import { GitHubError, type RepoResult, fetchRepoResult } from './github'
import {
  issueOpenedIconSvg,
  linkExternalIconSvg,
  pullRequestIconSvg,
  starIconSvg,
} from './icons'
import { parseRepoRef } from './parse-repo'

export const RENDERER_KEY = ':gfw-repo'

// Compact counts the way GitHub renders them: 103k, 1.2k, 12.3k, 2.1m.
const compact = (n: number): string => {
  if (n < 1000) return String(n)
  const units: Array<[number, string]> = [
    [1e6, 'm'],
    [1e3, 'k'],
  ]
  for (const [div, suffix] of units) {
    if (n >= div) {
      const v = n / div
      const s = v >= 100 ? Math.round(v).toString() : v.toFixed(1)
      return `${s.replace(/\.0$/, '')}${suffix}`
    }
  }
  return String(n)
}

// Coarse "x ago" phrasing matching GitHub's relative timestamps.
const relativeTime = (iso?: string): string => {
  if (!iso) return 'unknown'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'unknown'
  const secs = Math.max(0, (Date.now() - then) / 1000)
  const units: Array<[number, string]> = [
    [31536000, 'year'],
    [2592000, 'month'],
    [604800, 'week'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ]
  for (const [size, name] of units) {
    if (secs >= size) {
      const v = Math.floor(secs / size)
      return `${v} ${name}${v === 1 ? '' : 's'} ago`
    }
  }
  return 'just now'
}

// The star group is a button that force-refreshes the cache on click. The slot
// + encoded url ride along in data attributes so the click model can re-render
// this exact widget. Renders the star glyph and count, no "Star" label.
const starButton = (
  stars: number,
  slot: string,
  encodedUrl: string,
): string => `
  <span class="gfw-repo-btn" data-on-click="gfwRefreshRepo"
        data-slot="${slot}" data-url="${encodedUrl}"
        title="${stars.toLocaleString()} stars — click to refresh"
        style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;
               line-height:1;font-size:12px;
               color:var(--ls-secondary-text-color, #848d97);">
    ${starIconSvg('currentColor')}<span>${compact(stars)}</span>
  </span>`

const openLink = (url: string): string => `
  <a class="gfw-open" href="${url}" target="_blank" rel="noopener"
     title="Open repository on GitHub"
     style="display:inline-flex;align-items:center;line-height:1;
            text-decoration:none;
            color:var(--ls-secondary-text-color, #848d97);">
    ${linkExternalIconSvg('currentColor')}
  </a>`

// Last-commit recency, linking to the default branch's commit history.
const commitLink = (result: RepoResult): string => {
  const href = `${result.url}/commits/${encodeURIComponent(result.defaultBranch)}`
  return `
  <a class="gfw-repo-commit" href="${href}" target="_blank" rel="noopener"
     title="View commits on ${result.defaultBranch}"
     style="display:inline-flex;align-items:center;line-height:1;font-size:12px;
            text-decoration:none;
            color:var(--ls-secondary-text-color, #848d97);">
    ${relativeTime(result.lastCommit)}
  </a>`
}

// A bare icon + count (no label), linking to the repo's issues / pulls tab.
const countLink = (
  icon: string,
  count: number,
  href: string,
  label: string,
): string => `
  <a class="gfw-repo-count" href="${href}" target="_blank" rel="noopener"
     title="${count.toLocaleString()} open ${label}"
     style="display:inline-flex;align-items:center;gap:4px;line-height:1;
            font-size:12px;text-decoration:none;
            color:var(--ls-secondary-text-color, #848d97);">
    ${icon}<span>${compact(count)}</span>
  </a>`

// `stale` dims the widget and explains it via a tooltip — used when we're
// showing a cached value because a refetch failed (e.g. offline).
const shell = (inner: string, stale = false): string => `
  <span class="gfw-repo-widget"${stale ? ' title="Offline — showing last known state"' : ''}
        style="display:inline-flex;align-items:center;gap:6px;line-height:1;
               margin-right:6px;vertical-align:middle;${stale ? 'opacity:0.55;' : ''}">
    ${inner}
  </span>`

const ttlMs = (): number =>
  (Number(logseq.settings?.cacheTtlHours ?? 24) || 24) * 60 * 60 * 1000

// Register the click handler that backs the repo widget's force-refresh.
export const registerRepoRenderModel = (): void => {
  logseq.provideModel({
    async gfwRefreshRepo(e: { dataset: { slot?: string; url?: string } }) {
      const { slot, url } = e.dataset
      if (slot && url) await handleRender(slot, url, true)
    },
  })
}

export const handleRender = async (
  slot: string,
  encodedUrl: string,
  force = false,
): Promise<void> => {
  const key = `gfw-repo-${slot}`
  let url: string
  try {
    url = decodeURIComponent(encodedUrl)
  } catch {
    url = encodedUrl
  }

  const ref = parseRepoRef(url)
  if (!ref) {
    logseq.provideUI({
      key,
      slot,
      reset: true,
      template: shell(
        `<span style="color:#f85149;font-size:12px;">⚠ no GitHub repo link</span>`,
      ),
    })
    return
  }

  const draw = (result: RepoResult, stale = false) => {
    const issues = countLink(
      issueOpenedIconSvg('currentColor'),
      result.openIssues,
      `${ref.url}/issues`,
      'issues',
    )
    const prs = countLink(
      pullRequestIconSvg('currentColor'),
      result.openPrs,
      `${ref.url}/pulls`,
      'pull requests',
    )
    logseq.provideUI({
      key,
      slot,
      reset: true,
      template: shell(
        starButton(result.stars, slot, encodedUrl) +
          openLink(ref.url) +
          commitLink(result) +
          issues +
          prs,
        stale,
      ),
    })
  }

  // Serve from cache unless this is a forced refresh.
  const ck = cacheKey(ref.owner, ref.repo, 'repo')
  if (!force) {
    const cached = getCached<RepoResult>(ck, ttlMs())
    if (cached) {
      draw(cached)
      return
    }
  }

  // Cache miss (or forced) — show a neutral loading state, then fetch.
  logseq.provideUI({
    key,
    slot,
    reset: true,
    template: shell(starButton(0, slot, encodedUrl) + openLink(ref.url)),
  })

  try {
    const token = (logseq.settings?.githubToken as string) || undefined
    const result = await dedupe(ck, () => fetchRepoResult(ref, token))
    setCached(ck, result)
    draw(result)
  } catch (err) {
    console.error('[github-watcher] repo render failed', err)
    // Prefer the last known state over an error when we have one cached.
    const stale = getCachedStale<RepoResult>(ck)
    if (stale) {
      draw(stale, true)
      return
    }
    const rateLimited = err instanceof GitHubError && err.rateLimited
    const hint = rateLimited
      ? logseq.settings?.githubToken
        ? 'rate limited'
        : 'rate limited — add a GitHub token in settings'
      : 'API error'
    logseq.provideUI({
      key,
      slot,
      reset: true,
      template: shell(
        starButton(0, slot, encodedUrl) +
          openLink(ref.url) +
          `<span style="color:#848d97;font-size:11px;">${hint}</span>`,
      ),
    })
  }
}

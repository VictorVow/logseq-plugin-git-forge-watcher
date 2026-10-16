import { cacheKey } from './cache'
import { fetchRepoResult, type RepoResult } from './github'
import { issueOpenedIconSvg, pullRequestIconSvg, starIconSvg } from './icons'
import { parseRepoRef, type RepoRef } from './parse-repo'
import {
  defineWidget,
  openLink,
  refreshAttrs,
  type WidgetContext,
} from './widget'

// Compact counts the way GitHub renders them: 103k, 1.2k, 12.3k, 2.1m.
const compact = (n: number): string => {
  if (n < 1000) return String(n)
  const units: [number, string][] = [
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
  const units: [number, string][] = [
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

// The star group is a button that force-refreshes the cache on click.
// Renders the star glyph and count, no "Star" label.
const starButton = (stars: number, ctx: WidgetContext): string => `
  <span class="gfw-repo-btn" ${refreshAttrs('repo', ctx)}
        title="${stars.toLocaleString()} stars — click to refresh"
        style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;
               line-height:1;font-size:12px;
               color:var(--ls-secondary-text-color, #848d97);">
    ${starIconSvg('currentColor')}<span>${compact(stars)}</span>
  </span>`

const openRepo = (url: string): string =>
  openLink(url, 'Open repository on GitHub', 'line-height:1;')

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

export const handleRender = defineWidget<RepoRef, RepoResult>({
  kind: 'repo',
  noun: 'repo',
  parse: parseRepoRef,
  cacheKey: (ref) => cacheKey(ref.owner, ref.repo, 'repo'),
  fetch: fetchRepoResult,
  draw: (result, ref, ctx) => {
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
    return (
      starButton(result.stars, ctx) +
      openRepo(ref.url) +
      commitLink(result) +
      issues +
      prs
    )
  },
  placeholder: (ref, ctx) => starButton(0, ctx) + openRepo(ref.url),
  shellStyle: 'line-height:1;vertical-align:baseline;',
})

import { cacheKey } from './cache'
import {
  type BranchResult,
  type BranchStatus,
  fetchBranchResult,
  type PrInfo,
} from './github'
import { branchIconSvg } from './icons'
import { type BranchRef, parseBranchRef } from './parse-branch'
import { prIcon } from './render-pr'
import {
  defineWidget,
  escapeHtml,
  openLink,
  statusButton,
  type WidgetContext,
} from './widget'

const BRANCH_COLORS: Record<BranchStatus, string> = {
  active: '#3fb950', // green
  stale: '#d29922', // yellow
  deleted: '#f85149', // red
}

const pill = (pr: PrInfo): string => `
  <a class="gfw-pr-pill" href="${pr.url}" target="_blank" rel="noopener"
     title="${escapeHtml(pr.title)}"
     style="display:inline-flex;align-items:center;gap:3px;padding:1px 8px;
            border:1px solid var(--ls-border-color, #30363d);border-radius:999px;
            font-size:12px;line-height:18px;text-decoration:none;
            color:var(--ls-primary-text-color, #c9d1d9);white-space:nowrap;">
    ${prIcon(pr.state)}<span>#${pr.number}</span>
  </a>`

const branchButton = (status: BranchStatus, ctx: WidgetContext): string =>
  statusButton(
    'branch',
    ctx,
    `Branch ${status} — click to refresh`,
    branchIconSvg(BRANCH_COLORS[status]),
  )

const openBranch = (url: string): string =>
  openLink(url, 'Open branch on GitHub')

export const handleRender = defineWidget<BranchRef, BranchResult>({
  kind: 'branch',
  noun: 'branch',
  parse: parseBranchRef,
  // The `branch/` prefix keeps branches named e.g. `repo` or `pull/5` from
  // colliding with other widgets.
  cacheKey: (ref) => cacheKey(ref.owner, ref.repo, `branch/${ref.branch}`),
  fetch: (ref, token) => {
    const staleDays = Number(logseq.settings?.staleDays ?? 30) || 30
    return fetchBranchResult(ref, staleDays, token)
  },
  draw: (result, ref, ctx) => {
    const pills = result.prs
      .slice()
      .sort((a, b) => b.number - a.number)
      .map(pill)
      .join('')
    return branchButton(result.status, ctx) + openBranch(ref.url) + pills
  },
  placeholder: (ref, ctx) => branchButton('stale', ctx) + openBranch(ref.url),
})

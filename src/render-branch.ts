import { cacheKey, dedupe, getCached, setCached } from './cache'
import {
  type BranchResult,
  type BranchStatus,
  fetchBranchResult,
  type PrInfo,
  type PrState,
} from './github'
import {
  branchIconSvg,
  closedIconSvg,
  linkExternalIconSvg,
  mergedIconSvg,
  pullRequestIconSvg,
} from './icons'
import { parseBranchRef } from './parse-branch'

export const RENDERER_KEY = ':gfw-branch'

const BRANCH_COLORS: Record<BranchStatus, string> = {
  active: '#3fb950', // green
  stale: '#d29922', // yellow
  deleted: '#f85149', // red
}

const PR_COLORS: Record<PrState, string> = {
  open: '#3fb950', // green
  draft: '#848d97', // grey
  closed: '#f85149', // red
  merged: '#a371f7', // purple
}

const prIcon = (state: PrState): string => {
  const color = PR_COLORS[state]
  if (state === 'merged') return mergedIconSvg(color)
  if (state === 'closed') return closedIconSvg(color)
  return pullRequestIconSvg(color)
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

// The branch icon is a button that force-refreshes the cache on click. The
// slot + encoded url ride along in data attributes so the click model can
// re-render this exact widget.
const branchButton = (
  status: BranchStatus,
  slot: string,
  encodedUrl: string,
): string => {
  const color = BRANCH_COLORS[status]
  return `
  <span class="gfw-branch-btn" data-on-click="gfwRefreshBranch"
        data-slot="${slot}" data-url="${encodedUrl}"
        title="Branch ${status} — click to refresh"
        style="display:inline-flex;align-items:center;justify-content:center;
               width:22px;height:22px;border-radius:6px;cursor:pointer;
               border:1px solid var(--ls-border-color, #30363d);
               background:var(--ls-secondary-background-color, transparent);">
    ${branchIconSvg(color)}
  </span>`
}

const openLink = (url: string): string => `
  <a class="gfw-open" href="${url}" target="_blank" rel="noopener"
     title="Open branch on GitHub"
     style="display:inline-flex;align-items:center;text-decoration:none;
            color:var(--ls-secondary-text-color, #848d97);">
    ${linkExternalIconSvg('currentColor')}
  </a>`

const escapeHtml = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] as string,
  )

const shell = (inner: string): string => `
  <span class="gfw-branch-widget"
        style="display:inline-flex;align-items:center;gap:6px;
               margin-right:6px;vertical-align:middle;">
    ${inner}
  </span>`

const ttlMs = (): number =>
  (Number(logseq.settings?.cacheTtlHours ?? 24) || 24) * 60 * 60 * 1000

// Register the click handler that backs the branch button's force-refresh.
export const registerBranchRenderModel = (): void => {
  logseq.provideModel({
    async gfwRefreshBranch(e: { dataset: { slot?: string; url?: string } }) {
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
  const key = `gfw-branch-${slot}`
  let url: string
  try {
    url = decodeURIComponent(encodedUrl)
  } catch {
    url = encodedUrl
  }

  const ref = parseBranchRef(url)
  if (!ref) {
    logseq.provideUI({
      key,
      slot,
      reset: true,
      template: shell(
        `<span style="color:#f85149;font-size:12px;">⚠ no GitHub branch link</span>`,
      ),
    })
    return
  }

  const draw = (result: BranchResult) => {
    const pills = result.prs
      .slice()
      .sort((a, b) => b.number - a.number)
      .map(pill)
      .join('')
    logseq.provideUI({
      key,
      slot,
      reset: true,
      template: shell(
        branchButton(result.status, slot, encodedUrl) +
          openLink(ref.url) +
          pills,
      ),
    })
  }

  // Serve from cache unless this is a forced refresh.
  const ck = cacheKey(ref.owner, ref.repo, ref.branch)
  if (!force) {
    const cached = getCached(ck, ttlMs())
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
    template: shell(
      branchButton('stale', slot, encodedUrl) + openLink(ref.url),
    ),
  })

  try {
    const staleDays = Number(logseq.settings?.staleDays ?? 30) || 30
    const token = (logseq.settings?.githubToken as string) || undefined
    const result = await dedupe(ck, () =>
      fetchBranchResult(ref, staleDays, token),
    )
    setCached(ck, result)
    draw(result)
  } catch (err) {
    console.error('[git-forge-watcher] render failed', err)
    logseq.provideUI({
      key,
      slot,
      reset: true,
      template: shell(
        branchButton('deleted', slot, encodedUrl) +
          openLink(ref.url) +
          `<span style="color:#848d97;font-size:11px;">API error</span>`,
      ),
    })
  }
}

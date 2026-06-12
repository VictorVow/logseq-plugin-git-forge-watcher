import {
  type BranchStatus,
  fetchBranchResult,
  type PrInfo,
  type PrState,
} from './github'
import {
  branchIconSvg,
  closedIconSvg,
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

const branchButton = (status: BranchStatus, url: string): string => {
  const color = BRANCH_COLORS[status]
  return `
  <a class="gfw-branch-btn" href="${url}" target="_blank" rel="noopener"
     title="Branch ${status}"
     style="display:inline-flex;align-items:center;justify-content:center;
            width:22px;height:22px;border-radius:6px;
            border:1px solid var(--ls-border-color, #30363d);
            background:var(--ls-secondary-background-color, transparent);
            text-decoration:none;">
    ${branchIconSvg(color)}
  </a>`
}

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

export const handleRender = async (
  slot: string,
  encodedUrl: string,
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

  // Render a loading state immediately so the slot is never empty.
  logseq.provideUI({
    key,
    slot,
    reset: true,
    template: shell(branchButton('stale', ref.url)),
  })

  try {
    const staleDays = Number(logseq.settings?.staleDays ?? 30) || 30
    const token = (logseq.settings?.githubToken as string) || undefined
    const result = await fetchBranchResult(ref, staleDays, token)

    const pills = result.prs
      .sort((a, b) => b.number - a.number)
      .map(pill)
      .join('')

    logseq.provideUI({
      key,
      slot,
      reset: true,
      template: shell(branchButton(result.status, ref.url) + pills),
    })
  } catch (err) {
    console.error('[git-forge-watcher] render failed', err)
    logseq.provideUI({
      key,
      slot,
      reset: true,
      template: shell(
        branchButton('deleted', ref.url) +
          `<span style="color:#848d97;font-size:11px;">API error</span>`,
      ),
    })
  }
}

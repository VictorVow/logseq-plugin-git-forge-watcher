import { cacheKey, dedupe, getCached, setCached } from './cache'
import {
  GitHubError,
  type IssueResult,
  type IssueState,
  fetchIssueResult,
} from './github'
import {
  issueClosedIconSvg,
  issueOpenedIconSvg,
  issueSkipIconSvg,
  linkExternalIconSvg,
} from './icons'
import { parseIssueRef } from './parse-issue'

export const RENDERER_KEY = ':gfw-issue'

const ISSUE_COLORS: Record<IssueState, string> = {
  open: '#3fb950', // green
  completed: '#a371f7', // purple
  not_planned: '#848d97', // grey
}

const issueIcon = (state: IssueState): string => {
  const color = ISSUE_COLORS[state]
  if (state === 'open') return issueOpenedIconSvg(color)
  if (state === 'not_planned') return issueSkipIconSvg(color)
  return issueClosedIconSvg(color)
}

const ISSUE_LABEL: Record<IssueState, string> = {
  open: 'open',
  completed: 'closed as completed',
  not_planned: 'closed as not planned',
}

// The issue icon is a button that force-refreshes the cache on click. The
// slot + encoded url ride along in data attributes so the click model can
// re-render this exact widget.
const issueButton = (
  state: IssueState,
  slot: string,
  encodedUrl: string,
): string => `
  <span class="gfw-issue-btn" data-on-click="gfwRefreshIssue"
        data-slot="${slot}" data-url="${encodedUrl}"
        title="Issue ${ISSUE_LABEL[state]} — click to refresh"
        style="display:inline-flex;align-items:center;justify-content:center;
               width:22px;height:22px;border-radius:6px;cursor:pointer;
               border:1px solid var(--ls-border-color, #30363d);
               background:var(--ls-secondary-background-color, transparent);">
    ${issueIcon(state)}
  </span>`

const openLink = (url: string): string => `
  <a class="gfw-open" href="${url}" target="_blank" rel="noopener"
     title="Open issue on GitHub"
     style="display:inline-flex;align-items:center;text-decoration:none;
            color:var(--ls-secondary-text-color, #848d97);">
    ${linkExternalIconSvg('currentColor')}
  </a>`

const shell = (inner: string): string => `
  <span class="gfw-issue-widget"
        style="display:inline-flex;align-items:center;gap:6px;
               margin-right:6px;vertical-align:middle;">
    ${inner}
  </span>`

const ttlMs = (): number =>
  (Number(logseq.settings?.cacheTtlHours ?? 24) || 24) * 60 * 60 * 1000

// Register the click handler that backs the issue button's force-refresh.
export const registerIssueRenderModel = (): void => {
  logseq.provideModel({
    async gfwRefreshIssue(e: { dataset: { slot?: string; url?: string } }) {
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
  const key = `gfw-issue-${slot}`
  let url: string
  try {
    url = decodeURIComponent(encodedUrl)
  } catch {
    url = encodedUrl
  }

  const ref = parseIssueRef(url)
  if (!ref) {
    logseq.provideUI({
      key,
      slot,
      reset: true,
      template: shell(
        `<span style="color:#f85149;font-size:12px;">⚠ no GitHub issue link</span>`,
      ),
    })
    return
  }

  const draw = (result: IssueResult) => {
    logseq.provideUI({
      key,
      slot,
      reset: true,
      template: shell(
        issueButton(result.state, slot, encodedUrl) + openLink(result.url),
      ),
    })
  }

  // Serve from cache unless this is a forced refresh.
  const ck = cacheKey(ref.owner, ref.repo, `issues/${ref.number}`)
  if (!force) {
    const cached = getCached<IssueResult>(ck, ttlMs())
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
      issueButton('not_planned', slot, encodedUrl) + openLink(ref.url),
    ),
  })

  try {
    const token = (logseq.settings?.githubToken as string) || undefined
    const result = await dedupe(ck, () => fetchIssueResult(ref, token))
    setCached(ck, result)
    draw(result)
  } catch (err) {
    console.error('[git-forge-watcher] issue render failed', err)
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
        issueButton('not_planned', slot, encodedUrl) +
          openLink(ref.url) +
          `<span style="color:#848d97;font-size:11px;">${hint}</span>`,
      ),
    })
  }
}

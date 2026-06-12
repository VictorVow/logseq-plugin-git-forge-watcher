import {
  cacheKey,
  dedupe,
  getCached,
  getCachedStale,
  setCached,
} from './cache'
import {
  GitHubError,
  type PrInfo,
  type PrState,
  fetchPrResult,
} from './github'
import {
  closedIconSvg,
  linkExternalIconSvg,
  mergedIconSvg,
  pullRequestIconSvg,
} from './icons'
import { parsePrRef } from './parse-pr'

export const RENDERER_KEY = ':gfw-pr'

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

const PR_LABEL: Record<PrState, string> = {
  open: 'open',
  draft: 'draft',
  closed: 'closed',
  merged: 'merged',
}

// The PR icon is a button that force-refreshes the cache on click. The slot +
// encoded url ride along in data attributes so the click model can re-render
// this exact widget.
const prButton = (
  state: PrState,
  slot: string,
  encodedUrl: string,
): string => `
  <span class="gfw-pr-btn" data-on-click="gfwRefreshPr"
        data-slot="${slot}" data-url="${encodedUrl}"
        title="Pull request ${PR_LABEL[state]} — click to refresh"
        style="display:inline-flex;align-items:center;justify-content:center;
               width:22px;height:22px;border-radius:6px;cursor:pointer;
               border:1px solid var(--ls-border-color, #30363d);
               background:var(--ls-secondary-background-color, transparent);">
    ${prIcon(state)}
  </span>`

const openLink = (url: string): string => `
  <a class="gfw-open" href="${url}" target="_blank" rel="noopener"
     title="Open pull request on GitHub"
     style="display:inline-flex;align-items:center;text-decoration:none;
            color:var(--ls-secondary-text-color, #848d97);">
    ${linkExternalIconSvg('currentColor')}
  </a>`

// `stale` dims the widget and explains it via a tooltip — used when we're
// showing a cached value because a refetch failed (e.g. offline).
const shell = (inner: string, stale = false): string => `
  <span class="gfw-pr-widget"${stale ? ' title="Offline — showing last known state"' : ''}
        style="display:inline-flex;align-items:center;gap:6px;
               margin-right:6px;vertical-align:middle;${stale ? 'opacity:0.55;' : ''}">
    ${inner}
  </span>`

const ttlMs = (): number =>
  (Number(logseq.settings?.cacheTtlHours ?? 24) || 24) * 60 * 60 * 1000

// Register the click handler that backs the PR button's force-refresh.
export const registerPrRenderModel = (): void => {
  logseq.provideModel({
    async gfwRefreshPr(e: { dataset: { slot?: string; url?: string } }) {
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
  const key = `gfw-pr-${slot}`
  let url: string
  try {
    url = decodeURIComponent(encodedUrl)
  } catch {
    url = encodedUrl
  }

  const ref = parsePrRef(url)
  if (!ref) {
    logseq.provideUI({
      key,
      slot,
      reset: true,
      template: shell(
        `<span style="color:#f85149;font-size:12px;">⚠ no GitHub pull request link</span>`,
      ),
    })
    return
  }

  const draw = (result: PrInfo, stale = false) => {
    logseq.provideUI({
      key,
      slot,
      reset: true,
      template: shell(
        prButton(result.state, slot, encodedUrl) + openLink(result.url),
        stale,
      ),
    })
  }

  // Serve from cache unless this is a forced refresh.
  const ck = cacheKey(ref.owner, ref.repo, `pull/${ref.number}`)
  if (!force) {
    const cached = getCached<PrInfo>(ck, ttlMs())
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
    template: shell(prButton('draft', slot, encodedUrl) + openLink(ref.url)),
  })

  try {
    const token = (logseq.settings?.githubToken as string) || undefined
    const result = await dedupe(ck, () => fetchPrResult(ref, token))
    setCached(ck, result)
    draw(result)
  } catch (err) {
    console.error('[github-watcher] pr render failed', err)
    // Prefer the last known state over an error when we have one cached.
    const stale = getCachedStale<PrInfo>(ck)
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
        prButton('draft', slot, encodedUrl) +
          openLink(ref.url) +
          `<span style="color:#848d97;font-size:11px;">${hint}</span>`,
      ),
    })
  }
}

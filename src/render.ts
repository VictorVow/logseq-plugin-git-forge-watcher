import { classifyLink, isLinkKind, type LinkKind } from './parse-link'
import {
  RENDERER_KEY as BRANCH_RENDERER_KEY,
  registerBranchRenderModel,
  handleRender as renderBranch,
} from './render-branch'
import {
  RENDERER_KEY as ISSUE_RENDERER_KEY,
  registerIssueRenderModel,
  handleRender as renderIssue,
} from './render-issue'
import {
  RENDERER_KEY as PR_RENDERER_KEY,
  registerPrRenderModel,
  handleRender as renderPr,
} from './render-pr'
import {
  RENDERER_KEY as REPO_RENDERER_KEY,
  registerRepoRenderModel,
  handleRender as renderRepo,
} from './render-repo'

// `{{renderer :gfw, <encoded-url>}}` picks the widget from the URL's shape. An
// optional third argument forces a kind, e.g. `{{renderer :gfw, <url>, repo}}`
// to show repo stats for a pull request link.
export const RENDERER_KEY = ':gfw'

// Macros inserted by older versions name the widget kind in the key itself.
// They're stored in users' graphs, so they must keep rendering as that kind.
const LEGACY_KEYS: Record<string, LinkKind> = {
  [BRANCH_RENDERER_KEY]: 'branch',
  [ISSUE_RENDERER_KEY]: 'issue',
  [PR_RENDERER_KEY]: 'pr',
  [REPO_RENDERER_KEY]: 'repo',
}

const RENDERERS: Record<
  LinkKind,
  (slot: string, encodedUrl: string) => Promise<void>
> = {
  branch: renderBranch,
  issue: renderIssue,
  pr: renderPr,
  repo: renderRepo,
}

export const isWidgetKey = (key: string): boolean =>
  key === RENDERER_KEY || key in LEGACY_KEYS

const decode = (encodedUrl: string): string => {
  try {
    return decodeURIComponent(encodedUrl)
  } catch {
    return encodedUrl
  }
}

type Resolved = { kind: LinkKind } | { error: string }

// Work out which widget a macro renders: legacy keys are fixed, `:gfw` uses
// the explicit kind argument if given, otherwise the URL's shape.
export const resolveKind = (
  key: string,
  encodedUrl: string,
  kindArg?: string,
): Resolved => {
  const legacy = LEGACY_KEYS[key]
  if (legacy) return { kind: legacy }
  const forced = kindArg?.trim().toLowerCase()
  if (forced) {
    return isLinkKind(forced)
      ? { kind: forced }
      : { error: `unknown widget type "${forced}"` }
  }
  const ref = classifyLink(decode(encodedUrl))
  return ref ? { kind: ref.kind } : { error: 'no GitHub link' }
}

// Register the click handlers that back each widget's force-refresh button.
export const registerRenderModels = (): void => {
  registerBranchRenderModel()
  registerIssueRenderModel()
  registerPrRenderModel()
  registerRepoRenderModel()
}

export const handleRender = async (
  slot: string,
  args: string[],
): Promise<void> => {
  const [name, rawUrl, kindArg] = args
  const key = name?.trim() ?? ''
  if (!isWidgetKey(key)) return

  const encodedUrl = (rawUrl ?? '').trim()
  const resolved = resolveKind(key, encodedUrl, kindArg)
  if ('error' in resolved) {
    logseq.provideUI({
      key: `gfw-${slot}`,
      slot,
      reset: true,
      template: `<span style="color:#f85149;font-size:12px;margin-right:6px;">⚠ ${resolved.error}</span>`,
    })
    return
  }
  await RENDERERS[resolved.kind](slot, encodedUrl)
}

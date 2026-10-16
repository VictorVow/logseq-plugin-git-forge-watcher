import {
  classifyLink,
  decodeUrl,
  isLinkKind,
  type LinkKind,
} from './parse-link'
import { handleRender as renderBranch } from './render-branch'
import { handleRender as renderIssue } from './render-issue'
import { handleRender as renderPr } from './render-pr'
import { handleRender as renderRepo } from './render-repo'
import type { Renderer } from './widget'

// `{{renderer :gfw, <encoded-url>}}` picks the widget from the URL's shape. An
// optional third argument forces a kind, e.g. `{{renderer :gfw, <url>, repo}}`
// to show repo stats for a pull request link.
export const RENDERER_KEY = ':gfw'

// Macros inserted by older versions name the widget kind in the key itself.
// They're stored in users' graphs, so they must keep rendering as that kind.
const LEGACY_KEYS: Record<string, LinkKind> = {
  ':gfw-branch': 'branch',
  ':gfw-issue': 'issue',
  ':gfw-pr': 'pr',
  ':gfw-repo': 'repo',
}

const RENDERERS: Record<LinkKind, Renderer> = {
  branch: renderBranch,
  issue: renderIssue,
  pr: renderPr,
  repo: renderRepo,
}

export const isWidgetKey = (key: string): boolean =>
  key === RENDERER_KEY || key in LEGACY_KEYS

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
  const ref = classifyLink(decodeUrl(encodedUrl))
  return ref ? { kind: ref.kind } : { error: 'no GitHub link' }
}

// Register the click handler behind every widget's force-refresh button. The
// button carries its widget kind, slot and URL (see `refreshAttrs`).
export const registerRenderModels = (): void => {
  logseq.provideModel({
    async gfwRefresh(e: {
      dataset: { kind?: string; slot?: string; url?: string }
    }) {
      const { kind, slot, url } = e.dataset
      if (isLinkKind(kind) && slot && url)
        await RENDERERS[kind](slot, url, true)
    },
  })
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

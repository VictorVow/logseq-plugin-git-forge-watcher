import { cacheKey } from './cache'
import { fetchPrResult, type PrInfo, type PrState } from './github'
import { closedIconSvg, mergedIconSvg, pullRequestIconSvg } from './icons'
import { type PrRef, parsePrRef } from './parse-pr'
import {
  defineWidget,
  openLink,
  statusButton,
  type WidgetContext,
} from './widget'

const PR_COLORS: Record<PrState, string> = {
  open: '#3fb950', // green
  draft: '#848d97', // grey
  closed: '#f85149', // red
  merged: '#a371f7', // purple
}

// Also used for the PR pills on the branch widget.
export const prIcon = (state: PrState): string => {
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

const prButton = (state: PrState, ctx: WidgetContext): string =>
  statusButton(
    'pr',
    ctx,
    `Pull request ${PR_LABEL[state]} — click to refresh`,
    prIcon(state),
  )

const openPr = (url: string): string =>
  openLink(url, 'Open pull request on GitHub')

export const handleRender = defineWidget<PrRef, PrInfo>({
  kind: 'pr',
  noun: 'pull request',
  parse: parsePrRef,
  cacheKey: (ref) => cacheKey(ref.owner, ref.repo, `pull/${ref.number}`),
  fetch: fetchPrResult,
  draw: (result, _ref, ctx) => prButton(result.state, ctx) + openPr(result.url),
  placeholder: (ref, ctx) => prButton('draft', ctx) + openPr(ref.url),
})

import { cacheKey } from './cache'
import { fetchIssueResult, type IssueResult, type IssueState } from './github'
import {
  issueClosedIconSvg,
  issueOpenedIconSvg,
  issueSkipIconSvg,
} from './icons'
import { type IssueRef, parseIssueRef } from './parse-issue'
import {
  defineWidget,
  openLink,
  statusButton,
  type WidgetContext,
} from './widget'

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

const issueButton = (state: IssueState, ctx: WidgetContext): string =>
  statusButton(
    'issue',
    ctx,
    `Issue ${ISSUE_LABEL[state]} — click to refresh`,
    issueIcon(state),
  )

const openIssue = (url: string): string => openLink(url, 'Open issue on GitHub')

export const handleRender = defineWidget<IssueRef, IssueResult>({
  kind: 'issue',
  noun: 'issue',
  parse: parseIssueRef,
  cacheKey: (ref) => cacheKey(ref.owner, ref.repo, `issues/${ref.number}`),
  fetch: fetchIssueResult,
  draw: (result, _ref, ctx) =>
    issueButton(result.state, ctx) + openIssue(result.url),
  placeholder: (ref, ctx) =>
    issueButton('not_planned', ctx) + openIssue(ref.url),
})

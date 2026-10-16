import { parseBranchRef } from './parse-branch'
import { parseIssueRef } from './parse-issue'
import { parsePrRef } from './parse-pr'
import { parseRepoRef } from './parse-repo'

export type LinkKind = 'repo' | 'branch' | 'issue' | 'pr'

export const isLinkKind = (s: string | undefined): s is LinkKind =>
  s === 'repo' || s === 'branch' || s === 'issue' || s === 'pr'

export interface LinkRef {
  kind: LinkKind
  url: string
}

// Most specific first. Every GitHub link has an owner/repo, so `repo` is the
// fallback for anything that isn't a branch, issue or pull request link.
const MATCHERS: [LinkKind, (url: string) => { url: string } | null][] = [
  ['pr', parsePrRef],
  ['issue', parseIssueRef],
  ['branch', parseBranchRef],
  ['repo', parseRepoRef],
]

// Decide which widget a single GitHub URL should render as, returning the kind
// alongside the normalised URL for that kind (e.g. a PR link with a
// `#discussion_r…` anchor becomes the bare `…/pull/<n>` URL).
export const classifyLink = (url: string): LinkRef | null => {
  for (const [kind, parse] of MATCHERS) {
    const ref = parse(url)
    if (ref) return { kind, url: ref.url }
  }
  return null
}

const LINK_RE = /https?:\/\/github\.com\/[^\s)\]]+/gi

// Pull every GitHub link out of a block's title/content, in the order they
// appear, each classified by the widget it renders as.
export const parseLinkRefs = (text: string): LinkRef[] => {
  const refs: LinkRef[] = []
  for (const [url] of text.matchAll(LINK_RE)) {
    const ref = classifyLink(url)
    if (ref) refs.push(ref)
  }
  return refs
}

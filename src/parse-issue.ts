export interface IssueRef {
  owner: string
  repo: string
  number: number
  url: string
}

const ISSUE_RE = /https?:\/\/github\.com\/([^/\s)]+)\/([^/\s)]+)\/issues\/(\d+)/gi

// Pull every GitHub issue reference out of a block's title/content, in the
// order they appear. Handles `.../issues/<number>` links, ignoring any trailing
// anchor/query (e.g. `#issuecomment-3902062405`) that Logseq may carry along.
export const parseIssueRefs = (text: string): IssueRef[] => {
  const refs: IssueRef[] = []
  for (const m of text.matchAll(ISSUE_RE)) {
    const [, owner, repo, rawNumber] = m
    const number = Number(rawNumber)
    if (!owner || !repo || !number) continue
    const url = `https://github.com/${owner}/${repo}/issues/${number}`
    refs.push({ owner, repo, number, url })
  }
  return refs
}

// Pull the first GitHub issue reference out of a block's title/content.
export const parseIssueRef = (text: string): IssueRef | null =>
  parseIssueRefs(text)[0] ?? null

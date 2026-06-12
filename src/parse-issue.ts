export interface IssueRef {
  owner: string
  repo: string
  number: number
  url: string
}

// Pull the first GitHub issue reference out of a block's title/content.
// Handles `.../issues/<number>` links, ignoring any trailing anchor/query
// (e.g. `#issuecomment-3902062405`) that Logseq may carry along.
export const parseIssueRef = (text: string): IssueRef | null => {
  const re = /https?:\/\/github\.com\/([^/\s)]+)\/([^/\s)]+)\/issues\/(\d+)/i
  const m = re.exec(text)
  if (!m) return null

  const [, owner, repo, rawNumber] = m
  const number = Number(rawNumber)
  if (!owner || !repo || !number) return null

  const url = `https://github.com/${owner}/${repo}/issues/${number}`
  return { owner, repo, number, url }
}

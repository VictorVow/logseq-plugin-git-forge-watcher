export interface PrRef {
  owner: string
  repo: string
  number: number
  url: string
}

// Pull the first GitHub pull request reference out of a block's title/content.
// Handles `.../pull/<number>` links, ignoring any trailing anchor/query
// (e.g. `#discussion_r123`) that Logseq may carry along.
export const parsePrRef = (text: string): PrRef | null => {
  const re = /https?:\/\/github\.com\/([^/\s)]+)\/([^/\s)]+)\/pull\/(\d+)/i
  const m = re.exec(text)
  if (!m) return null

  const [, owner, repo, rawNumber] = m
  const number = Number(rawNumber)
  if (!owner || !repo || !number) return null

  const url = `https://github.com/${owner}/${repo}/pull/${number}`
  return { owner, repo, number, url }
}

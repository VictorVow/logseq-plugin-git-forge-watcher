export interface PrRef {
  owner: string
  repo: string
  number: number
  url: string
}

const PR_RE = /https?:\/\/github\.com\/([^/\s)]+)\/([^/\s)]+)\/pull\/(\d+)/gi

// Pull every GitHub pull request reference out of a block's title/content, in
// the order they appear. Handles `.../pull/<number>` links, ignoring any
// trailing anchor/query (e.g. `#discussion_r123`) that Logseq may carry along.
export const parsePrRefs = (text: string): PrRef[] => {
  const refs: PrRef[] = []
  for (const m of text.matchAll(PR_RE)) {
    const [, owner, repo, rawNumber] = m
    const number = Number(rawNumber)
    if (!owner || !repo || !number) continue
    const url = `https://github.com/${owner}/${repo}/pull/${number}`
    refs.push({ owner, repo, number, url })
  }
  return refs
}

// Pull the first GitHub pull request reference out of a block's title/content.
export const parsePrRef = (text: string): PrRef | null =>
  parsePrRefs(text)[0] ?? null

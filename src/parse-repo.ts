export interface RepoRef {
  owner: string
  repo: string
  url: string
}

const REPO_RE = /https?:\/\/github\.com\/([^/\s)#?]+)\/([^/\s)#?]+)/gi

// Pull every repository root out of a block's title/content, in the order they
// appear. Any GitHub link works — the first two path segments after the host
// are the owner and repo — so a deep link (`.../tree/x`, `.../pull/1`,
// `.../issues/2`) still resolves to its repo root. A trailing `.git` and any
// anchor/query are stripped.
export const parseRepoRefs = (text: string): RepoRef[] => {
  const refs: RepoRef[] = []
  for (const m of text.matchAll(REPO_RE)) {
    const [, owner, rawRepo] = m
    const repo = rawRepo.replace(/\.git$/i, '')
    if (!owner || !repo) continue
    const url = `https://github.com/${owner}/${repo}`
    refs.push({ owner, repo, url })
  }
  return refs
}

// Pull the first repository root out of a block's title/content.
export const parseRepoRef = (text: string): RepoRef | null =>
  parseRepoRefs(text)[0] ?? null

export interface RepoRef {
  owner: string
  repo: string
  url: string
}

// Pull the repository root out of a block's title/content. Any GitHub link
// works — the first two path segments after the host are the owner and repo —
// so a deep link (`.../tree/x`, `.../pull/1`, `.../issues/2`) still resolves to
// its repo root. A trailing `.git` and any anchor/query are stripped.
export const parseRepoRef = (text: string): RepoRef | null => {
  const re = /https?:\/\/github\.com\/([^/\s)#?]+)\/([^/\s)#?]+)/i
  const m = re.exec(text)
  if (!m) return null

  const [, owner, rawRepo] = m
  const repo = rawRepo.replace(/\.git$/i, '')
  if (!owner || !repo) return null

  const url = `https://github.com/${owner}/${repo}`
  return { owner, repo, url }
}

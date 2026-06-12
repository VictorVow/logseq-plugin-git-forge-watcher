export interface BranchRef {
  owner: string
  repo: string
  branch: string
  url: string
}

// Pull the first GitHub branch reference out of a block's title/content.
// Handles `.../tree/<branch>` links (the shape Logseq renders for a branch),
// where <branch> may itself contain slashes (e.g. `logseq/upgrade-...`).
export const parseBranchRef = (text: string): BranchRef | null => {
  const re =
    /https?:\/\/github\.com\/([^/\s)]+)\/([^/\s)]+)\/tree\/([^\s)\]]+)/i
  const m = re.exec(text)
  if (!m) return null

  const [url, owner, repo, rawBranch] = m
  // Strip a trailing slash and any anchor/query.
  const branch = decodeURIComponent(
    rawBranch.replace(/[#?].*$/, '').replace(/\/+$/, ''),
  )
  if (!owner || !repo || !branch) return null

  return { owner, repo, branch, url }
}

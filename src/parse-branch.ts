export interface BranchRef {
  owner: string
  repo: string
  branch: string
  url: string
}

const BRANCH_RE =
  /https?:\/\/github\.com\/([^/\s)]+)\/([^/\s)]+)\/tree\/([^\s)\]]+)/gi

// Pull every GitHub branch reference out of a block's title/content, in the
// order they appear. Handles `.../tree/<branch>` links (the shape Logseq
// renders for a branch), where <branch> may itself contain slashes
// (e.g. `logseq/upgrade-...`).
export const parseBranchRefs = (text: string): BranchRef[] => {
  const refs: BranchRef[] = []
  for (const m of text.matchAll(BRANCH_RE)) {
    const [url, owner, repo, rawBranch] = m
    // Strip a trailing slash and any anchor/query.
    const branch = decodeURIComponent(
      rawBranch.replace(/[#?].*$/, '').replace(/\/+$/, ''),
    )
    if (!owner || !repo || !branch) continue
    refs.push({ owner, repo, branch, url })
  }
  return refs
}

// Pull the first GitHub branch reference out of a block's title/content.
export const parseBranchRef = (text: string): BranchRef | null =>
  parseBranchRefs(text)[0] ?? null

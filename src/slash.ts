import { parseBranchRefs } from './parse-branch'
import { parseIssueRefs } from './parse-issue'
import { parsePrRefs } from './parse-pr'
import { parseRepoRefs } from './parse-repo'
import { RENDERER_KEY } from './render-branch'
import { RENDERER_KEY as ISSUE_RENDERER_KEY } from './render-issue'
import { RENDERER_KEY as PR_RENDERER_KEY } from './render-pr'
import { RENDERER_KEY as REPO_RENDERER_KEY } from './render-repo'

// When a block contains more than one matching link, slash commands default to
// the first match. The `preferLastUrl` setting flips this to the last match.
const pickRef = <T>(refs: T[]): T | undefined =>
  logseq.settings?.preferLastUrl ? refs.at(-1) : refs[0]

// Registers the "Git Forge Watcher - Branch" slash command. When run on a
// block, it parses the GitHub branch link out of the block, then prepends a
// renderer macro so the widget renders inline between the bullet and the title.
//
// DB graphs keep the editable text in `block.title`; file graphs use
// `block.content`. Read/write the right one so this works on both.
export const registerBranchSlashCommand = (): void => {
  logseq.Editor.registerSlashCommand('Git Forge Watcher - Branch', async () => {
    const block = await logseq.Editor.getCurrentBlock()
    if (!block) return

    const text = block.title ?? block.content ?? ''

    const ref = pickRef(parseBranchRefs(text))
    if (!ref) {
      logseq.UI.showMsg('No GitHub branch link found in this block.', 'warning')
      return
    }

    // Don't double-insert if the widget is already present.
    if (text.includes(RENDERER_KEY)) {
      logseq.UI.showMsg('Branch widget already added to this block.', 'info')
      return
    }

    const macro = `{{renderer ${RENDERER_KEY}, ${encodeURIComponent(ref.url)}}}`
    await logseq.Editor.updateBlock(block.uuid, `${macro} ${text}`)
  })
}

// Registers the "Git Forge Watcher - Issue" slash command. Same flow as the
// branch command, but parses a GitHub issue link and prepends the issue
// renderer macro so the state icon renders inline in front of the title.
export const registerIssueSlashCommand = (): void => {
  logseq.Editor.registerSlashCommand('Git Forge Watcher - Issue', async () => {
    const block = await logseq.Editor.getCurrentBlock()
    if (!block) return

    const text = block.title ?? block.content ?? ''

    const ref = pickRef(parseIssueRefs(text))
    if (!ref) {
      logseq.UI.showMsg('No GitHub issue link found in this block.', 'warning')
      return
    }

    // Don't double-insert if the widget is already present.
    if (text.includes(ISSUE_RENDERER_KEY)) {
      logseq.UI.showMsg('Issue widget already added to this block.', 'info')
      return
    }

    const macro = `{{renderer ${ISSUE_RENDERER_KEY}, ${encodeURIComponent(ref.url)}}}`
    await logseq.Editor.updateBlock(block.uuid, `${macro} ${text}`)
  })
}

// Registers the "Git Forge Watcher - Pull Request" slash command. Same flow as
// the branch/issue commands, but parses a GitHub pull request link and prepends
// the PR renderer macro so the state icon renders inline in front of the title.
export const registerPrSlashCommand = (): void => {
  logseq.Editor.registerSlashCommand(
    'Git Forge Watcher - Pull Request',
    async () => {
      const block = await logseq.Editor.getCurrentBlock()
      if (!block) return

      const text = block.title ?? block.content ?? ''

      const ref = pickRef(parsePrRefs(text))
      if (!ref) {
        logseq.UI.showMsg(
          'No GitHub pull request link found in this block.',
          'warning',
        )
        return
      }

      // Don't double-insert if the widget is already present.
      if (text.includes(PR_RENDERER_KEY)) {
        logseq.UI.showMsg('Pull request widget already added to this block.', 'info')
        return
      }

      const macro = `{{renderer ${PR_RENDERER_KEY}, ${encodeURIComponent(ref.url)}}}`
      await logseq.Editor.updateBlock(block.uuid, `${macro} ${text}`)
    },
  )
}

// Registers the "Git Forge Watcher - Repo" slash command. Same flow as the
// other commands, but derives the repository root from any GitHub link in the
// block and prepends the repo renderer macro so the stars / last-commit /
// issue / PR widget renders inline in front of the title.
export const registerRepoSlashCommand = (): void => {
  logseq.Editor.registerSlashCommand('Git Forge Watcher - Repo', async () => {
    const block = await logseq.Editor.getCurrentBlock()
    if (!block) return

    const text = block.title ?? block.content ?? ''

    const ref = pickRef(parseRepoRefs(text))
    if (!ref) {
      logseq.UI.showMsg('No GitHub repo link found in this block.', 'warning')
      return
    }

    // Don't double-insert if the widget is already present.
    if (text.includes(REPO_RENDERER_KEY)) {
      logseq.UI.showMsg('Repo widget already added to this block.', 'info')
      return
    }

    const macro = `{{renderer ${REPO_RENDERER_KEY}, ${encodeURIComponent(ref.url)}}}`
    await logseq.Editor.updateBlock(block.uuid, `${macro} ${text}`)
  })
}

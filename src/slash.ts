import { parseBranchRef } from './parse-branch'
import { RENDERER_KEY } from './render-branch'

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

    const ref = parseBranchRef(text)
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

import '@logseq/libs'

import { handlePopup } from './handle-popup'
import {
  handleRender,
  RENDERER_KEY,
  registerBranchRenderModel,
} from './render-branch'
import {
  handleRender as handleIssueRender,
  RENDERER_KEY as ISSUE_RENDERER_KEY,
  registerIssueRenderModel,
} from './render-issue'
import { settings } from './settings'
import { registerBranchSlashCommand, registerIssueSlashCommand } from './slash'

const main = async () => {
  const isDbGraph = await logseq.App.checkCurrentIsDbGraph()
  console.log(`git-forge-watcher loaded (DB graph: ${isDbGraph})`)

  // Used to handle any popups
  handlePopup()

  // Slash commands: "Git Forge Watcher - Branch" / "… - Issue"
  registerBranchSlashCommand()
  registerIssueSlashCommand()

  // Click handlers backing the button force-refresh on each widget.
  registerBranchRenderModel()
  registerIssueRenderModel()

  // Renderers that draw the inline widgets inside the block.
  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    const [name, encodedUrl] = payload.arguments
    const key = name?.trim()
    if (key === RENDERER_KEY) {
      await handleRender(slot, (encodedUrl ?? '').trim())
    } else if (key === ISSUE_RENDERER_KEY) {
      await handleIssueRender(slot, (encodedUrl ?? '').trim())
    }
  })
}

logseq.useSettingsSchema(settings).ready(main).catch(console.error)

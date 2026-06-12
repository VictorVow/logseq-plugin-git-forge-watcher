import '@logseq/libs'

import { handlePopup } from './handle-popup'
import { handleRender, RENDERER_KEY } from './render-branch'
import { settings } from './settings'
import { registerBranchSlashCommand } from './slash'

const main = async () => {
  const isDbGraph = await logseq.App.checkCurrentIsDbGraph()
  console.log(`git-forge-watcher loaded (DB graph: ${isDbGraph})`)

  // Used to handle any popups
  handlePopup()

  // Slash command: "Git Forge Watcher - Branch"
  registerBranchSlashCommand()

  // Renderer that draws the branch button + PR pills inside the block.
  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    const [name, encodedUrl] = payload.arguments
    if (name?.trim() !== RENDERER_KEY) return
    await handleRender(slot, (encodedUrl ?? '').trim())
  })
}

logseq.useSettingsSchema(settings).ready(main).catch(console.error)

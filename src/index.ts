import '@logseq/libs'

import { handlePopup } from './handle-popup'
import { handleRender, registerRenderModels } from './render'
import { settings } from './settings'
import { registerSlashCommands } from './slash'

const main = () => {
  // Register everything synchronously so the plugin reports "ready" to Logseq
  // immediately. Any await here (e.g. a host round-trip) delays ready and makes
  // Logseq flag the plugin as slow to load, hurting app startup time.

  // Used to handle any popups
  handlePopup()

  // Slash commands: "Git Forge Watcher" / "Git Forge Watcher - Repo"
  registerSlashCommands()

  // Click handlers backing the button force-refresh on each widget.
  registerRenderModels()

  // Renderer that draws the inline widgets inside the block. Handles the
  // unified `:gfw` key plus the legacy per-kind keys.
  logseq.App.onMacroRendererSlotted(({ slot, payload }) =>
    handleRender(slot, payload.arguments),
  )

  // Non-blocking: log the graph type without delaying ready.
  logseq.App.checkCurrentIsDbGraph()
    .then((isDbGraph) =>
      console.log(`git-forge-watcher loaded (DB graph: ${isDbGraph})`),
    )
    .catch(console.error)
}

logseq.useSettingsSchema(settings).ready(main).catch(console.error)

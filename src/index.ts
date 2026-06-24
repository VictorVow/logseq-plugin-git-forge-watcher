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
import {
  handleRender as handlePrRender,
  RENDERER_KEY as PR_RENDERER_KEY,
  registerPrRenderModel,
} from './render-pr'
import {
  handleRender as handleRepoRender,
  RENDERER_KEY as REPO_RENDERER_KEY,
  registerRepoRenderModel,
} from './render-repo'
import { settings } from './settings'
import {
  registerBranchSlashCommand,
  registerIssueSlashCommand,
  registerPrSlashCommand,
  registerRepoSlashCommand,
} from './slash'

const main = () => {
  // Register everything synchronously so the plugin reports "ready" to Logseq
  // immediately. Any await here (e.g. a host round-trip) delays ready and makes
  // Logseq flag the plugin as slow to load, hurting app startup time.

  // Used to handle any popups
  handlePopup()

  // Slash commands: "Git Forge Watcher - Branch" / "… - Issue" /
  // "… - Pull Request" / "… - Repo"
  registerBranchSlashCommand()
  registerIssueSlashCommand()
  registerPrSlashCommand()
  registerRepoSlashCommand()

  // Click handlers backing the button force-refresh on each widget.
  registerBranchRenderModel()
  registerIssueRenderModel()
  registerPrRenderModel()
  registerRepoRenderModel()

  // Renderers that draw the inline widgets inside the block.
  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    const [name, encodedUrl] = payload.arguments
    const key = name?.trim()
    if (key === RENDERER_KEY) {
      await handleRender(slot, (encodedUrl ?? '').trim())
    } else if (key === ISSUE_RENDERER_KEY) {
      await handleIssueRender(slot, (encodedUrl ?? '').trim())
    } else if (key === PR_RENDERER_KEY) {
      await handlePrRender(slot, (encodedUrl ?? '').trim())
    } else if (key === REPO_RENDERER_KEY) {
      await handleRepoRender(slot, (encodedUrl ?? '').trim())
    }
  })

  // Non-blocking: log the graph type without delaying ready.
  logseq.App.checkCurrentIsDbGraph()
    .then((isDbGraph) =>
      console.log(`git-forge-watcher loaded (DB graph: ${isDbGraph})`),
    )
    .catch(() => {})
}

logseq.useSettingsSchema(settings).ready(main).catch(console.error)

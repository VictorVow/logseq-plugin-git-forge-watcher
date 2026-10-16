import { decodeUrl, type LinkRef, parseLinkRefs } from './parse-link'
import { parseRepoRefs } from './parse-repo'
import { RENDERER_KEY, resolveKind } from './render'

// When a block contains more than one matching link, slash commands default to
// the first match. The `preferLastUrl` setting flips this to the last match.
const pickRef = <T>(refs: T[]): T | undefined =>
  logseq.settings?.preferLastUrl ? refs.at(-1) : refs[0]

// Combines the renderer macro with the existing block text. Each widget kind
// has an `…InsertAtStart` setting (default true) that puts the widget before
// the text; when it's off the macro is appended at the end instead.
const placeMacro = (macro: string, text: string, settingKey: string): string =>
  logseq.settings?.[settingKey] === false
    ? `${text} ${macro}`
    : `${macro} ${text}`

// Matches any of this plugin's renderer macros, current or legacy:
// `{{renderer :gfw, <url>}}`, `{{renderer :gfw, <url>, repo}}`,
// `{{renderer :gfw-pr, <url>}}`, …
const MACRO_RE =
  /\{\{renderer\s+(:gfw(?:-[a-z]+)?)\s*,\s*([^,}\s]+)\s*(?:,\s*([a-z]+)\s*)?\}\}/gi

const widgetId = (kind: string, url: string): string => `${kind} ${url}`

// The kind + URL of every widget already in the block, so running a command
// again adds a widget for the next link rather than duplicating one.
const existingWidgets = (text: string): Set<string> => {
  const ids = new Set<string>()
  for (const [, key, encodedUrl, kindArg] of text.matchAll(MACRO_RE)) {
    if (!key || !encodedUrl) continue
    const resolved = resolveKind(key, encodedUrl, kindArg)
    if ('kind' in resolved) {
      ids.add(widgetId(resolved.kind, decodeUrl(encodedUrl)))
    }
  }
  return ids
}

// Reads the links out of the current block, then inserts a `:gfw` renderer
// macro for the first (or last) one that doesn't have a widget yet.
//
// DB graphs keep the editable text in `block.title`; file graphs use
// `block.content`. Read/write the right one so this works on both.
const insertWidget = async (
  findRefs: (text: string) => LinkRef[],
  what: string,
): Promise<void> => {
  const block = await logseq.Editor.getCurrentBlock()
  if (!block) return

  const text = block.title ?? block.content ?? ''

  const refs = findRefs(text)
  if (refs.length === 0) {
    logseq.UI.showMsg(`No ${what} found in this block.`, 'warning')
    return
  }

  const existing = existingWidgets(text)
  const ref = pickRef(
    refs.filter((r) => !existing.has(widgetId(r.kind, r.url))),
  )
  if (!ref) {
    logseq.UI.showMsg('Widget already added to this block.', 'info')
    return
  }

  const macro = `{{renderer ${RENDERER_KEY}, ${encodeURIComponent(ref.url)}}}`
  await logseq.Editor.updateBlock(
    block.uuid,
    placeMacro(macro, text, `${ref.kind}InsertAtStart`),
  )
}

// Registers the slash commands:
//
// - "Git Forge Watcher" picks the widget from the link's shape: a pull
//   request, issue, branch (`/tree/…`) or, for any other GitHub link, the repo.
// - "Git Forge Watcher - Repo" always inserts the repo widget, resolving deep
//   links (`…/pull/1`, `…/tree/x`) to their repository root.
export const registerSlashCommands = (): void => {
  logseq.Editor.registerSlashCommand('Git Forge Watcher', () =>
    insertWidget(parseLinkRefs, 'GitHub link'),
  )
  logseq.Editor.registerSlashCommand('Git Forge Watcher - Repo', () =>
    insertWidget(
      (text) => parseRepoRefs(text).map(({ url }) => ({ kind: 'repo', url })),
      'GitHub repo link',
    ),
  )
}

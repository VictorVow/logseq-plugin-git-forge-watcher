# GitHub Watcher

A [Logseq](https://logseq.com) plugin that watches GitHub branches, issues and
pull requests, rendering their live status inline inside your blocks.

Run one of its slash commands on a block that contains a GitHub link and it
drops a small widget between the bullet and the block's text: a status icon
coloured by the current state, plus a link out to GitHub. Click the icon to
force a refresh.

## What it does

The plugin adds three slash commands, one per kind of GitHub link. Each one
reads the link out of the block, prepends a renderer macro, and draws an inline
widget at the start of the block.

### GitHub Watcher - Branch

For a block containing a `github.com/<owner>/<repo>/tree/<branch>` link, e.g.

```
[`logseq/upgrade-tailwind-base-ui`](https://github.com/logseq/logseq/tree/logseq/upgrade-tailwind-base-ui)
```

it renders:

- **A branch button** (GitHub's branch octicon), coloured by status:
  - 🟢 **green** — active (the branch exists and was committed to recently)
  - 🟡 **yellow** — stale (last commit older than the stale threshold)
  - 🔴 **red** — deleted (the branch no longer exists on GitHub)
- **Pull-request pills** for every PR opened from that branch, each showing the
  PR number and an icon coloured by state:
  - 🟢 green — open · ⚪ grey — draft · 🔴 red — closed · 🟣 purple — merged

### GitHub Watcher - Issue

For a block containing a `github.com/<owner>/<repo>/issues/<number>` link
(any trailing `#issuecomment-…` anchor is ignored), it renders an **issue
button** coloured by state, plus a link out to the issue:

- 🟢 **green** — open
- 🟣 **purple** — closed as completed
- ⚪ **grey** — closed as not planned

### GitHub Watcher - Pull Request

For a block containing a `github.com/<owner>/<repo>/pull/<number>` link, it
renders a **pull-request button** coloured by state, plus a link out to the PR:

- 🟢 **green** — open
- ⚪ **grey** — draft
- 🔴 **red** — closed
- 🟣 **purple** — merged

Status is read live from the GitHub REST API. Every widget's status icon is
also a button: click it to force an immediate refresh, bypassing the cache.

## Usage

1. Put your cursor in a block that contains the relevant GitHub link.
2. Type `/` and choose the matching command —
   **GitHub Watcher - Branch**, **- Issue**, or **- Pull Request**.

The command prepends a `{{renderer :gfw-branch, …}}` (or `:gfw-issue` /
`:gfw-pr`) macro to the block, which renders the widget inline. Works on both DB
graphs (reads `block/title`) and legacy file graphs (reads `block/content`).

## Caching & offline behaviour

Status is cached in the plugin's `localStorage`, so it persists across restarts
and is shared across graphs (GitHub status is global, not graph-specific).
Multiple blocks referencing the same branch/issue/PR coalesce into a single API
request.

- Within the cache TTL (default **24 hours**), widgets render instantly from
  cache with no network call.
- Once the TTL expires, the next render re-queries GitHub.
- If that refresh fails — you're offline, rate-limited, or GitHub errors — the
  widget falls back to the **last known state**, shown dimmed with an "Offline
  — showing last known state" tooltip, rather than an error.
- Clicking a status icon always forces an immediate refresh.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| **GitHub token** | _(empty)_ | Optional personal access token. Raises the API rate limit and allows reading branches/issues/PRs in private repos. |
| **Stale threshold (days)** | `30` | A branch whose last commit is older than this many days shows yellow (stale) instead of green (active). |
| **Cache TTL (hours)** | `24` | How long branch/issue/PR status is cached before re-querying GitHub. Click a status icon to force an immediate refresh. |

Without a token the plugin uses GitHub's unauthenticated rate limit (60
requests/hour per IP), which is fine for light use but may throttle on large
graphs.

## Install

### From source (developer mode)

```sh
bun install
bun run build
```

In Logseq, enable **Developer mode** (Settings → Advanced), then
**Load unpacked plugin** and point it at this project root.

### Develop with hot reload

```sh
bun install
bun run dev
```

`bun run dev` starts Vite in dev mode; thanks to
[`vite-plugin-logseq`](https://github.com/pengx17/vite-plugin-logseq), edits to
`src/` hot-reload inside Logseq without reloading the unpacked plugin.

## Project layout

```
src/
  index.ts         # plugin entry: registers the slash commands + macro renderers
  slash.ts         # the three "GitHub Watcher - …" slash commands
  render-branch.ts # builds the inline branch widget (status + PR pills)
  render-issue.ts  # builds the inline issue widget
  render-pr.ts     # builds the inline pull-request widget
  github.ts        # GitHub REST client: branch status, PRs, issue/PR state
  parse-branch.ts  # extracts owner/repo/branch from a tree link
  parse-issue.ts   # extracts owner/repo/number from an issues link
  parse-pr.ts      # extracts owner/repo/number from a pull link
  cache.ts         # localStorage TTL cache + in-flight request dedupe
  icons.ts         # GitHub octicon SVGs (branch / PR / issue states)
  settings.ts      # plugin settings schema (token, stale threshold, cache TTL)
  handle-popup.ts  # Esc / click-outside dismiss helpers
index.html         # Vite entry consumed by Logseq
vite.config.ts     # registers vite-plugin-logseq
biome.json         # formatter + linter config
```

## License

MIT

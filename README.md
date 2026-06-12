# Git Forge Watcher

A [Logseq](https://logseq.com) plugin that watches GitHub branches and their
linked pull requests, rendering their status inline inside your blocks.

Run it on any block that contains a GitHub branch link and it drops a small
widget between the bullet and the block's text: a branch icon coloured by the
branch's health, followed by a pill for each linked pull request.

## What it does

Given a block whose text contains a GitHub branch link, e.g.

```
[`logseq/upgrade-tailwind-base-ui`](https://github.com/logseq/logseq/tree/logseq/upgrade-tailwind-base-ui)
```

the **Git Forge Watcher - Branch** slash command renders, inline at the start
of the block:

- **A branch button** (GitHub's branch octicon), coloured by status:
  - 🟢 **green** — active (the branch exists and was committed to recently)
  - 🟡 **yellow** — stale (last commit older than the stale threshold)
  - 🔴 **red** — deleted (the branch no longer exists on GitHub)
- **Pull-request pills** for every PR opened from that branch, each showing the
  PR number and an icon coloured by state:
  - 🟢 green — open · ⚪ grey — draft · 🔴 red — closed · 🟣 purple — merged

  Branch status and PRs are read live from the GitHub REST API. Both the button
  and the pills link out to GitHub.

## Usage

1. Put your cursor in a block that contains a `github.com/<owner>/<repo>/tree/<branch>`
   link.
2. Type `/` and choose **Git Forge Watcher - Branch**.

The command prepends a `{{renderer :gfw-branch, …}}` macro to the block, which
renders the widget inline. Works on both DB graphs (reads `block/title`) and
legacy file graphs (reads `block/content`).

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| **GitHub token** | _(empty)_ | Optional personal access token. Raises the API rate limit and allows reading branches/PRs in private repos. |
| **Stale threshold (days)** | `30` | A branch whose last commit is older than this many days shows yellow (stale) instead of green (active). |

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
  index.ts         # plugin entry: registers the slash command + macro renderer
  slash.ts         # "Git Forge Watcher - Branch" slash command
  render-branch.ts # builds and provides the inline widget UI
  github.ts        # GitHub REST client: branch status + linked PRs
  parse-branch.ts  # extracts owner/repo/branch from a tree link
  icons.ts         # GitHub octicon SVGs (branch / pull-request / merge / closed)
  settings.ts      # plugin settings schema (token, stale threshold)
  handle-popup.ts  # Esc / click-outside dismiss helpers
index.html         # Vite entry consumed by Logseq
vite.config.ts     # registers vite-plugin-logseq
biome.json         # formatter + linter config
```

## License

MIT

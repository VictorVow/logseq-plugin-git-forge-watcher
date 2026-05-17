# Logseq Plugin Basic Template

An opinionated starter template for building [Logseq](https://logseq.com) plugins with TypeScript, Vite, Bun, and Biome.

## What you get

- **TypeScript + Vite** build, configured for Logseq via [`vite-plugin-logseq`](https://github.com/pengx17/vite-plugin-logseq) so HMR works while you develop the plugin against a live Logseq instance.
- **Bun** as the package manager and script runner.
- **Biome** for formatting and linting (replaces ESLint + Prettier).
- **Husky** pre-commit hook that runs `biome check --write` and `tsc --noEmit`.
- **GitHub Actions** workflow that builds the plugin and cuts a release via `semantic-release` (zip bundled for the Logseq marketplace).
- Minimal `src/` entry that wires up `@logseq/libs`, a settings schema, and a popup helper (Esc / click-outside to close).

## Getting started

1. Click **Use this template** on GitHub (or clone the repo).
2. **Rename `gh actions/` to `.github/`.** GitHub only picks up workflows from the `.github/` directory; the folder is shipped under a different name so the template repo itself does not run the publish workflow.
3. Replace every `<insert-plugin-name>` placeholder in `package.json` (`name`, `logseq.id`, `logseq.title`, and the `release` asset) with your plugin's id.
4. Add an `icon.svg` to the project root.
5. Update this README's overview / usage sections for your plugin.

## Develop

```sh
bun install
bun run dev
```

`bun run dev` starts Vite in dev mode. In Logseq, enable **Developer mode**, then **Load unpacked plugin** and point it at this project root. Thanks to `vite-plugin-logseq`, edits to `src/` hot-reload inside Logseq without a full plugin reload.

## Build

```sh
bun run build
```

Outputs to `dist/`. The packaged plugin entry is `dist/index.html` (see `logseq.main` in `package.json`).

## Release

Push to `main`. The workflow in `.github/workflows/publish.yml` will:

1. Build with Bun.
2. Bundle `README.md`, `package.json`, `icon.svg`, and `dist/` into `<plugin-name>.zip`.
3. Run `semantic-release` to create a GitHub Release with the zip attached — ready for the Logseq marketplace.

Conventional commits drive the version bumps.

## Opinionated choices

- **Biome over ESLint/Prettier.** One tool, one config (`biome.json`), much faster. Linter recommended rules are off in favour of a hand-picked set; tweak `biome.json` to taste.
- **Bun over npm/pnpm.** Scripts call `bunx` directly. If you prefer npm, swap `bunx` for `npx` in `package.json`.
- **`vite-plugin-logseq` for HMR.** It rewrites asset paths so the dev server can serve the plugin straight into Logseq — much nicer than rebuilding and reloading the unpacked plugin on every change.
- **DB-graph aware.** `src/index.ts` calls `logseq.App.checkCurrentIsDbGraph()` so you can branch behaviour for the new DB version vs. the file-based graph.
- **Popup ergonomics.** `src/handle-popup.ts` wires up Esc and click-outside to dismiss `logseq.showMainUI()` popups — drop it if you're not building a popup-style plugin.

## Project layout

```
src/
  index.ts         # plugin entry, registers settings + main()
  settings.ts      # SettingSchemaDesc array
  handle-popup.ts  # Esc / click-outside dismiss helpers
index.html         # Vite entry consumed by Logseq
vite.config.ts     # registers vite-plugin-logseq
biome.json         # formatter + linter config
gh actions/        # rename to .github/ after templating
```

## License

MIT

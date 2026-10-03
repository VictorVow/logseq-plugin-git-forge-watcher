// Generates a `dev/` directory that can be side-loaded into Logseq alongside
// the marketplace release. Logseq identifies plugins by `logseq.id` and refuses
// to load two copies with the same id, so we emit a copy of `package.json` with
// a `-dev` id suffix and a `(Dev)` title prefix, then symlink the real build
// output (and icon) in so the dev plugin always reflects the latest `dist/`.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const devDir = join(root, 'dev')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

if (!existsSync(join(root, 'dist'))) {
  console.error(
    'No dist/ found. Run `bun run build` (or `npm run build`) first.',
  )
  process.exit(1)
}

pkg.name = `${pkg.name}-dev`
pkg.logseq.id = `${pkg.logseq.id}-dev`
pkg.logseq.title = `(Dev) ${pkg.logseq.title}`

rmSync(devDir, { recursive: true, force: true })
mkdirSync(devDir)

writeFileSync(join(devDir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)

// `logseq.main` points at `dist/index.html`, so symlink the real build output.
symlinkSync(join(root, 'dist'), join(devDir, 'dist'), 'dir')

const icon = 'icon.png'
if (existsSync(join(root, icon))) {
  symlinkSync(join(root, icon), join(devDir, icon))
} else {
  console.warn(
    `No ${icon} found at project root; dev plugin will have no icon.`,
  )
}

console.log(
  `Created ./dev/ for plugin id "${pkg.logseq.id}". ` +
    'In Logseq: Settings -> Plugins -> Load unpacked plugin -> select ./dev/.',
)

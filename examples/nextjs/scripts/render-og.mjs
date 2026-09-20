#!/usr/bin/env node
/**
 * Renders the card at /og/card into public/og/card/.
 *
 * The renderer captures a *running* page, so the order is always: build, start
 * a server, render, stop the server. This script exists so that sequence does
 * not have to live in a package.json one-liner with a background `&` and an
 * orphaned process when the render fails.
 *
 * It builds and runs `next start` rather than using `next dev`, and that is not
 * cosmetic: the card's animation only moves once React has hydrated, and the
 * dev server ties hydration to its HMR connection. Capture a dev server whose
 * HMR socket cannot connect and every frame comes out as the un-hydrated
 * initial state - a correct-looking background with all the content still at
 * `opacity: 0`.
 *
 * Run it, then build again so the site picks up the fresh manifest:
 *
 *     pnpm og:render && pnpm build
 */
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const PORT = Number(process.env.PORT ?? 3000)
const ORIGIN = `http://127.0.0.1:${PORT}`
const CARD_PATH = '/og/card'
const OUT_DIR = join(root, 'public/og/card')
// Root-relative on purpose. The manifest is committed, so it must not carry the
// origin it happened to be rendered on; the metadata helper resolves these
// against SITE_URL at build time.
const ASSET_BASE = '/og/card'

async function run(command, args, options = {}) {
  const child = spawn(command, args, { stdio: 'inherit', ...options })
  const [code] = await once(child, 'exit')
  if (code !== 0) throw new Error(`${command} ${args.join(' ')} exited with ${code}`)
}

/**
 * Polls until the server answers, it dies, or the deadline passes.
 *
 * The `exitCode` check matters: the usual failure here is the port already
 * being taken, and without it that turns into a two minute wait for a server
 * that died in the first second.
 */
async function waitForServer(url, child, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Server exited with ${child.exitCode} before answering on ${url}. ` +
          'Is the port already in use? Set PORT to pick another one.',
      )
    }
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Server did not answer on ${url} within ${timeoutMs}ms`)
}

await mkdir(OUT_DIR, { recursive: true })
await run('pnpm', ['exec', 'next', 'build'], { cwd: root })

const server = spawn('pnpm', ['exec', 'next', 'start', '--port', String(PORT)], {
  cwd: root,
  stdio: 'inherit',
})

// Kill the server whatever happens - a failed render must not leave a process
// holding the port and wedging the next run.
let stopped = false
const stopServer = () => {
  if (stopped) return
  stopped = true
  server.kill('SIGTERM')
}
process.on('exit', stopServer)
process.on('SIGINT', () => {
  stopServer()
  process.exit(130)
})

try {
  await waitForServer(`${ORIGIN}${CARD_PATH}`, server)
  // Inside this monorepo the CLI is run from source via its `start` script,
  // exactly like CI does. In your own project the same call is simply
  // `npx liveog render http://localhost:3000/og/card public/og/card ...`.
  await run(
    'pnpm',
    [
      '--filter',
      '@liveog/cli',
      'start',
      'render',
      `${ORIGIN}${CARD_PATH}`,
      OUT_DIR,
      '--width', '1200',
      '--height', '630',
      '--duration', '4000',
      '--fps', '30',
      '--base-url', ASSET_BASE,
      '--no-config',
    ],
    { cwd: root },
  )
  console.log(`\nRendered ${CARD_PATH} into public/og/card/`)
} finally {
  stopServer()
}

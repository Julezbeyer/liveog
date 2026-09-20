import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { LiveOGManifest } from './liveog-metadata'

const MANIFEST_PATH = join(process.cwd(), 'public/og/card/liveog.manifest.json')

/**
 * Reads the render manifest, or returns `null` when the card has not been
 * rendered yet.
 *
 * Tolerating the missing file is deliberate. The assets are build artifacts
 * produced by a *running* server (`pnpm og:render`), so the very first build of
 * a fresh clone necessarily happens before they exist. A static
 * `import manifest from '.../liveog.manifest.json'` would make that first build
 * fail with a module-not-found error instead.
 */
export function loadManifest(): LiveOGManifest | null {
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as LiveOGManifest
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

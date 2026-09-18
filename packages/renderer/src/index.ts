import { copyFile, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { defaults } from '@liveog/core'

export type RenderFormat = 'png' | 'gif' | 'mp4'

export type RenderStage = 'launch' | 'capture' | 'encode' | 'manifest'

/** Progress event emitted while rendering. */
export interface RenderProgress {
  stage: RenderStage
  /** Human-readable label for the current stage. */
  label: string
  /** Completion within the stage, 0..1. */
  ratio: number
}

export interface RenderRequest {
  /** URL of the page that renders the card and listens for `liveog:time`. */
  url: string
  /** Directory that receives `og.png`, `og.mp4` and `og.gif`. */
  outDir: string
  /** Subset of formats to produce. Defaults to all three. */
  formats?: RenderFormat[]
  width?: number
  height?: number
  /** Animation length in milliseconds. */
  duration?: number
  fps?: number
  /**
   * Timeline position (ms) captured as the static PNG fallback.
   * Defaults to the end of the animation so the poster shows the finished card.
   */
  posterTime?: number
  /**
   * Chromium binary to launch instead of the browser downloaded by Playwright.
   * Defaults to the `LIVEOG_BROWSER_PATH` environment variable when set.
   */
  browserExecutablePath?: string
  /**
   * Public base URL the assets will be served from. When set, the manifest
   * contains absolute URLs ready to paste into `<meta>` tags.
   */
  baseUrl?: string
  /** Write `liveog.manifest.json` next to the assets. Defaults to true. */
  manifest?: boolean
  /**
   * Called as the render advances, for progress display. `ratio` is 0..1 within
   * the current stage; stages arrive in order and each is reported at least once.
   */
  onProgress?: (event: RenderProgress) => void
  /** Pass FFmpeg's own output through instead of capturing it. Defaults to false. */
  verbose?: boolean
}

/** One rendered file, as described in the manifest. */
export interface ManifestAsset {
  format: RenderFormat
  /** File name inside `outDir`. */
  file: string
  /** Absolute URL when `baseUrl` was given, otherwise the bare file name. */
  url: string
  /** MIME type for the matching Open Graph tag. */
  type: string
  bytes: number
}

export interface RenderManifest {
  /** Manifest schema version, bumped on breaking shape changes. */
  version: 1
  width: number
  height: number
  duration: number
  fps: number
  frameCount: number
  /** Timeline position captured as the static PNG. */
  posterTime: number
  assets: ManifestAsset[]
  /** Ready-to-paste Open Graph and Twitter meta tags. */
  meta: string[]
}

export interface RenderResult {
  outDir: string
  width: number
  height: number
  duration: number
  fps: number
  formats: RenderFormat[]
  frameCount: number
  posterFrame: number
  manifest: RenderManifest
}

const MIME: Record<RenderFormat, string> = {
  png: 'image/png',
  mp4: 'video/mp4',
  gif: 'image/gif',
}

const FILE_NAME: Record<RenderFormat, string> = {
  png: 'og.png',
  mp4: 'og.mp4',
  gif: 'og.gif',
}

/** Timeline positions in milliseconds, one per captured frame. */
export function frameTimes(duration: number, fps: number): number[] {
  const frameCount = Math.max(1, Math.ceil((duration / 1000) * fps))
  return Array.from({ length: frameCount }, (_, frame) => Math.round((frame / fps) * 1000))
}

/** Index of the captured frame closest to `posterTime`, clamped to the timeline. */
export function posterFrameIndex(times: number[], posterTime: number): number {
  let best = 0
  for (let i = 1; i < times.length; i++) {
    if (Math.abs(times[i]! - posterTime) < Math.abs(times[best]! - posterTime)) best = i
  }
  return best
}

/** Joins a base URL and a file name without doubling or dropping the slash. */
export function assetUrl(baseUrl: string | undefined, file: string): string {
  if (!baseUrl) return file
  return `${baseUrl.replace(/\/+$/, '')}/${file}`
}

/**
 * Open Graph and Twitter tags for the rendered assets.
 *
 * `og:image` always points at the PNG because every platform needs a static
 * fallback. `og:video` is only emitted when an MP4 exists, and the GIF is
 * deliberately never advertised as `og:image` — platforms that accept it show
 * the first frame only, which is worse than the poster.
 */
export function metaTags(assets: ManifestAsset[], width: number, height: number): string[] {
  const byFormat = new Map(assets.map(asset => [asset.format, asset]))
  const png = byFormat.get('png')
  const mp4 = byFormat.get('mp4')
  const tags: string[] = []

  if (png) {
    tags.push(`<meta property="og:image" content="${png.url}" />`)
    tags.push(`<meta property="og:image:type" content="${png.type}" />`)
    tags.push(`<meta property="og:image:width" content="${width}" />`)
    tags.push(`<meta property="og:image:height" content="${height}" />`)
  }

  if (mp4) {
    tags.push(`<meta property="og:video" content="${mp4.url}" />`)
    tags.push(`<meta property="og:video:type" content="${mp4.type}" />`)
    tags.push(`<meta property="og:video:width" content="${width}" />`)
    tags.push(`<meta property="og:video:height" content="${height}" />`)
  }

  tags.push(`<meta name="twitter:card" content="summary_large_image" />`)
  if (png) tags.push(`<meta name="twitter:image" content="${png.url}" />`)

  return tags
}

function frameName(frame: number) {
  return `frame-${String(frame).padStart(6, '0')}.png`
}

function run(command: string, args: string[], verbose = false) {
  return new Promise<void>((resolvePromise, reject) => {
    // FFmpeg writes its banner and per-frame stats to stderr. Buffering it and
    // only replaying it on failure keeps a successful render quiet, while a
    // broken encode still shows the full output that explains why.
    const child = spawn(command, args, { stdio: verbose ? 'inherit' : ['ignore', 'ignore', 'pipe'] })
    let captured = ''
    child.stderr?.on('data', chunk => { captured += chunk.toString() })
    child.once('error', error => {
      const hint = (error as NodeJS.ErrnoException).code === 'ENOENT'
        ? `${command} was not found on PATH. Install it and try again.`
        : error.message
      reject(new Error(hint))
    })
    child.once('exit', code => {
      if (code === 0) return resolvePromise()
      const tail = captured.trim().split('\n').slice(-15).join('\n')
      reject(new Error(`${command} exited with code ${code}${tail ? `\n\n${tail}` : ''}`))
    })
  })
}

/** Resolves true when an `ffmpeg` binary can be executed. */
export function hasFFmpeg(): Promise<boolean> {
  return new Promise(resolvePromise => {
    const child = spawn('ffmpeg', ['-version'], { stdio: 'ignore' })
    child.once('error', () => resolvePromise(false))
    child.once('exit', code => resolvePromise(code === 0))
  })
}

const FFMPEG_HINT = [
  'FFmpeg is required to encode MP4 and GIF output but was not found on PATH.',
  '',
  '  macOS          brew install ffmpeg',
  '  Debian/Ubuntu  sudo apt-get install ffmpeg',
  '  Windows        winget install Gyan.FFmpeg',
  '',
  'Or render only the static image with: --formats png',
].join('\n')

export async function render(request: RenderRequest): Promise<RenderResult> {
  const width = request.width ?? defaults.width
  const height = request.height ?? defaults.height
  const duration = request.duration ?? defaults.duration
  const fps = request.fps ?? defaults.fps
  const formats = request.formats ?? ['png', 'mp4', 'gif']
  const outDir = resolve(request.outDir)
  const times = frameTimes(duration, fps)
  const posterTime = request.posterTime ?? duration
  const poster = posterFrameIndex(times, posterTime)

  // Check before launching a browser and capturing frames, so a missing
  // dependency fails in a second instead of after a full capture run.
  const needsFFmpeg = formats.includes('mp4') || formats.includes('gif')
  if (needsFFmpeg && !(await hasFFmpeg())) throw new Error(FFMPEG_HINT)

  const framesDir = await mkdtemp(join(tmpdir(), 'liveog-frames-'))
  const executablePath = request.browserExecutablePath ?? process.env.LIVEOG_BROWSER_PATH
  const report = request.onProgress ?? (() => {})

  report({ stage: 'launch', label: 'Starting browser', ratio: 0 })
  const browser = await chromium.launch({ headless: true, executablePath })

  await mkdir(outDir, { recursive: true })

  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    await page.goto(request.url, { waitUntil: 'networkidle' })
    report({ stage: 'launch', label: 'Page loaded', ratio: 1 })

    for (const [frame, timeMs] of times.entries()) {
      await page.evaluate((t) => {
        window.dispatchEvent(new CustomEvent('liveog:time', { detail: t }))
      }, timeMs)
      await page.screenshot({ path: join(framesDir, frameName(frame)), type: 'png', clip: { x: 0, y: 0, width, height } })
      report({
        stage: 'capture',
        label: `Capturing frames ${frame + 1}/${times.length}`,
        ratio: (frame + 1) / times.length,
      })
    }

    if (formats.includes('png')) {
      await copyFile(join(framesDir, frameName(poster)), join(outDir, 'og.png'))
    }

    const sequence = ['-framerate', String(fps), '-i', join(framesDir, 'frame-%06d.png')]

    // Encoding has no reliable progress signal, so each format counts as one step.
    const encodeSteps = Math.max((formats.includes('mp4') ? 1 : 0) + (formats.includes('gif') ? 1 : 0), 1)
    let encoded = 0

    if (formats.includes('mp4')) {
      report({ stage: 'encode', label: 'Encoding MP4', ratio: encoded / encodeSteps })
      await run('ffmpeg', ['-y', ...sequence, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(outDir, 'og.mp4')], request.verbose)
      report({ stage: 'encode', label: 'Encoding MP4', ratio: ++encoded / encodeSteps })
    }

    if (formats.includes('gif')) {
      report({ stage: 'encode', label: 'Encoding GIF', ratio: encoded / encodeSteps })
      // Two-pass palette encoding keeps GIFs small (roughly 50x smaller than the ffmpeg default).
      const filter = `fps=15,scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`
      await run('ffmpeg', ['-y', ...sequence, '-vf', filter, join(outDir, 'og.gif')], request.verbose)
      report({ stage: 'encode', label: 'Encoding GIF', ratio: ++encoded / encodeSteps })
    }

    const assets: ManifestAsset[] = []
    for (const format of ['png', 'mp4', 'gif'] as const) {
      if (!formats.includes(format)) continue
      const file = FILE_NAME[format]
      const { size } = await stat(join(outDir, file))
      assets.push({ format, file, url: assetUrl(request.baseUrl, file), type: MIME[format], bytes: size })
    }

    const manifest: RenderManifest = {
      version: 1,
      width,
      height,
      duration,
      fps,
      frameCount: times.length,
      posterTime: times[poster]!,
      assets,
      meta: metaTags(assets, width, height),
    }

    if (request.manifest !== false) {
      await writeFile(join(outDir, 'liveog.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    }

    return { outDir, width, height, duration, fps, formats, frameCount: times.length, posterFrame: poster, manifest }
  } finally {
    await browser.close()
    await rm(framesDir, { recursive: true, force: true })
  }
}

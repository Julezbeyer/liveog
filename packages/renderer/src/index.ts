import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { defaults } from '@liveog/core'

export type RenderFormat = 'png' | 'gif' | 'mp4'

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

function frameName(frame: number) {
  return `frame-${String(frame).padStart(6, '0')}.png`
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.once('error', error => {
      const hint = (error as NodeJS.ErrnoException).code === 'ENOENT'
        ? `${command} was not found on PATH. Install it and try again.`
        : error.message
      reject(new Error(hint))
    })
    child.once('exit', code => code === 0 ? resolvePromise() : reject(new Error(`${command} exited with code ${code}`)))
  })
}

export async function render(request: RenderRequest): Promise<RenderResult> {
  const width = request.width ?? defaults.width
  const height = request.height ?? defaults.height
  const duration = request.duration ?? defaults.duration
  const fps = request.fps ?? defaults.fps
  const formats = request.formats ?? ['png', 'mp4', 'gif']
  const outDir = resolve(request.outDir)
  const times = frameTimes(duration, fps)
  const poster = posterFrameIndex(times, request.posterTime ?? duration)
  const framesDir = await mkdtemp(join(tmpdir(), 'liveog-frames-'))
  const executablePath = request.browserExecutablePath ?? process.env.LIVEOG_BROWSER_PATH
  const browser = await chromium.launch({ headless: true, executablePath })

  await mkdir(outDir, { recursive: true })

  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    await page.goto(request.url, { waitUntil: 'networkidle' })

    for (const [frame, timeMs] of times.entries()) {
      await page.evaluate((t) => {
        window.dispatchEvent(new CustomEvent('liveog:time', { detail: t }))
      }, timeMs)
      await page.screenshot({ path: join(framesDir, frameName(frame)), type: 'png', clip: { x: 0, y: 0, width, height } })
    }

    if (formats.includes('png')) {
      await copyFile(join(framesDir, frameName(poster)), join(outDir, 'og.png'))
    }

    const sequence = ['-framerate', String(fps), '-i', join(framesDir, 'frame-%06d.png')]

    if (formats.includes('mp4')) {
      await run('ffmpeg', ['-y', ...sequence, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(outDir, 'og.mp4')])
    }

    if (formats.includes('gif')) {
      // Two-pass palette encoding keeps GIFs small (roughly 50x smaller than the ffmpeg default).
      const filter = `fps=15,scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`
      await run('ffmpeg', ['-y', ...sequence, '-vf', filter, join(outDir, 'og.gif')])
    }

    return { outDir, width, height, duration, fps, formats, frameCount: times.length, posterFrame: poster }
  } finally {
    await browser.close()
    await rm(framesDir, { recursive: true, force: true })
  }
}

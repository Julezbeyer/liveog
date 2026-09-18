import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { defaults } from '@liveog/core'

export type RenderFormat = 'png' | 'gif' | 'mp4'

export interface RenderRequest {
  url: string
  outDir: string
  formats?: RenderFormat[]
  width?: number
  height?: number
  duration?: number
  fps?: number
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', code => code === 0 ? resolvePromise() : reject(new Error(`${command} exited with code ${code}`)))
  })
}

export async function render(request: RenderRequest) {
  const width = request.width ?? defaults.width
  const height = request.height ?? defaults.height
  const duration = request.duration ?? defaults.duration
  const fps = request.fps ?? defaults.fps
  const formats = request.formats ?? ['png', 'mp4', 'gif']
  const outDir = resolve(request.outDir)
  const framesDir = await mkdtemp(join(tmpdir(), 'liveog-frames-'))
  const browser = await chromium.launch({ headless: true })

  await mkdir(outDir, { recursive: true })

  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    await page.goto(request.url, { waitUntil: 'networkidle' })

    const frameCount = Math.ceil((duration / 1000) * fps)
    for (let frame = 0; frame < frameCount; frame++) {
      const timeMs = Math.round((frame / fps) * 1000)
      await page.evaluate((t) => {
        window.dispatchEvent(new CustomEvent('liveog:time', { detail: t }))
      }, timeMs)

      const path = join(framesDir, `frame-${String(frame).padStart(6, '0')}.png`)
      await page.screenshot({ path, type: 'png', clip: { x: 0, y: 0, width, height } })
    }

    const posterFrame = join(framesDir, 'frame-000000.png')
    if (formats.includes('png')) {
      await run('ffmpeg', ['-y', '-i', posterFrame, join(outDir, 'og.png')])
    }

    if (formats.includes('mp4')) {
      await run('ffmpeg', ['-y', '-framerate', String(fps), '-i', join(framesDir, 'frame-%06d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(outDir, 'og.mp4')])
    }

    if (formats.includes('gif')) {
      await run('ffmpeg', ['-y', '-framerate', String(fps), '-i', join(framesDir, 'frame-%06d.png'), '-vf', 'fps=15,scale=1200:-1:flags=lanczos', join(outDir, 'og.gif')])
    }

    return { outDir, width, height, duration, fps, formats }
  } finally {
    await browser.close()
    await rm(framesDir, { recursive: true, force: true })
  }
}

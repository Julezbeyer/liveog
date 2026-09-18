import { toCanvas } from 'html-to-image'
import { HEIGHT, WIDTH } from '../templates/types'

/** Rasterises the card DOM node at its native 1200×630 size. */
export function captureCard(node: HTMLElement): Promise<HTMLCanvasElement> {
  return toCanvas(node, {
    width: WIDTH,
    height: HEIGHT,
    pixelRatio: 1,
    cacheBust: false,
    // Cards use system fonts only, so skip the (slow) stylesheet font embedding.
    skipFonts: true,
  })
}

/** Timeline positions for `duration` ms at `fps`, matching @liveog/renderer. */
export function frameTimes(duration: number, fps: number): number[] {
  const count = Math.max(1, Math.ceil((duration / 1000) * fps))
  return Array.from({ length: count }, (_, i) => Math.round((i / fps) * 1000))
}

export type FrameSource = (timeMs: number) => Promise<HTMLCanvasElement>
export type Progress = (done: number, total: number) => void

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

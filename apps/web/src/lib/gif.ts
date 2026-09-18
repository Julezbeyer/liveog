import { GIFEncoder, applyPalette, quantize } from 'gifenc'
import { HEIGHT, WIDTH } from '../templates/types'
import { frameTimes, type FrameSource, type Progress } from './capture'

export const GIF_FPS = 15

function pixels(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  return ctx.getImageData(0, 0, WIDTH, HEIGHT).data
}

/**
 * Palette-based GIF, same idea as the renderer's palettegen/paletteuse pass:
 * one global palette taken from the final frame, applied to every frame.
 * Frames after the first only carry the pixels that changed; unchanged pixels
 * use a transparent index over the previous frame, which keeps the mostly
 * static backgrounds cheap.
 */
export async function encodeGif(source: FrameSource, duration: number, onProgress?: Progress): Promise<Blob> {
  const times = frameTimes(duration, GIF_FPS)
  const total = times.length + 1
  onProgress?.(0, total)

  const poster = pixels(await source(duration))
  const colors = quantize(poster, 255, { format: 'rgb444' })
  const TRANSPARENT = colors.length
  const palette = [...colors, [0, 0, 0]]
  onProgress?.(1, total)

  const gif = GIFEncoder()
  const delay = Math.round(1000 / GIF_FPS)
  let previous: Uint8Array | null = null
  const diff = new Uint8Array(WIDTH * HEIGHT)

  for (const [i, t] of times.entries()) {
    const index = applyPalette(pixels(await source(t)), colors, 'rgb444')
    if (!previous) {
      gif.writeFrame(index, WIDTH, HEIGHT, { palette, delay, repeat: 0 })
    } else {
      for (let px = 0; px < index.length; px++) diff[px] = index[px] === previous[px] ? TRANSPARENT : index[px]!
      gif.writeFrame(diff, WIDTH, HEIGHT, { palette, delay, transparent: true, transparentIndex: TRANSPARENT, dispose: 1 })
    }
    previous = index
    onProgress?.(i + 2, total)
    // Yield so the progress bar can paint.
    await new Promise(r => setTimeout(r, 0))
  }
  gif.finish()
  const bytes = gif.bytes()
  return new Blob([bytes.slice().buffer], { type: 'image/gif' })
}

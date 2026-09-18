import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, WebMOutputFormat, canEncodeVideo } from 'mediabunny'
import { HEIGHT, WIDTH } from '../templates/types'
import { frameTimes, type FrameSource, type Progress } from './capture'

export const VIDEO_FPS = 30

export type VideoKind = 'mp4' | 'webm'

/**
 * MP4/H.264 where the browser can encode it (Chrome, Edge, Safari 17+),
 * WebM/VP9 as a fallback (Firefox, open-source Chromium). `null` means the
 * browser has no usable WebCodecs at all.
 */
export async function detectVideoSupport(): Promise<VideoKind | null> {
  if (typeof VideoEncoder === 'undefined' || !window.isSecureContext) return null
  const size = { width: WIDTH, height: HEIGHT }
  try {
    if (await canEncodeVideo('avc', size)) return 'mp4'
    if (await canEncodeVideo('vp9', size)) return 'webm'
  } catch { /* treat as unsupported */ }
  return null
}

export async function encodeVideo(kind: VideoKind, source: FrameSource, duration: number, onProgress?: Progress): Promise<Blob> {
  const times = frameTimes(duration, VIDEO_FPS)
  onProgress?.(0, times.length)

  // One scratch canvas that every captured frame is drawn into; CanvasSource reads it on each add().
  const scratch = document.createElement('canvas')
  scratch.width = WIDTH
  scratch.height = HEIGHT
  const ctx = scratch.getContext('2d')!

  const output = new Output({
    format: kind === 'mp4' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(),
    target: new BufferTarget(),
  })
  const video = new CanvasSource(scratch, {
    codec: kind === 'mp4' ? 'avc' : 'vp9',
    bitrate: QUALITY_HIGH,
    keyFrameInterval: 1,
  })
  output.addVideoTrack(video, { frameRate: VIDEO_FPS })
  await output.start()

  const frameSeconds = 1 / VIDEO_FPS
  for (const [i, t] of times.entries()) {
    const frame = await source(t)
    ctx.drawImage(frame, 0, 0)
    await video.add(i * frameSeconds, frameSeconds)
    onProgress?.(i + 1, times.length)
  }
  video.close()
  await output.finalize()

  const buffer = output.target.buffer
  if (!buffer) throw new Error('Video encoding produced no data')
  return new Blob([buffer], { type: kind === 'mp4' ? 'video/mp4' : 'video/webm' })
}

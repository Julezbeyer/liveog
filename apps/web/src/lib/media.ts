import type { Media } from '../templates/types'

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

export const MEDIA_ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES].join(',')
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',')

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Images become data URLs (html-to-image can inline them), videos stay as object URLs. */
export async function fileToMedia(file: File): Promise<Media> {
  if (file.type.startsWith('video/')) {
    return { kind: 'video', url: URL.createObjectURL(file), name: file.name }
  }
  return { kind: 'image', url: await readAsDataUrl(file), name: file.name }
}

export function releaseMedia(media: Media | null) {
  if (media?.kind === 'video') URL.revokeObjectURL(media.url)
}

/**
 * Anything that needs to get ready before a frame at `timeMs` is captured
 * (video backgrounds seek and paint into their canvas). Registered by
 * components while mounted, awaited by the exporter for every frame.
 */
const preparers = new Set<(timeMs: number) => Promise<void>>()

export function registerFramePreparer(fn: (timeMs: number) => Promise<void>) {
  preparers.add(fn)
  return () => { preparers.delete(fn) }
}

export function prepareFrame(timeMs: number) {
  return Promise.all([...preparers].map(fn => fn(timeMs)))
}

export function seekVideo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise(resolve => {
    if (Math.abs(video.currentTime - seconds) < 0.002 && video.readyState >= 2) return resolve()
    const done = () => { video.removeEventListener('seeked', done); resolve() }
    video.addEventListener('seeked', done)
    video.currentTime = seconds
  })
}

export function whenLoaded(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2) return Promise.resolve()
  return new Promise(resolve => video.addEventListener('loadeddata', () => resolve(), { once: true }))
}

export function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'liveog'
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

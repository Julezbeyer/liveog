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

/** Wait for decoded media, including when a previous seek temporarily emptied the buffer. */
function waitForVideo(video: HTMLVideoElement, ready: () => boolean, events: string[], start?: () => void): Promise<void> {
  if (video.error) return Promise.reject(new Error('This video could not be decoded. Try another file.'))
  if (ready()) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout)
      events.forEach(event => video.removeEventListener(event, check))
      video.removeEventListener('error', failed)
    }
    const check = () => { if (ready()) { cleanup(); resolve() } }
    const failed = () => { cleanup(); reject(new Error('This video could not be decoded. Try another file.')) }
    const timeout = setTimeout(() => { cleanup(); reject(new Error('The background video took too long to load. Try another file.')) }, 15000)
    events.forEach(event => video.addEventListener(event, check))
    video.addEventListener('error', failed)
    try { start?.(); check() } catch (error) { cleanup(); reject(error) }
  })
}

export function seekVideo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return waitForVideo(video,
    () => !video.seeking && Math.abs(video.currentTime - seconds) < 0.002 && video.readyState >= 2,
    ['seeked', 'loadeddata', 'canplay'],
    () => { video.currentTime = seconds },
  )
}

export function whenLoaded(video: HTMLVideoElement): Promise<void> {
  return waitForVideo(video, () => video.readyState >= 2, ['loadeddata', 'canplay', 'seeked'])
}

export function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'liveog'
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

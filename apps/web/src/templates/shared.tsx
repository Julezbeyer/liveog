import { createContext, useContext, useEffect, useRef, type CSSProperties, type PropsWithChildren } from 'react'
import { LiveCard } from '@liveog/react'
import { registerFramePreparer, seekVideo, whenLoaded } from '../lib/media'
import { HEIGHT, WIDTH, type CardData, type Media } from './types'

export const MediaTime = createContext<number | null>(null)

export const FONT = '"Inter Variable", Inter, "Segoe UI", system-ui, -apple-system, Helvetica, Arial, sans-serif'

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return { r: 124, g: 92, b: 255 }
  const n = parseInt(m[1]!, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function accentRgba(accent: string, alpha: number) {
  const { r, g, b } = hexToRgb(accent)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const cover: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }

/**
 * Video background. In the live preview a <video> element plays or is seeked
 * to the scrubber position. During export the same frame is painted into a
 * canvas, because html-to-image cannot rasterise <video>.
 */
function VideoLayer({ media, time, playing, exporting }: { media: Media; time: number; playing: boolean; exporting: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const loopTime = (video: HTMLVideoElement, ms: number) =>
    video.duration && Number.isFinite(video.duration) ? (ms / 1000) % video.duration : 0

  // Live preview: free-running playback while playing, otherwise follow the scrubber.
  useEffect(() => {
    const video = videoRef.current
    if (!video || exporting) return
    let active = true
    if (playing) {
      video.play().catch(() => { /* autoplay blocked: stays on the current frame */ })
    } else {
      video.pause()
      whenLoaded(video).then(() => { if (active) video.currentTime = loopTime(video, time) }).catch(() => { /* Export reports media errors to the user. */ })
    }
    return () => { active = false }
  }, [playing, time, exporting])

  // Export: seek and paint exactly the frame that belongs to `timeMs`.
  useEffect(() => {
    return registerFramePreparer(async timeMs => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return
      video.pause()
      await whenLoaded(video)
      await seekVideo(video, loopTime(video, timeMs))
      canvas.width = WIDTH
      canvas.height = HEIGHT
      const ctx = canvas.getContext('2d')!
      const scale = Math.max(WIDTH / video.videoWidth, HEIGHT / video.videoHeight)
      const w = video.videoWidth * scale
      const h = video.videoHeight * scale
      ctx.drawImage(video, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h)
    })
  }, [])

  return (
    <>
      <video ref={videoRef} src={media.url} muted loop playsInline preload="auto" style={{ ...cover, visibility: exporting ? 'hidden' : 'visible' }} />
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} style={{ ...cover, visibility: exporting ? 'visible' : 'hidden' }} />
    </>
  )
}

/** Full-bleed card background: uploaded image or video under a dark overlay, or a gradient tinted by the accent. */
export function Backdrop({
  data, time, playing = false, exporting = false, children, style,
}: PropsWithChildren<{ data: CardData; time: number; playing?: boolean; exporting?: boolean; style?: CSSProperties }>) {
  const mediaTime = useContext(MediaTime) ?? time
  const bg = data.background
  const gradient = `radial-gradient(1200px 600px at 100% 0%, ${accentRgba(data.accent, 0.35)}, transparent 60%), linear-gradient(135deg, #0b0b0f, #1a1a22)`

  return (
    <LiveCard width={WIDTH} height={HEIGHT}>
      <div style={{ width: '100%', height: '100%', position: 'relative', background: bg ? '#000' : gradient, color: '#fff', fontFamily: FONT }}>
        {bg?.kind === 'image' && <img src={bg.url} alt="" style={cover} />}
        {bg?.kind === 'video' && <VideoLayer media={bg} time={mediaTime} playing={playing} exporting={exporting} />}
        {bg && <div style={{ ...cover, background: 'linear-gradient(135deg, rgba(8,8,10,.82), rgba(8,8,10,.5))' }} />}
        <div style={{ position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box', ...style }}>{children}</div>
      </div>
    </LiveCard>
  )
}

export function Logo({ media, size = 72 }: { media: Media | null; size?: number }) {
  if (!media) return null
  return (
    <img
      src={media.url}
      alt=""
      style={{ width: size, height: size, objectFit: 'contain', borderRadius: 14, background: 'rgba(255,255,255,.06)', display: 'block' }}
    />
  )
}

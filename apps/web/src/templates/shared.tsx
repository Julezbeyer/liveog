import type { CSSProperties, PropsWithChildren } from 'react'
import { LiveCard } from '@liveog/react'
import { HEIGHT, WIDTH, type CardData } from './types'

export const FONT = 'Inter, "Segoe UI", system-ui, -apple-system, Helvetica, Arial, sans-serif'

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

/** Full-bleed card background: uploaded image with a dark overlay, or a gradient tinted by the accent. */
export function Backdrop({ data, children, style }: PropsWithChildren<{ data: CardData; style?: CSSProperties }>) {
  const layers = data.background
    ? `linear-gradient(135deg, rgba(8,8,10,.82), rgba(8,8,10,.55)), url(${data.background})`
    : `radial-gradient(1200px 600px at 100% 0%, ${accentRgba(data.accent, 0.35)}, transparent 60%), linear-gradient(135deg, #0b0b0f, #1a1a22)`

  return (
    <LiveCard width={WIDTH} height={HEIGHT}>
      <div
        style={{
          width: '100%',
          height: '100%',
          background: layers,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#fff',
          fontFamily: FONT,
          boxSizing: 'border-box',
          position: 'relative',
          ...style,
        }}
      >
        {children}
      </div>
    </LiveCard>
  )
}

export function Logo({ src, size = 72 }: { src: string; size?: number }) {
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      style={{ width: size, height: size, objectFit: 'contain', borderRadius: 14, background: 'rgba(255,255,255,.06)' }}
    />
  )
}

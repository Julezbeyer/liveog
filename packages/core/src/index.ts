export type LiveOGConfig = {
  width?: number
  height?: number
  duration?: number
  fps?: number
}

export const defaults: Required<LiveOGConfig> = {
  width: 1200,
  height: 630,
  duration: 4000,
  fps: 30,
}

export function progress(timeMs: number, durationMs: number) {
  return Math.max(0, Math.min(1, timeMs / durationMs))
}

export function lerp(from: number, to: number, t: number) {
  return from + (to - from) * Math.max(0, Math.min(1, t))
}

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

/**
 * Progress of a segment that starts at `delayMs` and runs for `durationMs`.
 * Returns 0 before the segment starts and 1 once it has finished, so elements
 * can share one timeline without knowing about each other.
 */
export function segmentProgress(timeMs: number, delayMs: number, durationMs: number) {
  if (durationMs <= 0) return timeMs < delayMs ? 0 : 1
  return progress(timeMs - delayMs, durationMs)
}

/** Normalised easing curve: takes clamped progress 0..1 and returns eased 0..1. */
export type EasingFunction = (t: number) => number

/**
 * Easing curves for `Animate` and `Counter`.
 *
 * Every curve satisfies `f(0) === 0` and `f(1) === 1`, which keeps the rendered
 * timeline deterministic: the poster frame at the end of a segment always shows
 * the finished state regardless of the curve in use.
 */
export const easings = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  easeInCubic: (t: number) => t ** 3,
  easeOutCubic: (t: number) => 1 - (1 - t) ** 3,
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  easeOutBack: (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
} satisfies Record<string, EasingFunction>

/** Name of a built-in easing curve. */
export type EasingName = keyof typeof easings

/** Accepts a built-in curve name or a custom function. */
export type Easing = EasingName | EasingFunction

/** Resolves an easing name or function to a callable curve. Unknown input falls back to `linear`. */
export function resolveEasing(easing: Easing | undefined): EasingFunction {
  if (typeof easing === 'function') return easing
  if (easing && easing in easings) return easings[easing]
  return easings.linear
}

/** `lerp` with an easing curve applied to `t` first. */
export function ease(from: number, to: number, t: number, easing?: Easing) {
  return lerp(from, to, resolveEasing(easing)(Math.max(0, Math.min(1, t))))
}

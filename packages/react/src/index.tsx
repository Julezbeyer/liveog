import React, { createContext, useContext, useEffect, useState } from 'react'
import { defaults, ease, resolveEasing, segmentProgress, type Easing } from '@liveog/core'

/**
 * `null` means "no provider above me", which is different from a provider that
 * legitimately supplies time 0. That distinction is what lets `useLiveOGTime`
 * decide whether to subscribe to `liveog:time` itself.
 */
const TimeContext = createContext<number | null>(null)

/** Supplies the timeline position to every card component below it. */
export const LiveOGTimeProvider = TimeContext.Provider

/**
 * Current timeline position in milliseconds.
 *
 * Inside a `LiveOGTimeProvider` this returns the provided value, which is what
 * the renderer drives frame by frame. Outside a provider it subscribes to the
 * `liveog:time` window event itself, so a card works in the browser without any
 * listener boilerplate.
 */
export function useLiveOGTime(): number {
  const provided = useContext(TimeContext)
  const subscribe = provided === null
  const [time, setTime] = useState(0)

  useEffect(() => {
    if (!subscribe) return

    const onTime = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail
      if (typeof detail === 'number' && !Number.isNaN(detail)) {
        setTime(detail)
      }
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object' && event.data.type === 'liveog:time') {
        const rawTime = typeof event.data.detail === 'number' ? event.data.detail : event.data.time
        if (typeof rawTime === 'number' && !Number.isNaN(rawTime)) {
          setTime(rawTime)
        }
      }
    }

    window.addEventListener('liveog:time', onTime)
    window.addEventListener('message', onMessage)

    return () => {
      window.removeEventListener('liveog:time', onTime)
      window.removeEventListener('message', onMessage)
    }
  }, [subscribe])

  return provided ?? time
}

export function LiveCard({
  width = defaults.width,
  height = defaults.height,
  duration = defaults.duration,
  children,
}: React.PropsWithChildren<{ width?: number; height?: number; duration?: number }>) {
  return (
    <div data-liveog-duration={duration} style={{ width, height, overflow: 'hidden', position: 'relative' }}>
      {children}
    </div>
  )
}

export type AnimateProps = React.PropsWithChildren<{
  /** Edge the element travels in from. */
  from?: 'bottom' | 'top' | 'left' | 'right'
  /** Length of the move in milliseconds (default 700). */
  duration?: number
  /** Milliseconds to wait before the move starts (default 0). */
  delay?: number
  /** Built-in easing name or a custom `(t: number) => number` curve. */
  easing?: Easing
  /** Travel distance in pixels (default 36). */
  distance?: number
}>

export function Animate({
  from = 'bottom',
  duration = 700,
  delay = 0,
  easing = 'easeOutCubic',
  distance = 36,
  children,
}: AnimateProps) {
  const t = useLiveOGTime()
  const p = resolveEasing(easing)(segmentProgress(t, delay, duration))
  const axis = from === 'left' || from === 'right' ? 'X' : 'Y'
  const sign = from === 'top' || from === 'left' ? -1 : 1
  const offset = distance * sign * (1 - p)
  return <div style={{ opacity: p, transform: `translate${axis}(${offset}px)` }}>{children}</div>
}

export type CounterProps = {
  from?: number
  to: number
  suffix?: string
  /** Length of the count-up in milliseconds (default 1800). */
  duration?: number
  /** Milliseconds to wait before counting starts (default 0). */
  delay?: number
  /** Built-in easing name or a custom `(t: number) => number` curve. */
  easing?: Easing
  /** Formats the interpolated value. Defaults to a rounded, locale-aware number. */
  format?: (value: number) => string
}

const defaultFormat = (value: number) => Math.round(value).toLocaleString()

export function Counter({
  from = 0,
  to,
  suffix = '',
  duration = 1800,
  delay = 0,
  easing = 'easeOutCubic',
  format = defaultFormat,
}: CounterProps) {
  const t = useLiveOGTime()
  const value = ease(from, to, segmentProgress(t, delay, duration), easing)
  return (
    <span>
      {format(value)}
      {suffix}
    </span>
  )
}

export * from './CodeTyping'
export * from './Sparkline'

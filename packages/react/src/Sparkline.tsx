import React from 'react'
import { lerp, resolveEasing, segmentProgress, type Easing } from '@liveog/core'
import { useLiveOGTime } from './index'

export interface SparklineProps {
  /** Array of numerical data points to visualize. */
  data: number[]
  /** Width of the SVG canvas in pixels. Default 300. */
  width?: number
  /** Height of the SVG canvas in pixels. Default 100. */
  height?: number
  /** Padding around the plotted data in pixels. Default 8. */
  padding?: number
  /** Stroke color of the sparkline. Default '#3b82f6'. */
  stroke?: string
  /** Stroke width in pixels. Default 2.5. */
  strokeWidth?: number
  /** Stroke linecap style. Default 'round'. */
  strokeLinecap?: 'round' | 'square' | 'butt'
  /** Stroke linejoin style. Default 'round'. */
  strokeLinejoin?: 'round' | 'bevel' | 'miter'
  /** Fill color or boolean/gradient for the area under the curve. Default false. */
  fill?: string | boolean
  /** Top color for gradient area fill. Defaults to stroke color. */
  fillTopColor?: string
  /** Bottom color for gradient area fill. Defaults to stroke color. */
  fillBottomColor?: string
  /** Whether to smooth the path using cubic Bézier curves. Default false. */
  smooth?: boolean
  /** Curve style alias: 'linear' or 'smooth'. */
  curve?: 'linear' | 'smooth'
  /** Whether to show the leading tip dot at the animated head position. Default true. */
  showTip?: boolean
  /** Alias for showTip. */
  showDot?: boolean
  /** Radius of the leading tip dot. Default 4. */
  tipRadius?: number
  /** Alias for tipRadius. */
  dotRadius?: number
  /** Color of the leading tip dot. Defaults to stroke color. */
  tipColor?: string
  /** Alias for tipColor. */
  dotColor?: string
  /** Delay in milliseconds before animation begins. Default 0. */
  delay?: number
  /** Duration in milliseconds of the animation. Default 1000. */
  duration?: number
  /** Easing function or name for animation progression. Default 'linear'. */
  easing?: Easing
  /** Optional lower bound for data value scaling. */
  min?: number
  /** Optional upper bound for data value scaling. */
  max?: number
  /** Optional class name on root SVG. */
  className?: string
  /** Optional inline styles on root SVG. */
  style?: React.CSSProperties
}

interface Point {
  x: number
  y: number
}

interface SegmentBezier {
  p0: Point
  cp1: Point
  cp2: Point
  p1: Point
}

function evaluateCubicBezier(p0: Point, cp1: Point, cp2: Point, p1: Point, t: number): Point {
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t

  return {
    x: mt3 * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * p1.x,
    y: mt3 * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * p1.y,
  }
}

export function Sparkline({
  data = [],
  width = 300,
  height = 100,
  padding = 8,
  stroke = '#3b82f6',
  strokeWidth = 2.5,
  strokeLinecap = 'round',
  strokeLinejoin = 'round',
  fill = false,
  fillTopColor,
  fillBottomColor,
  smooth = false,
  curve,
  showTip,
  showDot,
  tipRadius,
  dotRadius,
  tipColor,
  dotColor,
  delay = 0,
  duration = 1000,
  easing = 'linear',
  min,
  max,
  className,
  style,
}: SparklineProps) {
  const t = useLiveOGTime()
  const rawId = React.useId()
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  const clipId = `liveog-sparkline-clip-${safeId}`
  const gradientId = `liveog-sparkline-grad-${safeId}`

  const isSmooth = curve ? curve === 'smooth' : smooth
  const displayTip = showTip ?? showDot ?? true
  const activeTipRadius = tipRadius ?? dotRadius ?? 4
  const activeTipColor = tipColor ?? dotColor ?? stroke

  // Timeline progress strictly driven by LiveOG time
  const rawProgress = segmentProgress(t, delay, duration)
  const p = resolveEasing(easing)(rawProgress)

  // Empty data fallback
  if (data.length === 0) {
    return (
      <svg
        data-testid="sparkline"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        style={{ display: 'block', overflow: 'hidden', ...style }}
      />
    )
  }

  const innerWidth = Math.max(0, width - 2 * padding)
  const innerHeight = Math.max(0, height - 2 * padding)

  const minVal = min ?? Math.min(...data)
  const maxVal = max ?? Math.max(...data)
  const range = maxVal === minVal ? 1 : maxVal - minVal

  // Scale data points to SVG coordinates
  const points: Point[] =
    data.length === 1
      ? [{ x: width / 2, y: height / 2 }]
      : data.map((val, i) => {
          const x = padding + (i / (data.length - 1)) * innerWidth
          const y = padding + innerHeight * (1 - (val - minVal) / range)
          return { x, y }
        })

  const firstPoint: Point = points[0] ?? { x: width / 2, y: height / 2 }
  const lastPoint: Point = points[points.length - 1] ?? firstPoint

  // Build Bézier segments for smooth curve & head point calculation
  const bezierSegments: SegmentBezier[] = []
  if (points.length >= 2) {
    for (let i = 0; i < points.length - 1; i++) {
      const pPrev = points[Math.max(0, i - 1)] ?? firstPoint
      const pCurr = points[i] ?? firstPoint
      const pNext = points[i + 1] ?? lastPoint
      const pNextNext = points[Math.min(points.length - 1, i + 2)] ?? lastPoint

      const cp1: Point = {
        x: pCurr.x + (pNext.x - pPrev.x) / 6,
        y: pCurr.y + (pNext.y - pPrev.y) / 6,
      }
      const cp2: Point = {
        x: pNext.x - (pNextNext.x - pCurr.x) / 6,
        y: pNext.y - (pNextNext.y - pCurr.y) / 6,
      }

      bezierSegments.push({ p0: pCurr, cp1, cp2, p1: pNext })
    }
  }

  // Generate SVG path string
  let linePath = `M ${firstPoint.x.toFixed(2)},${firstPoint.y.toFixed(2)}`
  if (points.length > 1) {
    if (!isSmooth) {
      for (let i = 1; i < points.length; i++) {
        const pt = points[i]
        if (pt) {
          linePath += ` L ${pt.x.toFixed(2)},${pt.y.toFixed(2)}`
        }
      }
    } else {
      for (const seg of bezierSegments) {
        linePath += ` C ${seg.cp1.x.toFixed(2)},${seg.cp1.y.toFixed(2)} ${seg.cp2.x.toFixed(2)},${seg.cp2.y.toFixed(2)} ${seg.p1.x.toFixed(2)},${seg.p1.y.toFixed(2)}`
      }
    }
  }

  // Generate area path
  const bottomY = height - padding
  const areaPath =
    points.length >= 2
      ? `${linePath} L ${lastPoint.x.toFixed(2)},${bottomY.toFixed(2)} L ${firstPoint.x.toFixed(2)},${bottomY.toFixed(2)} Z`
      : ''

  // Interpolated head position for leading tip dot
  let head: Point = firstPoint
  if (points.length >= 2) {
    const k = p * (points.length - 1)
    const idx = Math.min(Math.floor(k), points.length - 2)
    const u = k - idx

    const seg = bezierSegments[idx]
    if (isSmooth && seg) {
      head = evaluateCubicBezier(seg.p0, seg.cp1, seg.cp2, seg.p1, u)
    } else {
      const p1 = points[idx] ?? firstPoint
      const p2 = points[idx + 1] ?? lastPoint
      head = {
        x: lerp(p1.x, p2.x, u),
        y: lerp(p1.y, p2.y, u),
      }
    }
  }

  // Deterministic clip rect width: reveals from padding at p=0 up to padding + innerWidth at p=1
  const clipWidth = Number((padding + p * innerWidth).toFixed(3))
  const strokeOffset = Number((1 - p).toFixed(4))

  const hasFill = Boolean(fill)
  const isGradient = fill === 'gradient' || fill === true
  const fillSource = isGradient ? `url(#${gradientId})` : typeof fill === 'string' ? fill : 'none'

  return (
    <svg
      data-testid="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block', overflow: 'hidden', ...style }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            data-testid="sparkline-clip-rect"
            x={0}
            y={0}
            width={clipWidth}
            height={height}
          />
        </clipPath>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillTopColor ?? stroke} stopOpacity={0.35} />
          <stop offset="100%" stopColor={fillBottomColor ?? stroke} stopOpacity={0.0} />
        </linearGradient>
      </defs>

      {/* Area fill revealed under curve */}
      {hasFill && areaPath && (
        <path
          data-testid="sparkline-fill"
          d={areaPath}
          fill={fillSource}
          clipPath={`url(#${clipId})`}
        />
      )}

      {/* Animated line drawn with pathLength="1" */}
      <path
        data-testid="sparkline-path"
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap={strokeLinecap}
        strokeLinejoin={strokeLinejoin}
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset={strokeOffset}
      />

      {/* Leading indicator tip dot */}
      {displayTip && (
        <circle
          data-testid="sparkline-tip"
          cx={Number(head.x.toFixed(2))}
          cy={Number(head.y.toFixed(2))}
          r={activeTipRadius}
          fill={activeTipColor}
        />
      )}
    </svg>
  )
}

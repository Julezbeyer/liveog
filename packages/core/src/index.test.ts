import { describe, expect, it } from 'vitest'
import { ease, easings, lerp, progress, resolveEasing, segmentProgress } from './index'

describe('timeline helpers', () => {
  it('clamps progress', () => {
    expect(progress(-10, 100)).toBe(0)
    expect(progress(50, 100)).toBe(.5)
    expect(progress(150, 100)).toBe(1)
  })
  it('interpolates and clamps t', () => {
    expect(lerp(0, 100, .5)).toBe(50)
    expect(lerp(0, 100, 2)).toBe(100)
  })
})

describe('segmentProgress', () => {
  it('stays at 0 until the delay has passed', () => {
    expect(segmentProgress(0, 500, 1000)).toBe(0)
    expect(segmentProgress(499, 500, 1000)).toBe(0)
  })
  it('runs from 0 to 1 across the segment', () => {
    expect(segmentProgress(500, 500, 1000)).toBe(0)
    expect(segmentProgress(1000, 500, 1000)).toBe(.5)
    expect(segmentProgress(1500, 500, 1000)).toBe(1)
  })
  it('stays at 1 after the segment finished', () => {
    expect(segmentProgress(9000, 500, 1000)).toBe(1)
  })
  it('treats a zero duration as an instant switch at the delay', () => {
    expect(segmentProgress(499, 500, 0)).toBe(0)
    expect(segmentProgress(500, 500, 0)).toBe(1)
  })
})

describe('easings', () => {
  it('every curve is anchored at 0 and 1', () => {
    for (const [name, curve] of Object.entries(easings)) {
      expect(curve(0), `${name} at t=0`).toBeCloseTo(0, 5)
      expect(curve(1), `${name} at t=1`).toBeCloseTo(1, 5)
    }
  })

  it('easeOutCubic front-loads the movement', () => {
    expect(easings.easeOutCubic(.5)).toBeGreaterThan(.5)
  })

  it('easeInQuad back-loads the movement', () => {
    expect(easings.easeInQuad(.5)).toBeLessThan(.5)
  })

  it('easeOutBack overshoots before settling', () => {
    expect(easings.easeOutBack(.7)).toBeGreaterThan(1)
    expect(easings.easeOutBack(1)).toBeCloseTo(1, 5)
  })
})

describe('resolveEasing', () => {
  it('resolves built-in names', () => {
    expect(resolveEasing('easeInQuad')).toBe(easings.easeInQuad)
  })
  it('passes custom functions through', () => {
    const custom = (t: number) => t
    expect(resolveEasing(custom)).toBe(custom)
  })
  it('falls back to linear for undefined', () => {
    expect(resolveEasing(undefined)).toBe(easings.linear)
  })
})

describe('ease', () => {
  it('matches lerp when linear', () => {
    expect(ease(0, 100, .25, 'linear')).toBe(lerp(0, 100, .25))
  })
  it('applies the curve and clamps t', () => {
    expect(ease(0, 100, .5, 'easeInQuad')).toBe(25)
    expect(ease(0, 100, 5, 'easeInQuad')).toBe(100)
    expect(ease(0, 100, -5, 'easeInQuad')).toBe(0)
  })
})

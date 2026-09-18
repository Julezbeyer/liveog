import { describe, expect, it } from 'vitest'
import { lerp, progress } from './index'

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

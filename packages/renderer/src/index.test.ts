import { describe, expect, it } from 'vitest'
import { frameTimes, posterFrameIndex } from './index'

describe('frameTimes', () => {
  it('produces one entry per frame starting at 0', () => {
    expect(frameTimes(1000, 4)).toEqual([0, 250, 500, 750])
  })
  it('rounds partial frames up so the timeline end is covered', () => {
    expect(frameTimes(1100, 4)).toHaveLength(5)
  })
  it('never returns an empty schedule', () => {
    expect(frameTimes(0, 30)).toEqual([0])
  })
})

describe('posterFrameIndex', () => {
  const times = frameTimes(4000, 30)
  it('defaults to the final frame when asked for the end of the timeline', () => {
    expect(posterFrameIndex(times, 4000)).toBe(times.length - 1)
  })
  it('picks the closest frame for a mid-timeline poster', () => {
    expect(times[posterFrameIndex(times, 2000)]).toBe(2000)
  })
  it('clamps poster times outside the timeline', () => {
    expect(posterFrameIndex(times, -50)).toBe(0)
    expect(posterFrameIndex(times, 99999)).toBe(times.length - 1)
  })
})

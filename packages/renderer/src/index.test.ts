import { describe, expect, it } from 'vitest'
import { assetUrl, frameTimes, metaTags, posterFrameIndex, type ManifestAsset } from './index'

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

describe('assetUrl', () => {
  it('returns the bare file name without a base URL', () => {
    expect(assetUrl(undefined, 'og.png')).toBe('og.png')
  })
  it('joins base and file', () => {
    expect(assetUrl('https://example.com/og', 'og.png')).toBe('https://example.com/og/og.png')
  })
  it('does not double the slash', () => {
    expect(assetUrl('https://example.com/og/', 'og.png')).toBe('https://example.com/og/og.png')
    expect(assetUrl('https://example.com/og///', 'og.png')).toBe('https://example.com/og/og.png')
  })
})

function asset(format: 'png' | 'mp4' | 'gif', url: string): ManifestAsset {
  const type = format === 'png' ? 'image/png' : format === 'mp4' ? 'video/mp4' : 'image/gif'
  return { format, file: `og.${format}`, url, type, bytes: 1000 }
}

describe('metaTags', () => {
  it('emits image and video tags with dimensions', () => {
    const tags = metaTags([asset('png', 'https://x.dev/og.png'), asset('mp4', 'https://x.dev/og.mp4')], 1200, 630)
    expect(tags).toContain('<meta property="og:image" content="https://x.dev/og.png" />')
    expect(tags).toContain('<meta property="og:video" content="https://x.dev/og.mp4" />')
    expect(tags).toContain('<meta property="og:image:width" content="1200" />')
    expect(tags).toContain('<meta property="og:video:height" content="630" />')
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />')
  })

  it('omits video tags when no MP4 was rendered', () => {
    const tags = metaTags([asset('png', 'og.png')], 1200, 630)
    expect(tags.some(tag => tag.includes('og:video'))).toBe(false)
  })

  it('never advertises the GIF as og:image', () => {
    const tags = metaTags([asset('png', 'og.png'), asset('gif', 'og.gif')], 1200, 630)
    expect(tags.some(tag => tag.includes('og.gif'))).toBe(false)
  })

  it('skips image tags when the PNG was not rendered', () => {
    const tags = metaTags([asset('mp4', 'og.mp4')], 1200, 630)
    expect(tags.some(tag => tag.includes('og:image'))).toBe(false)
    expect(tags.some(tag => tag.includes('twitter:image'))).toBe(false)
  })
})

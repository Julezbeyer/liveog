import { describe, expect, it } from 'vitest'
import { stripSiteSuffix, toPatch, type ImportPayload } from './site-import'

const empty: ImportPayload = {
  url: 'https://example.com/',
  siteName: null,
  title: null,
  description: null,
  accent: null,
  image: null,
  logo: null,
  notes: [],
}

describe('stripSiteSuffix', () => {
  it('removes a trailing site name after common separators', () => {
    expect(stripSiteSuffix('Pricing | Example', 'Example')).toBe('Pricing')
    expect(stripSiteSuffix('Pricing – Example', 'Example')).toBe('Pricing')
    expect(stripSiteSuffix('Pricing — Example', 'Example')).toBe('Pricing')
    expect(stripSiteSuffix('Pricing · Example', 'Example')).toBe('Pricing')
  })

  it('leaves the title alone when the site name is elsewhere', () => {
    expect(stripSiteSuffix('Example is hiring', 'Example')).toBe('Example is hiring')
  })

  it('never returns an empty title', () => {
    expect(stripSiteSuffix('| Example', 'Example')).toBe('| Example')
  })

  it('treats regex characters in the site name literally', () => {
    expect(stripSiteSuffix('Docs | C++ (the site)', 'C++ (the site)')).toBe('Docs')
  })

  it('does nothing without a site name', () => {
    expect(stripSiteSuffix('Pricing | Example', null)).toBe('Pricing | Example')
  })
})

describe('toPatch', () => {
  it('maps head data onto card fields', () => {
    const patch = toPatch({
      ...empty,
      siteName: 'Example',
      title: 'Ship faster | Example',
      description: 'A tool for shipping.',
      accent: '#7c5cff',
    })
    expect(patch).toEqual({
      eyebrow: 'EXAMPLE',
      title: 'Ship faster',
      subtitle: 'A tool for shipping.',
      accent: '#7c5cff',
    })
  })

  it('leaves out anything the page did not provide', () => {
    expect(toPatch({ ...empty, title: 'Only a title' })).toEqual({ title: 'Only a title' })
  })

  it('returns an empty patch for a page with nothing on it', () => {
    expect(toPatch(empty)).toEqual({})
  })

  it('wraps the icon as image media so it can be rasterised', () => {
    const patch = toPatch({
      ...empty,
      logo: { dataUrl: 'data:image/svg+xml;base64,BBB', name: 'icon.svg', bytes: 3 },
    })
    expect(patch.logo).toEqual({ kind: 'image', url: 'data:image/svg+xml;base64,BBB', name: 'icon.svg' })
  })

  it('never applies the social image as background on its own', () => {
    // Most og:images are finished cards with their own headline - laid behind
    // ours, neither is readable. It is offered in the UI instead.
    const patch = toPatch({
      ...empty,
      title: 'Something',
      image: { dataUrl: 'data:image/png;base64,AAA', name: 'og.png', bytes: 3 },
    })
    expect(patch).not.toHaveProperty('background')
  })

  it('shortens long copy instead of letting it overflow the card', () => {
    const patch = toPatch({ ...empty, title: 'x'.repeat(200), description: 'y'.repeat(400) })
    expect(patch.title!.length).toBe(90)
    expect(patch.title!.endsWith('…')).toBe(true)
    expect(patch.subtitle!.length).toBe(150)
  })

  it('collapses whitespace that pages leave in their meta tags', () => {
    expect(toPatch({ ...empty, title: '  Ship\n   faster  ' }).title).toBe('Ship faster')
  })
})

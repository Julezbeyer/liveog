import { describe, expect, it } from 'vitest'
import { decodeEntities, normaliseColor, parseHead } from './parse-head'

const base = new URL('https://example.com/blog/post')

describe('parseHead', () => {
  it('prefers Open Graph over the document title', () => {
    const head = parseHead(
      `<head><title>Fallback</title><meta property="og:title" content="Real title"></head>`,
      base,
    )
    expect(head.title).toBe('Real title')
  })

  it('falls back to the document title when there is no og:title', () => {
    expect(parseHead('<head><title>  Just a title  </title></head>', base).title).toBe('Just a title')
  })

  it('resolves relative image and icon URLs against the page', () => {
    const head = parseHead(
      `<head><meta property="og:image" content="../card.png"><link rel="icon" href="/icon.svg"></head>`,
      base,
    )
    expect(head.imageUrl).toBe('https://example.com/card.png')
    expect(head.iconUrl).toBe('https://example.com/icon.svg')
  })

  it('honours a <base href> for relative URLs', () => {
    const head = parseHead(
      `<head><base href="https://cdn.example.com/assets/"><link rel="icon" href="icon.png"></head>`,
      base,
    )
    expect(head.iconUrl).toBe('https://cdn.example.com/assets/icon.png')
  })

  it('prefers an apple-touch-icon over a small favicon', () => {
    const head = parseHead(
      `<head>
        <link rel="icon" sizes="16x16" href="/small.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/touch.png">
      </head>`,
      base,
    )
    expect(head.iconUrl).toBe('https://example.com/touch.png')
  })

  it('falls back to /favicon.ico when nothing is declared', () => {
    expect(parseHead('<head></head>', base).iconUrl).toBe('https://example.com/favicon.ico')
  })

  it('ignores the data: placeholder icon minimal pages use', () => {
    const head = parseHead('<head><link rel="icon" href="data:,"></head>', base)
    expect(head.iconUrl).toBe('https://example.com/favicon.ico')
  })

  it('ignores non-http image URLs', () => {
    expect(parseHead('<head><meta property="og:image" content="data:image/png;base64,AA"></head>', base).imageUrl).toBeNull()
  })

  it('keeps the first og:image when a page lists several', () => {
    const head = parseHead(
      `<head><meta property="og:image" content="/first.png"><meta property="og:image" content="/second.png"></head>`,
      base,
    )
    expect(head.imageUrl).toBe('https://example.com/first.png')
  })

  it('ignores meta tags that appear after </head>', () => {
    const head = parseHead(
      `<head><meta property="og:title" content="Head"></head><body><meta property="og:description" content="Body"></body>`,
      base,
    )
    expect(head.description).toBeNull()
  })

  it('reads single-quoted and unquoted attributes', () => {
    const head = parseHead(
      `<head><meta property='og:site_name' content='Example'><meta name=description content=Short></head>`,
      base,
    )
    expect(head.siteName).toBe('Example')
    expect(head.description).toBe('Short')
  })

  it('decodes entities in content', () => {
    const head = parseHead(`<head><meta property="og:title" content="Tom &amp; Jerry &#39;96"></head>`, base)
    expect(head.title).toBe("Tom & Jerry '96")
  })

  it('survives a page with no head at all', () => {
    const head = parseHead('<p>hello</p>', base)
    expect(head.title).toBeNull()
    expect(head.description).toBeNull()
  })
})

describe('decodeEntities', () => {
  it('leaves unknown entities untouched', () => {
    expect(decodeEntities('&unknownthing; &amp;')).toBe('&unknownthing; &')
  })
})

describe('normaliseColor', () => {
  it('expands three digit hex', () => {
    expect(normaliseColor('#0AF')).toBe('#00aaff')
  })

  it('passes six digit hex through in lowercase', () => {
    expect(normaliseColor('#7C5CFF')).toBe('#7c5cff')
  })

  it('converts rgb() to hex', () => {
    expect(normaliseColor('rgb(124, 92, 255)')).toBe('#7c5cff')
  })

  it('rejects anything the colour input cannot take', () => {
    expect(normaliseColor('rebeccapurple')).toBeNull()
    expect(normaliseColor('')).toBeNull()
    expect(normaliseColor(null)).toBeNull()
  })
})

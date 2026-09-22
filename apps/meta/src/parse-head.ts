/**
 * A focused reader for the one part of a page this service cares about: the
 * `<head>`. It is not a general HTML parser and does not try to be - it scans
 * `<meta>`, `<link>` and `<title>` and ignores everything else, which is why it
 * needs no dependency and cannot be walked into a tree-shaped surprise.
 */

export interface HeadData {
  title: string | null
  description: string | null
  siteName: string | null
  themeColor: string | null
  /** Absolute URL of the page's own social image, if it advertises one. */
  imageUrl: string | null
  /** Absolute URL of the best icon found, largest and most modern first. */
  iconUrl: string | null
  /** False when `iconUrl` is our /favicon.ico guess rather than a declared link. */
  iconDeclared: boolean
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
  '#x27': "'",
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, name: string) => {
    const known = ENTITIES[name] ?? ENTITIES[name.toLowerCase()]
    if (known) return known
    if (name.startsWith('#x') || name.startsWith('#X')) {
      const code = parseInt(name.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    if (name.startsWith('#')) {
      const code = parseInt(name.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return match
  })
}

const ATTRIBUTE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>`]+))/g

function attributes(tag: string): Record<string, string> {
  const found: Record<string, string> = {}
  for (const match of tag.matchAll(ATTRIBUTE)) {
    const name = match[1]?.toLowerCase()
    if (!name) continue
    found[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '').trim()
  }
  return found
}

/** Largest edge declared in a `sizes` attribute, or 0 when it says nothing useful. */
function largestSize(sizes: string | undefined): number {
  if (!sizes) return 0
  if (sizes.toLowerCase() === 'any') return 1024 // "any" means scalable, treat as best
  let best = 0
  for (const pair of sizes.split(/\s+/)) {
    const edge = Number(pair.split(/x/i)[0])
    if (Number.isFinite(edge)) best = Math.max(best, edge)
  }
  return best
}

function absolute(base: URL, value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value, base)
    // Minimal pages often carry `<link rel="icon" href="data:,">` purely to stop
    // the browser asking for a favicon. That is not an icon, so it is dropped
    // here rather than travelling down to the fetcher to be rejected there and
    // reported to the user as a failure.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

export function parseHead(html: string, baseUrl: URL): HeadData {
  // Everything interesting lives before </head>; stopping there keeps a huge
  // body from being scanned and avoids picking up meta tags inside content.
  const headEnd = html.search(/<\/head\s*>/i)
  const head = headEnd === -1 ? html.slice(0, 200_000) : html.slice(0, headEnd)

  const meta = new Map<string, string>()
  for (const match of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0])
    const key = (attrs['property'] ?? attrs['name'] ?? attrs['itemprop'])?.toLowerCase()
    const content = attrs['content']
    // First declaration wins: pages that repeat og:image list the primary first.
    if (key && content && !meta.has(key)) meta.set(key, content)
  }

  let base = baseUrl
  for (const match of head.matchAll(/<base\b[^>]*>/gi)) {
    const href = attributes(match[0])['href']
    const resolved = absolute(baseUrl, href)
    if (resolved) {
      base = new URL(resolved)
      break
    }
  }

  let icon: { url: string; score: number } | null = null
  for (const match of head.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(match[0])
    const rel = attrs['rel']?.toLowerCase() ?? ''
    if (!/\b(icon|apple-touch-icon|apple-touch-icon-precomposed)\b/.test(rel)) continue
    const href = absolute(base, attrs['href'])
    if (!href) continue
    // An apple-touch-icon is a deliberately designed square, which is exactly
    // what a card wants; a bare favicon is usually a 16px afterthought.
    const relBonus = rel.includes('apple-touch-icon') ? 512 : 0
    const typeBonus = (attrs['type'] ?? '').includes('svg') || href.endsWith('.svg') ? 256 : 0
    const score = relBonus + typeBonus + largestSize(attrs['sizes'])
    if (!icon || score > icon.score) icon = { url: href, score }
  }

  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const documentTitle = titleMatch?.[1] ? decodeEntities(titleMatch[1]).trim() : null

  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = meta.get(key)?.trim()
      if (value) return value
    }
    return null
  }

  return {
    title: pick('og:title', 'twitter:title') ?? documentTitle ?? null,
    description: pick('og:description', 'twitter:description', 'description'),
    siteName: pick('og:site_name', 'application-name'),
    themeColor: normaliseColor(pick('theme-color', 'msapplication-tilecolor')),
    imageUrl: absolute(base, pick('og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src') ?? undefined),
    iconUrl: icon?.url ?? absolute(base, '/favicon.ico'),
    iconDeclared: icon !== null,
  }
}

/**
 * The card's accent is an `<input type="color">` value, which only accepts
 * `#rrggbb`. Anything else (named colours, `rgb()`, `#abc`) is either expanded
 * or dropped rather than handed over to break the picker.
 */
export function normaliseColor(value: string | null): string | null {
  if (!value) return null
  const text = value.trim().toLowerCase()

  const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/)
  if (hex?.[1]) {
    const digits = hex[1]
    if (digits.length === 3) {
      return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`
    }
    return `#${digits}`
  }

  const rgb = text.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/)
  if (rgb) {
    const channels = rgb.slice(1, 4).map(n => Math.min(255, Number(n)))
    if (channels.every(n => Number.isFinite(n))) {
      return `#${channels.map(n => n.toString(16).padStart(2, '0')).join('')}`
    }
  }

  return null
}

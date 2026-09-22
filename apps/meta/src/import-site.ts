import { fetchLimited } from './fetch-limited'
import { BlockedUrlError } from './net-guard'
import { parseHead } from './parse-head'

const MAX_HTML_BYTES = 512 * 1024
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const MAX_ICON_BYTES = 512 * 1024

const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
])

export interface ImportedAsset {
  /** Inlined on purpose - see `fetchAsset`. */
  dataUrl: string
  name: string
  bytes: number
}

export interface ImportedSite {
  url: string
  siteName: string | null
  title: string | null
  description: string | null
  accent: string | null
  image: ImportedAsset | null
  logo: ImportedAsset | null
  /** Things the caller should be told about, in plain language. */
  notes: string[]
}

function fileName(url: URL, fallback: string): string {
  const last = url.pathname.split('/').filter(Boolean).pop()
  return last && last.length <= 64 ? last : fallback
}

/**
 * Fetches an image and returns it as a data URL.
 *
 * Inlining rather than passing the remote URL through is not a detail: the
 * playground rasterises the card with html-to-image, and a cross-origin `<img>`
 * taints the canvas, at which point every export fails. A data URL is same-origin
 * by definition. It also means the visitor's browser never contacts the imported
 * site, so importing a page does not tell that site who is importing it.
 */
async function fetchAsset(
  url: URL,
  maxBytes: number,
  fallbackName: string,
  notes: string[],
  label: string,
): Promise<ImportedAsset | null> {
  let response
  try {
    response = await fetchLimited(url, { maxBytes, accept: 'image/*' })
  } catch (error) {
    notes.push(`The ${label} could not be downloaded${error instanceof BlockedUrlError ? ` (${error.message})` : ''}.`)
    return null
  }

  if (response.status >= 400) {
    notes.push(`The ${label} returned HTTP ${response.status}.`)
    return null
  }
  if (response.truncated) {
    // A cut-off image decodes to garbage, which looks like a bug in the card
    // rather than a size limit. Better to have no image and say why.
    notes.push(`The ${label} is larger than ${Math.round(maxBytes / 1024)} KB and was skipped.`)
    return null
  }

  const mime = (response.contentType.split(';')[0] ?? '').trim().toLowerCase()
  if (!IMAGE_TYPES.has(mime)) {
    notes.push(`The ${label} is not an image we can use (${mime || 'unknown type'}).`)
    return null
  }
  if (response.bytes.byteLength === 0) {
    notes.push(`The ${label} was empty.`)
    return null
  }

  const base64 = Buffer.from(response.bytes).toString('base64')
  return {
    dataUrl: `data:${mime};base64,${base64}`,
    name: fileName(response.url, fallbackName),
    bytes: response.bytes.byteLength,
  }
}

export async function importSite(rawUrl: string): Promise<ImportedSite> {
  const trimmed = rawUrl.trim()
  if (!trimmed) throw new BlockedUrlError('Enter a URL first.')

  let target: URL
  try {
    // People type "example.com", not "https://example.com".
    target = new URL(/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    throw new BlockedUrlError('That does not look like a URL.')
  }

  const page = await fetchLimited(target, { maxBytes: MAX_HTML_BYTES, accept: 'text/html,application/xhtml+xml' })
  if (page.status >= 400) {
    throw new BlockedUrlError(`That page returned HTTP ${page.status}.`)
  }

  const html = new TextDecoder('utf-8', { fatal: false }).decode(page.bytes)
  const head = parseHead(html, page.url)
  const notes: string[] = []
  // Only worth mentioning when it actually cost us something. The head sits at
  // the top of the document, so hitting the cap on a large page is normal and
  // usually harmless - saying so every time would just train people to ignore
  // these notes.
  if (page.truncated && (!head.title || !head.imageUrl)) {
    notes.push('The page was too large to read completely, so some tags may be missing.')
  }

  const imageUrl = safeUrl(head.imageUrl)
  const iconUrl = safeUrl(head.iconUrl)

  // A declared icon that fails is worth reporting; our own /favicon.ico guess
  // failing is not - most sites simply do not have one, and complaining about a
  // missing file nobody promised is noise.
  const iconNotes: string[] = head.iconDeclared ? notes : []

  const [image, logo] = await Promise.all([
    imageUrl ? fetchAsset(imageUrl, MAX_IMAGE_BYTES, 'og-image', notes, 'social image') : null,
    iconUrl ? fetchAsset(iconUrl, MAX_ICON_BYTES, 'icon', iconNotes, 'icon') : null,
  ])

  if (!head.title && !head.description && !image) {
    notes.push('That page has almost no Open Graph tags, so there was little to import.')
  }

  return {
    url: page.url.toString(),
    siteName: head.siteName,
    title: head.title,
    description: head.description,
    accent: head.themeColor,
    image,
    logo,
    notes,
  }
}

function safeUrl(value: string | null): URL | null {
  if (!value) return null
  try {
    return new URL(value)
  } catch {
    return null
  }
}

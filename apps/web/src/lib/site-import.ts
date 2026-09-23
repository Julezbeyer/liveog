import type { CardData, Media } from '../templates'

/**
 * Base URL of the importer function, e.g. `https://liveog-meta.vercel.app`.
 *
 * When it is not configured the import field is not rendered at all. A visible
 * button that always fails is worse than no button.
 */
export const IMPORT_API = String(import.meta.env.VITE_META_API ?? '').trim().replace(/\/+$/, '')

interface Asset {
  dataUrl: string
  name: string
  bytes: number
}

export interface ImportPayload {
  url: string
  siteName: string | null
  title: string | null
  description: string | null
  accent: string | null
  image: Asset | null
  logo: Asset | null
  notes: string[]
}

export interface ImportResult {
  patch: Partial<CardData>
  /**
   * The page's own og:image, offered rather than applied - see `toPatch`.
   * `null` when the page has none or it could not be downloaded.
   */
  socialImage: Media | null
  notes: string[]
  url: string
}

const MAX_EYEBROW = 32
const MAX_TITLE = 90
const MAX_SUBTITLE = 150

function clamp(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`
}

/**
 * Drops the " | Site Name" tail that CMSs append to every page title.
 *
 * On a card the site name already sits in the eyebrow, so leaving it in the
 * title says the same thing twice and eats a line of the headline.
 */
export function stripSiteSuffix(title: string, siteName: string | null): string {
  if (!siteName) return title
  const escaped = siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return title.replace(new RegExp(`\\s*[|\\-–—·»]\\s*${escaped}\\s*$`, 'i'), '').trim() || title
}

export function asMedia(asset: Asset | null): Media | null {
  return asset ? { kind: 'image', url: asset.dataUrl, name: asset.name } : null
}

/**
 * Turns the importer's answer into a patch for the card.
 *
 * The page's og:image is deliberately *not* part of the patch. Most sites'
 * social images are already finished cards with their own headline on them, so
 * using one as a full-bleed background puts our title on top of theirs and
 * neither is readable. It only works for purely graphic images, and only a
 * person looking at it can tell which kind it is - so it is offered, not applied.
 */
export function toPatch(payload: ImportPayload): Partial<CardData> {
  const patch: Partial<CardData> = {}

  if (payload.siteName) patch.eyebrow = clamp(payload.siteName, MAX_EYEBROW).toUpperCase()
  if (payload.title) patch.title = clamp(stripSiteSuffix(payload.title, payload.siteName), MAX_TITLE)
  if (payload.description) patch.subtitle = clamp(payload.description, MAX_SUBTITLE)
  if (payload.accent) patch.accent = payload.accent

  const logo = asMedia(payload.logo)
  if (logo) patch.logo = logo

  return patch
}

export async function importFromUrl(input: string, signal?: AbortSignal): Promise<ImportResult> {
  if (!IMPORT_API) throw new Error('Importing from a URL is not enabled on this deployment.')

  const endpoint = `${IMPORT_API}/api/import?url=${encodeURIComponent(input.trim())}`
  let response: Response
  try {
    response = await fetch(endpoint, { signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('The importer could not be reached.')
  }

  let payload: ImportPayload & { error?: string }
  try {
    payload = await response.json()
  } catch {
    throw new Error('The importer sent something unreadable.')
  }

  if (!response.ok) throw new Error(payload.error || 'That site could not be read.')

  const patch = toPatch(payload)
  const socialImage = asMedia(payload.image)
  if (Object.keys(patch).length === 0 && !socialImage) {
    throw new Error('That page had nothing we could put on a card.')
  }

  return { patch, socialImage, notes: payload.notes ?? [], url: payload.url }
}

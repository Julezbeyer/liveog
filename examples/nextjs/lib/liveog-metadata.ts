import type { Metadata } from 'next'

/**
 * The parts of `liveog.manifest.json` this helper relies on. Kept structural on
 * purpose so a manifest imported with `resolveJsonModule` satisfies it without
 * a cast.
 */
export type LiveOGManifest = {
  width: number
  height: number
  assets: Array<{
    format: string
    url: string
    type: string
  }>
}

export type LiveOGMetadataOptions = {
  /**
   * Absolute origin the assets are served from, e.g. `https://example.com`.
   *
   * Open Graph consumers do not resolve relative URLs, so this is required
   * rather than optional - a missing base URL is the single most common way to
   * ship a preview that silently never renders anywhere.
   */
  baseUrl: string
  title: string
  description: string
  /** Canonical page path the card belongs to. Defaults to `/`. */
  path?: string
}

function absolute(baseUrl: string, url: string): string {
  // The manifest stores bare filenames unless `liveog render --base-url` was
  // used, so both cases have to resolve to the same absolute URL here.
  return new URL(url, baseUrl).toString()
}

/**
 * Turns a LiveOG render manifest into a Next.js `Metadata` object.
 *
 * Next emits `og:image*` from `openGraph.images` and `og:video*` from
 * `openGraph.videos`, so the manifest maps onto it almost one to one.
 */
export function liveOGMetadata(
  manifest: LiveOGManifest,
  options: LiveOGMetadataOptions,
): Metadata {
  const { baseUrl, title, description, path = '/' } = options

  if (!baseUrl) {
    throw new Error(
      'liveOGMetadata: baseUrl is required. Open Graph needs absolute URLs; ' +
        'set SITE_URL (or equivalent) before building.',
    )
  }

  const { width, height } = manifest
  const png = manifest.assets.find((asset) => asset.format === 'png')
  const mp4 = manifest.assets.find((asset) => asset.format === 'mp4')

  if (!png) {
    throw new Error(
      'liveOGMetadata: the manifest has no PNG asset. Every platform needs the ' +
        'static fallback, so render at least the png format.',
    )
  }

  const imageUrl = absolute(baseUrl, png.url)

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absolute(baseUrl, path),
      images: [{ url: imageUrl, width, height, alt: title }],
      // Platforms that ignore og:video fall back to the PNG above, which is the
      // whole reason LiveOG always renders one.
      ...(mp4
        ? { videos: [{ url: absolute(baseUrl, mp4.url), width, height, type: mp4.type }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

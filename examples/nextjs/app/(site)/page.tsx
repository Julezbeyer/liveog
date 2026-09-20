import type { Metadata } from 'next'
import { loadManifest } from '../../lib/liveog-manifest'
import { liveOGMetadata } from '../../lib/liveog-metadata'

const TITLE = 'LiveOG × Next.js'
const DESCRIPTION = 'Animated Open Graph cards rendered from an App Router route.'

// Falls back to localhost so `next build` works in a fresh clone and in CI.
// A real site would fail the build instead of guessing an origin.
const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3000'

export function generateMetadata(): Metadata {
  const manifest = loadManifest()

  // Before the first `pnpm og:render` there is nothing to point at, so the page
  // ships without Open Graph tags rather than with broken ones.
  if (!manifest) return { title: TITLE, description: DESCRIPTION }

  return liveOGMetadata(manifest, {
    baseUrl: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    path: '/',
  })
}

export default function Home() {
  const manifest = loadManifest()

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '96px 24px' }}>
      <h1 style={{ fontSize: 48, lineHeight: 1.1, margin: 0 }}>{TITLE}</h1>
      <p style={{ fontSize: 20, lineHeight: 1.6, color: '#b9b9c9' }}>
        This page&rsquo;s Open Graph tags point at assets rendered from{' '}
        <a href="/og/card" style={{ color: '#a58bff' }}>
          /og/card
        </a>{' '}
        by <code>liveog render</code>. View source to see the generated{' '}
        <code>og:image</code> and <code>og:video</code> tags.
      </p>
      <p style={{ fontSize: 20, lineHeight: 1.6, color: '#b9b9c9' }}>
        The rendering happens at build time, never on request &mdash; the
        renderer needs Chromium and FFmpeg, which do not exist inside a
        serverless function.
      </p>
      {manifest ? (
        <img
          src="/og/card/og.png"
          alt="The rendered card"
          width={manifest.width}
          height={manifest.height}
          style={{ width: '100%', height: 'auto', borderRadius: 12, marginTop: 32 }}
        />
      ) : (
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: '#ffd479',
            border: '1px solid #4a3c1a',
            borderRadius: 12,
            padding: '16px 20px',
            marginTop: 32,
          }}
        >
          No card rendered yet. Run <code>pnpm og:render</code>, then build
          again.
        </p>
      )}
    </main>
  )
}

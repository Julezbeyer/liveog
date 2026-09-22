import { importSite } from '../src/import-site'
import { BlockedUrlError } from '../src/net-guard'

/**
 * GET /api/import?url=https://example.com
 *
 * Returns the page's own Open Graph data, with its social image and icon
 * inlined as data URLs, ready to drop into a LiveOG card.
 */

const DEFAULT_ORIGINS = ['https://julezbeyer.github.io']

/**
 * Local development on any port. Listing 5173 alone is not enough: Vite moves
 * to 5174, 5175, … whenever the port is taken, and the import then fails with
 * a CORS error that looks exactly like the importer being down. Allowing a
 * loopback origin costs nothing - only a page on the caller's own machine can
 * carry one.
 */
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

/**
 * CORS here is hygiene, not a security boundary - it stops other websites from
 * quietly using this endpoint from their visitors' browsers, but anything that
 * speaks HTTP can still call it directly. The real limits are the SSRF guard,
 * the size caps and the timeout.
 */
function allowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS
  if (!configured) return DEFAULT_ORIGINS
  return configured.split(',').map(value => value.trim()).filter(Boolean)
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = allowedOrigins()
  const match = origin && (allowed.includes('*') || allowed.includes(origin) || LOCAL_ORIGIN.test(origin)) ? origin : null
  return {
    ...(match ? { 'access-control-allow-origin': match } : {}),
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  }
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request.headers.get('origin'))

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'GET') {
    return json({ error: 'Use GET.' }, 405, { ...cors, allow: 'GET, OPTIONS' })
  }

  const url = new URL(request.url).searchParams.get('url')
  if (!url) return json({ error: 'Pass a ?url= parameter.' }, 400, cors)

  try {
    const site = await importSite(url)
    return json(site, 200, {
      ...cors,
      // The same site usually gets imported more than once while someone is
      // fiddling with a card. An hour at the edge keeps that nearly free.
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    })
  } catch (error) {
    if (error instanceof BlockedUrlError) {
      return json({ error: error.message }, 400, cors)
    }
    if (error instanceof Error && error.name === 'TimeoutError') {
      return json({ error: 'That site took too long to answer.' }, 504, cors)
    }
    // Deliberately vague: the underlying message can carry internal hostnames.
    return json({ error: 'That site could not be read.' }, 502, cors)
  }
}

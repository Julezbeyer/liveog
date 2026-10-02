import { BlockedUrlError, assertPublicUrl } from './net-guard.js'

const USER_AGENT = 'LiveOG-Importer/1.0 (+https://github.com/Julezbeyer/liveog)'
const MAX_REDIRECTS = 3

export interface LimitedResponse {
  url: URL
  status: number
  contentType: string
  bytes: Uint8Array
  /** True when the body was cut off at `maxBytes` rather than ending on its own. */
  truncated: boolean
}

export interface FetchOptions {
  maxBytes: number
  timeoutMs?: number
  accept?: string
}

/**
 * Reads at most `maxBytes` from the body.
 *
 * `Content-Length` is not trusted for this: it is attacker-controlled and may be
 * absent or a lie, so the cap is enforced while reading. Without that, one
 * request for a multi-gigabyte "image" takes the function down.
 */
async function readCapped(response: Response, maxBytes: number): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  const reader = response.body?.getReader()
  if (!reader) return { bytes: new Uint8Array(0), truncated: false }

  const chunks: Uint8Array[] = []
  let total = 0
  let truncated = false

  while (total < maxBytes) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    chunks.push(value)
    if (total >= maxBytes) {
      truncated = true
      break
    }
  }
  await reader.cancel().catch(() => {})

  const bytes = new Uint8Array(Math.min(total, maxBytes))
  let offset = 0
  for (const chunk of chunks) {
    const room = bytes.byteLength - offset
    if (room <= 0) break
    bytes.set(chunk.subarray(0, room), offset)
    offset += Math.min(chunk.byteLength, room)
  }
  return { bytes, truncated }
}

/**
 * Fetches a public URL with redirects followed by hand.
 *
 * Manual redirects are the point: `redirect: 'follow'` would let a public host
 * bounce us to `http://169.254.169.254/` without the guard ever seeing it.
 */
export async function fetchLimited(target: URL, options: FetchOptions): Promise<LimitedResponse> {
  const { maxBytes, timeoutMs = 8000, accept } = options
  let url = target

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url)

    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'user-agent': USER_AGENT,
        ...(accept ? { accept } : {}),
      },
    })

    const location = response.headers.get('location')
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel().catch(() => {})
      let next: URL
      try {
        next = new URL(location, url)
      } catch {
        throw new BlockedUrlError('That site redirected to an address we could not read.')
      }
      url = next
      continue
    }

    const { bytes, truncated } = await readCapped(response, maxBytes)
    return {
      url,
      status: response.status,
      contentType: response.headers.get('content-type') ?? '',
      bytes,
      truncated,
    }
  }

  throw new BlockedUrlError('That site redirected too many times.')
}

import { lookup } from 'node:dns/promises'

/**
 * This service fetches whatever URL a stranger types into a public text field,
 * which is the textbook setup for SSRF: without a guard, `http://169.254.169.254/`
 * or `http://10.0.0.5/admin` would be fetched by our infrastructure, from inside
 * our network, and the response handed back to the caller.
 *
 * So every hop is checked, not just the first one - a public host is allowed to
 * redirect to a private one, and that is the interesting attack.
 */

/** Ranges that must never be reachable through this service. */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true
  const [a, b] = parts as [number, number, number, number]
  if (a === 0) return true // "this network"
  if (a === 10) return true // private
  if (a === 127) return true // loopback
  if (a === 169 && b === 254) return true // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true // private
  if (a === 192 && b === 168) return true // private
  if (a === 192 && b === 0) return true // IETF protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return true // carrier-grade NAT
  if (a === 198 && (b === 18 || b === 19)) return true // benchmarking
  if (a >= 224) return true // multicast and reserved
  return false
}

function isPrivateIPv6(ip: string): boolean {
  const address = ip.toLowerCase().split('%')[0] ?? ''
  if (address === '::' || address === '::1') return true
  // IPv4-mapped (::ffff:10.0.0.1) inherits the IPv4 verdict.
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped?.[1]) return isPrivateIPv4(mapped[1])
  if (address.startsWith('fe80')) return true // link-local
  const first = parseInt(address.slice(0, 2), 16)
  if (!Number.isNaN(first) && (first & 0xfe) === 0xfc) return true // unique local fc00::/7
  return false
}

export function isPrivateAddress(ip: string, family: 4 | 6): boolean {
  return family === 4 ? isPrivateIPv4(ip) : isPrivateIPv6(ip)
}

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BlockedUrlError'
  }
}

/**
 * Throws unless `url` is a public http(s) address.
 *
 * Note the residual risk: between this check and the actual connection the name
 * could resolve to a different address (DNS rebinding). Closing that hole needs
 * connection-level pinning, which the platform fetch does not expose. For a
 * service whose entire output is a page's own `<head>`, the blast radius of that
 * window is small - but it is a known gap, not an oversight.
 */
export async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BlockedUrlError('Only http and https URLs can be imported.')
  }

  const host = url.hostname.replace(/^\[|\]$/g, '')
  let addresses: Array<{ address: string; family: number }>
  try {
    addresses = await lookup(host, { all: true })
  } catch {
    throw new BlockedUrlError(`Could not resolve ${url.hostname}.`)
  }

  if (addresses.length === 0) throw new BlockedUrlError(`Could not resolve ${url.hostname}.`)

  for (const { address, family } of addresses) {
    if (isPrivateAddress(address, family === 6 ? 6 : 4)) {
      throw new BlockedUrlError('That address is not publicly reachable.')
    }
  }
}

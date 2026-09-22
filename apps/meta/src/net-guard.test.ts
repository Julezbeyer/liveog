import { describe, expect, it } from 'vitest'
import { assertPublicUrl, isPrivateAddress } from './net-guard'

describe('isPrivateAddress', () => {
  it('blocks loopback and private IPv4 ranges', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.1', '172.16.0.1', '172.31.255.255', '0.0.0.0']) {
      expect(isPrivateAddress(ip, 4), ip).toBe(true)
    }
  })

  it('blocks the cloud metadata address', () => {
    expect(isPrivateAddress('169.254.169.254', 4)).toBe(true)
  })

  it('blocks carrier-grade NAT and multicast', () => {
    expect(isPrivateAddress('100.64.0.1', 4)).toBe(true)
    expect(isPrivateAddress('239.255.255.250', 4)).toBe(true)
  })

  it('allows ordinary public IPv4', () => {
    for (const ip of ['1.1.1.1', '8.8.8.8', '172.32.0.1', '192.167.0.1', '93.184.216.34']) {
      expect(isPrivateAddress(ip, 4), ip).toBe(false)
    }
  })

  it('blocks IPv6 loopback, link-local and unique-local', () => {
    for (const ip of ['::1', 'fe80::1', 'fc00::1', 'fd12:3456::1']) {
      expect(isPrivateAddress(ip, 6), ip).toBe(true)
    }
  })

  it('sees through IPv4-mapped IPv6', () => {
    expect(isPrivateAddress('::ffff:127.0.0.1', 6)).toBe(true)
    expect(isPrivateAddress('::ffff:8.8.8.8', 6)).toBe(false)
  })

  it('allows public IPv6', () => {
    expect(isPrivateAddress('2606:4700:4700::1111', 6)).toBe(false)
  })

  it('treats malformed input as private rather than guessing', () => {
    expect(isPrivateAddress('not-an-ip', 4)).toBe(true)
    expect(isPrivateAddress('1.2.3', 4)).toBe(true)
  })
})

describe('assertPublicUrl', () => {
  it('rejects non-http schemes before doing any lookup', async () => {
    await expect(assertPublicUrl(new URL('file:///etc/passwd'))).rejects.toThrow(/http and https/)
    await expect(assertPublicUrl(new URL('gopher://example.com/'))).rejects.toThrow(/http and https/)
  })

  it('rejects a literal loopback address', async () => {
    await expect(assertPublicUrl(new URL('http://127.0.0.1:8080/admin'))).rejects.toThrow(/not publicly reachable/)
  })

  it('rejects localhost by name', async () => {
    await expect(assertPublicUrl(new URL('http://localhost:3000/'))).rejects.toThrow(/not publicly reachable/)
  })
})

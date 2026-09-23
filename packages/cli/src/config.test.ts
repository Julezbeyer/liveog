import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findConfig, loadConfig, validateConfig } from './config'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'liveog-config-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('validateConfig', () => {
  it('accepts an empty object', () => {
    expect(validateConfig({})).toEqual([])
  })

  it('accepts a full config', () => {
    const problems = validateConfig({
      url: 'http://localhost:5173',
      outDir: './dist',
      width: 1200,
      height: 630,
      duration: 3000,
      fps: 30,
      formats: ['png', 'mp4'],
      baseUrl: 'https://example.com',
      manifest: false,
    })
    expect(problems).toEqual([])
  })

  it('rejects non-objects', () => {
    expect(validateConfig(null)).toEqual(['config must export an object'])
    expect(validateConfig(42)).toEqual(['config must export an object'])
  })

  it('reports wrong types', () => {
    const problems = validateConfig({ width: 'big', url: 5, manifest: 'yes' })
    expect(problems).toContain('width must be a positive number')
    expect(problems).toContain('url must be a string')
    expect(problems).toContain('manifest must be a boolean')
  })

  it('rejects unknown formats', () => {
    expect(validateConfig({ formats: ['png', 'avi'] })).toEqual([
      'formats contains unknown value(s): avi',
    ])
  })

  it('accepts webp in formats', () => {
    expect(validateConfig({ formats: ['png', 'webp'] })).toEqual([])
  })

  it('rejects a non-array formats value', () => {
    expect(validateConfig({ formats: 'png' })).toEqual([
      'formats must be an array of png, mp4, gif or webp',
    ])
  })

  it('accepts valid port values', () => {
    expect(validateConfig({ port: 3000 })).toEqual([])
    expect(validateConfig({ port: 1 })).toEqual([])
    expect(validateConfig({ port: 65535 })).toEqual([])
    expect(validateConfig({ port: 8080 })).toEqual([])
  })

  it('rejects invalid port values', () => {
    expect(validateConfig({ port: 0 })).toContain('port must be an integer between 1 and 65535')
    expect(validateConfig({ port: -1 })).toContain('port must be an integer between 1 and 65535')
    expect(validateConfig({ port: 65536 })).toContain('port must be an integer between 1 and 65535')
    expect(validateConfig({ port: 3000.5 })).toContain('port must be an integer between 1 and 65535')
    expect(validateConfig({ port: '3000' })).toContain('port must be an integer between 1 and 65535')
    expect(validateConfig({ port: NaN })).toContain('port must be an integer between 1 and 65535')
  })
})

describe('findConfig', () => {
  it('returns undefined when there is no config', async () => {
    expect(await findConfig(dir)).toBeUndefined()
  })

  it('finds a config file in the directory', async () => {
    const path = join(dir, 'liveog.config.mjs')
    await writeFile(path, 'export default {}')
    expect(await findConfig(dir)).toBe(path)
  })
})

describe('loadConfig', () => {
  it('loads a default export', async () => {
    const path = join(dir, 'liveog.config.mjs')
    await writeFile(path, "export default { url: 'http://localhost:5173', fps: 24 }")
    await expect(loadConfig(path)).resolves.toEqual({ url: 'http://localhost:5173', fps: 24 })
  })

  it('throws when the file is missing', async () => {
    await expect(loadConfig(join(dir, 'nope.mjs'))).rejects.toThrow(/not found/)
  })

  it('throws when there is no default export', async () => {
    const path = join(dir, 'liveog.config.mjs')
    await writeFile(path, 'export const url = "x"')
    await expect(loadConfig(path)).rejects.toThrow(/no default export/)
  })

  it('throws with the validation problems listed', async () => {
    const path = join(dir, 'liveog.config.mjs')
    await writeFile(path, 'export default { fps: -1 }')
    await expect(loadConfig(path)).rejects.toThrow(/fps must be a positive number/)
  })

  it('loads a config with port', async () => {
    const path = join(dir, 'liveog.config.mjs')
    await writeFile(path, 'export default { port: 4000 }')
    await expect(loadConfig(path)).resolves.toEqual({ port: 4000 })
  })

  it('throws when config has invalid port', async () => {
    const path = join(dir, 'liveog.config.mjs')
    await writeFile(path, 'export default { port: 70000 }')
    await expect(loadConfig(path)).rejects.toThrow(/port must be an integer between 1 and 65535/)
  })
})

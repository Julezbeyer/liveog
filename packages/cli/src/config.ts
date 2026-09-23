import { stat } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { isAbsolute, resolve } from 'node:path'
import type { RenderFormat } from '@liveog/renderer'

/** Shape of a `liveog.config.ts` default export. Every field is optional. */
export interface LiveOGFileConfig {
  url?: string
  card?: {
    url?: string
  }
  outDir?: string
  width?: number
  height?: number
  duration?: number
  fps?: number
  formats?: RenderFormat[]
  poster?: number
  browser?: string
  baseUrl?: string
  manifest?: boolean
  port?: number
}

const CONFIG_NAMES = [
  'liveog.config.ts',
  'liveog.config.mts',
  'liveog.config.js',
  'liveog.config.mjs',
]

const ALL_FORMATS: RenderFormat[] = ['png', 'mp4', 'gif', 'webp']

async function isFile(path: string) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

/** First config file present in `cwd`, or undefined when there is none. */
export async function findConfig(cwd = process.cwd()): Promise<string | undefined> {
  for (const name of CONFIG_NAMES) {
    const candidate = resolve(cwd, name)
    if (await isFile(candidate)) return candidate
  }
  return undefined
}

/** Validates a loaded config object, returning the list of problems found. */
export function validateConfig(value: unknown): string[] {
  const problems: string[] = []
  if (typeof value !== 'object' || value === null) return ['config must export an object']
  const config = value as Record<string, unknown>

  for (const key of ['width', 'height', 'duration', 'fps', 'poster'] as const) {
    const entry = config[key]
    if (entry === undefined) continue
    if (typeof entry !== 'number' || !Number.isFinite(entry) || entry < 0) {
      problems.push(`${key} must be a positive number`)
    }
  }

  for (const key of ['url', 'outDir', 'browser', 'baseUrl'] as const) {
    const entry = config[key]
    if (entry !== undefined && typeof entry !== 'string') problems.push(`${key} must be a string`)
  }

  if (config.card !== undefined) {
    if (typeof config.card !== 'object' || config.card === null) {
      problems.push('card must be an object')
    } else if (
      (config.card as { url?: unknown }).url !== undefined &&
      typeof (config.card as { url?: unknown }).url !== 'string'
    ) {
      problems.push('card.url must be a string')
    }
  }

  if (config.port !== undefined) {
    if (
      typeof config.port !== 'number' ||
      !Number.isInteger(config.port) ||
      config.port < 1 ||
      config.port > 65535
    ) {
      problems.push('port must be an integer between 1 and 65535')
    }
  }

  if (config.manifest !== undefined && typeof config.manifest !== 'boolean') {
    problems.push('manifest must be a boolean')
  }

  if (config.formats !== undefined) {
    if (!Array.isArray(config.formats)) {
      problems.push('formats must be an array of png, mp4, gif or webp')
    } else {
      const unknown = config.formats.filter(f => !ALL_FORMATS.includes(f as RenderFormat))
      if (unknown.length) problems.push(`formats contains unknown value(s): ${unknown.join(', ')}`)
    }
  }

  return problems
}

/**
 * Loads a config file.
 *
 * TypeScript configs rely on the running Node version being able to import
 * them (Node 22.6+ with type stripping, or a loader like tsx). When that fails
 * the error explains the options instead of surfacing a raw import error.
 */
export async function loadConfig(path: string): Promise<LiveOGFileConfig> {
  const absolute = isAbsolute(path) ? path : resolve(process.cwd(), path)
  if (!(await isFile(absolute))) throw new Error(`Config file not found: ${absolute}`)

  let module: { default?: unknown }
  try {
    module = await import(pathToFileURL(absolute).href)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Could not load ${absolute}\n${reason}\n\n` +
      'TypeScript configs need Node 22.6+ (type stripping) or a loader such as tsx. ' +
      'A liveog.config.mjs works everywhere.',
    )
  }

  const config = module.default
  if (config === undefined) throw new Error(`${absolute} has no default export`)

  const problems = validateConfig(config)
  if (problems.length) throw new Error(`Invalid config in ${absolute}:\n  - ${problems.join('\n  - ')}`)

  return config as LiveOGFileConfig
}

#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { render, type RenderFormat } from '@liveog/renderer'

const USAGE = `Usage: liveog render <url> [outDir] [options]

Options:
  --width <px>        Card width (default 1200)
  --height <px>       Card height (default 630)
  --duration <ms>     Animation length in milliseconds (default 4000)
  --fps <n>           Frames per second (default 30)
  --formats <list>    Comma separated subset of png,mp4,gif (default all)
  --poster <ms>       Timeline position captured as the static PNG (default: end)
  --browser <path>    Chromium executable to use instead of the Playwright download
  -h, --help          Show this help
`

const ALL_FORMATS: RenderFormat[] = ['png', 'mp4', 'gif']

function fail(message: string): never {
  console.error(message)
  console.error()
  console.error(USAGE)
  process.exit(1)
}

function toNumber(name: string, value: string | undefined) {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) fail(`--${name} must be a positive number, got "${value}"`)
  return parsed
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    width: { type: 'string' },
    height: { type: 'string' },
    duration: { type: 'string' },
    fps: { type: 'string' },
    formats: { type: 'string' },
    poster: { type: 'string' },
    browser: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
})

if (values.help) {
  console.log(USAGE)
  process.exit(0)
}

const [command, url, outDir = 'dist'] = positionals
if (command !== 'render' || !url) fail('Expected: liveog render <url> [outDir]')

const formats = values.formats
  ? values.formats.split(',').map(f => f.trim()).filter(Boolean)
  : ALL_FORMATS
const invalid = formats.filter(f => !ALL_FORMATS.includes(f as RenderFormat))
if (invalid.length) fail(`Unknown format(s): ${invalid.join(', ')}. Use png, mp4 or gif.`)

const result = await render({
  url,
  outDir,
  formats: formats as RenderFormat[],
  width: toNumber('width', values.width),
  height: toNumber('height', values.height),
  duration: toNumber('duration', values.duration),
  fps: toNumber('fps', values.fps),
  posterTime: values.poster === undefined ? undefined : Number(values.poster),
  browserExecutablePath: values.browser,
})

console.log(`LiveOG rendered ${result.formats.join(', ')} to ${result.outDir}`)

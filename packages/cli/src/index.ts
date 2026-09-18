#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { render, type RenderFormat } from '@liveog/renderer'
import { findConfig, loadConfig, type LiveOGFileConfig } from './config.js'
import { createReporter } from './reporter.js'

const USAGE = `Usage: liveog render [url] [outDir] [options]

Options:
  --width <px>        Card width (default 1200)
  --height <px>       Card height (default 630)
  --duration <ms>     Animation length in milliseconds (default 4000)
  --fps <n>           Frames per second (default 30)
  --formats <list>    Comma separated subset of png,mp4,gif (default all)
  --poster <ms>       Timeline position captured as the static PNG (default: end)
  --browser <path>    Chromium executable to use instead of the Playwright download
  --base-url <url>    Public URL prefix used for the manifest and meta tags
  --no-manifest       Skip writing liveog.manifest.json
  --config <path>     Config file to load (default: liveog.config.ts in cwd)
  --no-config         Ignore any config file
  --verbose           Show FFmpeg output instead of a progress bar
  --no-progress       Plain log lines instead of a progress bar
  -v, --version       Show the version
  -h, --help          Show this help

Options given on the command line override the config file.
`

const ALL_FORMATS: RenderFormat[] = ['png', 'mp4', 'gif']

/** Past-tense label shown with the green check once a stage completes. */
function stageDone(stage: string): string {
  if (stage === 'launch') return 'Browser ready'
  if (stage === 'capture') return 'Frames captured'
  if (stage === 'encode') return 'Encoded'
  return stage
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

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
    'base-url': { type: 'string' },
    // Node's parseArgs has no `--no-x` negation, so the flags are explicit.
    'no-manifest': { type: 'boolean' },
    config: { type: 'string' },
    'no-config': { type: 'boolean' },
    verbose: { type: 'boolean' },
    'no-progress': { type: 'boolean' },
    version: { type: 'boolean', short: 'v' },
    help: { type: 'boolean', short: 'h' },
  },
})

if (values.help) {
  console.log(USAGE)
  process.exit(0)
}

if (values.version) {
  // Read from the shipped package.json rather than baking the version in at
  // build time, so it can never drift from what npm actually installed.
  const here = dirname(fileURLToPath(import.meta.url))
  const { version } = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'))
  console.log(version)
  process.exit(0)
}

const [command, urlArg, outDirArg] = positionals
if (command === undefined) {
  console.log(USAGE)
  process.exit(0)
}
if (command !== 'render') fail(`Unknown command "${command}". Expected: liveog render [url] [outDir]`)

// `--no-config` skips config discovery entirely.
let fileConfig: LiveOGFileConfig = {}
let configPath: string | undefined
if (!values['no-config']) {
  configPath = values.config ?? (await findConfig())
  if (values.config && !configPath) fail(`Config file not found: ${values.config}`)
  if (configPath) {
    try {
      fileConfig = await loadConfig(configPath)
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error))
    }
  }
}

const url = urlArg ?? fileConfig.url
if (!url) {
  fail('No URL given. Pass one as an argument or set `url` in your config file.')
}

const outDir = outDirArg ?? fileConfig.outDir ?? 'dist'

const formatsInput = values.formats
  ? values.formats.split(',').map(f => f.trim()).filter(Boolean)
  : fileConfig.formats ?? ALL_FORMATS
const invalid = formatsInput.filter(f => !ALL_FORMATS.includes(f as RenderFormat))
if (invalid.length) fail(`Unknown format(s): ${invalid.join(', ')}. Use png, mp4 or gif.`)

const posterFlag = values.poster === undefined ? undefined : Number(values.poster)
if (posterFlag !== undefined && !Number.isFinite(posterFlag)) {
  fail(`--poster must be a number, got "${values.poster}"`)
}

const manifestDisabled = values['no-manifest'] === true || fileConfig.manifest === false

if (configPath) console.log(`Using config ${configPath}`)

const reporter = createReporter({ enabled: values['no-progress'] || values.verbose ? false : undefined })
let lastStage = ''

// A Ctrl-C mid-spin would otherwise leave the terminal without a cursor.
const onInterrupt = () => { reporter.stop(); process.exit(130) }
process.once('SIGINT', onInterrupt)
process.once('SIGTERM', onInterrupt)

const started = Date.now()

try {
  const result = await render({
    url,
    outDir,
    formats: formatsInput as RenderFormat[],
    width: toNumber('width', values.width) ?? fileConfig.width,
    height: toNumber('height', values.height) ?? fileConfig.height,
    duration: toNumber('duration', values.duration) ?? fileConfig.duration,
    fps: toNumber('fps', values.fps) ?? fileConfig.fps,
    posterTime: posterFlag ?? fileConfig.poster,
    browserExecutablePath: values.browser ?? fileConfig.browser,
    baseUrl: values['base-url'] ?? fileConfig.baseUrl,
    manifest: !manifestDisabled,
    verbose: values.verbose === true,
    onProgress: event => {
      if (event.stage !== lastStage && lastStage) reporter.done(stageDone(lastStage))
      lastStage = event.stage
      reporter.progress(event.label, event.ratio)
    },
  })

  if (lastStage) reporter.done(stageDone(lastStage))
  reporter.stop()

  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  // A relative path that climbs out of the cwd is harder to read than the absolute one.
  const rel = relative(process.cwd(), result.outDir)
  const where = !rel ? '.' : rel.startsWith('..') ? result.outDir : rel

  console.log()
  console.log(`  Rendered ${result.frameCount} frames in ${seconds}s → ${where}/`)
  for (const asset of result.manifest.assets) {
    console.log(`    ${asset.file.padEnd(20)} ${formatBytes(asset.bytes)}`)
  }

  if (!manifestDisabled) {
    console.log()
    console.log('  Paste into your <head>:')
    console.log()
    for (const tag of result.manifest.meta) console.log(`    ${tag}`)
    console.log()
    console.log(`  Also written to ${where}/liveog.manifest.json`)
  }
  console.log()
} catch (error) {
  reporter.stop()
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

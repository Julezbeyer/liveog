import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { mkdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

const app = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(new URL('../../../packages/renderer/package.json', import.meta.url))
const { chromium } = require('playwright')
const artifacts = process.env.LIVEOG_WEB_ARTIFACTS ?? join(tmpdir(), 'liveog-web-smoke')
await mkdir(artifacts, { recursive: true })
const port = process.env.LIVEOG_WEB_TEST_PORT ?? '5187'
const url = `http://127.0.0.1:${port}/liveog/`
const server = spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', port, '--strictPort'], { cwd: app, stdio: 'pipe', detached: true })
let log = ''
server.stdout.on('data', data => { log += data })
server.stderr.on('data', data => { log += data })
let browser
let page
const errors = []
try {
  for (let i = 0; ; i++) {
    if (server.exitCode !== null || i === 40) throw new Error(`Preview server unavailable: ${log}`)
    try { if ((await fetch(url)).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  browser = await chromium.launch({ headless: true, executablePath: process.env.LIVEOG_BROWSER_PATH || undefined, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } })
  page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url)
  const saved = () => page.getByRole('status').filter({ hasText: 'All changes saved on this device' }).waitFor()
  const step = name => page.locator('.editor-steps').getByRole('button', { name: new RegExp(name) }).click()
  const choose = async name => { await step('Template'); await page.getByRole('radio', { name: new RegExp(name) }).click() }
  const scrub = async time => {
    const pause = page.getByRole('button', { name: 'Pause', exact: true })
    if (await pause.count()) await pause.click()
    await page.getByRole('slider', { name: 'Timeline' }).fill(String(time))
  }
  await saved()
  await choose('Typewriter')
  await page.getByLabel('Your message', { exact: true }).fill('A better way to share your story.')
  await page.getByLabel('Supporting text').fill('Made in the visual editor. No code needed.')
  await step('Animation')
  await page.getByRole('radio', { name: '3s', exact: true }).click()
  await page.getByRole('button', { name: /^Fade in/ }).click()
  await scrub(0)
  assert.equal(await page.locator('.card-root > div > div').evaluate(el => getComputedStyle(el).opacity), '0')
  await scrub(3000)
  assert.equal(await page.locator('.card-root > div > div').evaluate(el => getComputedStyle(el).opacity), '1')
  await saved()
  await page.reload()
  await saved()
  await step('Content')
  assert.equal(await page.getByLabel('Your message', { exact: true }).inputValue(), 'A better way to share your story.')
  await step('Animation')
  assert.equal(await page.getByRole('button', { name: /^Fade in/ }).getAttribute('aria-pressed'), 'true')
  assert.equal(await page.getByRole('radio', { name: '3s', exact: true }).getAttribute('aria-checked'), 'true')
  await choose('Growth chart')
  await page.getByLabel('Chart values', { exact: true }).fill('12, invalid')
  assert.equal(await page.getByRole('button', { name: /^Image PNG/ }).isDisabled(), true)
  await page.getByLabel('Chart values', { exact: true }).fill('12, 24, -3, 42, 60')
  await page.getByRole('button', { name: /^Image PNG/ }).waitFor()
  assert.equal(await page.getByRole('button', { name: /^Image PNG/ }).isEnabled(), true)
  await page.getByLabel('Headline', { exact: true }).fill('Every step tells a story.')
  await page.getByLabel('Logo', { exact: true }).setInputFiles(join(app, 'public/og.png'))
  await saved()
  await step('Animation')
  await page.getByRole('button', { name: /^Still/ }).click()
  await scrub(0)
  const stillStart = await page.locator('.card-root').innerHTML()
  await scrub(3000)
  assert.equal(await page.locator('.card-root').innerHTML(), stillStart, 'Still must freeze the card')
  await page.getByRole('button', { name: /^Slide up/ }).click()
  await scrub(0)
  assert.ok((await page.locator('.card-root > div > div').getAttribute('style')).includes('64px'))
  await page.getByRole('button', { name: /^Signature motion/ }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Replay', exact: true }).click()
  assert.ok(Number(await page.getByRole('slider', { name: 'Timeline' }).inputValue()) < 300, 'Replay restarts while playing')
  await scrub(3000)
  await page.screenshot({ path: join(artifacts, 'desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('#download').scrollIntoViewIfNeeded()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.screenshot({ path: join(artifacts, 'mobile.png'), fullPage: true })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile page overflows horizontally')
  await page.setViewportSize({ width: 1440, height: 1050 })
  await step('Content')
  await page.getByLabel('Background image or video', { exact: true }).setInputFiles(join(app, 'public/og.mp4'))
  await saved()
  await page.reload()
  await saved()
  await step('Content')
  assert.equal(await page.getByLabel('Chart values', { exact: true }).inputValue(), '12, 24, -3, 42, 60')
  assert.equal(await page.locator('.filename').filter({ hasText: 'og.mp4' }).count(), 1)
  assert.equal(await page.locator('.filename').filter({ hasText: 'og.png' }).count(), 1)
  await page.waitForFunction(() => document.querySelector('.card-root video')?.readyState >= 2)
  await choose('Typewriter')
  assert.equal(await page.getByLabel('Your message', { exact: true }).inputValue(), 'A better way to share your story.')
  await choose('Growth chart')
  assert.equal(await page.getByLabel('Headline', { exact: true }).inputValue(), 'Every step tells a story.')
  // Downloads exercise real capture and encoders, including a restored video background.
  for (const [name, kind] of [[/^Image PNG/, 'png'], [/^Animation GIF/, 'gif'], [/^Video /, 'video']]) {
    const button = page.getByRole('button', { name })
    if (kind === 'video' && !await button.isEnabled()) throw new Error('Expected Chromium to offer a video encoder')
    const downloading = page.waitForEvent('download', { timeout: 120000 })
    await button.click()
    const download = await downloading
    const path = join(artifacts, download.suggestedFilename())
    await download.saveAs(path)
    const bytes = await readFile(path)
    assert.ok(bytes.length > 1000, `${kind} download is empty`)
    if (kind === 'png') {
      assert.equal(bytes.subarray(1, 4).toString(), 'PNG')
      assert.equal(bytes.readUInt32BE(16), 1200)
      assert.equal(bytes.readUInt32BE(20), 630)
    }
    if (kind === 'gif') assert.equal(bytes.subarray(0, 3).toString(), 'GIF')
    console.log(`Downloaded ${download.suggestedFilename()}: ${bytes.length} bytes`)
    await page.waitForFunction(() => !document.querySelector('fieldset').disabled)
  }
  const fallback = await browser.newContext()
  await fallback.addInitScript(() => Object.defineProperty(window, 'indexedDB', { get() { throw new Error('Storage disabled') } }))
  const blocked = await fallback.newPage()
  await blocked.goto(url)
  await blocked.getByRole('status').filter({ hasText: 'Draft storage unavailable' }).waitFor()
  assert.equal(await blocked.getByRole('radio', { name: /^Launch/ }).isEnabled(), true)
  await fallback.close()
  assert.deepEqual(errors, [], 'browser runtime errors')
  console.log(`Editor checks passed: templates, animation, validation, persistence, media, mobile layout, PNG/GIF/video downloads, storage fallback. Screenshots: ${artifacts}`)
} catch (error) {
  if (page) console.error(await page.locator('#download').innerText().catch(() => ''), errors)
  if (page) await page.screenshot({ path: join(artifacts, 'failure.png'), fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  try { process.kill(-server.pid, 'SIGTERM') } catch {}
}

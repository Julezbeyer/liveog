#!/usr/bin/env node
import { render } from '@liveog/renderer'

const [command, url, outDir = 'dist'] = process.argv.slice(2)

if (command !== 'render' || !url) {
  console.log('Usage: liveog render <url> [outDir]')
  process.exit(1)
}

await render({ url, outDir, formats: ['png', 'mp4', 'gif'] })
console.log(`LiveOG rendered to ${outDir}`)
